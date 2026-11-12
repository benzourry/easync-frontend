import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import type { DragPayload } from '../services/diagram-canvas.service';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';

@Component({
  selector: 'app-canvas-stage',
  template: `
    <main
      #host
      class="flex-1 relative bg-[#f8fafc] dark:bg-[#0f172a] w-full h-full transition-colors duration-200 overflow-hidden"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
    >
      <div
        class="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 px-4 py-1.5 rounded-full shadow-sm backdrop-blur-md pointer-events-none z-10 border border-slate-200/50 dark:border-slate-700/50 opacity-70 whitespace-nowrap"
      >
        <span
          ><kbd class="px-1.5 py-0.5 rounded bg-slate-100/80 dark:bg-slate-700/80">Shift</kbd> + Drag
          to connect</span
        >
        <span
          ><kbd class="px-1.5 py-0.5 rounded bg-slate-100/80 dark:bg-slate-700/80">Space</kbd> + Drag
          to pan</span
        >
      </div>

      <canvas #canvas aria-label="ArchiMate diagram canvas"></canvas>

      @if (store.connectionMode()) {
        <div
          class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg text-sm font-medium z-20"
          role="status"
        >
          {{ store.connectionHint() }}
        </div>
      }

      @if (store.toast(); as toast) {
        <div
          [class]="toastClass(toast.isError)"
          role="status"
          aria-live="polite"
        >
          {{ toast.text }}
        </div>
      }

      <div
        [class]="toolbarClass()"
        [style.left.px]="store.toolbar().left"
        [style.top.px]="store.toolbar().top"
        [attr.aria-hidden]="!store.toolbar().visible"
      >
        <button
          type="button"
          class="flex items-center justify-center w-7 h-7 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
          title="Bring to Front"
          aria-label="Bring to front"
          (click)="diagram.bringToFront()"
        >
          ↑
        </button>
        <button
          type="button"
          class="flex items-center justify-center w-7 h-7 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
          title="Send to Back"
          aria-label="Send to back"
          (click)="diagram.sendToBack()"
        >
          ↓
        </button>
        <div class="w-px h-4 bg-gray-300 dark:bg-slate-600 mx-1"></div>
        <button
          type="button"
          class="flex items-center justify-center w-7 h-7 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition-colors"
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
        <div class="w-px h-4 bg-gray-300 dark:bg-slate-600 mx-1"></div>
        <button
          type="button"
          class="flex items-center justify-center w-7 h-7 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded transition-colors"
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

  protected toolbarClass(): string {
    const base =
      'absolute -translate-x-1/2 flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-gray-200 dark:border-slate-700 p-1 rounded-lg shadow-xl transition-all duration-200 z-20';
    return this.store.toolbar().visible
      ? `${base} opacity-100 scale-100`
      : `${base} opacity-0 scale-95 pointer-events-none`;
  }

  protected toastClass(isError: boolean): string {
    const base =
      'absolute bottom-6 left-1/2 -translate-x-1/2 text-white px-4 py-2 rounded shadow-lg text-sm font-medium z-30 max-w-[90%]';
    return `${base} ${isError ? 'bg-red-600' : 'bg-gray-800 dark:bg-gray-700'}`;
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    const raw = event.dataTransfer?.getData('application/x-archimate');
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as DragPayload;
      this.diagram.handleDrop(payload, event.clientX, event.clientY);
    } catch {
      this.store.showToast('Unable to add the dropped element.', true);
    }
  }
}
