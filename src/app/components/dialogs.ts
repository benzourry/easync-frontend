import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';

@Component({
  selector: 'app-edit-label-dialog',
  template: `
    @if (store.editDialogValue() !== null) {
      <div
        class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        (keydown.escape)="cancel()"
        (click)="onBackdrop($event)"
      >
        <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm p-5" (click)="$event.stopPropagation()">
          <h2 id="edit-modal-title" class="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            Edit Element Label
          </h2>
          <label for="label-input" class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
            >Label</label
          >
          <input
            #labelInput
            id="label-input"
            type="text"
            autofocus
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            [value]="store.editDialogValue() ?? ''"
            (keydown.enter)="confirm()"
          />
          <div class="flex justify-end gap-2 mt-5">
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              (click)="cancel()"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              (click)="confirm()"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class EditLabelDialog {
  protected readonly store = inject(DiagramStore);
  private readonly diagram = inject(DiagramCanvasService);
  private readonly labelInput = viewChild<ElementRef<HTMLInputElement>>('labelInput');

  constructor() {
    effect(() => {
      if (this.store.editDialogValue() === null) return;
      const input = this.labelInput()?.nativeElement;
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  protected onBackdrop(event: MouseEvent): void {
    event.stopPropagation();
    this.cancel();
  }

  protected cancel(): void {
    this.diagram.closeLabelDialog();
  }

  protected confirm(): void {
    const input = this.labelInput()?.nativeElement;
    this.diagram.saveLabel(input?.value ?? '');
  }
}

@Component({
  selector: 'app-clear-dialog',
  template: `
    @if (store.clearDialogOpen()) {
      <div
        class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-modal-title"
        (keydown.escape)="cancel()"
        (click)="cancel()"
      >
        <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm p-5" (click)="$event.stopPropagation()">
          <h2 id="clear-modal-title" class="text-lg font-semibold text-red-600 mb-3">Clear Canvas</h2>
          <p class="text-sm text-gray-600 dark:text-slate-300 mb-5">
            Are you sure you want to clear all elements, connections, and saved views? This cannot be undone.
          </p>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              autofocus
              class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              (click)="cancel()"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
              (click)="confirm()"
            >
              Yes, Clear All
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ClearDialog {
  protected readonly store = inject(DiagramStore);
  private readonly diagram = inject(DiagramCanvasService);

  protected cancel(): void {
    this.store.clearDialogOpen.set(false);
  }

  protected confirm(): void {
    this.diagram.clearAll();
  }
}

@Component({
  selector: 'app-new-view-dialog',
  template: `
    @if (store.newViewDialogOpen()) {
      <div
        class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-view-modal-title"
        (keydown.escape)="cancel()"
        (click)="cancel()"
      >
        <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm p-5" (click)="$event.stopPropagation()">
          <h2 id="new-view-modal-title" class="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            Create New View
          </h2>
          <label for="new-view-input" class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
            >View name</label
          >
          <input
            #viewInput
            id="new-view-input"
            type="text"
            autofocus
            placeholder="e.g. Application Layer"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            (keydown.enter)="confirm()"
          />
          <div class="flex justify-end gap-2 mt-5">
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              (click)="cancel()"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              (click)="confirm()"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class NewViewDialog {
  protected readonly store = inject(DiagramStore);
  private readonly diagram = inject(DiagramCanvasService);
  private readonly viewInput = viewChild<ElementRef<HTMLInputElement>>('viewInput');

  constructor() {
    effect(() => {
      if (!this.store.newViewDialogOpen()) return;
      const input = this.viewInput()?.nativeElement;
      if (input) input.focus();
    });
  }

  protected cancel(): void {
    this.store.newViewDialogOpen.set(false);
  }

  protected confirm(): void {
    const name = this.viewInput()?.nativeElement.value.trim() || 'New View';
    this.diagram.createView(name);
  }
}
