import { Service, computed, inject, signal } from '@angular/core';
import { MAGIC_CONNECTOR, type ConnectionTypeChoice } from '../models/archimate.models';
import type {
  FloatingToolbarState,
  LayerGroup,
  RelationshipSummary,
  RepositoryLayer,
  SelectionProperties,
  SidebarTab,
  ToastMessage,
  ViewContentType,
  ViewSummary,
} from '../models/diagram.models';
import {
  EMPTY_CATALOGUE,
  type ModelCatalogue,
  type ModelElement,
  type ModelRelationship,
} from '../models/model.models';
import { ThemeService } from './theme.service';
import { summarizeIssues, validateModel } from '../models/validation.models';
import { viewpointAdmits, viewpointById } from '../frameworks/viewpoints';

const EMPTY_SELECTION: SelectionProperties = {
  kind: 'none',
  name: '',
  parentId: '',
  linkedView: '',
  color: '#ffffff',
  connType: 'association',
  doc: '',
  canCollapse: false,
  isCollapsed: false,
  elementKey: '',
  availableParentGroups: [],
  availableLinkedViews: [],
};

const TOAST_DURATION_MS = 3000;

/** Single source of truth for everything the UI renders around the canvas. */
@Service()
export class DiagramStore {
  private readonly theme = inject(ThemeService);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly views = signal<ViewSummary[]>([
    { id: 'view_default', name: 'Default View', viewpoint: null, contentType: 'diagram', isActive: true },
  ]);
  readonly activeViewId = signal('view_default');
  readonly repository = signal<RepositoryLayer[]>([]);
  readonly layers = signal<LayerGroup[]>([]);
  readonly relationships = signal<RelationshipSummary[]>([]);
  readonly selection = signal<SelectionProperties>(EMPTY_SELECTION);

  /** The model behind the pictures: shapes point at these by key. */
  readonly elements = signal<ModelElement[]>([]);
  readonly modelRelationships = signal<ModelRelationship[]>([]);
  readonly catalogue = computed<ModelCatalogue>(() => ({
    elements: this.elements(),
    relationships: this.modelRelationships(),
  }));
  readonly elementByKey = computed(
    () => new Map(this.elements().map((element) => [element.key, element])),
  );

  /** ArchiMate problems in the model; recomputed whenever the catalogue changes. */
  readonly validationIssues = computed(() => validateModel(this.catalogue()));
  readonly validationSummary = computed(() => summarizeIssues(this.validationIssues()));

  /** Viewpoint of the view on screen, or `undefined` when the view is not scoped to one. */
  readonly activeViewpointId = computed<string | null>(() => {
    const active = this.activeViewId();
    return this.views().find((view) => view.id === active)?.viewpoint ?? null;
  });
  readonly activeViewpoint = computed(
    () => viewpointById(this.activeViewpointId()) ?? null,
  );

  /** What the active view holds: a canvas, a catalogue table or a matrix grid. */
  readonly activeContentType = computed<ViewContentType>(() => {
    const active = this.activeViewId();
    return this.views().find((view) => view.id === active)?.contentType ?? 'diagram';
  });

  /**
   * Issues in scope for the active viewpoint. Elements the viewpoint does not admit are still
   * validated, but the panel hides them by default so a business view is not buried in
   * technology-layer noise. Issues that cannot be tied to an element always stay visible.
   */
  readonly viewpointIssues = computed(() => {
    const viewpoint = this.activeViewpoint();
    if (!viewpoint) return this.validationIssues();
    const elements = this.elementByKey();
    return this.validationIssues().filter((issue) => {
      const element = issue.elementKey ? elements.get(issue.elementKey) : undefined;
      if (!element) return true;
      return viewpointAdmits(viewpoint, element.archimateType, element.layer);
    });
  });

  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  /** Set while the signed-in user may only read the open diagram. */
  readonly readOnly = signal(false);
  /** Bumped on every canvas mutation so persistence can schedule an autosave. */
  readonly documentRevision = signal(0);

  readonly connectionMode = signal(false);
  readonly connectionHint = signal(
    'Magic connector: select the first shape to connect from.',
  );
  readonly connectionType = signal<ConnectionTypeChoice>(MAGIC_CONNECTOR);
  readonly sidebarTab = signal<SidebarTab>('explorer');
  readonly toast = signal<ToastMessage | null>(null);
  readonly toolbar = signal<FloatingToolbarState>({ visible: false, left: 0, top: 0 });

  readonly paletteOpen = signal(false);
  readonly explorerOpen = signal(false);

