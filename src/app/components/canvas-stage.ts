import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { DiagramCanvasService, type DragPayload } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';
import { clientPointFromEvent } from '../utils/drag-point';

@Component({
  selector: 'app-canvas-stage',
  imports: [DragDropModule],
  template: `
    <main
      #host
      class="app-canvas-surface flex-grow-1 position-relative h-100 w-100 overflow-hidden"
      cdkDropList
      cdkDropListSortingDisabled
      (cdkDropListDropped)="onDrop($event)"
    >
      <div
        class="app-overlay-pill position-absolute top-0 start-50 translate-middle-x mt-3 d-none d-md-flex gap-4 px-3 py-1 small text-body-secondary z-2 text-nowrap pe-none"
        aria-hidden="true"
      >
        <span><kbd>Shift</kbd> + Drag to connect</span>
        <span><kbd>Space</kbd> + Drag to pan</span>
        <span class="d-none d-lg-inline"><kbd>Ctrl</kbd> + <kbd>Z</kbd> to undo</span>
      </div>

      <canvas #canvas class="d-block" aria-label="ArchiMate diagram canvas"></canvas>

      @if (store.connectionMode()) {
        <div
          class="alert alert-primary position-absolute bottom-0 start-50 translate-middle-x mb-4 px-3 py-2 small shadow-sm z-3"
          role="status"
        >
          {{ store.connectionHint() }}
        </div>
      }

      @if (store.toast(); as toast) {
        <div [class]="toastClass(toast.isError)" role="status" aria-live="polite">
          {{ toast.text }}
        </div>
      }

      <div
        [class]="toolbarClass()"
        [style.left.px]="store.toolbar().left"
        [style.top.px]="store.toolbar().top"
      >
        <div class="btn-group btn-group-sm" role="group" aria-label="Actions for the selected object">
          <button
            type="button"
            class="btn btn-light app-icon-btn"
            title="Bring to Front"
            aria-label="Bring to front"
            (click)="diagram.bringToFront()"
          >
            <svg class="app-icon" aria-hidden="true"><use href="icons.svg#front"></use></svg>
          </button>
          <button
            type="button"
            class="btn btn-light app-icon-btn"
            title="Send to Back"
            aria-label="Send to back"
            (click)="diagram.sendToBack()"
          >
            <svg class="app-icon" aria-hidden="true"><use href="icons.svg#back"></use></svg>
          </button>
        </div>

        <div class="vr opacity-25"></div>

        <button
          type="button"
          class="btn btn-sm btn-light text-primary app-icon-btn"
          title="Edit Properties"
          aria-label="Edit properties"
          (click)="diagram.editActiveObject()"
        >
          <svg class="app-icon" aria-hidden="true"><use href="icons.svg#pencil"></use></svg>
        </button>

        <div class="vr opacity-25"></div>

        <button
          type="button"
          class="btn btn-sm btn-light text-danger app-icon-btn"
          title="Delete"
          aria-label="Delete selected object"
          (click)="diagram.deleteActive()"
        >
          <svg class="app-icon" aria-hidden="true"><use href="icons.svg#trash3"></use></svg>
        </button>
      </div>
    </main>
  `,
  styles: `
    :host {
      display: block;
      flex: 1 1 0%;
      min-width: 0;
      position: relative;
    }
  `,
})
export class CanvasStage {
  protected readonly store = inject(DiagramStore);
  protected readonly diagram = inject(DiagramCanvasService);

  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    afterNextRender(() =>
      this.diagram.attach(this.hostRef().nativeElement, this.canvasRef().nativeElement),
    );
    inject(DestroyRef).onDestroy(() => this.diagram.detach());
  }

  protected onDrop(event: CdkDragDrop<DragPayload>): void {
    const payload = event.item.data as DragPayload | undefined;
    if (!payload) return;

    const point = clientPointFromEvent(event.event);
    this.diagram.dropPayloadAt(payload, point.x, point.y);
  }

  protected toolbarClass(): string {
    const base =
      'app-toolbar position-absolute translate-middle-x d-flex align-items-center gap-1 bg-body border rounded-3 shadow p-1 z-3';
    return this.store.toolbar().visible ? `${base} opacity-100` : `${base} opacity-0 invisible`;
  }

  protected toastClass(isError: boolean): string {
    const base =
      'alert position-absolute bottom-0 start-50 translate-middle-x mb-4 px-3 py-2 small shadow-sm z-3 text-center';
    return isError ? `${base} alert-danger` : `${base} alert-dark`;
  }
}
