import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, computed, inject } from '@angular/core';
import { PALETTE_CATEGORIES, RELATIONSHIP_OPTIONS } from '../models/archimate.models';
import type { PaletteItem, RelationshipType } from '../models/archimate.models';
import { DiagramCanvasService, type DragPayload } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';

@Component({
  selector: 'app-palette-sidebar',
  imports: [DragDropModule],
  template: `
    <aside
      id="elements-palette"
      class="app-sidebar offcanvas-md offcanvas-start d-flex flex-column border-end"
      [class.show]="store.paletteOpen()"
      aria-label="Elements palette"
    >
      <div
        class="d-flex align-items-start justify-content-between gap-2 px-3 py-3 border-bottom bg-body-tertiary flex-shrink-0"
      >
        <div>
          <h2 class="h6 mb-0">Elements Palette</h2>
          <p class="small text-body-secondary mb-0">Drag or tap to add</p>
        </div>
        <button
          type="button"
          class="btn-close d-md-none flex-shrink-0"
          aria-label="Close elements palette"
          (click)="store.togglePalette()"
        ></button>
      </div>

      <div
        class="flex-grow-1 overflow-auto app-scroll px-3 py-3 bg-body"
        cdkDropList
        cdkDropListSortingDisabled
        cdkDropListAutoScrollDisabled
      >
        <section class="mb-4">
          <h3 class="app-section-title">
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

          <div class="d-flex flex-column gap-2">
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

            <div>
              <label class="form-label small mb-1" for="relationship-type">Relationship type</label>
              <select
                id="relationship-type"
                class="form-select form-select-sm"
                [value]="store.connectionType()"
                (change)="onTypeChange($event)"
              >
                @for (option of relationshipOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>
          </div>
        </section>

        @for (category of categories; track category.title) {
          <section class="mb-4">
            <h3 class="app-section-title">
              <span
                class="d-inline-block rounded-circle border app-color-dot"
                [style.background-color]="category.dotColor"
                aria-hidden="true"
              ></span>
              {{ category.title }}
            </h3>

            <div class="app-palette-grid">
              @for (item of category.items; track item.label) {
                <button
                  type="button"
                  cdkDrag
                  cdkDragPreviewClass="app-drag-preview"
                  [cdkDragData]="payload(item)"
                  [class]="itemClass(item)"
                  [style.background-color]="item.isDashed ? null : item.color"
                  [attr.aria-label]="'Add ' + item.label"
                  (cdkDragStarted)="onDragStarted()"
                  (cdkDragEnded)="onDragEnded()"
                  (click)="onItemClick(item)"
                >
                  <span class="fs-5 lh-1 opacity-75" aria-hidden="true">{{ item.icon }}</span>
                  <span class="app-palette-label">{{ item.displayLabel }}</span>
                </button>
              }
            </div>
          </section>
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

  protected readonly connectClass = computed(
    () =>
      `btn w-100 d-flex align-items-center justify-content-center gap-2 ${
        this.store.connectionMode() ? 'btn-primary' : 'btn-outline-secondary'
      }`,
  );

  /** Set while a drag is in flight so the trailing click does not add twice. */
  private dragging = false;

  protected itemClass(item: PaletteItem): string {
    const base =
      'palette-item btn btn-sm border rounded-2 d-flex flex-column align-items-center justify-content-center gap-1 p-1';
    return item.isDashed
      ? `${base} border-dashed border-secondary-subtle bg-body`
      : `${base} border-secondary-subtle text-dark`;
  }

  protected onTypeChange(event: Event): void {
    this.store.connectionType.set((event.target as HTMLSelectElement).value as RelationshipType);
  }

  protected onItemClick(item: PaletteItem): void {
    if (this.dragging) return;
    this.diagram.addPaletteItem(item);
  }

  protected payload(item: PaletteItem): DragPayload {
    return { label: item.label, color: item.color, icon: item.icon, layer: item.layer };
  }

  protected onDragStarted(): void {
    this.dragging = true;
  }

  protected onDragEnded(): void {
    // The browser emits a click on the tile after the drag; let it pass first.
    setTimeout(() => (this.dragging = false));
  }
}
