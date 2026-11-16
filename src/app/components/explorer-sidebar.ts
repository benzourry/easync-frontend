import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap/nav';
import type { RepositoryLayer } from '../models/diagram.models';
import { viewpointsForFramework } from '../frameworks/viewpoints';
import { DiagramCanvasService, type DragPayload } from '../services/diagram-canvas.service';
import { DiagramPersistenceService } from '../services/diagram-persistence.service';
import { DiagramStore } from '../services/diagram-store';
import { TranslationService } from '../services/translation.service';
import { PlateauPlanner } from './plateau-planner';
import { PropertiesPanel } from './properties-panel';
import { ValidationPanel } from './validation-panel';

type RepositoryItem = RepositoryLayer['items'][number];

@Component({
  selector: 'app-explorer-sidebar',
  imports: [PropertiesPanel, ValidationPanel, PlateauPlanner, DragDropModule, NgbNavModule],
  template: `
    <aside
      id="explorer-sidebar"
      class="app-sidebar app-sidebar-end offcanvas-lg offcanvas-end d-flex flex-column border-start"
      [class.show]="store.explorerOpen()"
      [attr.aria-label]="i18n.t('explorer.aria')"
    >
      <div class="d-flex align-items-stretch border-bottom bg-body-tertiary flex-shrink-0">
        <ul
          #nav="ngbNav"
          ngbNav
          class="nav-tabs border-0 flex-grow-1"
          [activeId]="store.sidebarTab()"
          (activeIdChange)="setSidebarTab($event)"
          [destroyOnHide]="false"
        >
          <li [ngbNavItem]="'explorer'" domId="explorer" class="flex-fill">
            <button type="button" ngbNavLink class="w-100 app-tab">{{ i18n.t('explorer.tabExplorer') }}</button>
            <ng-template ngbNavContent>
              <div
                class="h-100 overflow-auto app-scroll app-panel-body"
                cdkDropList
                cdkDropListSortingDisabled
                cdkDropListAutoScrollDisabled
              >
                <details open class="mb-1">
                  <summary class="app-tree-summary">{{ i18n.t('explorer.diagrams') }}</summary>
                  <div class="list-group list-group-flush ps-2">
                    @for (view of store.views(); track view.id) {
                      <button type="button" [class]="rowClass(view.isActive)" (click)="diagram.selectView(view.id)">
                        <svg class="app-icon" aria-hidden="true"><use href="icons.svg#window-stack"></use></svg>
                        <span class="text-truncate">{{ view.name }}</span>
                      </button>
                    }
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-success border-dashed w-100 mt-1"
                      [disabled]="store.readOnly()"
                      (click)="store.newViewDialogOpen.set(true)"
                    >
                      {{ i18n.t('explorer.newView') }}
                    </button>
                  </div>
                </details>

                @if (store.activeViewpointId() !== null || viewpoints().length > 0) {
                  <details open class="mb-1">
                    <summary class="app-tree-summary">{{ i18n.t('explorer.viewpoint') }}</summary>
                    <div class="px-2 pb-1">
                      <label class="visually-hidden" for="view-content">{{ i18n.t('explorer.viewContent') }}</label>
                      <select
                        id="view-content"
                        class="form-select form-select-sm mb-2"
                        [disabled]="store.readOnly()"
                        [value]="store.activeContentType()"
                        (change)="onContentChange($event)"
                      >
                        <option value="diagram">{{ i18n.t('explorer.contentDiagram') }}</option>
                        <option value="catalogue">{{ i18n.t('explorer.contentCatalogue') }}</option>
                        <option value="matrix">{{ i18n.t('explorer.contentMatrix') }}</option>
                      </select>
                      <label class="visually-hidden" for="view-viewpoint">{{
                        i18n.t('explorer.viewpoint')
                      }}</label>
                      <select
                        id="view-viewpoint"
                        class="form-select form-select-sm"
                        [disabled]="store.readOnly() || !hasProjectFramework()"
                        [value]="store.activeViewpointId() ?? ''"
                        (change)="onViewpointChange($event)"
                      >
                        <option value="">{{ i18n.t('explorer.viewpointNone') }}</option>
                        @for (viewpoint of viewpoints(); track viewpoint.id) {
                          <option [value]="viewpoint.id">{{ viewpoint.name }}</option>
                        }
                      </select>
                      @if (store.activeViewpoint(); as viewpoint) {
                        <p class="small text-body-secondary mb-1 mt-2">{{ viewpoint.concern }}</p>
                        <p class="small text-body-secondary mb-1">
                          <span class="fw-semibold">{{ i18n.t('explorer.viewpointStakeholders') }}:</span>
                          {{ viewpoint.stakeholders.join(', ') }}
                        </p>
                        <p class="small text-body-secondary mb-0">{{ i18n.t('explorer.viewpointHint') }}</p>
                      }
                    </div>
                  </details>
                }

                @if (store.repository().length > 0) {
                  <details open class="mb-1">
                    <summary class="app-tree-summary">{{ i18n.t('explorer.repository') }}</summary>
                    <div class="px-2 pb-1">
                      <label class="visually-hidden" for="repo-search">{{ i18n.t('explorer.search') }}</label>
                      <input
                        id="repo-search"
                        type="search"
                        class="form-control form-control-sm"
                        [placeholder]="i18n.t('explorer.searchPlaceholder')"
                        [value]="query()"
                        (input)="onSearch($event)"
                      />
                    </div>
                    <div class="ps-2">
                      @for (layer of repository(); track layer.layer) {
                        <details open>
                          <summary class="app-tree-subsummary">{{ layer.layer }}</summary>
                          <div class="ps-2">
                            @for (item of layer.items; track item.elementKey) {
                              <div
                                cdkDrag
                                cdkDragPreviewClass="app-drag-preview"
                                [cdkDragData]="payload(item, layer)"
                                [cdkDragDisabled]="store.readOnly()"
                                class="app-drag-row d-flex align-items-center gap-2 px-2 py-1 rounded"
                                [title]="item.label"
                              >
                                <span class="flex-shrink-0" aria-hidden="true">{{ item.icon }}</span>
                                <span class="text-truncate">{{ item.label }}</span>
                                @if (item.occurrences > 0) {
                                  <span
                                    class="badge bg-body-secondary text-body-secondary ms-auto flex-shrink-0"
                                    [title]="usageTitle(item)"
                                    >{{ item.occurrences }}</span
                                  >
                                }
                              </div>
                            }
                          </div>
                        </details>
                      }
                      @if (repository().length === 0) {
                        <p class="small text-body-secondary px-2 py-1 mb-0">{{ i18n.t('explorer.noMatches') }}</p>
                      }
                    </div>
                  </details>
                }

                @for (group of store.layers(); track group.layer) {
                  <details open class="mb-1">
                    <summary class="app-tree-summary">
                      {{ group.layer }} {{ i18n.t('explorer.currentSuffix') }}
                    </summary>
                    <div class="list-group list-group-flush ps-2">
                      @for (shape of group.shapes; track shape.id) {
                        <button type="button" [class]="rowClass(shape.isActive)" (click)="diagram.selectByKey(shape.id)">
                          <span class="flex-shrink-0" aria-hidden="true">{{ shape.icon }}</span>
                          <span class="text-truncate">{{ shape.label }}</span>
                        </button>
                      }
                    </div>
                  </details>
                }

                @if (store.hasRelationships()) {
                  <details open class="mb-1">
                    <summary class="app-tree-summary">{{ i18n.t('explorer.relationships') }}</summary>
                    <div class="list-group list-group-flush ps-2">
                      @for (relationship of store.relationships(); track relationship.key) {
                        <button
                          type="button"
                          [class]="rowClass(relationship.isActive)"
                          [title]="relationship.sourceName + ' ' + i18n.t('explorer.to') + ' ' + relationship.targetName"
                          (click)="diagram.selectByKey(relationship.key)"
                        >
                          <span class="badge bg-body-secondary text-body-secondary text-uppercase flex-shrink-0">{{
                            relationship.type
                          }}</span>
                          <span class="text-truncate"
                            >{{ relationship.sourceName }} → {{ relationship.targetName }}</span
                          >
                        </button>
                      }
                    </div>
                  </details>
                }

                <app-plateau-planner />

                @if (store.isEmptyModel()) {
                  <p class="small text-body-secondary px-2 py-1 mb-0">{{ i18n.t('explorer.emptyModel') }}</p>
                }
              </div>
            </ng-template>
          </li>

          <li [ngbNavItem]="'properties'" domId="properties" class="flex-fill">
            <button type="button" ngbNavLink class="w-100 app-tab">{{ i18n.t('explorer.tabProperties') }}</button>
            <ng-template ngbNavContent>
              <div class="h-100 overflow-auto app-scroll app-panel-body">
                <app-properties-panel />
              </div>
            </ng-template>
          </li>

          <li [ngbNavItem]="'problems'" domId="problems" class="flex-fill">
            <button type="button" ngbNavLink class="w-100 app-tab">
              {{ i18n.t('explorer.tabProblems') }}
              @if (store.validationSummary().errors > 0) {
                <span class="badge text-bg-danger ms-1">{{ store.validationSummary().errors }}</span>
              }
            </button>
            <ng-template ngbNavContent>
              <div class="h-100 overflow-auto app-scroll app-panel-body">
                <app-validation-panel />
              </div>
            </ng-template>
          </li>
        </ul>
        <button
          type="button"
          class="btn-close d-lg-none align-self-center mx-2 flex-shrink-0"
          [attr.aria-label]="i18n.t('explorer.close')"
          (click)="store.toggleExplorer()"
        ></button>
      </div>

      <div class="flex-grow-1 overflow-hidden bg-body" [ngbNavOutlet]="nav"></div>
    </aside>
  `,
})
export class ExplorerSidebar {
  protected readonly store = inject(DiagramStore);
  protected readonly diagram = inject(DiagramCanvasService);
  protected readonly persistence = inject(DiagramPersistenceService);
  protected readonly i18n = inject(TranslationService);

