import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { LAYER_ORDER, layerOf } from '../models/archimate.models';
import type { ArchimateLayer, RelationshipType } from '../models/archimate.models';
import { viewpointAdmits } from '../frameworks/viewpoints';
import type { ModelElement } from '../models/model.models';
import { DiagramStore } from '../services/diagram-store';
import { TranslationService } from '../services/translation.service';

/** One cell of the grid: how the row element relates to the column element. */
interface Cell {
  count: number;
  types: RelationshipType[];
}

/**
 * Renders a view whose content is a matrix: one axis lists elements, the other does the same, and
 * a cell marks that a relationship exists. It answers the "what depends on what" question that a
 * picture cannot, e.g. which applications share data with which.
 */
@Component({
  selector: 'app-matrix-view',
  template: `
    <section class="app-matrix d-flex flex-column h-100 overflow-hidden">
      <header class="d-flex flex-wrap align-items-center gap-2 border-bottom px-3 py-2">
        <h2 class="h6 mb-0 me-auto">{{ i18n.t('matrix.title') }}</h2>
        <div class="d-flex align-items-center gap-1">
          <label class="form-label small mb-0 text-nowrap" for="matrix-row-layer">{{
            i18n.t('matrix.rows')
          }}</label>
          <select
            id="matrix-row-layer"
            class="form-select form-select-sm"
            [value]="activeRowLayer() ?? ''"
            (change)="onRowLayer($event)"
          >
            @for (layer of layers(); track layer) {
              <option [value]="layer">{{ layer }}</option>
            }
          </select>
        </div>
        <div class="d-flex align-items-center gap-1">
          <label class="form-label small mb-0 text-nowrap" for="matrix-column-layer">{{
            i18n.t('matrix.columns')
          }}</label>
          <select
            id="matrix-column-layer"
            class="form-select form-select-sm"
            [value]="activeColumnLayer() ?? ''"
            (change)="onColumnLayer($event)"
          >
            @for (layer of layers(); track layer) {
              <option [value]="layer">{{ layer }}</option>
            }
          </select>
        </div>
        <div class="form-check form-check-inline mb-0 small">
          <input
            class="form-check-input"
            type="checkbox"
            id="matrix-empty"
            [checked]="showEmpty()"
            (change)="onShowEmpty($event)"
          />
          <label class="form-check-label" for="matrix-empty">{{ i18n.t('matrix.showEmpty') }}</label>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary text-nowrap"
          [disabled]="rows().length === 0 || columns().length === 0"
          (click)="exportCsv()"
        >
          {{ i18n.t('matrix.export') }}
        </button>
      </header>

      @if (rows().length === 0 || columns().length === 0) {
        <p class="small text-body-secondary p-3 mb-0">{{ i18n.t('matrix.empty') }}</p>
      } @else {
        <div class="flex-grow-1 overflow-auto">
          <table class="table table-sm table-bordered align-middle mb-0 app-matrix-table">
            <caption class="visually-hidden">{{ i18n.t('matrix.hint') }}</caption>
            <thead>
              <tr>
                <th scope="col" class="app-matrix-corner">{{ i18n.t('matrix.corner') }}</th>
                @for (column of columns(); track column.key) {
                  <th scope="col" class="app-matrix-heading">
                    <span class="app-matrix-vertical">{{ column.name }}</span>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.key) {
                <tr>
                  <th scope="row" class="app-matrix-heading">{{ row.name }}</th>
                  @for (column of columns(); track column.key) {
                    @let cell = cellFor(row, column);
                    <td [class]="cellClass(cell)" [title]="cellTitle(cell)">
                      @if (cell.count > 0) {
                        <span class="badge text-bg-primary">{{ cell.count }}</span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .app-matrix {
      background-color: var(--bs-body-bg);
    }
    .app-matrix-table th,
    .app-matrix-table td {
      padding: 0.25rem 0.35rem;
      white-space: nowrap;
    }
    .app-matrix-table thead th {
      position: sticky;
      top: 0;
      background-color: var(--bs-tertiary-bg);
      z-index: 1;
    }
    .app-matrix-heading {
      background-color: var(--bs-tertiary-bg);
      font-weight: 500;
      max-width: 14rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .app-matrix-table tbody th {
      position: sticky;
      left: 0;
      z-index: 1;
    }
    .app-matrix-corner {
      position: sticky;
      left: 0;
      background-color: var(--bs-tertiary-bg);
      z-index: 2;
    }
    .app-matrix-vertical {
      display: inline-block;
      max-width: 12rem;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: bottom;
    }
    .app-matrix-table td {
      text-align: center;
    }
  `,
})
export class MatrixView {
  protected readonly store = inject(DiagramStore);
  protected readonly i18n = inject(TranslationService);
  private readonly document = inject(DOCUMENT);

