import { Service, computed, inject, signal } from '@angular/core';
import type { RelationshipType } from '../models/archimate.models';
import type {
  FloatingToolbarState,
  LayerGroup,
  RelationshipSummary,
  RepositoryLayer,
  SelectionProperties,
  SidebarTab,
  ToastMessage,
  ViewSummary,
} from '../models/diagram.models';
import { ThemeService } from './theme.service';

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
  availableParentGroups: [],
  availableLinkedViews: [],
};

const TOAST_DURATION_MS = 3000;

/** Single source of truth for everything the UI renders around the canvas. */
@Service()
export class DiagramStore {
  private readonly theme = inject(ThemeService);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly views = signal<ViewSummary[]>([{ id: 'view_default', name: 'Default View', isActive: true }]);
  readonly activeViewId = signal('view_default');
  readonly repository = signal<RepositoryLayer[]>([]);
  readonly layers = signal<LayerGroup[]>([]);
  readonly relationships = signal<RelationshipSummary[]>([]);
  readonly selection = signal<SelectionProperties>(EMPTY_SELECTION);

  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  /** Set while the signed-in user may only read the open diagram. */
  readonly readOnly = signal(false);
  /** Bumped on every canvas mutation so persistence can schedule an autosave. */
  readonly documentRevision = signal(0);

  readonly connectionMode = signal(false);
  readonly connectionHint = signal('Connection Mode: Select first shape to connect from.');
  readonly connectionType = signal<RelationshipType>('flow');
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
}