  protected readonly query = signal('');

  /** Viewpoints offered for the open project's framework, always including ArchiMate's own. */
  protected readonly viewpoints = computed(() =>
    viewpointsForFramework(this.persistence.project()?.framework),
  );

  protected readonly hasProjectFramework = computed(() => this.persistence.project() !== null);

  protected onViewpointChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const viewId = this.store.activeViewId();
    this.diagram.setViewpoint(viewId, value === '' ? null : value);
  }

  protected onContentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const viewId = this.store.activeViewId();
    const contentType =
      value === 'catalogue' ? 'catalogue' : value === 'matrix' ? 'matrix' : 'diagram';
    this.diagram.setContentType(viewId, contentType);
  }

  /** Repository rows narrowed by {@link query}, matching name, type, domain or any property. */
  protected readonly repository = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.store.repository();
    return this.store
      .repository()
      .map((layer) => ({ ...layer, items: layer.items.filter((item) => this.matches(item, query)) }))
      .filter((layer) => layer.items.length > 0);
  });

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  private matches(item: RepositoryItem, query: string): boolean {
    if (item.label.toLowerCase().includes(query)) return true;
    const element = this.store.elementFor(item.elementKey);
    if (!element) return false;
    const haystack = [
      element.archimateType,
      element.domain,
      element.plateau,
      element.lifecycleState,
      element.referenceModel,
      element.refCode,
      element.owner,
      element.classification,
      ...Object.entries(element.properties).flat(),
    ];
    return haystack.some((value) => (value ?? '').toLowerCase().includes(query));
  }

  protected setSidebarTab(id: string | number): void {
    if (id === 'explorer' || id === 'properties' || id === 'problems') {
      this.store.setSidebarTab(id);
    }
  }

  protected rowClass(isActive: boolean): string {
    const base =
      'list-group-item list-group-item-action d-flex align-items-center gap-2 py-1 px-2 border-0 rounded app-tree-row';
    return isActive ? `${base} active` : base;
  }

  protected payload(item: RepositoryItem, layer: RepositoryLayer): DragPayload {
    return {
      label: item.label,
      color: item.color,
      icon: item.icon,
      layer: layer.layer,
      elementKey: item.elementKey,
    };
  }

  protected usageTitle(item: RepositoryItem): string {
    const occurrences = `${this.i18n.t('explorer.usageOccurrences')}: ${item.occurrences}`;
    const views = `${this.i18n.t('explorer.usageViews')}: ${item.viewCount}`;
    return `${occurrences} · ${views}`;
  }
}
