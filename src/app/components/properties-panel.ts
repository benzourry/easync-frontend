import { Component, computed, inject } from '@angular/core';
import { RELATIONSHIP_OPTIONS } from '../models/archimate.models';
import type { RelationshipType } from '../models/archimate.models';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';

@Component({
  selector: 'app-properties-panel',
  template: `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-slate-200">Properties</h2>
    </div>

    @if (selection().kind === 'none') {
      <p class="text-xs text-gray-400 dark:text-slate-500">Select an element to view properties</p>
    } @else {
      <div class="space-y-4">
        <div>
          <label for="prop-name" class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
            >Name</label
          >
          <input
            id="prop-name"
            type="text"
            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            [value]="selection().name"
            (change)="onName($event)"
          />
        </div>

        @if (selection().kind === 'shape') {
          @if (selection().availableParentGroups.length > 0) {
            <div>
              <label
                for="prop-parent-group"
                class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
                >Parent Group</label
              >
              <select
                id="prop-parent-group"
                class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                [value]="selection().parentId"
                (change)="onParent($event)"
              >
                <option value="">None</option>
                @for (group of selection().availableParentGroups; track group.id) {
                  <option [value]="group.id">{{ group.name }}</option>
                }
              </select>
            </div>
          }

          <div>
            <label for="prop-link" class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
              >Link to View</label
            >
            <select
              id="prop-link"
              class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              [value]="selection().linkedView"
              (change)="onLink($event)"
            >
              <option value="">None</option>
              @for (view of selection().availableLinkedViews; track view.id) {
                <option [value]="view.id">{{ view.name }}</option>
              }
            </select>
          </div>

          <div>
            <label for="prop-color" class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
              >Color</label
            >
            <div class="flex gap-2">
              <input
                id="prop-color"
                type="color"
                class="h-8 w-12 p-0 border border-gray-300 dark:border-slate-600 rounded cursor-pointer bg-white dark:bg-slate-700"
                [value]="selection().color"
                (change)="onColor($event)"
              />
              <button
                type="button"
                class="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                (click)="diagram.resetColor()"
              >
                Reset
              </button>
            </div>
          </div>
        }

        @if (selection().kind === 'connection') {
          <div>
            <label for="prop-type" class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
              >Relationship Type</label
            >
            <select
              id="prop-type"
              class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              [value]="selection().connType"
              (change)="onType($event)"
            >
              @for (option of relationshipOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
        }

        <div>
          <label for="prop-doc" class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
            >Documentation</label
          >
          <textarea
            id="prop-doc"
            rows="3"
            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            [value]="selection().doc"
            (change)="onDoc($event)"
          ></textarea>
        </div>

        @if (selection().kind === 'connection') {
          <div>
            <span class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Bendpoints</span>
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                (click)="diagram.addBendpoint()"
              >
                Add Bend
              </button>
              <button
                type="button"
                class="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                (click)="diagram.clearBendpointsAction()"
              >
                Clear Bends
              </button>
            </div>
            <p class="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
              Double-click a line to add a bendpoint, double-click a dot to remove it.
            </p>
          </div>
        }

        @if (selection().kind === 'shape' && selection().canCollapse) {
          <div>
            <button
              type="button"
              class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              (click)="diagram.toggleCollapseExpand()"
            >
              {{ selection().isCollapsed ? 'Expand Contents' : 'Collapse Contents' }}
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class PropertiesPanel {
  protected readonly store = inject(DiagramStore);
  protected readonly diagram = inject(DiagramCanvasService);

  protected readonly relationshipOptions = RELATIONSHIP_OPTIONS;
  protected readonly selection = computed(() => this.store.selection());

  protected onName(event: Event): void {
    this.diagram.updateProperty('name', (event.target as HTMLInputElement).value);
  }

  protected onParent(event: Event): void {
    this.diagram.updateProperty('parent', (event.target as HTMLSelectElement).value);
  }

  protected onLink(event: Event): void {
    this.diagram.updateProperty('link', (event.target as HTMLSelectElement).value);
  }

  protected onColor(event: Event): void {
    this.diagram.updateProperty('color', (event.target as HTMLInputElement).value);
  }

  protected onType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as RelationshipType;
    this.diagram.updateProperty('type', value);
  }

  protected onDoc(event: Event): void {
    this.diagram.updateProperty('doc', (event.target as HTMLTextAreaElement).value);
  }
}
