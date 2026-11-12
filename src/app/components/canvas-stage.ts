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
            class="btn btn-light"
            title="Bring to Front"
            aria-label="Bring to front"
            (click)="diagram.bringToFront()"
          >
            ↑
          </button>
          <button
            type="button"
            class="btn btn-light"
            title="Send to Back"
            aria-label="Send to back"
            (click)="diagram.sendToBack()"
          >
            ↓
          </button>
        </div>

        <div class="vr opacity-25"></div>

        <button
          type="button"
          class="btn btn-sm btn-light text-primary"
          title="Edit Properties"
          aria-label="Edit properties"
          (click)="diagram.editActiveObject()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>

        <div class="vr opacity-25"></div>

        <button
          type="button"
          class="btn btn-sm btn-light text-danger"
          title="Delete"
          aria-label="Delete selected object"
          (click)="diagram.deleteActive()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path
              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            ></path>
          </svg>
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
