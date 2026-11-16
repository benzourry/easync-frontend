import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import type { MessageKey } from '../i18n/messages';
import { viewpointAdmits } from '../frameworks/viewpoints';
import type { ModelElement, Plateau } from '../models/model.models';
import { PLATEAU_OPTIONS } from '../models/model.models';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';
import { TranslationService } from '../services/translation.service';

/** A column the table can show; `property` columns come from the elements' own properties. */
interface Column {
  id: string;
  labelKey: MessageKey | null;
  /** Property name when the column is a custom property rather than a built-in field. */
  property: string | null;
}

const BASE_COLUMNS: readonly Column[] = [
  { id: 'name', labelKey: 'catalogue.columnName', property: null },
  { id: 'type', labelKey: 'catalogue.columnType', property: null },
  { id: 'layer', labelKey: 'catalogue.columnLayer', property: null },
  { id: 'domain', labelKey: 'catalogue.columnDomain', property: null },
  { id: 'plateau', labelKey: 'catalogue.columnPlateau', property: null },
  { id: 'lifecycle', labelKey: 'catalogue.columnLifecycle', property: null },
  { id: 'referenceModel', labelKey: 'catalogue.columnReferenceModel', property: null },
  { id: 'refCode', labelKey: 'catalogue.columnRefCode', property: null },
  { id: 'owner', labelKey: 'catalogue.columnOwner', property: null },
  { id: 'classification', labelKey: 'catalogue.columnClassification', property: null },
  { id: 'views', labelKey: 'catalogue.columnViews', property: null },
];

/** Most custom property columns to show, so a metadata-heavy model stays readable. */
const MAX_PROPERTY_COLUMNS = 8;

/**
 * Renders a view whose content is a catalogue instead of a picture: one row per model element,
 * sortable, filterable and exportable, so a model can be reviewed as a data set.
 */
@Component({
  selector: 'app-catalogue-view',
  template: `
    <section class="app-catalogue d-flex flex-column h-100 overflow-hidden">
      <header class="d-flex flex-wrap align-items-center gap-2 border-bottom px-3 py-2">
        <h2 class="h6 mb-0 me-auto">{{ i18n.t('catalogue.title') }}</h2>
        <label class="visually-hidden" for="catalogue-search">{{
          i18n.t('catalogue.search')
        }}</label>
        <input
          id="catalogue-search"
          type="search"
          class="form-control form-control-sm app-catalogue-search"
          [placeholder]="i18n.t('catalogue.search')"
          [value]="query()"
          (input)="onQuery($event)"
        />
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary text-nowrap"
          [disabled]="rows().length === 0"
          (click)="exportCsv()"
        >
          {{ i18n.t('catalogue.export') }}
        </button>
      </header>

      <div class="d-flex flex-wrap align-items-center gap-3 px-3 py-1 border-bottom small">
        @if (store.activeViewpoint(); as viewpoint) {
          <div class="form-check form-check-inline mb-0">
            <input
              class="form-check-input"
              type="checkbox"
              id="catalogue-scope"
              [checked]="scopeToViewpoint()"
              (change)="onScopeChange($event)"
            />
            <label class="form-check-label" for="catalogue-scope">
              {{ i18n.t('catalogue.scopeViewpoint') }} — {{ viewpoint.name }}
            </label>
          </div>
        }
        <span class="text-body-secondary">
          {{ i18n.t('catalogue.count', { shown: rows().length, total: scoped().length }) }}
        </span>
      </div>

      @if (store.elements().length === 0) {
        <p class="small text-body-secondary p-3 mb-0">{{ i18n.t('catalogue.emptyModel') }}</p>
      } @else if (rows().length === 0) {
        <p class="small text-body-secondary p-3 mb-0">{{ i18n.t('catalogue.empty') }}</p>
      } @else {
        <div class="flex-grow-1 overflow-auto">
          <table class="table table-sm table-hover align-middle mb-0 app-catalogue-table">
            <thead class="sticky-top">
              <tr>
                @for (column of columns(); track column.id) {
                  <th scope="col" class="text-nowrap">
                    <button
                      type="button"
                      class="btn btn-link btn-sm p-0 text-decoration-none text-reset"
                      [attr.aria-label]="i18n.t('catalogue.sortBy') + ' ' + label(column)"
                      (click)="sortBy(column.id)"
                    >
                      {{ label(column) }}
                      @if (sortKey() === column.id) {
                        <span aria-hidden="true">{{ sortDesc() ? '▾' : '▴' }}</span>
                      }
                    </button>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (element of rows(); track element.key) {
                <tr>
                  @for (column of columns(); track column.id) {
                    <td [class]="cellClass(column)">
                      @if (column.id === 'name') {
                        <span class="d-block">{{ element.name || '—' }}</span>
                        @if (!readOnly()) {
                          <button
                            type="button"
                            class="btn btn-link btn-sm p-0 app-catalogue-rename"
                            [attr.aria-label]="i18n.t('catalogue.rename') + ': ' + element.name"
                            (click)="rename(element)"
                          >
                            {{ i18n.t('catalogue.rename') }}
                          </button>
                        }
                      } @else {
                        {{ cell(element, column) }}
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
    .app-catalogue {
      background-color: var(--bs-body-bg);
    }
    .app-catalogue-search {
      max-width: 16rem;
    }
    .app-catalogue-table th,
    .app-catalogue-table td {
      white-space: nowrap;
    }
    .app-catalogue-table thead th {
      background-color: var(--bs-tertiary-bg);
    }
    .app-catalogue-rename {
      font-size: 0.75rem;
      text-decoration: none;
    }
  `,
})
export class CatalogueView {
  protected readonly store = inject(DiagramStore);
  protected readonly i18n = inject(TranslationService);
  private readonly diagram = inject(DiagramCanvasService);
  private readonly document = inject(DOCUMENT);

