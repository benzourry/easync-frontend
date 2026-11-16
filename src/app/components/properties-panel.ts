import { Component, computed, inject } from '@angular/core';
import { RELATIONSHIP_OPTIONS } from '../models/archimate.models';
import type { RelationshipType } from '../models/archimate.models';
import {
  LIFECYCLE_OPTIONS,
  PLATEAU_OPTIONS,
  TYPE_OPTIONS,
  asLifecycleState,
  asPlateau,
} from '../models/model.models';
import type { ModelElement } from '../models/model.models';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';
import { TranslationService } from '../services/translation.service';

/** Element fields edited through a plain text input, mapped to the field name they write. */
type ElementTextField = 'domain' | 'owner' | 'classification' | 'referenceModel' | 'refCode';

@Component({
  selector: 'app-properties-panel',
  template: `
    @if (selection().kind === 'none') {
      <p class="small text-body-secondary mb-0">{{ i18n.t('props.empty') }}</p>
    } @else {
      <div class="d-flex flex-column gap-3">
        @if (store.readOnly()) {
          <p class="form-text mb-0">{{ i18n.t('props.readOnly') }}</p>
        }

        @if (selection().kind !== 'connection' || !store.readOnly()) {
          <div>
            <label for="prop-name" class="form-label small mb-1">{{ i18n.t('props.name') }}</label>
            <input
              id="prop-name"
              type="text"
              class="form-control form-control-sm"
              [value]="selection().name"
              [readonly]="store.readOnly()"
              (change)="onName($event)"
            />
          </div>
        }

        @if (selection().kind === 'shape') {
          @if (element(); as el) {
            <fieldset class="border rounded px-2 pb-2 pt-1">
              <legend class="float-none w-auto px-1 fs-6 mb-1">{{ i18n.t('props.elementTitle') }}</legend>
              <p class="form-text mt-0 mb-2">{{ i18n.t('props.elementHint') }}</p>
              <div class="d-flex flex-column gap-2">
                <div>
                  <label for="prop-element-type" class="form-label small mb-1">{{ i18n.t('props.elementType') }}</label>
                  <select
                    id="prop-element-type"
                    class="form-select form-select-sm"
                    [value]="el.archimateType"
                    [disabled]="store.readOnly()"
                    (change)="onElementType($event)"
                  >
                    @for (group of typeOptions; track group.layer) {
                      <optgroup [label]="group.layer">
                        @for (type of group.types; track type) {
                          <option [value]="type">{{ type }}</option>
                        }
                      </optgroup>
                    }
                  </select>
                </div>

                <div>
                  <label for="prop-element-domain" class="form-label small mb-1">{{ i18n.t('props.elementDomain') }}</label>
                  <input
                    id="prop-element-domain"
                    type="text"
                    class="form-control form-control-sm"
                    [value]="el.domain ?? ''"
                    [readonly]="store.readOnly()"
                    (change)="onElementText('domain', $event)"
                  />
                  <p class="form-text mb-0">{{ i18n.t('props.elementDomainHint') }}</p>
                </div>

                <div>
                  <label for="prop-element-plateau" class="form-label small mb-1">{{ i18n.t('props.elementPlateau') }}</label>
                  <select
                    id="prop-element-plateau"
                    class="form-select form-select-sm"
                    [value]="el.plateau ?? ''"
                    [disabled]="store.readOnly()"
                    (change)="onElementPlateau($event)"
                  >
                    <option value="">{{ i18n.t('props.unset') }}</option>
                    @for (option of plateauOptions; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="prop-element-lifecycle" class="form-label small mb-1">{{ i18n.t('props.elementLifecycle') }}</label>
                  <select
                    id="prop-element-lifecycle"
                    class="form-select form-select-sm"
                    [value]="el.lifecycleState ?? ''"
                    [disabled]="store.readOnly()"
                    (change)="onElementLifecycle($event)"
                  >
                    <option value="">{{ i18n.t('props.unset') }}</option>
                    @for (option of lifecycleOptions; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="prop-element-owner" class="form-label small mb-1">{{ i18n.t('props.elementOwner') }}</label>
                  <input
                    id="prop-element-owner"
                    type="text"
                    class="form-control form-control-sm"
                    [value]="el.owner ?? ''"
                    [readonly]="store.readOnly()"
                    (change)="onElementText('owner', $event)"
                  />
                </div>

                <div>
                  <label for="prop-element-classification" class="form-label small mb-1">{{ i18n.t('props.elementClassification') }}</label>
                  <input
                    id="prop-element-classification"
                    type="text"
                    class="form-control form-control-sm"
                    [value]="el.classification ?? ''"
                    [readonly]="store.readOnly()"
                    (change)="onElementText('classification', $event)"
                  />
                </div>

                <div class="row g-2">
                  <div class="col-6">
                    <label for="prop-element-refmodel" class="form-label small mb-1">{{ i18n.t('props.elementReferenceModel') }}</label>
                    <input
                      id="prop-element-refmodel"
                      type="text"
                      class="form-control form-control-sm"
                      [value]="el.referenceModel ?? ''"
                      [readonly]="store.readOnly()"
                      (change)="onElementText('referenceModel', $event)"
                    />
                  </div>
                  <div class="col-6">
                    <label for="prop-element-refcode" class="form-label small mb-1">{{ i18n.t('props.elementRefCode') }}</label>
                    <input
                      id="prop-element-refcode"
                      type="text"
                      class="form-control form-control-sm"
                      [value]="el.refCode ?? ''"
                      [readonly]="store.readOnly()"
                      (change)="onElementText('refCode', $event)"
                    />
                  </div>
                </div>

                <div>
                  <span class="form-label small mb-1 d-block">{{ i18n.t('props.elementProperties') }}</span>
                  @for (property of elementProperties(); track property.key) {
                    <div class="d-flex gap-1 mb-1">
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        [attr.aria-label]="i18n.t('props.propertyKey')"
                        [value]="property.key"
                        [readonly]="store.readOnly()"
                        (change)="onPropertyKey(property.key, $event)"
                      />
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        [attr.aria-label]="i18n.t('props.propertyValue')"
                        [value]="property.value"
                        [readonly]="store.readOnly()"
                        (change)="onPropertyValue(property.key, $event)"
                      />
                      @if (!store.readOnly()) {
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-secondary"
                          [attr.aria-label]="i18n.t('props.removeProperty')"
                          (click)="removeProperty(property.key)"
                        >
                          &times;
                        </button>
                      }
                    </div>
                  }
                  @if (!store.readOnly()) {
                    <button type="button" class="btn btn-sm btn-outline-secondary w-100" (click)="addProperty()">
                      {{ i18n.t('props.addProperty') }}
                    </button>
                  }
                </div>
              </div>
            </fieldset>
          }

          @if (selection().availableParentGroups.length > 0) {
            <div>
              <label for="prop-parent-group" class="form-label small mb-1">{{ i18n.t('props.parentGroup') }}</label>
              <select
                id="prop-parent-group"
                class="form-select form-select-sm"
                [value]="selection().parentId"
                [disabled]="store.readOnly()"
                (change)="onParent($event)"
              >
                <option value="">{{ i18n.t('props.none') }}</option>
                @for (group of selection().availableParentGroups; track group.id) {
                  <option [value]="group.id">{{ group.name }}</option>
                }
              </select>
            </div>
          }

          <div>
            <label for="prop-link" class="form-label small mb-1">{{ i18n.t('props.linkToView') }}</label>
            <select
              id="prop-link"
              class="form-select form-select-sm"
              [value]="selection().linkedView"
              [disabled]="store.readOnly()"
              (change)="onLink($event)"
            >
              <option value="">None</option>
              @for (view of selection().availableLinkedViews; track view.id) {
                <option [value]="view.id">{{ view.name }}</option>
              }
            </select>
          </div>

          <div>
            <label for="prop-color" class="form-label small mb-1">{{ i18n.t('props.color') }}</label>
            <div class="d-flex align-items-center gap-2">
              <input
                id="prop-color"
                type="color"
                class="form-control form-control-color form-control-sm"
                [value]="selection().color"
                [disabled]="store.readOnly()"
                (change)="onColor($event)"
              />
              @if (!store.readOnly()) {
                <button type="button" class="btn btn-sm btn-outline-secondary" (click)="diagram.resetColor()">
                  {{ i18n.t('props.reset') }}
                </button>
              }
            </div>
          </div>
        }

        @if (selection().kind === 'connection') {
          <div>
            <label for="prop-type" class="form-label small mb-1">{{ i18n.t('props.relationshipType') }}</label>
            <select
              id="prop-type"
              class="form-select form-select-sm"
              [value]="selection().connType"
              [disabled]="store.readOnly()"
              (change)="onType($event)"
            >
              @for (option of relationshipOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
        }

        <div>
          <label for="prop-doc" class="form-label small mb-1">{{ i18n.t('props.documentation') }}</label>
          <textarea
            id="prop-doc"
            rows="3"
            class="form-control form-control-sm"
            [value]="selection().doc"
            [readonly]="store.readOnly()"
            (change)="onDoc($event)"
          ></textarea>
        </div>

        @if (selection().kind === 'connection' && !store.readOnly()) {
          <div>
            <span class="form-label small mb-1 d-block">{{ i18n.t('props.bendpoints') }}</span>
            <div class="d-flex gap-2">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary flex-fill"
                (click)="diagram.addBendpoint()"
              >
                {{ i18n.t('props.addBend') }}
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary flex-fill"
                (click)="diagram.clearBendpointsAction()"
              >
                {{ i18n.t('props.clearBends') }}
              </button>
            </div>
            <p class="form-text mb-0">
              {{ i18n.t('props.bendHint') }}
            </p>
          </div>
        }

        @if (selection().kind === 'shape' && selection().canCollapse && !store.readOnly()) {
          <div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary w-100"
              (click)="diagram.toggleCollapseExpand()"
            >
              {{ selection().isCollapsed ? i18n.t('props.expandContents') : i18n.t('props.collapseContents') }}
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
  protected readonly i18n = inject(TranslationService);

  protected readonly relationshipOptions = RELATIONSHIP_OPTIONS;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly plateauOptions = PLATEAU_OPTIONS;
  protected readonly lifecycleOptions = LIFECYCLE_OPTIONS;
  protected readonly selection = computed(() => this.store.selection());

  /** The element behind the selected shape, or `null` for an unmodelled or empty selection. */
  protected readonly element = computed<ModelElement | null>(
    () => this.store.elementFor(this.selection().elementKey) ?? null,
  );

  protected readonly elementProperties = computed(() =>
    Object.entries(this.element()?.properties ?? {}).map(([key, value]) => ({ key, value })),
  );

  protected onElementType(event: Event): void {
    this.patchElement({ archimateType: (event.target as HTMLSelectElement).value });
  }

  protected onElementText(field: ElementTextField, event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.patchElement({ [field]: value || null });
  }

  protected onElementPlateau(event: Event): void {
    this.patchElement({ plateau: asPlateau((event.target as HTMLSelectElement).value) });
  }

  protected onElementLifecycle(event: Event): void {
    this.patchElement({ lifecycleState: asLifecycleState((event.target as HTMLSelectElement).value) });
  }

  protected onPropertyKey(previous: string, event: Event): void {
    const next = (event.target as HTMLInputElement).value.trim();
    if (!next || next === previous) return;
    const entries = this.elementProperties().map((entry) =>
      entry.key === previous ? { key: next, value: entry.value } : entry,
    );
    this.writeProperties(entries);
  }

  protected onPropertyValue(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const entries = this.elementProperties().map((entry) =>
      entry.key === key ? { key, value } : entry,
    );
    this.writeProperties(entries);
  }

  protected addProperty(): void {
    const entries = this.elementProperties();
    let index = entries.length + 1;
    while (entries.some((entry) => entry.key === `property ${index}`)) index++;
    this.writeProperties([...entries, { key: `property ${index}`, value: '' }]);
  }

  protected removeProperty(key: string): void {
    this.writeProperties(this.elementProperties().filter((entry) => entry.key !== key));
  }

  private writeProperties(entries: { key: string; value: string }[]): void {
    const properties: Record<string, string> = {};
    for (const entry of entries) properties[entry.key] = entry.value;
    this.patchElement({ properties });
  }

  private patchElement(change: Partial<Omit<ModelElement, 'key'>>): void {
    this.diagram.updateElement(change);
  }

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
