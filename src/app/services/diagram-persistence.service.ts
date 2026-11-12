import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Service, computed, effect, inject, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { apiErrorMessage, isStaleVersion } from '../core/http-error';
import type { ApiErrorBody, DiagramDto, ProjectSummary } from '../models/api.models';
import { DiagramApiService } from './diagram-api.service';
import { DiagramCanvasService } from './diagram-canvas.service';
import { DiagramStore } from './diagram-store';
import { ProjectApiService } from './project-api.service';

const AUTOSAVE_DELAY_MS = 900;

export type SaveState = 'saved' | 'saving' | 'dirty' | 'error';

/**
 * Keeps the open diagram in sync with the server: loads it with the caller's role,
 * autosaves canvas changes with optimistic versioning and exposes save/conflict state.
 */
@Service()
export class DiagramPersistenceService {
  private readonly diagrams = inject(DiagramApiService);
  private readonly projects = inject(ProjectApiService);
  private readonly canvas = inject(DiagramCanvasService);
  private readonly store = inject(DiagramStore);

  readonly diagram = signal<DiagramDto | null>(null);
  readonly project = signal<ProjectSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveFailed = signal(false);
  readonly conflictVersion = signal<number | null>(null);
  readonly version = signal(0);
  readonly savedRevision = signal(0);

  readonly dirty = computed(
    () => this.diagram() !== null && this.store.documentRevision() !== this.savedRevision(),
  );

  readonly saveState = computed<SaveState>(() => {
    if (this.saveFailed()) return 'error';
    if (this.saving()) return 'saving';
    return this.dirty() ? 'dirty' : 'saved';
  });

  readonly projectId = computed(() => this.diagram()?.projectId ?? null);
  readonly diagramName = computed(() => this.diagram()?.name ?? 'Diagram');
  readonly readOnly = this.store.readOnly;

  private activeId: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private queued = false;

  constructor() {
    effect(() => {
      const revision = this.store.documentRevision();
      const savedRevision = this.savedRevision();
      const diagram = this.diagram();
      const readOnly = this.store.readOnly();
      const failed = this.saveFailed();

      if (!diagram || readOnly || failed || revision === savedRevision) return;
      this.scheduleSave();
    });

    inject(DestroyRef).onDestroy(() => this.cancelTimer());
  }

