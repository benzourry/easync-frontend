import { Component, computed, inject } from '@angular/core';
import { RELATIONSHIP_OPTIONS } from '../models/archimate.models';
import type { RelationshipType } from '../models/archimate.models';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';

@Component({
  selector: 'app-properties-panel',
  template: `
    <h2 class="h6 mb-3">Properties</h2>

    @if (selection().kind === 'none') {
      <p class="small text-body-secondary mb-0">Select an element to view properties</p>
    } @else {
      <div class="d-flex flex-column gap-3">
        <div>
          <label for="prop-name" class="form-label small mb-1">Name</label>
          <input
            id="prop-name"
            type="text"
            class="form-control form-control-sm"
            [value]="selection().name"
            (change)="onName($event)"
          />
        </div>

        @if (selection().kind === 'shape') {
          @if (selection().availableParentGroups.length > 0) {
            <div>
              <label for="prop-parent-group" class="form-label small mb-1">Parent Group</label>
              <select
                id="prop-parent-group"
                class="form-select form-select-sm"
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
            <label for="prop-link" class="form-label small mb-1">Link to View</label>
            <select
              id="prop-link"
              class="form-select form-select-sm"
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
            <label for="prop-color" class="form-label small mb-1">Color</label>
            <div class="d-flex align-items-center gap-2">
              <input
                id="prop-color"
                type="color"
                class="form-control form-control-color form-control-sm"
                [value]="selection().color"
                (change)="onColor($event)"
              />
              <button type="button" class="btn btn-sm btn-outline-secondary" (click)="diagram.resetColor()">
                Reset
              </button>
            </div>
          </div>
        }

        @if (selection().kind === 'connection') {
          <div>
            <label for="prop-type" class="form-label small mb-1">Relationship Type</label>
            <select
              id="prop-type"
              class="form-select form-select-sm"
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
          <label for="prop-doc" class="form-label small mb-1">Documentation</label>
          <textarea
            id="prop-doc"
            rows="3"
            class="form-control form-control-sm"
            [value]="selection().doc"
            (change)="onDoc($event)"
          ></textarea>
        </div>

        @if (selection().kind === 'connection') {
          <div>
            <span class="form-label small mb-1 d-block">Bendpoints</span>
            <div class="d-flex gap-2">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary flex-fill"
                (click)="diagram.addBendpoint()"
              >
                Add Bend
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary flex-fill"
                (click)="diagram.clearBendpointsAction()"
              >
                Clear Bends
              </button>
            </div>
            <p class="form-text mb-0">
              Double-click a line to add a bendpoint, double-click a dot to remove it.
            </p>
          </div>
        }

        @if (selection().kind === 'shape' && selection().canCollapse) {
          <div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary w-100"
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