  protected readonly query = signal('');
  protected readonly sortKey = signal('name');
  protected readonly sortDesc = signal(false);
  /** Hide elements the active viewpoint does not admit; meaningless without a viewpoint. */
  protected readonly scopeToViewpoint = signal(true);

  protected readonly readOnly = this.store.readOnly;

  /** Elements in scope, before the search box narrows them further. */
  protected readonly scoped = computed(() => {
    const viewpoint = this.store.activeViewpoint();
    const elements = this.store.elements();
    if (!viewpoint || !this.scopeToViewpoint()) return elements;
    return elements.filter((element) =>
      viewpointAdmits(viewpoint, element.archimateType, element.layer),
    );
  });

  protected readonly columns = computed<Column[]>(() => {
    const properties = new Set<string>();
    for (const element of this.scoped()) {
      for (const name of Object.keys(element.properties)) properties.add(name);
    }
    const extra = [...properties]
      .sort((left, right) => left.localeCompare(right))
      .slice(0, MAX_PROPERTY_COLUMNS)
      .map<Column>((name) => ({ id: `prop:${name}`, labelKey: null, property: name }));
    return [...BASE_COLUMNS, ...extra];
  });

  /** How many views draw each element, keyed by element key. */
  private readonly usage = computed(() => {
    const counts = new Map<string, number>();
    for (const layer of this.store.repository()) {
      for (const item of layer.items) counts.set(item.elementKey, item.viewCount);
    }
    return counts;
  });

  protected readonly rows = computed(() => {
    const needle = this.query().trim().toLowerCase();
    const columns = this.columns();
    const key = this.sortKey();
    const direction = this.sortDesc() ? -1 : 1;
    const usage = this.usage();

    const matching = this.scoped().filter(
      (element) =>
        needle === '' ||
        columns.some((column) => this.raw(element, column, usage).toLowerCase().includes(needle)),
    );

    const column = columns.find((item) => item.id === key) ?? columns[0];
    return [...matching].sort((left, right) => {
      const a = this.raw(left, column, usage);
      const b = this.raw(right, column, usage);
      // Numbers sort as numbers, so a usage count of 10 comes after 9 rather than before 2.
      const numeric = Number(a) - Number(b);
      const result =
        a !== '' && b !== '' && !Number.isNaN(numeric) && numeric !== 0
          ? numeric
          : a.localeCompare(b, undefined, { sensitivity: 'base' });
      return result * direction;
    });
  });

  protected label(column: Column): string {
    return column.labelKey ? this.i18n.t(column.labelKey) : (column.property ?? column.id);
  }

  protected cell(element: ModelElement, column: Column): string {
    return this.raw(element, column, this.usage());
  }

  protected cellClass(column: Column): string {
    if (column.id === 'name' || column.property !== null) return 'text-break';
    return 'text-body-secondary';
  }

  /** The comparable text of one cell; shared by search, sorting and rendering. */
  private raw(
    element: ModelElement,
    column: Column,
    usage: Map<string, number>,
  ): string {
    if (column.property !== null) return element.properties[column.property] ?? '';
    switch (column.id) {
      case 'name':
        return element.name;
      case 'type':
        return element.archimateType;
      case 'layer':
        return element.layer;
      case 'domain':
        return element.domain ?? '';
      case 'plateau':
        return this.plateauLabel(element.plateau);
      case 'lifecycle':
        return element.lifecycleState ?? '';
      case 'referenceModel':
        return element.referenceModel ?? '';
      case 'refCode':
        return element.refCode ?? '';
      case 'owner':
        return element.owner ?? '';
      case 'classification':
        return element.classification ?? '';
      case 'views':
        return String(usage.get(element.key) ?? 0);
      default:
        return '';
    }
  }

  private plateauLabel(plateau: Plateau | null): string {
    return PLATEAU_OPTIONS.find((option) => option.value === plateau)?.label ?? '';
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onScopeChange(event: Event): void {
    this.scopeToViewpoint.set((event.target as HTMLInputElement).checked);
  }

  /** Re-sorts by a column, flipping direction when the same column is clicked again. */
  protected sortBy(id: string): void {
    if (this.sortKey() === id) {
      this.sortDesc.update((descending) => !descending);
      return;
    }
    this.sortKey.set(id);
    this.sortDesc.set(false);
  }

  /** Renames the element, which also updates every occurrence of it on the other views. */
  protected rename(element: ModelElement): void {
    const name = window.prompt(this.i18n.t('catalogue.rename'), element.name);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === element.name) return;
    this.diagram.updateElementByKey(element.key, { name: trimmed });
  }

  /** Exports the rows on screen, one column per visible column, so the table is portable. */
  protected exportCsv(): void {
    const columns = this.columns();
    const usage = this.usage();
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const lines = [
      columns.map((column) => escape(this.label(column))).join(','),
      ...this.rows().map((element) =>
        columns.map((column) => escape(this.raw(element, column, usage))).join(','),
      ),
    ];
    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = 'easync-catalogue.csv';
    this.document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
