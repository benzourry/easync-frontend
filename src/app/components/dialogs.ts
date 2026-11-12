import { Component, TemplateRef, effect, inject, untracked, viewChild } from '@angular/core';
import { NgbModal, NgbModalModule, type NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';

const DIALOG_OPTIONS = { size: 'sm', centered: true, backdrop: 'static' as const };

/** ng-bootstrap focuses the first tabbable element, so text dialogs focus their input explicitly. */
function focusTextInput(id: string): void {
  const element = document.getElementById(id) as HTMLInputElement | null;
  element?.focus();
  element?.select();
}

@Component({
  selector: 'app-edit-label-dialog',
  imports: [NgbModalModule],
  template: `
    <ng-template #tpl let-modal>
      <div class="modal-header">
        <h2 class="modal-title h5" id="edit-label-modal-title">Edit Element Label</h2>
        <button type="button" class="btn-close" aria-label="Close" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body">
        <label for="label-input" class="form-label">Label</label>
        <input
          #labelInput
          id="label-input"
          type="text"
          class="form-control"
          [value]="store.editDialogValue() ?? ''"
          (keydown.enter)="confirm(modal, labelInput.value)"
        />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" (click)="modal.dismiss()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="confirm(modal, labelInput.value)">Save</button>
      </div>
    </ng-template>
  `,
})
export class EditLabelDialog {
  protected readonly store = inject(DiagramStore);
  private readonly diagram = inject(DiagramCanvasService);
  private readonly modalService = inject(NgbModal);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  private ref: NgbModalRef | null = null;

  constructor() {
    effect(() => {
      const value = this.store.editDialogValue();
      untracked(() => {
        if (value === null) {
          this.close();
          return;
        }
        if (this.ref) return;

        const ref = this.modalService.open(this.tpl(), {
          ...DIALOG_OPTIONS,
          ariaLabelledBy: 'edit-label-modal-title',
        });
        this.ref = ref;
        ref.shown.subscribe(() => focusTextInput('label-input'));
        ref.closed.subscribe(() => (this.ref = null));
        ref.dismissed.subscribe(() => {
          this.ref = null;
          this.diagram.closeLabelDialog();
        });
      });
    });
  }

  private close(): void {
    const ref = this.ref;
    this.ref = null;
    ref?.dismiss();
  }

  protected confirm(modal: NgbModalRef, label: string): void {
    this.ref = null;
    this.diagram.saveLabel(label.trim());
    modal.close();
  }
}

@Component({
  selector: 'app-clear-dialog',
  imports: [NgbModalModule],
  template: `
    <ng-template #tpl let-modal>
      <div class="modal-header">
        <h2 class="modal-title h5 text-danger" id="clear-modal-title">Clear Canvas</h2>
        <button type="button" class="btn-close" aria-label="Close" (click)="cancel(modal)"></button>
      </div>
      <div class="modal-body">
        <p class="mb-0">
          Are you sure you want to clear all elements, connections, and saved views? This cannot be undone.
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" (click)="cancel(modal)">Cancel</button>
        <button type="button" class="btn btn-danger" (click)="confirm(modal)">Yes, Clear All</button>
      </div>
    </ng-template>
  `,
})
export class ClearDialog {
  protected readonly store = inject(DiagramStore);
  private readonly diagram = inject(DiagramCanvasService);
  private readonly modalService = inject(NgbModal);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  private ref: NgbModalRef | null = null;

  constructor() {
    effect(() => {
      const open = this.store.clearDialogOpen();
      untracked(() => {
        if (!open) {
          this.close();
          return;
        }
        if (this.ref) return;

        const ref = this.modalService.open(this.tpl(), {
          ...DIALOG_OPTIONS,
          ariaLabelledBy: 'clear-modal-title',
        });
        this.ref = ref;
        ref.closed.subscribe(() => (this.ref = null));
        ref.dismissed.subscribe(() => {
          this.ref = null;
          this.store.clearDialogOpen.set(false);
        });
      });
    });
  }

  private close(): void {
    const ref = this.ref;
    this.ref = null;
    ref?.dismiss();
  }

  protected cancel(modal: NgbModalRef): void {
    this.store.clearDialogOpen.set(false);
    modal.dismiss();
  }

  protected confirm(modal: NgbModalRef): void {
    this.ref = null;
    this.diagram.clearAll();
    modal.close();
  }
}

@Component({
  selector: 'app-new-view-dialog',
  imports: [NgbModalModule],
  template: `
    <ng-template #tpl let-modal>
      <div class="modal-header">
        <h2 class="modal-title h5" id="new-view-modal-title">Create New View</h2>
        <button type="button" class="btn-close" aria-label="Close" (click)="cancel(modal)"></button>
      </div>
      <div class="modal-body">
        <label for="new-view-input" class="form-label">View name</label>
        <input
          #viewInput
          id="new-view-input"
          type="text"
          class="form-control"
          placeholder="e.g. Application Layer"
          (keydown.enter)="confirm(modal, viewInput.value)"
        />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" (click)="cancel(modal)">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="confirm(modal, viewInput.value)">Create</button>
      </div>
    </ng-template>
  `,
})
export class NewViewDialog {
  protected readonly store = inject(DiagramStore);
  private readonly diagram = inject(DiagramCanvasService);
  private readonly modalService = inject(NgbModal);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  private ref: NgbModalRef | null = null;

  constructor() {
    effect(() => {
      const open = this.store.newViewDialogOpen();
      untracked(() => {
        if (!open) {
          this.close();
          return;
        }
        if (this.ref) return;

        const ref = this.modalService.open(this.tpl(), {
          ...DIALOG_OPTIONS,
          ariaLabelledBy: 'new-view-modal-title',
        });
        this.ref = ref;
        ref.shown.subscribe(() => focusTextInput('new-view-input'));
        ref.closed.subscribe(() => (this.ref = null));
        ref.dismissed.subscribe(() => {
          this.ref = null;
          this.store.newViewDialogOpen.set(false);
        });
      });
    });
  }

  private close(): void {
    const ref = this.ref;
    this.ref = null;
    ref?.dismiss();
  }

  protected cancel(modal: NgbModalRef): void {
    this.store.newViewDialogOpen.set(false);
    modal.dismiss();
  }

  protected confirm(modal: NgbModalRef, name: string): void {
    this.ref = null;
    this.store.newViewDialogOpen.set(false);
    this.diagram.createView(name.trim() || 'New View');
    modal.close();
  }
}