  readonly editDialogValue = signal<string | null>(null);
  readonly clearDialogOpen = signal(false);
  readonly newViewDialogOpen = signal(false);
  readonly revisionsDialogOpen = signal(false);

  readonly isDark = this.theme.isDark;

  readonly isEmptyModel = computed(
    () =>
      this.layers().length === 0 &&
      this.relationships().length === 0 &&
      this.views().length <= 1 &&
      this.repository().length === 0,
  );

  readonly hasRelationships = computed(() => this.relationships().length > 0);

  toggleTheme(): void {
    this.theme.toggle();
  }

  showToast(text: string, isError = false): void {
    this.toast.set({ text, isError });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), TOAST_DURATION_MS);
  }

  hideToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  toggleConnectionMode(): void {
    this.connectionMode.update((mode) => !mode);
  }

  exitConnectionMode(): void {
    this.connectionMode.set(false);
  }

  setSidebarTab(tab: SidebarTab): void {
    this.sidebarTab.set(tab);
  }

  togglePalette(): void {
    const open = !this.paletteOpen();
    this.paletteOpen.set(open);
    if (open) this.explorerOpen.set(false);
  }

  toggleExplorer(): void {
    const open = !this.explorerOpen();
    this.explorerOpen.set(open);
    if (open) this.paletteOpen.set(false);
  }

  closeSidebars(): void {
    this.paletteOpen.set(false);
    this.explorerOpen.set(false);
  }

  setViews(views: ViewSummary[]): void {
    this.views.set(views);
  }

  resetSelection(): void {
    this.selection.set(EMPTY_SELECTION);
  }

  setActiveView(id: string): void {
    this.activeViewId.set(id);
    this.views.update((views) => views.map((view) => ({ ...view, isActive: view.id === id })));
  }

  markDocumentChanged(): void {
    this.documentRevision.update((revision) => revision + 1);
  }

  /** Replaces the whole model, used when a diagram is opened or reloaded. */
  setCatalogue(catalogue: ModelCatalogue): void {
    this.elements.set([...catalogue.elements]);
    this.modelRelationships.set([...catalogue.relationships]);
  }

  resetCatalogue(): void {
    this.elements.set([...EMPTY_CATALOGUE.elements]);
    this.modelRelationships.set([...EMPTY_CATALOGUE.relationships]);
  }

  elementFor(key: string | null | undefined): ModelElement | undefined {
    return key ? this.elementByKey().get(key) : undefined;
  }

  /** Adds elements that were derived from the canvas, without marking the document dirty. */
  registerElements(elements: readonly ModelElement[]): void {
    if (elements.length === 0) return;
    const known = this.elementByKey();
    const missing = elements.filter((element) => !known.has(element.key));
    if (missing.length === 0) return;
    this.elements.update((current) => [...current, ...missing]);
  }

  /** Adds or replaces one element. The element key is the identity, so this is also the save path. */
  upsertElement(element: ModelElement): void {
    const known = this.elementByKey().has(element.key);
    this.elements.update((elements) =>
      known
        ? elements.map((current) => (current.key === element.key ? element : current))
        : [...elements, element],
    );
    this.markDocumentChanged();
  }

  /** Drops an element and every relationship that pointed at it. */
  removeElement(key: string): void {
    if (!this.elementByKey().has(key)) return;
    this.elements.update((elements) => elements.filter((element) => element.key !== key));
    this.modelRelationships.update((relationships) =>
      relationships.filter((rel) => rel.sourceKey !== key && rel.targetKey !== key),
    );
    this.markDocumentChanged();
  }

  /**
   * Reconciles relationships derived from the canvas with the stored ones, keeping any metadata a
   * user already entered. Like {@link registerElements} this does not mark the document dirty.
   */
  reconcileRelationships(relationships: readonly ModelRelationship[]): void {
    const stored = new Map(this.modelRelationships().map((rel) => [rel.key, rel]));
    const next = relationships.map((rel) => stored.get(rel.key) ?? rel);
    const current = this.modelRelationships();
    if (next.length === current.length && next.every((rel, index) => rel === current[index])) {
      return;
    }
    this.modelRelationships.set(next);
  }

  /** Drops one relationship; the caller has already established that no view still shows it. */
  removeRelationship(key: string): void {
    if (!this.modelRelationships().some((rel) => rel.key === key)) return;
    this.modelRelationships.update((current) => current.filter((rel) => rel.key !== key));
    this.markDocumentChanged();
  }
}
