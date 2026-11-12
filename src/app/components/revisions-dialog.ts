import { DatePipe } from '@angular/common';
import { Component, TemplateRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { NgbModal, NgbModalModule, type NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal';
import { apiErrorMessage } from '../core/http-error';
import type { DiagramViewDto, RevisionDto, RevisionSummary } from '../models/api.models';
import { DiagramApiService } from '../services/diagram-api.service';
import { DiagramPersistenceService } from '../services/diagram-persistence.service';
import { DiagramStore } from '../services/diagram-store';

const DIALOG_OPTIONS = { size: 'lg', centered: true, backdrop: 'static' as const };

@Component({
  selector: 'app-revisions-dialog',
  imports: [NgbModalModule, DatePipe],
  template: `
    <ng-template #tpl let-modal>
      <div class="modal-header">
        <h2 class="modal-title h5" id="revisions-modal-title">Version history</h2>
        <button type="button" class="btn-close" aria-label="Close" (click)="close(modal)"></button>
      </div>

      <div class="modal-body">
        @if (store.readOnly()) {
          <div class="alert alert-info py-2 small" role="status">
            You have view access, so you can preview revisions but not save or restore them.
          </div>
        }

        @if (error(); as message) {
          <div class="alert alert-danger py-2 small" role="alert">{{ message }}</div>
        }

        @if (!store.readOnly()) {
          <div class="mb-3">
            <label class="form-label small" for="revision-label">Save the current diagram as a snapshot</label>
            <div class="input-group input-group-sm">
              <input
                id="revision-label"
                type="text"
                class="form-control"
                placeholder="e.g. Before refactor"
                [value]="label()"
                [disabled]="busy()"
                (input)="onLabel($event)"
              />
              <button
                type="button"
                class="btn btn-outline-primary"
                [disabled]="busy()"
                (click)="saveSnapshot()"
              >
                {{ busy() ? 'Saving…' : 'Save snapshot' }}
              </button>
            </div>
            @if (persistence.dirty()) {
              <p class="form-text mb-0">Unsaved canvas changes are included in the snapshot.</p>
            }
          </div>
        }

        @if (loading()) {
          <div class="d-flex align-items-center gap-2 text-secondary" role="status">
            <div class="spinner-border spinner-border-sm" aria-hidden="true"></div>
            <span>Loading revisions…</span>
          </div>
        } @else if (revisions().length === 0) {
          <p class="text-secondary mb-0">No revisions have been recorded yet.</p>
        } @else {
          <ul class="list-group list-group-flush">
            @for (revision of revisions(); track revision.id) {
              <li class="list-group-item px-0">
                <div class="d-flex flex-wrap align-items-center gap-2">
                  <div class="me-auto">
                    <p class="mb-0 fw-semibold">
                      {{ revision.label || 'Automatic save' }}
                      <span
                        class="badge ms-1"
                        [class]="
                          revision.kind === 'NAMED' ? 'text-bg-primary' : 'text-bg-secondary'
                        "
                        >{{ revision.kind === 'NAMED' ? 'Snapshot' : 'Auto' }}</span
                      >
                    </p>
                    <p class="mb-0 small text-secondary">
                      Version {{ revision.version }} · {{ revision.createdBy || 'Unknown' }} ·
                      {{ revision.createdAt | date: 'short' }}
                    </p>
                  </div>

                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    [attr.aria-expanded]="selected()?.id === revision.id"
                    (click)="preview(revision)"
                  >
                    {{ selected()?.id === revision.id ? 'Hide' : 'Preview' }}
                  </button>

                  @if (!store.readOnly()) {
                    @if (confirmingId() === revision.id) {
                      <button
                        type="button"
                        class="btn btn-sm btn-warning"
                        [disabled]="restoringId() !== null"
                        (click)="restore(revision)"
                      >
                        {{ restoringId() === revision.id ? 'Restoring…' : 'Confirm restore' }}
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary"
                        (click)="confirmingId.set(null)"
                      >
                        Cancel
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary"
                        [disabled]="persistence.dirty() || restoringId() !== null"
                        [attr.title]="
                          persistence.dirty() ? 'Save your changes before restoring a revision' : null
                        "
                        (click)="confirmingId.set(revision.id)"
                      >
                        Restore
                      </button>
                    }
                  }
                </div>

                @if (selected()?.id === revision.id) {
                  @if (previewLoading()) {
                    <p class="small text-secondary mt-2 mb-0" role="status">Loading preview…</p>
                  } @else if (selected(); as detail) {
                    <div class="table-responsive mt-2">
                      <table class="table table-sm align-middle mb-0">
                        <caption class="visually-hidden">
                          Views stored in revision {{ revision.version }}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">View</th>
                            <th scope="col" class="text-end">Shapes</th>
                            <th scope="col" class="text-end">Connections</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (view of detail.document.views; track view.viewKey) {
                            <tr>
                              <td>{{ view.name }}</td>
                              <td class="text-end">{{ shapeCount(view) }}</td>
                              <td class="text-end">{{ connectionCount(view) }}</td>
                            </tr>
                          } @empty {
                            <tr>
                              <td colspan="3" class="text-secondary">This revision has no views.</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                }
              </li>
            }
          </ul>
        }
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" (click)="close(modal)">Close</button>
      </div>
    </ng-template>
  `,
})
export class RevisionsDialog {
  protected readonly store = inject(DiagramStore);
  protected readonly persistence = inject(DiagramPersistenceService);
  private readonly api = inject(DiagramApiService);
  private readonly modalService = inject(NgbModal);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  protected readonly revisions = signal<RevisionSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly label = signal('');
  protected readonly busy = signal(false);
  protected readonly selected = signal<RevisionDto | null>(null);
  protected readonly previewLoading = signal(false);
  protected readonly confirmingId = signal<number | null>(null);
  protected readonly restoringId = signal<number | null>(null);

  private ref: NgbModalRef | null = null;

  constructor() {
    effect(() => {
      const open = this.store.revisionsDialogOpen();
      untracked(() => {
        if (!open) {
          this.closeRef();
          return;
        }
        if (this.ref) return;

        this.error.set(null);
        this.selected.set(null);
        this.confirmingId.set(null);
        this.load();

        const ref = this.modalService.open(this.tpl(), {
          ...DIALOG_OPTIONS,
          ariaLabelledBy: 'revisions-modal-title',
        });
        this.ref = ref;
        ref.closed.subscribe(() => (this.ref = null));
        ref.dismissed.subscribe(() => {
          this.ref = null;
          this.store.revisionsDialogOpen.set(false);
        });
      });
    });
  }

  protected load(): void {
    const diagramId = this.persistence.diagram()?.id;
    if (diagramId === undefined) return;
    this.loading.set(true);
    this.api.revisions(diagramId).subscribe({
      next: (revisions) => {
        this.revisions.set(revisions);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected onLabel(event: Event): void {
    this.label.set((event.target as HTMLInputElement).value);
  }

  protected saveSnapshot(): void {
    const label = this.label().trim();
    if (!label) {
      this.error.set('Enter a label for the snapshot.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.persistence.saveNow(label, (ok) => {
      this.busy.set(false);
      if (ok) {
        this.label.set('');
        this.load();
      }
    });
  }

  protected preview(revision: RevisionSummary): void {
    const diagramId = this.persistence.diagram()?.id;
    if (diagramId === undefined) return;
    if (this.selected()?.id === revision.id) {
      this.selected.set(null);
      return;
    }
    this.previewLoading.set(true);
    this.api.revision(diagramId, revision.id).subscribe({
      next: (detail) => {
        this.selected.set(detail);
        this.previewLoading.set(false);
      },
      error: (error: unknown) => {
        this.previewLoading.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }

  protected restore(revision: RevisionSummary): void {
    const diagramId = this.persistence.diagram()?.id;
    if (diagramId === undefined) return;
    this.restoringId.set(revision.id);
    this.error.set(null);
    const version = this.persistence.version();
    this.api.restoreRevision(diagramId, revision.id, version).subscribe({
      next: (diagram) => {
        this.restoringId.set(null);
        this.persistence.applyServerDiagram(diagram, version);
        this.store.revisionsDialogOpen.set(false);
        this.store.showToast(`Restored version ${revision.version}.`);
      },
      error: (error: unknown) => {
        this.restoringId.set(null);
        this.error.set(apiErrorMessage(error));
      },
    });
  }

  protected shapeCount(view: DiagramViewDto): number {
    return view.snapshot?.shapes?.length ?? 0;
  }

  protected connectionCount(view: DiagramViewDto): number {
    return view.snapshot?.connections?.length ?? 0;
  }

  protected close(modal: NgbModalRef): void {
    this.store.revisionsDialogOpen.set(false);
    modal.close();
  }

  private closeRef(): void {
    const ref = this.ref;
    this.ref = null;
    ref?.dismiss();
  }
}
