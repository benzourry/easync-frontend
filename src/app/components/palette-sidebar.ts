import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap/accordion';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap/dropdown';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap/nav';
import { PALETTE_CATEGORIES, RELATIONSHIP_OPTIONS } from '../models/archimate.models';
import type { PaletteItem, RelationshipType } from '../models/archimate.models';
import type { AiProviderSettings } from '../models/ai.models';
import { AiDiagramService } from '../services/ai-diagram.service';
import { DiagramCanvasService, type DragPayload } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';

type PaletteTab = 'elements' | 'ai';

@Component({
  selector: 'app-palette-sidebar',
  imports: [DragDropModule, NgbAccordionModule, NgbDropdownModule, NgbNavModule],
  template: `
    <aside
      id="elements-palette"
      class="app-sidebar offcanvas-md offcanvas-start d-flex flex-column border-end"
      [class.show]="store.paletteOpen()"
      aria-label="Elements palette"
    >
      <div
        class="d-flex align-items-center justify-content-between gap-2 px-3 py-2 border-bottom bg-body-tertiary flex-shrink-0"
      >
        <h2 class="h6 mb-0">Elements Palette</h2>
        <button
          type="button"
          class="btn-close d-md-none flex-shrink-0"
          aria-label="Close elements palette"
          (click)="store.togglePalette()"
        ></button>
      </div>

      <div class="border-bottom bg-body-tertiary flex-shrink-0">
        <ul
          #nav="ngbNav"
          ngbNav
          class="nav-tabs border-0"
          [activeId]="tab()"
          (activeIdChange)="setTab($event)"
          [destroyOnHide]="false"
        >
          <li [ngbNavItem]="'elements'" domId="elements" class="flex-fill">
            <button type="button" ngbNavLink class="w-100 app-tab">Elements</button>
            <ng-template ngbNavContent>
              <div
                class="h-100 overflow-auto app-scroll px-3 py-3"
                cdkDropList
                cdkDropListSortingDisabled
                cdkDropListAutoScrollDisabled
              >
                <div
                  class="btn-group w-100 dropdown"
                  ngbDropdown
                  placement="bottom-end"
                  role="group"
                  aria-label="Connection tool"
                >
                  <button
                    type="button"
                    [class]="connectClass()"
                    [attr.aria-pressed]="store.connectionMode()"
                    title="Toggle connection mode"
                    (click)="diagram.toggleConnectionMode()"
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
                      <path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7" />
                      <path d="M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7" />
                    </svg>
                    <span>{{ store.connectionMode() ? 'Connecting' : 'Connect' }}</span>
                  </button>
                  <button
                    type="button"
                    [class]="typeToggleClass()"
                    ngbDropdownToggle
                    [attr.aria-label]="'Relationship type: ' + typeLabel() + '. Change type'"
                    [title]="'Relationship type: ' + typeLabel()"
                  >
                    {{ typeLabel() }}
                  </button>
                  <div class="app-relationship-menu" ngbDropdownMenu role="menu">
                    @for (option of relationshipOptions; track option.value) {
                      <button
                        type="button"
                        ngbDropdownItem
                        role="menuitemradio"
                        [attr.aria-checked]="option.value === store.connectionType()"
                        [class.active]="option.value === store.connectionType()"
                        (click)="selectType(option.value)"
                      >
                        <span class="flex-grow-1 text-start">{{ option.label }}</span>
                        @if (option.value === store.connectionType()) {
                          <span class="ms-2" aria-hidden="true">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>

                <div
                  ngbAccordion
                  class="app-palette-accordion accordion-flush"
                  [closeOthers]="false"
                  [destroyOnHide]="false"
                >
                  @for (category of categories; track category.title; let index = $index) {
                    <div ngbAccordionItem [collapsed]="index !== 0">
                      <h3 ngbAccordionHeader>
                        <button type="button" ngbAccordionButton class="app-accordion-button">
                          <span
                            class="d-inline-block rounded-circle border app-color-dot"
                            [style.background-color]="category.dotColor"
                            aria-hidden="true"
                          ></span>
                          <span class="flex-grow-1 text-start">{{ category.title }}</span>
                          <span class="badge rounded-pill text-bg-light app-accordion-count">
                            {{ category.items.length }}
                          </span>
                        </button>
                      </h3>
                      <div ngbAccordionCollapse>
                        <div ngbAccordionBody>
                          <ng-template>
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
                                  <span class="fs-5 lh-1 opacity-75" aria-hidden="true">{{
                                    item.icon
                                  }}</span>
                                  <span class="app-palette-label">{{ item.displayLabel }}</span>
                                </button>
                              }
                            </div>
                          </ng-template>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </ng-template>
          </li>

          <li [ngbNavItem]="'ai'" domId="ai" class="flex-fill">
            <button type="button" ngbNavLink class="w-100 app-tab">AI Assistant</button>
            <ng-template ngbNavContent>
              <div class="h-100 overflow-auto app-scroll px-3 py-3">
                <label class="form-label small mb-1" for="ai-prompt">Describe your diagram</label>
                <textarea
                  id="ai-prompt"
                  class="form-control form-control-sm mb-2"
                  rows="3"
                  [value]="prompt()"
                  aria-describedby="ai-prompt-hint"
                  placeholder="e.g. A customer ordering process with a web portal, API and database"
                  (input)="onPromptInput($event)"
                  (keydown)="onPromptKeydown($event)"
                ></textarea>
                <p id="ai-prompt-hint" class="form-text small mt-0 mb-2">
                  The assistant proposes changes; nothing is applied until you confirm. Press
                  Ctrl+Enter to send.
                </p>

                <div class="d-flex gap-2">
                  <button
                    type="button"
                    class="btn btn-sm btn-primary flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                    [disabled]="ai.busy() || !prompt().trim()"
                    (click)="generate()"
                  >
                    @if (ai.busy()) {
                      <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    }
                    {{ ai.busy() ? 'Thinking…' : 'Preview changes' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary flex-shrink-0"
                    [attr.aria-expanded]="settingsOpen()"
                    aria-controls="ai-settings"
                    (click)="toggleSettings()"
                  >
                    Settings
                  </button>
                </div>

                @if (settingsOpen()) {
                  <div id="ai-settings" class="border rounded-2 p-2 mt-2 bg-body-tertiary">
                    <div class="mb-2">
                      <label class="form-label small mb-1" for="ai-base-url">API base URL</label>
                      <input
                        id="ai-base-url"
                        type="url"
                        class="form-control form-control-sm"
                        [value]="ai.settings().baseUrl"
                        placeholder="https://api.openai.com/v1"
                        (input)="onSettingInput('baseUrl', $event)"
                      />
                    </div>
                    <div class="mb-2">
                      <label class="form-label small mb-1" for="ai-model">Model</label>
                      <input
                        id="ai-model"
                        type="text"
                        class="form-control form-control-sm"
                        [value]="ai.settings().model"
                        placeholder="gpt-4o-mini"
                        (input)="onSettingInput('model', $event)"
                      />
                    </div>
                    <div>
                      <label class="form-label small mb-1" for="ai-api-key">API key</label>
                      <input
                        id="ai-api-key"
                        type="password"
                        class="form-control form-control-sm"
                        autocomplete="off"
                        [value]="ai.settings().apiKey"
                        (input)="onSettingInput('apiKey', $event)"
                      />
                      <p class="form-text small mb-0">
                        Any OpenAI-compatible endpoint (OpenAI, Azure, OpenRouter, Ollama, LM
                        Studio). Stored in this browser only.
                      </p>
                    </div>
                  </div>
                }

                @if (ai.error(); as message) {
                  <div
                    class="alert alert-danger py-2 px-2 small mt-2 mb-0 d-flex align-items-start gap-2"
                    role="alert"
                  >
                    <span class="flex-grow-1">{{ message }}</span>
                    <button
                      type="button"
                      class="btn-close flex-shrink-0"
                      aria-label="Dismiss error"
                      (click)="ai.clearError()"
                    ></button>
                  </div>
                }

                @if (ai.plan(); as plan) {
                  <div class="border rounded-2 p-2 mt-2" aria-live="polite">
                    <p class="small fw-semibold mb-1">{{ plan.summary }}</p>
                    <ul class="small mb-2 ps-3">
                      @for (line of ai.preview(); track $index) {
                        <li>{{ line }}</li>
                      }
                    </ul>
                    <div class="d-flex gap-2">
                      <button
                        type="button"
                        class="btn btn-sm btn-success flex-grow-1"
                        (click)="apply()"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary"
                        (click)="ai.discardPlan()"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                }
              </div>
            </ng-template>
          </li>
        </ul>
      </div>

      <div class="flex-grow-1 overflow-hidden bg-body" [ngbNavOutlet]="nav"></div>
    </aside>
  `,
})
export class PaletteSidebar {
  protected readonly store = inject(DiagramStore);
  protected readonly diagram = inject(DiagramCanvasService);
  protected readonly ai = inject(AiDiagramService);

