import { Component, computed, inject } from '@angular/core';
import { PALETTE_CATEGORIES, RELATIONSHIP_OPTIONS } from '../models/archimate.models';
import type { PaletteItem, RelationshipType } from '../models/archimate.models';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';

@Component({
  selector: 'app-palette-sidebar',
  template: `
    <aside [class]="asideClass()">
      <div
        class="p-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center"
      >
        <div>
          <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200">Elements Palette</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">Drag or tap to add</p>
        </div>
        <button
          type="button"
          class="md:hidden text-gray-500 hover:text-gray-800 dark:hover:text-white"
          aria-label="Close elements palette"
          (click)="store.togglePalette()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div
        class="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-6 bg-white dark:bg-slate-800"
      >
        <div>
          <h3
            class="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3 flex items-center gap-2"
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
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Tools
          </h3>
          <div class="flex flex-col gap-2">
            <button
              type="button"
              [class]="connectClass()"
              [attr.aria-pressed]="store.connectionMode()"
              (click)="diagram.toggleConnectionMode()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>{{ store.connectionMode() ? 'Stop Connecting' : 'Connect' }}</span>
            </button>
            <label class="sr-only" for="relationship-type">Relationship type</label>
            <select
              id="relationship-type"
              class="w-full h-9 px-2 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700"
              [value]="store.connectionType()"
              (change)="onTypeChange($event)"
            >
              @for (option of relationshipOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
        </div>

        @for (category of categories; track category.title) {
          <div>
            <h3
              class="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3 flex items-center gap-2"
            >
              <span [class]="'w-3 h-3 rounded-full border ' + category.dotColorClass"></span>
              {{ category.title }}
            </h3>
            <div class="grid grid-cols-2 gap-2">
              @for (item of category.items; track item.label) {
                <button
                  type="button"
                  draggable="true"
                  [class]="itemClass(item)"
                  [style.backgroundColor]="item.isDashed ? null : item.color"
                  [attr.aria-label]="'Add ' + item.label"
                  (dragstart)="onDragStart($event, item)"
                  (click)="diagram.addPaletteItem(item)"
                >
                  <span class="text-lg mb-1 opacity-70" aria-hidden="true">{{ item.icon }}</span>
                  {{ item.displayLabel }}
                </button>
              }
            </div>
          </div>
        }
      </div>
    </aside>
  `,
})
export class PaletteSidebar {
  protected readonly store = inject(DiagramStore);
  protected readonly diagram = inject(DiagramCanvasService);

  protected readonly categories = PALETTE_CATEGORIES;
  protected readonly relationshipOptions = RELATIONSHIP_OPTIONS;

  protected readonly asideClass = computed(
    () =>
      `w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col h-full z-50 shadow-[4px_0_15px_rgba(0,0,0,0.03)] shrink-0 absolute md:relative transform transition-transform duration-300 md:translate-x-0 ${
        this.store.paletteOpen() ? 'translate-x-0' : '-translate-x-full'
      }`,
  );

  protected readonly connectClass = computed(
    () =>
      `w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-md shadow-sm transition-colors text-sm font-medium ${
        this.store.connectionMode()
          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
          : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600'
      }`,
  );

  protected itemClass(item: PaletteItem): string {
    const base =
      'palette-item border border-gray-400 rounded p-2 text-center text-xs flex flex-col items-center justify-center h-16 shadow-sm w-full';
    return item.isDashed
      ? `${base} bg-white dark:bg-slate-700 dark:border-slate-500 border-dashed dark:text-slate-200`
      : `${base} text-slate-900`;
  }

  protected onTypeChange(event: Event): void {
    this.store.connectionType.set((event.target as HTMLSelectElement).value as RelationshipType);
  }

  protected onDragStart(event: DragEvent, item: PaletteItem): void {
    this.diagram.startDrag(event, {
      label: item.label,
      color: item.color,
      icon: item.icon,
      layer: item.layer,
    });
  }
}
