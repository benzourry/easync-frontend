import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap/accordion';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap/dropdown';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap/nav';
import { CONNECTION_TYPE_OPTIONS, PALETTE_CATEGORIES } from '../models/archimate.models';
import type {
  ConnectionTypeChoice,
  PaletteCategory,
  PaletteItem,
} from '../models/archimate.models';
import type { AiSettingsPatch } from '../models/ai.models';
import { viewpointAdmits } from '../frameworks/viewpoints';
import { TOGAF_DOMAINS, TOGAF_PHASES, findTogafPhase } from '../frameworks/togaf';
import type { TogafDomainId, TogafPhaseId } from '../frameworks/togaf';
import { AiDiagramService } from '../services/ai-diagram.service';
import { DiagramCanvasService, type DragPayload } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';
import { TranslationService } from '../services/translation.service';

type PaletteTab = 'elements' | 'ai';

/** The text inputs inside the assistant settings form. */
type SettingField = 'baseUrl' | 'model' | 'apiKey';

/** Keys are often pasted as 'Bearer sk-…' or wrapped in quotes; the server stores the raw value. */
function normalizeApiKey(raw: string | undefined): string {
  const withoutScheme = (raw?.trim() ?? '').replace(/^Bearer\s+/i, '').trim();
  return withoutScheme.replace(/^(["'])(.*)\1$/, '$2').trim();
}

@Component({
  selector: 'app-palette-sidebar',
  imports: [DragDropModule, NgbAccordionModule, NgbDropdownModule, NgbNavModule],
  template: `
    <aside
      id="elements-palette"
      class="app-sidebar offcanvas-lg offcanvas-start d-flex flex-column border-end"
      [class.show]="store.paletteOpen()"
      aria-label="Elements palette"
    >
      <div
        class="d-flex align-items-center justify-content-between gap-2 app-panel-header border-bottom bg-body-tertiary flex-shrink-0"
      >
        <h2 class="h6 mb-0">{{ panelTitle() }}</h2>
        <button
          type="button"
          class="btn-close d-lg-none flex-shrink-0"
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
                class="h-100 overflow-auto app-scroll app-panel-body"
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
                    [disabled]="store.readOnly()"
                    title="Toggle connection mode"
                    (click)="diagram.toggleConnectionMode()"
                  >
                    <svg class="app-icon" aria-hidden="true"><use href="icons.svg#link-45deg"></use></svg>
                    <span>{{ store.connectionMode() ? 'Connecting' : 'Connect' }}</span>
                  </button>
                  <button
                    type="button"
                    [class]="typeToggleClass()"
                    ngbDropdownToggle
                    [attr.aria-label]="'Connection type: ' + typeLabel() + '. Change type'"
                    [title]="typeTitle()"
                  >
                    {{ typeLabel() }}
                  </button>
                  <div class="app-relationship-menu" ngbDropdownMenu role="menu">
                    @for (option of connectionTypeOptions; track option.value) {
                      <button
                        type="button"
                        ngbDropdownItem
                        role="menuitemradio"
                        [attr.aria-checked]="option.value === store.connectionType()"
                        [class.active]="option.value === store.connectionType()"
                        [title]="option.description ?? ''"
                        (click)="selectType(option.value)"
                      >
                        <span class="flex-grow-1 text-start">{{ option.label }}</span>
                        @if (option.value === store.connectionType()) {
                          <svg class="app-icon ms-2" aria-hidden="true">
                            <use href="icons.svg#check2"></use>
                          </svg>
                        }
                      </button>
                    }
                  </div>
                </div>

                @if (store.activeViewpoint(); as viewpoint) {
                  <div
                    class="alert alert-secondary d-flex align-items-start gap-2 py-2 px-2 my-2"
                    role="status"
                  >
                    <div class="flex-grow-1 small">
                      <div class="fw-semibold">{{ viewpoint.name }}</div>
                      <div class="text-body-secondary">{{ filterSummary() }}</div>
                    </div>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary flex-shrink-0"
                      (click)="toggleFilter()"
                    >
                      {{ filterActive() ? i18n.t('palette.showAll') : i18n.t('palette.applyFilter') }}
                    </button>
                  </div>
                }

                <div
                  ngbAccordion
                  class="app-palette-accordion accordion-flush"
                  [closeOthers]="false"
                  [destroyOnHide]="false"
                >
                  @for (category of categories(); track category.title; let index = $index) {
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
                                  [cdkDragDisabled]="store.readOnly()"
                                  [disabled]="store.readOnly()"
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
              <div class="h-100 overflow-auto app-scroll app-panel-body">
                <div class="mb-2">
                  <label class="form-label small mb-1" for="ai-phase">TOGAF ADM phase</label>
                  <select
                    id="ai-phase"
                    class="form-select form-select-sm"
                    aria-describedby="ai-phase-hint ai-artifacts-hint"
                    (change)="onPhaseChange($event)"
                  >
                    @for (phase of phases; track phase.id) {
                      <option [value]="phase.id" [selected]="phase.id === ai.context().phase">
                        {{ phase.code }} — {{ phase.name }}
                      </option>
                    }
                  </select>
                  <p id="ai-phase-hint" class="form-text small mt-1 mb-0">{{ phasePurpose() }}</p>
                  <p class="form-text small mb-0" id="ai-artifacts-hint">{{ phaseArtifacts() }}</p>
                </div>

                <div class="mb-2">
                  <label class="form-label small mb-1" for="ai-domain">Architecture domain</label>
                  <select id="ai-domain" class="form-select form-select-sm" (change)="onDomainChange($event)">
                    @for (domain of domains; track domain.id) {
                      <option [value]="domain.id" [selected]="domain.id === ai.context().domain">
                        {{ domain.label }}
                      </option>
                    }
                  </select>
                </div>

                <label class="form-label small mb-1" for="ai-prompt">Describe your diagram</label>
                <textarea
                  id="ai-prompt"
                  class="form-control form-control-sm mb-2"
                  rows="3"
                  [value]="prompt()"
                  aria-describedby="ai-prompt-hint"
                  placeholder="e.g. Capability map for retail banking with the application services that realise it"
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

                @if (!ai.isConfigured()) {
                  <p class="form-text small mt-2 mb-0">
                    Add your AI API key under Settings to use the assistant. It is stored on the
                    EAsync server for your account.
                  </p>
                }

                @if (settingsOpen()) {
                  <form
                    id="ai-settings"
                    class="border rounded-2 p-2 mt-2 bg-body-tertiary"
                    (submit)="saveSettings($event)"
                  >
                    <div class="mb-2">
                      <label class="form-label small mb-1" for="ai-base-url">API base URL</label>
                      <input
                        id="ai-base-url"
                        type="url"
                        class="form-control form-control-sm"
                        [value]="settingsDraft().baseUrl"
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
                        [value]="settingsDraft().model"
                        placeholder="gpt-4o-mini"
                        (input)="onSettingInput('model', $event)"
                      />
                    </div>
                    <div class="mb-2">
                      <label class="form-label small mb-1" for="ai-api-key">API key</label>
                      <input
                        id="ai-api-key"
                        type="password"
                        class="form-control form-control-sm"
                        autocomplete="new-password"
                        [value]="settingsDraft().apiKey"
                        [attr.placeholder]="
                          ai.settings().hasApiKey
                            ? 'Stored on the server — leave blank to keep it'
                            : 'sk-…'
                        "
                        (input)="onSettingInput('apiKey', $event)"
                      />
                      <p class="form-text small mb-0">
                        Any OpenAI-compatible endpoint (OpenAI, Azure, OpenRouter, Ollama, LM
                        Studio). The key is kept on the EAsync server for your account and is never
                        sent back to this browser.
                      </p>
                    </div>
                    <div class="d-flex flex-wrap align-items-center gap-2">
                      <button
                        type="submit"
                        class="btn btn-sm btn-primary d-flex align-items-center gap-2"
                        [disabled]="ai.settingsBusy()"
                      >
                        @if (ai.settingsBusy()) {
                          <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                        }
                        Save
                      </button>
                      @if (ai.settings().hasApiKey) {
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger"
                          [disabled]="ai.settingsBusy()"
                          (click)="clearApiKey()"
                        >
                          Remove key
                        </button>
                        <span class="badge text-bg-success">Key stored</span>
                      } @else {
                        <span class="badge text-bg-secondary">No key</span>
                      }
                    </div>
                    @if (ai.settingsError(); as message) {
                      <div class="alert alert-danger py-1 px-2 small mt-2 mb-0" role="alert">
                        {{ message }}
                      </div>
                    }
                  </form>
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
                    @if (plan.rationale; as rationale) {
                      <p class="small mb-1 d-flex flex-wrap gap-1">
                        <span class="badge text-bg-light border fw-normal">{{ rationale.phase }}</span>
                        @if (rationale.viewpoint) {
                          <span class="badge text-bg-light border fw-normal">{{ rationale.viewpoint }}</span>
                        }
                      </p>
                      @if (rationale.principles.length) {
                        <ul class="small text-body-secondary mb-2 ps-3">
                          @for (principle of rationale.principles; track $index) {
                            <li>{{ principle }}</li>
                          }
                        </ul>
                      }
                    }
                    <ul class="small mb-2 ps-3">
                      @for (line of ai.preview(); track $index) {
                        <li>{{ line }}</li>
                      }
                    </ul>
                    @for (notice of ai.notices(); track $index) {
                      <p class="small text-warning-emphasis mb-2">{{ notice }}</p>
                    }
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
  protected readonly i18n = inject(TranslationService);

  constructor() {
    // Knowing whether a key is stored drives the assistant panel, so fetch it up front.
    this.ai.loadSettings();
  }

  /** Id of the viewpoint whose filter the user temporarily bypassed. */
  private readonly filterDisabledFor = signal<string | null>(null);

  protected readonly categories = computed<PaletteCategory[]>(() => {
    const viewpoint = this.effectiveViewpoint();
    if (!viewpoint) return PALETTE_CATEGORIES;
    return PALETTE_CATEGORIES.map((category) => ({
      ...category,
      items: category.items.filter((item) =>
        viewpointAdmits(viewpoint, item.label, item.layer),
      ),
    })).filter((category) => category.items.length > 0);
  });

  /** Viewpoint whose filter is applied, or `null` when the user asked to see everything. */
  protected readonly effectiveViewpoint = computed(() => {
    const viewpoint = this.store.activeViewpoint();
    if (!viewpoint || this.filterDisabledFor() === viewpoint.id) return null;
    return viewpoint;
  });

  protected readonly filterActive = computed(() => this.effectiveViewpoint() !== null);

  protected readonly filterSummary = computed(() => {
    const viewpoint = this.effectiveViewpoint();
    if (!viewpoint) {
      return this.store.activeViewpoint()?.concern ?? '';
    }
    const shown = this.categories().reduce((total, category) => total + category.items.length, 0);
    const available = PALETTE_CATEGORIES.reduce((total, category) => total + category.items.length, 0);
    const showing = this.i18n.t('palette.showing');
    const of = this.i18n.t('palette.of');
    const elements = this.i18n.t('palette.elements');
    return `${showing} ${shown} ${of} ${available} ${elements}`;
  });

  protected toggleFilter(): void {
    const viewpoint = this.store.activeViewpoint();
    if (!viewpoint) return;
    this.filterDisabledFor.set(this.filterDisabledFor() === viewpoint.id ? null : viewpoint.id);
  }

  protected readonly connectionTypeOptions = CONNECTION_TYPE_OPTIONS;
  protected readonly phases = TOGAF_PHASES;
  protected readonly domains = TOGAF_DOMAINS;

  protected readonly prompt = signal('');
  protected readonly settingsOpen = signal(false);
  /** Staged text of the settings form; saved to the server on submit. */
  protected readonly settingsDraft = signal<AiSettingsPatch>({ baseUrl: '', model: '', apiKey: '' });
  protected readonly tab = signal<PaletteTab>('elements');
  protected readonly panelTitle = computed(() =>
    this.tab() === 'ai' ? 'AI Assistant' : 'Elements Palette',
  );
  protected readonly phasePurpose = computed(() => findTogafPhase(this.ai.context().phase).purpose);
  protected readonly phaseArtifacts = computed(
    () => `Artefacts: ${findTogafPhase(this.ai.context().phase).artifacts.join(' · ')}`,
  );

  protected readonly typeLabel = computed(
    () =>
      this.connectionTypeOptions.find((option) => option.value === this.store.connectionType())
        ?.label ?? 'Connection',
  );

  protected readonly typeTitle = computed(() => {
    const option = this.connectionTypeOptions.find(
      (candidate) => candidate.value === this.store.connectionType(),
    );
    const label = option?.label ?? 'Connection';
    return option?.description
      ? `Connection type: ${label} — ${option.description}`
      : `Connection type: ${label}`;
  });

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

  protected selectType(type: ConnectionTypeChoice): void {
    this.store.connectionType.set(type);
    this.diagram.refreshConnectionHint();
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

  protected readonly onSettingInput = (field: SettingField, event: Event): void => {
    this.settingsDraft.update((draft) => ({
      ...draft,
      [field]: (event.target as HTMLInputElement).value,
    }));
  };

  protected saveSettings(event: Event): void {
    event.preventDefault();
    const draft = this.settingsDraft();
    const patch: AiSettingsPatch = {
      baseUrl: draft.baseUrl?.trim() ?? '',
      model: draft.model?.trim() ?? '',
    };
    const apiKey = normalizeApiKey(draft.apiKey);
    if (apiKey) patch.apiKey = apiKey;
    this.ai.saveSettings(patch, () => this.settingsDraft.update((d) => ({ ...d, apiKey: '' })));
  }

  protected clearApiKey(): void {
    this.ai.saveSettings({ clearApiKey: true }, () =>
      this.settingsDraft.update((draft) => ({ ...draft, apiKey: '' })),
    );
  }

  protected onPhaseChange(event: Event): void {
    this.ai.updateContext({ phase: (event.target as HTMLSelectElement).value as TogafPhaseId });
  }

  protected onDomainChange(event: Event): void {
    this.ai.updateContext({ domain: (event.target as HTMLSelectElement).value as TogafDomainId });
  }

  protected toggleSettings(): void {
    this.settingsOpen.update((open) => !open);
    if (!this.settingsOpen()) return;

    const sync = () => {
      const { baseUrl, model } = this.ai.settings();
      this.settingsDraft.set({ baseUrl, model, apiKey: '' });
    };
    sync();
    this.ai.loadSettings(() => {
      if (this.settingsOpen()) sync();
    });
  }

  /** Opens the settings form without closing it when it is already visible. */
  private openSettings(): void {
    if (this.settingsOpen()) return;
    this.toggleSettings();
  }

  protected async generate(): Promise<void> {
    await this.ai.generate(this.prompt());
    if (this.ai.providerFailed() || !this.ai.isConfigured()) this.openSettings();
  }

  protected apply(): void {
    this.ai.applyPlan();
    this.prompt.set('');
  }
}
