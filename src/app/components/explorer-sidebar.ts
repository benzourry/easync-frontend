import { Component, computed, inject } from '@angular/core';
import type { RepositoryLayer, SidebarTab } from '../models/diagram.models';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';
import { PropertiesPanel } from './properties-panel';

type RepositoryItem = RepositoryLayer['items'][number];

@Component({
  selector: 'app-explorer-sidebar',
  imports: [PropertiesPanel],
  template: `
    <aside [class]="asideClass()">
      <div
        class="flex items-center border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 shrink-0"
      >
        <button
          type="button"
          [class]="tabClass('explorer')"
          [attr.aria-selected]="store.sidebarTab() === 'explorer'"
          (click)="store.setSidebarTab('explorer')"
        >
          Explorer
        </button>
        <button
          type="button"
          [class]="tabClass('properties')"
          [attr.aria-selected]="store.sidebarTab() === 'properties'"
          (click)="store.setSidebarTab('properties')"
        >
          Properties
        </button>
        <button
          type="button"
          class="md:hidden px-3 text-gray-500 hover:text-gray-800 dark:hover:text-white"
          aria-label="Close explorer panel"
          (click)="store.toggleExplorer()"
        >
          ✕
        </button>
      </div>

      <div class="flex-1 relative overflow-hidden">
        <div
          class="absolute inset-0 overflow-y-auto custom-scrollbar p-2"
          [class.hidden]="store.sidebarTab() !== 'explorer'"
        >
          <details open class="mb-2">
            <summary
              class="p-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
            >
              Diagrams (Views)
            </summary>
            <div class="pl-2 mt-1 space-y-1">
              @for (view of store.views(); track view.id) {
                <button type="button" [class]="rowClass(view.isActive)" (click)="diagram.selectView(view.id)">
                  <span aria-hidden="true">🖼️</span>
                  <span class="truncate">{{ view.name }}</span>
                </button>
              }
              <button
                type="button"
                class="w-full mt-1 py-1.5 text-xs border border-dashed border-green-500 text-green-600 dark:text-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                (click)="store.newViewDialogOpen.set(true)"
              >
                + New View
              </button>
            </div>
          </details>

          @if (store.repository().length > 0) {
            <details class="mb-2">
              <summary
                class="p-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                Global Repository
              </summary>
              <div class="pl-2 mt-1 space-y-1">
                @for (layer of store.repository(); track layer.layer) {
                  <details>
                    <summary
                      class="text-xs font-medium text-gray-600 dark:text-slate-300 cursor-pointer px-1 py-0.5"
                    >
                      {{ layer.layer }}
                    </summary>
                    <div class="pl-2 space-y-0.5">
                      @for (item of layer.items; track item.id) {
                        <div
                          draggable="true"
                          class="flex items-center gap-2 px-2 py-1 text-xs rounded border border-transparent hover:border-gray-300 dark:hover:border-slate-600 cursor-grab active:cursor-grabbing text-gray-700 dark:text-slate-300"
                          [title]="item.label"
                          (dragstart)="onRepositoryDrag($event, item, layer)"
                        >
                          <span class="shrink-0" aria-hidden="true">{{ item.icon }}</span>
                          <span class="truncate">{{ item.label }}</span>
                        </div>
                      }
                    </div>
                  </details>
                }
              </div>
            </details>
          }

          @for (group of store.layers(); track group.layer) {
            <details open class="mb-2">
              <summary
                class="p-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                {{ group.layer }} (Current)
              </summary>
              <div class="pl-2 mt-1 space-y-1">
                @for (shape of group.shapes; track shape.id) {
                  <button type="button" [class]="rowClass(shape.isActive)" (click)="diagram.selectByKey(shape.id)">
                    <span class="shrink-0" aria-hidden="true">{{ shape.icon }}</span>
                    <span class="truncate">{{ shape.label }}</span>
                  </button>
                }
              </div>
            </details>
          }

          @if (store.hasRelationships()) {
            <details open class="mb-2">
              <summary
                class="p-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                Relationships
              </summary>
              <div class="pl-2 mt-1 space-y-1">
                @for (relationship of store.relationships(); track relationship.key) {
                  <button
                    type="button"
                    [class]="rowClass(relationship.isActive)"
                    [title]="relationship.sourceName + ' to ' + relationship.targetName"
                    (click)="diagram.selectByKey(relationship.key)"
                  >
                    <span class="text-[10px] font-bold uppercase shrink-0 text-gray-400 dark:text-slate-500">{{
                      relationship.type
                    }}</span>
                    <span class="truncate">{{ relationship.sourceName }} → {{ relationship.targetName }}</span>
                  </button>
                }
              </div>
            </details>
          }

          @if (store.isEmptyModel()) {
            <p class="text-xs text-gray-400 dark:text-slate-500 p-2">Model is empty</p>
          }
        </div>

        <div
          class="absolute inset-0 overflow-y-auto custom-scrollbar p-4 bg-white dark:bg-slate-800"
          [class.hidden]="store.sidebarTab() !== 'properties'"
        >
          <app-properties-panel />
        </div>
      </div>
    </aside>
  `,
})
export class ExplorerSidebar {
  protected readonly store = inject(DiagramStore);
  protected readonly diagram = inject(DiagramCanvasService);

  protected readonly asideClass = computed(
    () =>
      `w-72 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex flex-col h-full z-50 shadow-[-4px_0_15px_rgba(0,0,0,0.03)] shrink-0 absolute right-0 md:relative transform transition-transform duration-300 md:translate-x-0 ${
        this.store.explorerOpen() ? 'translate-x-0' : 'translate-x-full'
      }`,
  );

  protected tabClass(tab: SidebarTab): string {
    const base =
      'flex-1 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors';
    return this.store.sidebarTab() === tab
      ? `${base} border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-white dark:bg-slate-800`
      : `${base} border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200`;
  }

  protected rowClass(isActive: boolean): string {
    const base =
      'w-full flex items-center gap-2 px-2 py-1 text-left text-xs rounded border border-transparent text-gray-700 dark:text-slate-300';
    return isActive
      ? `${base} bg-blue-50 dark:bg-slate-700 border-blue-200 dark:border-slate-600 text-blue-700 dark:text-blue-300`
      : `${base} hover:bg-gray-50 dark:hover:bg-slate-700`;
  }

  protected onRepositoryDrag(event: DragEvent, item: RepositoryItem, layer: RepositoryLayer): void {
    event.dataTransfer?.setData(
      'application/x-archimate',
      JSON.stringify({
        label: item.label,
        color: item.color,
        icon: item.icon,
        layer: layer.layer,
        archimateId: item.id,
      }),
    );
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }
}
