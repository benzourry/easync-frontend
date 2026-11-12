import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, inject } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap/nav';
import type { RepositoryLayer } from '../models/diagram.models';
import { DiagramCanvasService, type DragPayload } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';
import { PropertiesPanel } from './properties-panel';

type RepositoryItem = RepositoryLayer['items'][number];

@Component({
  selector: 'app-explorer-sidebar',
  imports: [PropertiesPanel, DragDropModule, NgbNavModule],
  template: `
    <aside
      id="explorer-sidebar"
      class="app-sidebar app-sidebar-end offcanvas-md offcanvas-end d-flex flex-column border-start"
      [class.show]="store.explorerOpen()"
      aria-label="Explorer and properties"
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
            <button type="button" ngbNavLink class="w-100 app-tab">Explorer</button>
            <ng-template ngbNavContent>
              <div
                class="h-100 overflow-auto app-scroll p-2"
                cdkDropList
                cdkDropListSortingDisabled
                cdkDropListAutoScrollDisabled
              >
                <details open class="mb-1">
                  <summary class="app-tree-summary">Diagrams (Views)</summary>
                  <div class="list-group list-group-flush ps-2">
                    @for (view of store.views(); track view.id) {
                      <button type="button" [class]="rowClass(view.isActive)" (click)="diagram.selectView(view.id)">
                        <span class="flex-shrink-0" aria-hidden="true">🖼️</span>
                        <span class="text-truncate">{{ view.name }}</span>
                      </button>
                    }
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-success border-dashed w-100 mt-1"
                      (click)="store.newViewDialogOpen.set(true)"
                    >
                      + New View
                    </button>
                  </div>
                </details>

                @if (store.repository().length > 0) {
                  <details open class="mb-1">
                    <summary class="app-tree-summary">Global Repository</summary>
                    <div class="ps-2">
                      @for (layer of store.repository(); track layer.layer) {
                        <details open>
                          <summary class="app-tree-subsummary">{{ layer.layer }}</summary>
                          <div class="ps-2">
                            @for (item of layer.items; track item.id) {
                              <div
                                cdkDrag
                                cdkDragPreviewClass="app-drag-preview"
                                [cdkDragData]="payload(item, layer)"
                                class="app-drag-row d-flex align-items-center gap-2 px-2 py-1 rounded"
                                [title]="item.label"
                              >
                                <span class="flex-shrink-0" aria-hidden="true">{{ item.icon }}</span>
                                <span class="text-truncate">{{ item.label }}</span>
                              </div>
                            }
                          </div>
                        </details>
                      }
                    </div>
                  </details>
                }

                @for (group of store.layers(); track group.layer) {
                  <details open class="mb-1">
                    <summary class="app-tree-summary">{{ group.layer }} (Current)</summary>
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
                    <summary class="app-tree-summary">Relationships</summary>
                    <div class="list-group list-group-flush ps-2">
                      @for (relationship of store.relationships(); track relationship.key) {
                        <button
                          type="button"
                          [class]="rowClass(relationship.isActive)"
                          [title]="relationship.sourceName + ' to ' + relationship.targetName"
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

                @if (store.isEmptyModel()) {
                  <p class="small text-body-secondary px-2 py-1 mb-0">Model is empty</p>
                }
              </div>
            </ng-template>
          </li>

          <li [ngbNavItem]="'properties'" domId="properties" class="flex-fill">
            <button type="button" ngbNavLink class="w-100 app-tab">Properties</button>
            <ng-template ngbNavContent>
              <div class="h-100 overflow-auto app-scroll p-3">
                <app-properties-panel />
              </div>
            </ng-template>
          </li>
        </ul>
        <button
          type="button"
          class="btn-close d-md-none align-self-center mx-2 flex-shrink-0"
          aria-label="Close explorer panel"
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

  protected setSidebarTab(id: string | number): void {
    if (id === 'explorer' || id === 'properties') this.store.setSidebarTab(id);
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
      archimateId: item.id,
    };
  }
}