  protected readonly categories = PALETTE_CATEGORIES;
  protected readonly relationshipOptions = RELATIONSHIP_OPTIONS;

  protected readonly prompt = signal('');
  protected readonly settingsOpen = signal(false);
  protected readonly tab = signal<PaletteTab>('elements');

  protected readonly typeLabel = computed(
    () =>
      this.relationshipOptions.find((option) => option.value === this.store.connectionType())
        ?.label ?? 'Relationship',
  );

  protected readonly connectClass = computed(
    () =>
      `btn btn-sm d-flex align-items-center justify-content-center gap-2 ${
        this.store.connectionMode() ? 'btn-primary' : 'btn-outline-secondary'
      }`,
  );

  protected readonly typeToggleClass = computed(
    () =>
      `btn btn-sm dropdown-toggle dropdown-toggle-split text-nowrap ${
        this.store.connectionMode() ? 'btn-primary' : 'btn-outline-secondary'
      }`,
  );

  /** Set while a drag is in flight so the trailing click does not add twice. */
  private dragging = false;

  protected setTab(id: string | number): void {
    if (id === 'elements' || id === 'ai') this.tab.set(id);
  }

  protected itemClass(item: PaletteItem): string {
    const base =
      'palette-item btn btn-sm border rounded-2 d-flex flex-column align-items-center justify-content-center gap-1 p-1';
    return item.isDashed
      ? `${base} border-dashed border-secondary-subtle bg-body`
      : `${base} border-secondary-subtle text-dark`;
  }

  protected selectType(type: RelationshipType): void {
    this.store.connectionType.set(type);
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

  protected onPromptInput(event: Event): void {
    this.prompt.set((event.target as HTMLTextAreaElement).value);
  }

  protected onPromptKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void this.generate();
    }
  }

  protected onSettingInput(field: keyof AiProviderSettings, event: Event): void {
    this.ai.updateSettings({ [field]: (event.target as HTMLInputElement).value });
  }

  protected toggleSettings(): void {
    this.settingsOpen.update((open) => !open);
  }

  protected async generate(): Promise<void> {
    await this.ai.generate(this.prompt());
  }

  protected apply(): void {
    this.ai.applyPlan();
    this.prompt.set('');
  }
}