  /** `null` until the user picks a layer, so the grid opens on the first layer that has elements. */
  protected readonly rowLayer = signal<ArchimateLayer | null>(null);
  protected readonly columnLayer = signal<ArchimateLayer | null>(null);
  protected readonly showEmpty = signal(false);

  protected readonly layers = computed(() => {
    const present = new Set(this.admitted().map((element) => element.layer));
    const ordered = LAYER_ORDER.filter((layer) => present.has(layer));
    const extra = [...present].filter((layer) => !ordered.includes(layer)).sort();
    return [...ordered, ...extra];
  });

  /** Elements the active viewpoint admits; an unscoped view uses the whole model. */
  private readonly admitted = computed(() => {
    const viewpoint = this.store.activeViewpoint();
    const elements = this.store.elements();
    if (!viewpoint) return elements;
    return elements.filter((element) =>
      viewpointAdmits(viewpoint, element.archimateType, element.layer),
    );
  });

  /** Relationship pairs indexed by `source→target` so a cell lookup is constant time. */
  private readonly cells = computed(() => {
    const index = new Map<string, Cell>();
    for (const relationship of this.store.modelRelationships()) {
      const add = (key: string) => {
        const cell = index.get(key) ?? { count: 0, types: [] };
        cell.count++;
        if (!cell.types.includes(relationship.type)) cell.types.push(relationship.type);
        index.set(key, cell);
      };
      add(this.pairKey(relationship.sourceKey, relationship.targetKey));
      // A dependency is worth seeing whichever direction it was drawn in.
      add(this.pairKey(relationship.targetKey, relationship.sourceKey));
    }
    return index;
  });

  protected readonly rows = computed(() => this.axis(this.rowLayer()));
  protected readonly columns = computed(() => this.axis(this.columnLayer()));

  /** The layer on screen; falls back to the first layer the model actually uses. */
  protected readonly activeRowLayer = computed(
    () => this.rowLayer() ?? this.layers()[0] ?? null,
  );
  protected readonly activeColumnLayer = computed(
    () => this.columnLayer() ?? this.layers()[0] ?? null,
  );

  private axis(layer: ArchimateLayer | null): ModelElement[] {
    if (!layer) return [];
    const elements = this.admitted()
      .filter((element) => element.layer === layer && element.name.trim() !== '')
      .sort((left, right) => left.name.localeCompare(right.name));
    if (this.showEmpty()) return elements;

    const linked = new Set<string>();
    for (const relationship of this.store.modelRelationships()) {
      linked.add(relationship.sourceKey);
      linked.add(relationship.targetKey);
    }
    const used = elements.filter((element) => linked.has(element.key));
    // A model without relationships yet still gets its elements listed rather than a blank grid.
    return used.length > 0 ? used : elements;
  }

  private pairKey(sourceKey: string, targetKey: string): string {
    return `${sourceKey}\u0000${targetKey}`;
  }

  protected cellFor(row: ModelElement, column: ModelElement): Cell {
    return this.cells().get(this.pairKey(row.key, column.key)) ?? { count: 0, types: [] };
  }

  protected cellClass(cell: Cell): string {
    return cell.count > 0 ? 'table-primary' : '';
  }

  protected cellTitle(cell: Cell): string {
    if (cell.count === 0) return '';
    return `${cell.count} × ${cell.types.join(', ')}`;
  }

  protected onRowLayer(event: Event): void {
    this.rowLayer.set(layerOf((event.target as HTMLSelectElement).value));
  }

  protected onColumnLayer(event: Event): void {
    this.columnLayer.set(layerOf((event.target as HTMLSelectElement).value));
  }

  protected onShowEmpty(event: Event): void {
    this.showEmpty.set((event.target as HTMLInputElement).checked);
  }

  /** Writes the grid as CSV so it can be pasted into a governance or data-sharing template. */
  protected exportCsv(): void {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const columns = this.columns();
    const lines = [
      [escape(''), ...columns.map((column) => escape(column.name))].join(','),
      ...this.rows().map((row) =>
        [
          escape(row.name),
          ...columns.map((column) => escape(String(this.cellFor(row, column).count))),
        ].join(','),
      ),
    ];
    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = 'easync-matrix.csv';
    this.document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