  open(diagramId: number): void {
    this.close();
    this.loading.set(true);

    this.diagrams
      .get(diagramId)
      .pipe(
        switchMap((diagram) =>
          this.projects.get(diagram.projectId).pipe(map((project) => ({ diagram, project }))),
        ),
      )
      .subscribe({
        next: ({ diagram, project }) => {
          this.project.set(project);
          this.store.readOnly.set(project.role === 'VIEWER');
          this.applyServerDiagram(diagram);
          this.loading.set(false);
          this.store.showToast(
            project.role === 'VIEWER'
              ? 'Opened in read-only mode.'
              : `Opened “${diagram.name}”.`,
          );
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error));
        },
      });
  }

  fail(message: string): void {
    this.loading.set(false);
    this.error.set(message);
  }

  /** Applies a server copy of the diagram, discarding local unsaved state. */
  applyServerDiagram(diagram: DiagramDto, savedFromVersion?: number): void {
    this.activeId = diagram.id;
    this.savedRevision.set(this.store.documentRevision());
    this.diagram.set(diagram);
    this.version.set(
      savedFromVersion === undefined
        ? diagram.version
        : this.nextVersion(diagram.version, savedFromVersion),
    );
    this.saveFailed.set(false);
    this.conflictVersion.set(null);
    this.cancelTimer();
    this.canvas.loadDiagram(diagram);
    // Loading may normalize snapshots, so treat everything on screen as saved.
    this.savedRevision.set(this.store.documentRevision());
  }

  saveNow(revisionLabel?: string, onComplete?: (ok: boolean) => void): void {
    const diagramId = this.activeId;
    if (diagramId === null) {
      onComplete?.(false);
      return;
    }
    if (this.store.readOnly()) {
      this.store.showToast('You only have view access to this diagram.', true);
      onComplete?.(false);
      return;
    }
    if (this.saving()) {
      this.queued = true;
      onComplete?.(false);
      return;
    }

    this.cancelTimer();
    const revision = this.store.documentRevision();
    const views = this.canvas.buildViewDrafts();
    const version = this.version();

    this.saving.set(true);
    this.queued = false;

    this.diagrams
      .save(diagramId, {
        version,
        views,
        ...(revisionLabel?.trim() ? { revisionLabel: revisionLabel.trim() } : {}),
      })
      .subscribe({
        next: (saved) => {
          if (this.activeId !== diagramId) {
            onComplete?.(false);
            return;
          }
          this.saving.set(false);
          const nextVersion = this.nextVersion(saved.version, version);
          this.version.set(nextVersion);
          this.diagram.update((current) =>
            current
              ? {
                  ...current,
                  version: nextVersion,
                  updatedAt: saved.updatedAt,
                  lastModifiedBy: saved.lastModifiedBy,
                }
              : current,
          );
          this.savedRevision.set(revision);
          this.saveFailed.set(false);
          this.conflictVersion.set(null);
          if (revisionLabel?.trim()) {
            this.store.showToast(`Saved snapshot “${revisionLabel.trim()}”.`);
          }
          onComplete?.(true);
          if (this.queued) this.scheduleSave(0);
        },
        error: (error: unknown) => {
          if (this.activeId !== diagramId) {
            onComplete?.(false);
            return;
          }
          this.saving.set(false);
          this.saveFailed.set(true);
          if (isStaleVersion(error)) {
            const body = error instanceof HttpErrorResponse
              ? (error.error as Partial<ApiErrorBody> | null)
              : null;
            this.conflictVersion.set(body?.actualVersion ?? null);
            this.store.showToast(
              'This diagram changed elsewhere. Reload the latest copy or overwrite it.',
              true,
            );
            onComplete?.(false);
            return;
          }
          this.store.showToast(apiErrorMessage(error), true);
          onComplete?.(false);
        },
      });
  }

  /** Replaces local state with the latest server copy after a version conflict. */
  reloadLatest(): void {
    const diagramId = this.activeId;
    if (diagramId === null) return;
    this.cancelTimer();
    this.loading.set(true);
    this.diagrams.get(diagramId).subscribe({
      next: (diagram) => {
        this.applyServerDiagram(diagram);
        this.loading.set(false);
        this.store.showToast('Reloaded the latest saved copy.');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.store.showToast(apiErrorMessage(error), true);
      },
    });
  }

  /** Explicitly discards the other side's newer version by saving on top of it. */
  overwriteConflict(): void {
    const actual = this.conflictVersion();
    if (actual === null) return;
    this.version.set(actual);
    this.saveFailed.set(false);
    this.saveNow();
  }

  close(): void {
    this.cancelTimer();
    if (this.diagram() && !this.store.readOnly() && this.dirty() && !this.saving()) {
      this.saveNow();
    }
    this.activeId = null;
    this.diagram.set(null);
    this.project.set(null);
    this.error.set(null);
    this.loading.set(false);
    this.saving.set(false);
    this.saveFailed.set(false);
    this.conflictVersion.set(null);
    this.queued = false;
    this.store.readOnly.set(false);
  }

  /**
   * The server force-increments the stored version at commit time but echoes the version it
   * read back, so a successful write can report a version one behind the stored one. Trusting
   * the higher value keeps the next save from being rejected as stale.
   */
  private nextVersion(returned: number, sent: number): number {
    return Math.max(returned, sent + 1);
  }

  private scheduleSave(delay = AUTOSAVE_DELAY_MS): void {
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.saveNow();
    }, delay);
  }

  private cancelTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
