import { Service, effect, inject } from '@angular/core';
import { compareLayers, getArchimateTypeInfo, layerOf } from '../models/archimate.models';
import type {
  ArchimateLayer,
  PaletteItem,
  Point2D,
  RelationshipType,
} from '../models/archimate.models';
import type { DiagramDto, DiagramViewDto } from '../models/api.models';
import type {
  DiagramConnectionInfo,
  DiagramShapeInfo,
  LayerGroup,
  ParsedView,
  RelationshipSummary,
  RepositoryLayer,
  SelectionProperties,
  ShapeSpec,
  ShapeSummary,
  SnapshotSelection,
  SnapshotShape,
  ViewContentType,
  ViewSnapshot,
  ViewSummary,
} from '../models/diagram.models';
import type {
  ArchimateShape,
  BendpointHandle,
  ConnectionLine,
  DiagramConnection,
  StoredView,
} from '../models/fabric.types';
import {
  archimateTypeForIcon,
  compactKey,
  emptyModelElement,
  iconForType,
  paletteItemFor,
  relationshipKey,
} from '../models/model.models';
import type { ModelElement, ModelRelationship } from '../models/model.models';
import { HistoryStack } from '../utils/history-stack';
import { ArchimateImportService } from './archimate-import.service';
import { buildArchimateExchange, type ExchangeView } from './archimate-export.service';
import {
  generatePathString,
  getPointOnLine,
  getShapeEdgePoint,
} from './connection-geometry';
import { DiagramStore } from './diagram-store';
import { ThemeService } from './theme.service';

declare const fabric: typeof import('fabric').fabric;

const GRID_SIZE = 15;
const PASTE_OFFSET = 20;
const SHAPE_STROKE_WIDTH = 1;
const GROUP_TAB_HEIGHT = 24;
const MIN_SHAPE_WIDTH = 60;
const MIN_SHAPE_HEIGHT = 40;
const DEFAULT_VIEW_ID = 'view_default';
/** Snapshot used for a view that has never been rendered, matching the server's seed value. */
const EMPTY_SNAPSHOT: ViewSnapshot = { shapes: [], connections: [], selection: null };
/** How many undo steps are kept per view. */
const HISTORY_LIMIT = 60;
const DASHED_TYPES: RelationshipType[] = ['realization', 'access', 'influence', 'flow'];
/** Part-whole relationships that ArchiMate also expresses by nesting. */
const NESTING_IMPLIED_TYPES: RelationshipType[] = ['composition', 'aggregation'];
const GROUP_SHAPE_ICONS = ['⊞', '📁'];
const CONNECT_MODE_HINT = 'Connection Mode: Select first shape to connect from.';
const CONNECT_TARGET_HINT = 'Connection Mode: Select target shape to complete connection.';
const CONNECT_DONE_HINT = 'Connection created. Select another shape to start a new connection.';
/** Space between the floating toolbar and the object it belongs to. */
const TOOLBAR_GAP = 10;
/** Distance from the object's top edge to the toolbar's own top edge. */
const TOOLBAR_OFFSET = 46;
const TOOLBAR_MIN_TOP = 8;

/** Payload handed to the canvas when a palette tile or repository entry is dropped. */
export interface DragPayload {
  label: string;
  color: string;
  icon: string;
  layer: ArchimateLayer;
  archimateId?: string;
  /** ArchiMate type; omitted for palette tiles, whose label is already the type. */
  archimateType?: string;
  /** Model element to reuse, so dropping the same thing twice does not create a second element. */
  elementKey?: string;
}

/** Coerce persisted snapshot fields so an older or hand-edited payload cannot break rendering. */
function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

interface AddShapeOptions {
  label: string;
  color: string;
  icon: string;
  x: number;
  y: number;
  layer: ArchimateLayer;
  width?: number | null;
  height?: number | null;
  forceId?: string | null;
  /** Reuses an existing model element instead of creating one for this shape. */
  elementKey?: string | null;
  archimateType?: string | null;
  parentId?: string | null;
  isImport?: boolean;
}

/** Snapshot of a copied element, independent of the fabric object so paste survives deletion. */
interface CopiedShape {
  kind: 'shape';
  label: string;
  color: string;
  icon: string;
  layer: ArchimateLayer;
  left: number;
  top: number;
  width: number | null;
  height: number | null;
  elementId: string | null;
  parentId: string | null;
}

interface CopiedConnection {
  kind: 'connection';
  type: RelationshipType;
  source: ArchimateShape;
  target: ArchimateShape;
  bendpoints: Point2D[];
}

type CopiedItem = CopiedShape | CopiedConnection;

interface PathInternals {
  path: unknown;
  dirty: boolean;
  _calcDimensions(): { left: number; top: number; width: number; height: number };
}

/** Interaction flags an object had before view-only mode replaced them. */
type ObjectInteraction = Pick<
  fabric.Object,
  'selectable' | 'evented' | 'hoverCursor' | 'lockMovementX' | 'lockMovementY' | 'hasControls'
>;

/** Owns the Fabric.js canvas: rendering, interaction, persistence and inspector state. */
@Service()
export class DiagramCanvasService {
  private readonly store = inject(DiagramStore);
  private readonly theme = inject(ThemeService);
  private readonly importer = inject(ArchimateImportService);

  private canvas: fabric.Canvas | null = null;
  private host: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private connections: DiagramConnection[] = [];
  private readonly views = new Map<string, StoredView>([
    [DEFAULT_VIEW_ID, { name: 'Default View', viewpoint: null, contentType: 'diagram', objects: [], connections: [] }],
  ]);
  private readonly parsedViews = new Map<string, ParsedView>();
  /** Serialized state per view, so inactive views can be saved and restored losslessly. */
  private readonly snapshots = new Map<string, ViewSnapshot>();
  private activeViewId = DEFAULT_VIEW_ID;
  /** View to render as soon as the canvas exists (set when a diagram loads before attach). */
  private pendingViewId: string | null = null;
  private readOnly = false;
  /** Interaction flags to restore when a read-only viewer regains editing rights. */
  private readonly editableFlags = new WeakMap<fabric.Object, ObjectInteraction>();

  private bendpointHandles: BendpointHandle[] = [];
  private clipboard: CopiedItem[] = [];
  private pasteSeq = 0;

  /** Undo timelines, one per view, so switching views never mixes histories. */
  private readonly history = new Map<string, HistoryStack<ViewSnapshot>>();
  private restoringHistory = false;

  private connectionSource: ArchimateShape | null = null;
  private isPanning = false;
  private isSpaceDown = false;
  private isShiftDragging = false;
  private shiftSource: ArchimateShape | null = null;
  private tempLine: fabric.Line | null = null;
  private lastClientX = 0;
  private lastClientY = 0;
  private syncingVisibility = false;

  private touchDistance = 0;
  private touchCenter: Point2D = { x: 0, y: 0 };

  private editShape: ArchimateShape | null = null;
  private editTextbox: fabric.Textbox | null = null;

  private readonly objectKeys = new WeakMap<fabric.Object, string>();
  private liveObjects = new Map<string, fabric.Object>();
  private keySeq = 0;

  constructor() {
    effect(() => {
      const isDark = this.theme.isDark();
      this.applyTheme(isDark);
    });

    effect(() => {
      const readOnly = this.store.readOnly();
      this.applyReadOnly(readOnly);
    });
  }

  // --- Lifecycle -----------------------------------------------------------

  attach(host: HTMLElement, canvasElement: HTMLCanvasElement): void {
    if (this.canvas) return;
    this.host = host;

    this.canvas = new fabric.Canvas(canvasElement, {
      selection: true,
      preserveObjectStacking: true,
    });

    this.setupGridPattern();
    this.resizeCanvas();
    this.bindCanvasEvents();
    this.bindKeyboard();
    this.bindTouch();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(host);
    }

    this.refreshTree();
    this.refreshProperties();
    this.ensureHistory();
    this.applyReadOnly(this.store.readOnly());

    const pending = this.pendingViewId;
    if (pending) {
      this.pendingViewId = null;
      this.selectView(pending);
    }
    this.canvas.requestRenderAll();
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.unbindTouch();

    const canvas = this.canvas;
    if (canvas) {
      // Keep the live view in the snapshots so a save triggered by teardown still sees it.
      this.saveCurrentViewState();
      canvas.dispose();
      const upper = this.upperCanvasEl;
      upper?.replaceWith(upper.cloneNode(false));
    }
    this.canvas = null;
    this.host = null;
    this.history.clear();
    this.store.canUndo.set(false);
    this.store.canRedo.set(false);
  }

  /**
   * Blocks editing for view-only shares. Objects stay clickable so a viewer can
   * select an element and read its properties, but nothing can be dragged,
   * resized, rotated or rubber-band selected.
   */
  private applyReadOnly(readOnly: boolean): void {
    this.readOnly = readOnly;
    const canvas = this.canvas;
    if (!canvas) return;

    canvas.selection = !readOnly;
    for (const object of canvas.getObjects()) {
      if (readOnly) {
        if (!this.editableFlags.has(object)) {
          this.editableFlags.set(object, {
            selectable: object.selectable,
            evented: object.evented,
            hoverCursor: object.hoverCursor,
            lockMovementX: object.lockMovementX,
            lockMovementY: object.lockMovementY,
            hasControls: object.hasControls,
          });
        }
        object.set({
          selectable: true,
          evented: true,
          hoverCursor: 'pointer',
          lockMovementX: true,
          lockMovementY: true,
          hasControls: false,
        });
      } else {
        const previous = this.editableFlags.get(object);
        if (!previous) continue;
        object.set(previous);
        this.editableFlags.delete(object);
      }
    }

    if (readOnly && this.store.connectionMode()) this.store.exitConnectionMode();
    canvas.requestRenderAll();
    this.updateToolbar();
  }

  private resizeCanvas(): void {
    if (!this.canvas || !this.host) return;
    const width = this.host.clientWidth || 800;
    const height = this.host.clientHeight || 600;
    this.canvas.setWidth(width);
    this.canvas.setHeight(height);
    this.canvas.calcOffset();
    this.canvas.requestRenderAll();
  }

  private getCanvas(): fabric.Canvas | null {
    return this.canvas;
  }

  private get upperCanvasEl(): HTMLCanvasElement | null {
    const canvas = this.canvas as unknown as { upperCanvasEl?: HTMLCanvasElement } | null;
    return canvas?.upperCanvasEl ?? null;
  }

  // --- Grid & theme --------------------------------------------------------

  private setupGridPattern(): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const isDark = this.theme.isDark();
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = GRID_SIZE;
    patternCanvas.height = GRID_SIZE;

    const ctx = patternCanvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(GRID_SIZE, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, GRID_SIZE);
      ctx.stroke();
    }

    const pattern = new fabric.Pattern({
      source: patternCanvas as unknown as HTMLImageElement,
      repeat: 'repeat',
    });
    this.syncPatternOffset(pattern);
    canvas.setBackgroundColor(pattern, () => canvas.requestRenderAll());
  }

  private syncPatternOffset(pattern?: fabric.Pattern | string | null): void {
    const canvas = this.canvas;
    if (!canvas) return;
    const background = pattern ?? canvas.backgroundColor;
    if (typeof background !== 'object' || background === null) return;

    const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    background.offsetX = vpt[4] % GRID_SIZE;
    background.offsetY = vpt[5] % GRID_SIZE;
  }

  private applyTheme(isDark: boolean): void {
    const canvas = this.canvas;
    if (!canvas) return;

    this.setupGridPattern();

    const strokeColor = isDark ? '#94a3b8' : '#334155';
    const background = isDark ? '#1e293b' : '#ffffff';
    const active = canvas.getActiveObject() as ConnectionLine | undefined;

    for (const conn of this.connections) {
      conn.line.set('stroke', strokeColor);
      const isActive = active === conn.line;
      for (const dec of [conn.sourceDec, conn.targetDec]) {
        if (!dec) continue;
        const fill = typeof dec.fill === 'string' ? dec.fill : '';
        if (fill === '#94a3b8' || fill === '#334155') dec.set('fill', strokeColor);
        else if (fill === '#1e293b' || fill === '#ffffff') dec.set('fill', background);
        dec.set('stroke', isActive ? '#3b82f6' : strokeColor);
      }
    }
    this.setLineHighlight(active);

    for (const obj of canvas.getObjects()) {
      const shape = obj as ArchimateShape;
      if (!shape.isShape) continue;
      if (!this.isContainerShape(shape)) continue;
      for (const child of shape.getObjects()) {
        if (child.type === 'textbox') child.set('fill', isDark ? '#e2e8f0' : '#1e293b');
        if (child.type === 'rect') {
          child.set('fill', isDark ? '#1e293b' : shape.originalColor);
          child.set('stroke', isDark ? '#475569' : '#64748b');
        }
      }
    }

    canvas.requestRenderAll();
  }

  // --- Palette & drop ------------------------------------------------------

  /** True when the given client coordinates fall inside the canvas surface. */
  isPointOverCanvas(clientX: number, clientY: number): boolean {
    const host = this.host;
    if (!host) return false;
    const rect = host.getBoundingClientRect();
    return (
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    );
  }

  /** Places a palette/repository payload only when it was dropped onto the canvas surface. */
  dropPayloadAt(payload: DragPayload, clientX: number, clientY: number): void {
    if (this.readOnly) return;
    if (!this.isPointOverCanvas(clientX, clientY)) return;
    this.handleDrop(payload, clientX, clientY);
  }

  addPaletteItem(item: PaletteItem | DragPayload): void {
    const canvas = this.getCanvas();
    if (!canvas || this.readOnly) return;

    const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    const centerX = (canvas.getWidth() / 2 - vpt[4]) / vpt[0];
    const centerY = (canvas.getHeight() / 2 - vpt[5]) / vpt[3];

    const dropped = item as Partial<DragPayload>;
    this.addShape({
      label: item.label,
      color: item.color,
      icon: item.icon,
      layer: item.layer,
      archimateType: dropped.archimateType ?? item.label,
      elementKey: dropped.elementKey ?? null,
      x: Math.round((centerX + (Math.random() * 40 - 20)) / GRID_SIZE) * GRID_SIZE,
      y: Math.round((centerY + (Math.random() * 40 - 20)) / GRID_SIZE) * GRID_SIZE,
    });

    this.commitHistory();
    if (window.innerWidth < 768) this.store.closeSidebars();
  }

  handleDrop(payload: DragPayload, clientX: number, clientY: number): void {
    const canvas = this.getCanvas();
    const host = this.host;
    if (!canvas || !host || this.readOnly) return;

    const rect = host.getBoundingClientRect();
    const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    const worldX = (clientX - rect.left - vpt[4]) / vpt[0];
    const worldY = (clientY - rect.top - vpt[5]) / vpt[3];

    this.addShape({
      label: payload.label,
      color: payload.color,
      icon: payload.icon,
      layer: payload.layer,
      archimateType: payload.archimateType ?? payload.label,
      elementKey: payload.elementKey ?? null,
      x: Math.round(worldX / GRID_SIZE) * GRID_SIZE,
      y: Math.round(worldY / GRID_SIZE) * GRID_SIZE,
      forceId: payload.archimateId ?? null,
    });

    this.commitHistory();
    if (window.innerWidth < 768) this.store.closeSidebars();
  }

  // --- Programmatic editing (AI assistant) ---------------------------------

  /** Live elements with their ids, used to describe the diagram to the assistant. */
  describeShapes(): DiagramShapeInfo[] {
    return this.allShapes().map((shape) => ({
      id: shape.archimateId,
      label: this.labelOf(shape),
      layer: layerOf(shape.archimateLayer),
      icon: this.iconOf(shape),
      parentId: shape.parentId ?? null,
      left: Math.round(shape.left ?? 0),
      top: Math.round(shape.top ?? 0),
      width: Math.round(shape.getScaledWidth()),
      height: Math.round(shape.getScaledHeight()),
    }));
  }

  describeConnections(): DiagramConnectionInfo[] {
    return this.connections.map((conn) => ({
      sourceId: conn.source.archimateId,
      targetId: conn.target.archimateId,
      type: conn.type,
    }));
  }

  findShapeById(id: string): ArchimateShape | undefined {
    return this.findShape((shape) => shape.archimateId === id);
  }

  createShape(spec: ShapeSpec): string | null {
    const shape = this.addShape({
      label: spec.label,
      color: spec.color ?? '#ffffff',
      icon: spec.icon ?? '▭',
      layer: spec.layer ?? 'Generic',
      x: spec.x ?? 60,
      y: spec.y ?? 60,
      width: spec.width ?? null,
      height: spec.height ?? null,
      parentId: spec.parentId ?? null,
      isImport: true,
    });
    return shape?.archimateId ?? null;
  }

  connectByIds(sourceId: string, targetId: string, type: RelationshipType): boolean {
    const source = this.findShapeById(sourceId);
    const target = this.findShapeById(targetId);
    if (!source || !target || source === target) return false;
    return this.createConnection(source, target, type, []) !== null;
  }

  disconnectByIds(sourceId: string, targetId: string, type?: RelationshipType): boolean {
    const matches = this.connections.filter(
      (conn) =>
        conn.source.archimateId === sourceId &&
        conn.target.archimateId === targetId &&
        (!type || conn.type === type),
    );
    for (const conn of matches) this.removeConnection(conn.line);
    return matches.length > 0;
  }

  removeShapeById(id: string): boolean {
    const shape = this.findShapeById(id);
    if (!shape) return false;
    this.removeShape(shape);
    return true;
  }

  renameShapeById(id: string, label: string): boolean {
    const shape = this.findShapeById(id);
    if (!shape) return false;
    const text = label.trim() || 'Unnamed';
    const textbox = shape.getObjects().find((child) => child.type === 'textbox') as
      | fabric.Textbox
      | undefined;
    textbox?.set('text', text);
    this.syncElementName(shape, text);
    shape.setCoords();
    return true;
  }

  moveShapeById(id: string, x: number, y: number): boolean {
    const shape = this.findShapeById(id);
    if (!shape) return false;
    shape.set({ left: x, top: y });
    shape.lastLeft = x;
    shape.lastTop = y;
    shape.setCoords();
    return true;
  }

  /** Re-points an element's ArchiMate parent, which hides part-whole nesting lines. */
  setShapeParentById(id: string, parentId: string | null): boolean {
    const shape = this.findShapeById(id);
    if (!shape || id === parentId || (parentId && !this.findShapeById(parentId))) return false;
    shape.parentId = parentId;
    return true;
  }

  /** Repaints after a batch of programmatic edits. */
  commitProgrammaticChanges(): void {
    this.updateAllConnections();
    this.canvas?.requestRenderAll();
    this.refreshTree();
    this.refreshProperties();
    this.commitHistory();
  }

  private allShapes(): ArchimateShape[] {
    const canvas = this.canvas;
    if (!canvas) return [];
    return canvas.getObjects().filter((obj): obj is ArchimateShape => {
      const shape = obj as ArchimateShape;
      return shape.isShape === true;
    });
  }

  // --- Shapes --------------------------------------------------------------

  private addShape(options: AddShapeOptions): ArchimateShape | null {
    const canvas = this.canvas;
    if (!canvas) return null;

    const isDark = this.theme.isDark();
    const isGroupShape = GROUP_SHAPE_ICONS.includes(options.icon) || options.layer === 'Generic';
    const width = options.width ?? (isGroupShape ? 320 : 140);
    const height = options.height ?? (isGroupShape ? 240 : 70);
    const groupItems: fabric.Object[] = [];

    if (isGroupShape) {
      const tabHeight = GROUP_TAB_HEIGHT;
      const tabWidth = Math.min(80, width * 0.4);
      groupItems.push(
        new fabric.Rect({
          width: tabWidth,
          height: tabHeight,
          fill: isDark ? '#1e293b' : options.color,
          stroke: isDark ? '#475569' : '#64748b',
          strokeWidth: SHAPE_STROKE_WIDTH,
          rx: 3,
          ry: 3,
          left: 0,
          top: 0,
          strokeDashArray: [6, 4],
        }),
        new fabric.Rect({
          width,
          height: height - tabHeight + 1,
          fill: 'transparent',
          stroke: isDark ? '#475569' : '#64748b',
          strokeWidth: 1,
          rx: 3,
          ry: 3,
          left: 0,
          top: tabHeight - 1,
          strokeDashArray: [6, 4],
        }),
        new fabric.Textbox(options.label, {
          width: width - 20,
          left: 10,
          top: 4,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'left',
          fill: isDark ? '#e2e8f0' : '#1e293b',
          splitByGrapheme: false,
        }),
        new fabric.Text(options.icon, {
          fontSize: 14,
          left: width - 24,
          top: 5,
          fill: isDark ? '#94a3b8' : '#64748b',
        }),
      );
    } else {
      const label = new fabric.Textbox(options.label, {
        width: width - 20,
        left: 10,
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        fill: '#1e293b',
        splitByGrapheme: false,
      });
      label.set({ top: (height - (label.height ?? 0)) / 2 });

      groupItems.push(
        new fabric.Rect({
          width,
          height,
          fill: options.color,
          stroke: isDark ? '#475569' : '#94a3b8',
          strokeWidth: SHAPE_STROKE_WIDTH,
          rx: 4,
          ry: 4,
          left: 0,
          top: 0,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.15)', blur: 4, offsetX: 0, offsetY: 2 }),
        }),
        label,
        new fabric.Text(options.icon, {
          fontSize: 14,
          left: width - 24,
          top: 6,
          fill: '#64748b',
        }),
      );
    }

    const shape = new fabric.Group(groupItems, {
      left: options.x,
      top: options.y,
      subTargetCheck: false,
      hasControls: true,
      hasBorders: true,
      selectable: !this.store.connectionMode(),
    }) as ArchimateShape;

    const elementId = options.forceId ?? this.generateElementId();
    shape.isShape = true;
    shape.archimateId = elementId;
    shape.archimateElementKey = compactKey('el', options.elementKey ?? elementId);
    shape.archimateLayer = options.layer;
    shape.originalColor = options.color;
    shape.archimateDoc = '';
    shape.isCollapsed = false;
    shape.parentId = options.parentId ?? null;
    shape.linkedView = '';
    shape.lastLeft = options.x;
    shape.lastTop = options.y;

    if (isGroupShape) {
      shape.borderColor = '#3b82f6';
      shape.borderScaleFactor = 2;
    }

    canvas.add(shape);
    if (isGroupShape) shape.sendToBack();

    this.ensureElement(shape, options.archimateType ?? null);

    if (!this.store.connectionMode() && !options.isImport) {
      canvas.setActiveObject(shape);
      canvas.requestRenderAll();
    }

    return shape;
  }

  private generateElementId(): string {
    return `el_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Guarantees a shape has a model element. Derived elements are registered quietly because the
   * shape that produced them is already part of the pending change.
   */
  private ensureElement(shape: ArchimateShape, archimateType: string | null): void {
    const key = shape.archimateElementKey;
    if (!key || this.store.elementFor(key)) return;
    const layer = layerOf(shape.archimateLayer);
    this.store.registerElements([
      {
        ...emptyModelElement(
          key,
          this.labelOf(shape) || 'Untitled',
          archimateType ?? archimateTypeForIcon(this.iconOf(shape), layer),
          layer,
        ),
        documentation: shape.archimateDoc ?? '',
      },
    ]);
  }

  /** Mirrors a rename onto the element, so every occurrence of it reads the same name. */
  private syncElementName(shape: ArchimateShape, name: string): void {
    const key = shape.archimateElementKey;
    const element = this.store.elementFor(key);
    if (!key || !element || element.name === name) return;
    const renamed = { ...element, name };
    this.store.upsertElement(renamed);
    this.applyElementToOccurrences(renamed);
  }

  /** Drops the element only when this was its last occurrence anywhere in the diagram. */
  private releaseElement(shape: ArchimateShape): void {
    const key = shape.archimateElementKey;
    if (!key) return;

    const usedOnCanvas = this.allShapes().some(
      (other) => other !== shape && other.archimateElementKey === key,
    );
    if (usedOnCanvas) return;

    // The active view's snapshot predates this deletion, so ignore the occurrence being removed
    // there while still counting the same element as used by any other view.
    const usedElsewhere = [...this.snapshots.entries()].some(([viewId, snapshot]) =>
      (snapshot.shapes ?? []).some((other) => {
        if ((other.elementKey || other.id) !== key) return false;
        return !(viewId === this.activeViewId && other.id === shape.archimateId);
      }),
    );
    if (usedElsewhere) return;

    this.store.removeElement(key);
  }

  // --- Connections ---------------------------------------------------------

  private createConnection(
    source: ArchimateShape,
    target: ArchimateShape,
    forceType?: RelationshipType,
    initialBendpoints: Point2D[] = [],
  ): DiagramConnection | null {
    const canvas = this.canvas;
    if (!canvas || source === target) return null;

    const type = forceType ?? this.store.connectionType();
    const isDark = this.theme.isDark();
    const lineColor = isDark ? '#94a3b8' : '#334155';
    const dashed = DASHED_TYPES.includes(type);

    const line = new fabric.Path('M 0 0 L 0 0', {
      fill: 'transparent',
      stroke: lineColor,
      strokeWidth: 2,
      strokeDashArray: dashed ? [6, 4] : undefined,
      selectable: true,
      evented: true,
      objectCaching: false,
      lockMovementX: true,
      lockMovementY: true,
      perPixelTargetFind: true,
      targetFindTolerance: 4,
      padding: 4,
      hasControls: false,
      borderColor: '#ef4444',
      hoverCursor: 'pointer',
    } as unknown as fabric.IPathOptions) as ConnectionLine;

    line.isConnection = true;
    line.connType = type;
    line.archimateDoc = '';
    line.sourceDec = null;
    line.targetDec = null;

    const sourceDec = this.createSourceDecoration(type, lineColor, isDark);
    const targetDec = this.createTargetDecoration(type, lineColor, isDark);

    line.sourceDec = sourceDec;
    line.targetDec = targetDec;

    canvas.add(line);
    if (sourceDec) canvas.add(sourceDec);
    if (targetDec) canvas.add(targetDec);

    const connection: DiagramConnection = {
      line,
      sourceDec,
      targetDec,
      source,
      target,
      type,
      bendpoints: initialBendpoints.map((point) => ({ ...point })),
      corePoints: [],
    };

    this.connections.push(connection);
    this.updateAllConnections();
    return connection;
  }

  private createSourceDecoration(
    type: RelationshipType,
    color: string,
    isDark: boolean,
  ): fabric.Object | null {
    const common = {
      originX: 'center',
      originY: 'center',
      hasControls: false,
      hasBorders: false,
      selectable: false,
      evented: false,
      objectCaching: false,
    } as const;

    const diamond = [
      { x: 0, y: -8 },
      { x: 6, y: 0 },
      { x: 0, y: 8 },
      { x: -6, y: 0 },
    ];

    if (type === 'composition') {
      return new fabric.Polygon(diamond, { ...common, fill: color });
    }

    if (type === 'aggregation') {
      return new fabric.Polygon(diamond, {
        ...common,
        fill: isDark ? '#0f172a' : '#ffffff',
        stroke: color,
        strokeWidth: 1.5,
      });
    }

    if (type === 'assignment') {
      return new fabric.Circle({ ...common, radius: 4, fill: color });
    }

    return null;
  }

  private createTargetDecoration(
    type: RelationshipType,
    color: string,
    isDark: boolean,
  ): fabric.Object | null {
    const common = {
      originX: 'center',
      originY: 'center',
      hasControls: false,
      hasBorders: false,
      selectable: false,
      evented: false,
      objectCaching: false,
    } as const;

    if (type === 'triggering' || type === 'flow') {
      return new fabric.Triangle({ ...common, width: 12, height: 14, fill: color });
    }

    if (type === 'realization' || type === 'specialization') {
      return new fabric.Triangle({
        ...common,
        width: 14,
        height: 16,
        fill: isDark ? '#0f172a' : '#ffffff',
        stroke: color,
        strokeWidth: 1.5,
      });
    }

    if (type === 'serving' || type === 'access' || type === 'influence') {
      return new fabric.Polyline(
        [
          { x: -6, y: 6 },
          { x: 0, y: 0 },
          { x: 6, y: 6 },
        ],
        { ...common, fill: '', stroke: color, strokeWidth: 1.5 },
      );
    }

    return null;
  }

  // --- Routing -------------------------------------------------------------

  /**
   * Rebuilds a connection's polyline and re-seats its decorations, mirroring the
   * original app: the line is clipped at both shape borders and shortened along
   * its own axis to make room for the source/target decorations.
   */
  private updateConnectionGeometry(conn: DiagramConnection): void {
    const sourceCenter = conn.source.getCenterPoint();
    const targetCenter = conn.target.getCenterPoint();
    const sourceWidth = (conn.source.width ?? 0) * (conn.source.scaleX ?? 1);
    const sourceHeight = (conn.source.height ?? 0) * (conn.source.scaleY ?? 1);
    const targetWidth = (conn.target.width ?? 0) * (conn.target.scaleX ?? 1);
    const targetHeight = (conn.target.height ?? 0) * (conn.target.scaleY ?? 1);

    const bendpoints = conn.bendpoints;
    const hasBendpoints = bendpoints.length > 0;

    const firstTarget = hasBendpoints ? bendpoints[0] : targetCenter;
    const lastTarget = hasBendpoints ? bendpoints[bendpoints.length - 1] : sourceCenter;

    const startEdge = getShapeEdgePoint(sourceCenter, sourceWidth, sourceHeight, firstTarget);
    const endEdge = getShapeEdgePoint(targetCenter, targetWidth, targetHeight, lastTarget);

    const startAngle = Math.atan2(firstTarget.y - startEdge.y, firstTarget.x - startEdge.x);
    const endAngle = Math.atan2(endEdge.y - lastTarget.y, endEdge.x - lastTarget.x);

    let start = startEdge;
    let end = endEdge;

    if (conn.type === 'aggregation' || conn.type === 'composition') {
      start = getPointOnLine(startEdge, firstTarget, 16);
    } else if (conn.type === 'assignment') {
      start = getPointOnLine(startEdge, firstTarget, 8);
    }

    if (conn.type === 'realization' || conn.type === 'specialization') {
      end = getPointOnLine(endEdge, lastTarget, 14);
    }

    conn.corePoints = [start, ...bendpoints.map((point) => ({ ...point })), end];

    const startAngleDeg = (startAngle * 180) / Math.PI + 90;
    const endAngleDeg = (endAngle * 180) / Math.PI + 90;

    if (conn.sourceDec) {
      let offset = 0;
      if (conn.type === 'composition' || conn.type === 'aggregation') offset = 8;
      else if (conn.type === 'assignment') offset = 4;

      conn.sourceDec.set({
        left: startEdge.x + Math.cos(startAngle) * offset,
        top: startEdge.y + Math.sin(startAngle) * offset,
        angle: startAngleDeg,
      });
      conn.sourceDec.setCoords();
    }

    if (conn.targetDec) {
      let offset = 0;
      if (conn.type === 'realization' || conn.type === 'specialization') offset = 8;
      else if (conn.type === 'triggering' || conn.type === 'flow') offset = 7;
      else if (conn.type === 'serving' || conn.type === 'access' || conn.type === 'influence') {
        offset = 3;
      }

      conn.targetDec.set({
        left: endEdge.x - Math.cos(endAngle) * offset,
        top: endEdge.y - Math.sin(endAngle) * offset,
        angle: endAngleDeg,
      });
      conn.targetDec.setCoords();
    }
  }

  private updateAllConnections(): void {
    const canvas = this.canvas;
    if (!canvas) return;

    for (const conn of this.connections) {
      this.updateConnectionGeometry(conn);
    }

    this.syncConnectionVisibility();

    this.connections.forEach((conn, index) => {
      if (!conn.line.visible) return;

      const earlier = this.connections
        .slice(0, index)
        .filter((other) => other.line.visible)
        .map((other) => other.corePoints);
      this.applyPath(conn.line, generatePathString(conn.corePoints, earlier));
    });

    canvas.requestRenderAll();
  }

  /**
   * Keeps every connection in step with what its endpoints are showing: lines
   * disappear while an endpoint sits inside a collapsed group, and part-whole
   * lines disappear while the two elements are nested, because ArchiMate draws
   * containment by nesting them instead of drawing the relationship.
   */
  private syncConnectionVisibility(): void {
    if (this.syncingVisibility) return;
    this.syncingVisibility = true;

    try {
      for (const conn of this.connections) {
        const endpointsVisible = conn.source.visible !== false && conn.target.visible !== false;
        const impliedByNesting =
          endpointsVisible &&
          NESTING_IMPLIED_TYPES.includes(conn.type) &&
          this.isNestedPair(conn.source, conn.target);

        this.setConnectionVisible(conn, endpointsVisible && !impliedByNesting);
      }
    } finally {
      this.syncingVisibility = false;
    }
  }

  private setConnectionVisible(conn: DiagramConnection, visible: boolean): void {
    if (conn.line.visible !== visible) conn.line.set('visible', visible);
    if (conn.sourceDec && conn.sourceDec.visible !== visible) conn.sourceDec.set('visible', visible);
    if (conn.targetDec && conn.targetDec.visible !== visible) conn.targetDec.set('visible', visible);

    // A line that just went away must not stay selected, or the toolbar and
    // properties panel would keep editing something the user cannot see.
    const active = this.canvas?.getActiveObject();
    if (!visible && active === conn.line) {
      this.canvas?.discardActiveObject();
    }
  }

  /** True when one of the two shapes is contained in the other, however that is expressed. */
  private isNestedPair(a: ArchimateShape, b: ArchimateShape): boolean {
    if (this.parentChainIncludes(a, b.archimateId)) return true;
    if (this.parentChainIncludes(b, a.archimateId)) return true;
    return this.enclosesShape(a, b) || this.enclosesShape(b, a);
  }

  private enclosesShape(outer: ArchimateShape, inner: ArchimateShape): boolean {
    const a = outer.getBoundingRect(true, true);
    const b = inner.getBoundingRect(true, true);

    return (
      b.left >= a.left &&
      b.top >= a.top &&
      b.left + b.width <= a.left + a.width &&
      b.top + b.height <= a.top + a.height
    );
  }

  private applyPath(line: ConnectionLine, pathString: string): void {
    const internals = line as unknown as PathInternals;
    const util = fabric.util as unknown as { parsePath(path: string): unknown };
    internals.path = util.parsePath(pathString);

    const dims = internals._calcDimensions();
    line.set({
      width: dims.width,
      height: dims.height,
      pathOffset: new fabric.Point(dims.left + dims.width / 2, dims.top + dims.height / 2),
      left: dims.left,
      top: dims.top,
    });
    line.setCoords();
    internals.dirty = true;
  }

  private setLineHighlight(active: ConnectionLine | undefined | null): void {
    const isDark = this.theme.isDark();
    const defaultColor = isDark ? '#94a3b8' : '#334155';
    const background = isDark ? '#0f172a' : '#ffffff';

    for (const conn of this.connections) {
      const isActive = conn.line === active;
      const color = isActive ? '#3b82f6' : defaultColor;
      conn.line.set('stroke', color);

      for (const dec of [conn.sourceDec, conn.targetDec]) {
        if (!dec) continue;
        const fill = dec.fill;
        if (dec.stroke) dec.set('stroke', color);
        if (typeof fill === 'string' && fill && fill !== 'transparent') {
          if (fill === '#ffffff' || fill === '#0f172a') dec.set('fill', background);
          else dec.set('fill', color);
        }
        dec.dirty = true;
      }

      if (isActive) conn.line.bringToFront();
    }
  }

  // --- Bendpoints ----------------------------------------------------------

  private showBendpoints(conn: DiagramConnection): void {
    this.clearBendpoints();
    // Bendpoint handles are editing affordances, so view-only mode never shows them.
    if (this.readOnly) return;
    const canvas = this.canvas;
    if (!canvas) return;

    this.bendpointHandles = conn.bendpoints.map((point, index) => {
      const handle = new fabric.Circle({
        radius: 5,
        fill: '#3b82f6',
        stroke: '#ffffff',
        strokeWidth: 2,
        left: point.x,
        top: point.y,
        originX: 'center',
        originY: 'center',
        hasControls: false,
        hasBorders: false,
        selectable: true,
        evented: true,
        hoverCursor: 'grab',
        moveCursor: 'grabbing',
        objectCaching: false,
      }) as BendpointHandle;

      handle.isBendpoint = true;
      handle.connection = conn;
      handle.bpIndex = index;
      canvas.add(handle);
      return handle;
    });

    for (const handle of this.bendpointHandles) handle.bringToFront();
  }

  private clearBendpoints(): void {
    const canvas = this.canvas;
    if (!canvas) return;
    for (const handle of this.bendpointHandles) canvas.remove(handle);
    this.bendpointHandles = [];
  }

  addBendpoint(): void {
    const canvas = this.canvas;
    const active = this.resolveActiveObject() as ConnectionLine | null;
    if (!canvas || !active?.isConnection || this.readOnly) return;

    const conn = this.connections.find((candidate) => candidate.line === active);
    if (!conn) return;

    const sourceCenter = conn.source.getCenterPoint();
    const targetCenter = conn.target.getCenterPoint();
    const lastPoint =
      conn.bendpoints.length > 0 ? conn.bendpoints[conn.bendpoints.length - 1] : sourceCenter;

    conn.bendpoints.push({
      x: (lastPoint.x + targetCenter.x) / 2,
      y: (lastPoint.y + targetCenter.y) / 2,
    });

    this.updateAllConnections();
    this.showBendpoints(conn);
    canvas.requestRenderAll();
    this.commitHistory();
  }

  clearBendpointsAction(): void {
    const canvas = this.canvas;
    const active = this.resolveActiveObject() as ConnectionLine | null;
    if (!canvas || !active?.isConnection || this.readOnly) return;

    const conn = this.connections.find((candidate) => candidate.line === active);
    if (!conn) return;

    conn.bendpoints = [];
    if (this.bendpointHandles.includes(canvas.getActiveObject() as BendpointHandle)) {
      canvas.setActiveObject(conn.line);
    }
    this.updateAllConnections();
    this.showBendpoints(conn);
    canvas.requestRenderAll();
    this.commitHistory();
  }

  private deleteBendpoint(handle: BendpointHandle): void {
    const canvas = this.canvas;
    const conn = handle.connection;
    if (!canvas) return;

    conn.bendpoints.splice(handle.bpIndex, 1);
    if (canvas.getActiveObject() === handle) canvas.setActiveObject(conn.line);
    this.updateAllConnections();
    this.showBendpoints(conn);
    this.refreshProperties();
    canvas.requestRenderAll();
    this.commitHistory();
  }

  // --- Canvas events -------------------------------------------------------

  private bindCanvasEvents(): void {
    const canvas = this.canvas;
    if (!canvas) return;

    canvas.on('selection:created', () => this.syncSelection());
    canvas.on('selection:updated', () => this.syncSelection());
    canvas.on('selection:cleared', () => this.onSelectionCleared());
    canvas.on('mouse:down', (opt) => this.onMouseDown(opt));
    canvas.on('mouse:move', (opt) => this.onMouseMove(opt));
    canvas.on('mouse:up', (opt) => this.onMouseUp(opt));
    canvas.on('mouse:dblclick', (opt) => this.onDoubleClick(opt));
    canvas.on('mouse:wheel', (opt) => this.onWheel(opt));
    canvas.on('object:moving', (opt) => this.onObjectMoving(opt));
    canvas.on('object:modified', (opt) => this.onObjectModified(opt));
    canvas.on('object:scaling', (opt) => this.onObjectScaling(opt));
  }

  private onMouseDown(opt: fabric.IEvent<Event>): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const event = opt.e as MouseEvent;
    const pointer = canvas.getPointer(event);

    if (event.altKey || event.button === 1 || this.isSpaceDown) {
      this.isPanning = true;
      canvas.selection = false;
      this.lastClientX = event.clientX;
      this.lastClientY = event.clientY;
      canvas.setCursor('grabbing');
      return;
    }

    // Viewers may select an object to read its properties, but every gesture
    // below this point creates or edits something.
    if (this.readOnly) return;

    if (this.store.connectionMode()) {
      const sourceCandidate = opt.target as ArchimateShape | undefined;
      if (sourceCandidate?.isShape) this.handleConnectionClick(sourceCandidate);
      return;
    }

    const target = opt.target as ArchimateShape | undefined;
    if (event.shiftKey && target?.isShape && !this.store.connectionMode()) {
      this.isShiftDragging = true;
      this.shiftSource = target;
      canvas.selection = false;

      const center = target.getCenterPoint();
      this.tempLine = new fabric.Line([center.x, center.y, pointer.x, pointer.y], {
        stroke: '#3b82f6',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        objectCaching: false,
      });
      canvas.add(this.tempLine);
    }
  }

  private onMouseMove(opt: fabric.IEvent<Event>): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const event = opt.e as MouseEvent;
    const pointer = canvas.getPointer(event);

    if (this.isPanning) {
      const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
      vpt[4] += event.clientX - this.lastClientX;
      vpt[5] += event.clientY - this.lastClientY;
      this.lastClientX = event.clientX;
      this.lastClientY = event.clientY;
      canvas.setViewportTransform(vpt);
      this.syncPatternOffset();
      canvas.requestRenderAll();
    }

    if (this.isShiftDragging && this.tempLine) {
      this.tempLine.set({ x2: pointer.x, y2: pointer.y });
      this.tempLine.setCoords();
      canvas.requestRenderAll();
    }

    if (this.isPanning || this.isShiftDragging) this.updateToolbar();
  }

  private onMouseUp(opt: fabric.IEvent<Event>): void {
    const canvas = this.canvas;
    if (!canvas) return;

    if (this.isPanning) {
      this.isPanning = false;
      // Rubber-band selection stays off for viewers, so restore their state.
      canvas.selection = !this.readOnly;
      canvas.setCursor('default');
      this.updateToolbar();
    }

    if (!this.isShiftDragging) return;

    const source = this.shiftSource;
    this.isShiftDragging = false;
    this.shiftSource = null;
    canvas.selection = !this.readOnly;

    if (this.tempLine) {
      canvas.remove(this.tempLine);
      this.tempLine = null;
    }

    const target = canvas.findTarget(opt.e as MouseEvent, false) as ArchimateShape | undefined;
    if (source && target?.isShape && target !== source) {
      this.createConnection(source, target);
      this.refreshTree();
      this.commitHistory();
    }
    this.updateToolbar();
    canvas.requestRenderAll();
  }

  private onWheel(opt: fabric.IEvent<Event>): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const event = opt.e as WheelEvent;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      const zoom = Math.max(0.1, Math.min(5, canvas.getZoom() * 0.999 ** event.deltaY));
      canvas.zoomToPoint(new fabric.Point(event.offsetX, event.offsetY), zoom);
    } else {
      const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
      vpt[4] -= event.deltaX;
      vpt[5] -= event.deltaY;
      canvas.setViewportTransform(vpt);
    }

    this.syncPatternOffset();
    this.updateToolbar();
    canvas.requestRenderAll();
  }

  private onObjectMoving(opt: fabric.IEvent<Event>): void {
    const target = opt.target;
    if (!target) return;

    if (target.type === 'activeSelection') {
      this.updateAllConnections();
      return;
    }

    const handle = target as BendpointHandle;
    if (handle.isBendpoint) {
      const conn = handle.connection;
      const index = handle.bpIndex;
      if (index >= 0 && index < conn.bendpoints.length) {
        conn.bendpoints[index] = { x: handle.left ?? 0, y: handle.top ?? 0 };
      }
      this.updateAllConnections();
      this.updateToolbar();
      return;
    }

    const shape = target as ArchimateShape;
    if (!shape.isShape) return;

    const left = Math.round((shape.left ?? 0) / GRID_SIZE) * GRID_SIZE;
    const top = Math.round((shape.top ?? 0) / GRID_SIZE) * GRID_SIZE;
    shape.set({ left, top });

    const dx = left - (shape.lastLeft ?? left);
    const dy = top - (shape.lastTop ?? top);
    shape.lastLeft = left;
    shape.lastTop = top;

    if (dx !== 0 || dy !== 0) this.moveChildren(shape, dx, dy);

    this.updateAllConnections();
    this.updateToolbar();
  }

  private moveChildren(parent: ArchimateShape, dx: number, dy: number): void {
    const canvas = this.canvas;
    if (!canvas) return;

    for (const obj of canvas.getObjects()) {
      const shape = obj as ArchimateShape;
      if (!shape.isShape || shape === parent) continue;
      if (shape.parentId !== parent.archimateId) continue;

      const left = (shape.left ?? 0) + dx;
      const top = (shape.top ?? 0) + dy;
      shape.set({ left, top });
      shape.lastLeft = left;
      shape.lastTop = top;
      shape.setCoords();
      this.moveChildren(shape, dx, dy);
    }
  }

  private onObjectModified(opt: fabric.IEvent<Event>): void {
    const shape = opt.target as ArchimateShape | undefined;
    if (shape?.isShape) {
      this.normalizeShapeScale(shape);
      this.handleAutoGroup(shape);
    }
    this.updateAllConnections();
    this.syncSelection();
    this.commitHistory();
  }

  private handleAutoGroup(movedShape: ArchimateShape): void {
    const canvas = this.canvas;
    if (!canvas || movedShape.isCollapsed) return;

    const center = movedShape.getCenterPoint();
    const objects = canvas.getObjects();

    for (let index = objects.length - 1; index >= 0; index--) {
      const candidate = objects[index] as ArchimateShape;
      if (!candidate.isShape || candidate === movedShape) continue;
      if (this.parentChainIncludes(candidate, movedShape.archimateId)) continue;

      const bounds = candidate.getBoundingRect();
      const inside =
        center.x >= bounds.left &&
        center.x <= bounds.left + bounds.width &&
        center.y >= bounds.top &&
        center.y <= bounds.top + bounds.height;
      if (!inside) continue;

      if (this.isContainerShape(candidate) && !candidate.isCollapsed) {
        movedShape.parentId = candidate.archimateId;
        break;
      }

      if (!candidate.isCollapsed) {
        const exists = this.connections.some(
          (conn) =>
            conn.source === movedShape && conn.target === candidate && conn.type === 'composition',
        );
        if (!exists) {
          this.createConnection(movedShape, candidate, 'composition');
          this.store.showToast('Composition created; hidden because nesting already shows it.');
        }
        break;
      }
    }
  }

  private parentChainIncludes(shape: ArchimateShape, ancestorId: string): boolean {
    let parentId = shape.parentId;
    let guard = 0;

    while (parentId && guard++ < 50) {
      if (parentId === ancestorId) return true;
      const parent = this.findShape((candidate) => candidate.archimateId === parentId);
      parentId = parent?.parentId ?? null;
    }
    return false;
  }

  private findShape(predicate: (shape: ArchimateShape) => boolean): ArchimateShape | undefined {
    const canvas = this.canvas;
    if (!canvas) return undefined;
    return canvas
      .getObjects()
      .map((obj) => obj as ArchimateShape)
      .find((shape) => shape.isShape && predicate(shape));
  }

  private onObjectScaling(opt: fabric.IEvent<Event>): void {
    const shape = opt.target as ArchimateShape | undefined;
    if (!shape?.isShape) return;

    this.layoutShape(shape, shape.scaleX ?? 1, shape.scaleY ?? 1);
    this.updateAllConnections();
    this.updateToolbar();
  }

  /**
   * Folds a group's scale into its children so they keep their own stroke weight
   * and un-stretched text, then keeps the visual centre where it was.
   */
  private layoutShape(shape: ArchimateShape, scaleX: number, scaleY: number): void {
    const children = shape.getObjects();
    const rects = children.filter((child) => child.type === 'rect') as fabric.Rect[];
    const tab = rects.find((rect) => rect.height === GROUP_TAB_HEIGHT);
    const body = rects.find((rect) => rect !== tab);
    const label = children.find((child) => child.type === 'textbox') as fabric.Textbox | undefined;
    const icon = children.find((child) => child.type === 'text') as fabric.Text | undefined;
    const stroke = body?.strokeWidth ?? SHAPE_STROKE_WIDTH;

    // The group box includes half a stroke of bleed on each side, so the content
    // box is the box minus one stroke; keeping that mapping exact stops the size
    // from creeping by a pixel on every resize.
    const boundsWidth = Math.max(MIN_SHAPE_WIDTH, (shape.width ?? 0) * scaleX);
    const boundsHeight = Math.max(MIN_SHAPE_HEIGHT, (shape.height ?? 0) * scaleY);
    const width = Math.max(MIN_SHAPE_WIDTH - stroke, boundsWidth - stroke);
    const height = Math.max(MIN_SHAPE_HEIGHT - stroke, boundsHeight - stroke);
    const center = shape.getCenterPoint();

    // Children are positioned around the group's centre, so mirror the layout
    // used when the shape was built to keep everything anchored.
    if (tab && body) {
      tab.set({
        width: Math.min(80, width * 0.4),
        height: GROUP_TAB_HEIGHT,
        left: -width / 2,
        top: -height / 2,
      });
      body.set({
        width,
        height: Math.max(GROUP_TAB_HEIGHT - 1, height - GROUP_TAB_HEIGHT + 1),
        left: -width / 2,
        top: -height / 2 + GROUP_TAB_HEIGHT - 1,
      });
    } else {
      body?.set({ width, height, left: -width / 2, top: -height / 2 });
    }

    if (label) {
      label.set({ width: Math.max(20, width - 20), scaleX: 1, scaleY: 1 });
      label.set(
        tab
          ? { left: -width / 2 + 10, top: -height / 2 + 4 }
          : { left: -width / 2 + 10, top: -(label.height ?? 0) / 2 },
      );
    }

    icon?.set({
      left: width / 2 - 24,
      top: -height / 2 + (tab ? 5 : 6),
      scaleX: 1,
      scaleY: 1,
    });

    shape.set({
      width: width + stroke,
      height: height + stroke,
      scaleX: 1,
      scaleY: 1,
    });
    shape.setPositionByOrigin(center, 'center', 'center');
    shape.setCoords();
  }

  /** True when the shape had a leftover scale that needed folding into its size. */
  private normalizeShapeScale(shape: ArchimateShape): boolean {
    const scaleX = shape.scaleX ?? 1;
    const scaleY = shape.scaleY ?? 1;
    if (Math.abs(scaleX - 1) < 0.001 && Math.abs(scaleY - 1) < 0.001) return false;

    this.layoutShape(shape, scaleX, scaleY);
    return true;
  }

  private onSelectionCleared(): void {
    const canvas = this.canvas;
    let changed = false;

    // Resizing a multi-selection hands its scale down to the shapes when the
    // selection is released, which would leave stretched text behind.
    for (const obj of canvas?.getObjects() ?? []) {
      const shape = obj as ArchimateShape;
      if (!shape.isShape) continue;
      changed = this.normalizeShapeScale(shape) || changed;
    }

    if (changed) this.updateAllConnections();
    this.syncSelection();
  }

  private onDoubleClick(opt: fabric.IEvent<Event>): void {
    const canvas = this.canvas;
    if (!canvas || !opt.target) return;

    if (this.readOnly) {
      // Only navigation stays available to a viewer.
      const shape = opt.target as ArchimateShape;
      if (shape.isShape && shape.linkedView) this.selectView(shape.linkedView);
      return;
    }

    const bendpoint = opt.target as BendpointHandle;
    if (bendpoint.isBendpoint) {
      this.deleteBendpoint(bendpoint);
      return;
    }

    const connection = opt.target as ConnectionLine;
    if (connection.isConnection) {
      this.insertBendpointAt(connection, canvas.getPointer(opt.e as MouseEvent));
      return;
    }

    const shape = opt.target as ArchimateShape;
    if (!shape.isShape) return;

    if (shape.linkedView) {
      this.selectView(shape.linkedView);
      return;
    }
    this.openLabelDialog(shape);
  }

  private insertBendpointAt(connection: ConnectionLine, point: Point2D): void {
    const conn = this.connections.find((candidate) => candidate.line === connection);
    const points = conn?.corePoints;
    if (!conn || !points || points.length < 2) return;

    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length - 1; i++) {
      const distance = this.distanceToSegment(point, points[i], points[i + 1]);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    conn.bendpoints.splice(closestIndex, 0, { x: point.x, y: point.y });
    this.updateAllConnections();
    this.showBendpoints(conn);
    this.canvas?.requestRenderAll();
    this.commitHistory();
  }

  private distanceToSegment(point: Point2D, a: Point2D, b: Point2D): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);

    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
    return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
  }

  // --- Keyboard & touch ----------------------------------------------------

  private bindKeyboard(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      if (this.store.connectionMode()) this.toggleConnectionMode();
      this.store.editDialogValue.set(null);
      this.store.clearDialogOpen.set(false);
      this.store.newViewDialogOpen.set(false);
      // Let an open dialog consume the first Escape; the next one closes mobile sidebars.
      if (!document.querySelector('ngb-modal-window')) {
        this.store.paletteOpen.set(false);
        this.store.explorerOpen.set(false);
      }
      return;
    }

    const active = document.activeElement as HTMLElement | null;
    const tag = active?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active?.isContentEditable) return;

    const isCopy = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c';
    if (isCopy) {
      this.copySelection();
      return;
    }

    if (this.readOnly) return;

    // Text fields keep the browser's native undo, so these come after the guard.
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if (key === 'y') {
        event.preventDefault();
        this.redo();
        return;
      }
    }

    if (event.code === 'Space') {
      this.isSpaceDown = true;
      if (this.canvas) this.canvas.defaultCursor = 'grab';
      event.preventDefault();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.deleteActive();
      return;
    }

    const isPaste = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v';
    if (isPaste) {
      this.pasteCopied();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.code !== 'Space') return;
    this.isSpaceDown = false;
    if (this.canvas) this.canvas.defaultCursor = 'default';
  };

  private copySelection(): void {
    const active = this.canvas?.getActiveObject() as fabric.Object | undefined;
    if (!active) return;

    const objects =
      active.type === 'activeSelection'
        ? ((active as fabric.ActiveSelection).getObjects() as fabric.Object[])
        : [active];

    const items: CopiedItem[] = [];
    for (const object of objects) {
      const shape = object as ArchimateShape;
      const line = object as ConnectionLine;
      if (shape.isShape) {
        items.push({
          kind: 'shape',
          label: this.labelOf(shape),
          color: shape.originalColor,
          icon: this.iconOf(shape),
          layer: shape.archimateLayer,
          left: shape.left ?? 0,
          top: shape.top ?? 0,
          width: shape.width ?? null,
          height: shape.height ?? null,
          elementId: shape.archimateId || null,
          parentId: shape.parentId ?? null,
        });
        continue;
      }

      const connection = this.connections.find((candidate) => candidate.line === line);
      if (!connection) continue;
      items.push({
        kind: 'connection',
        type: connection.type,
        source: connection.source,
        target: connection.target,
        bendpoints: connection.bendpoints.map((point) => ({ ...point })),
      });
    }

    if (items.length === 0) return;

    this.clipboard = items;
    this.pasteSeq = 0;
    this.store.showToast(
      items.length === 1 ? 'Element copied to clipboard.' : `${items.length} elements copied to clipboard.`,
    );
  }

  private pasteCopied(): void {
    const canvas = this.canvas;
    if (!canvas || this.clipboard.length === 0) return;

    this.pasteSeq += 1;
    const offset = this.pasteSeq * PASTE_OFFSET;
    const created: fabric.Object[] = [];

    for (const item of this.clipboard) {
      if (item.kind === 'shape') {
        const shape = this.addShape({
          label: item.label,
          color: item.color,
          icon: item.icon,
          layer: item.layer,
          x: item.left + offset,
          y: item.top + offset,
          width: item.width,
          height: item.height,
          forceId: item.elementId,
          parentId: item.parentId,
        });
        if (shape) created.push(shape);
        continue;
      }

      // A copied relationship can only be recreated while both endpoints are on the current view.
      const onCanvas = (shape: ArchimateShape): boolean => canvas.getObjects().includes(shape);
      if (!onCanvas(item.source) || !onCanvas(item.target)) continue;

      const connection = this.createConnection(
        item.source,
        item.target,
        item.type,
        item.bendpoints.map((point) => ({ x: point.x + offset, y: point.y + offset })),
      );
      if (connection) created.push(connection.line);
    }

    if (created.length === 0) {
      this.store.showToast('Nothing to paste: the copied element is not part of this view.', true);
      return;
    }

    canvas.setActiveObject(
      created.length === 1 ? created[0] : new fabric.ActiveSelection(created, { canvas }),
    );
    this.syncSelection();
    this.commitHistory();
    this.store.showToast(created.length === 1 ? 'Element pasted.' : `${created.length} elements pasted.`);
  }

  private bindTouch(): void {
    const upper = this.upperCanvasEl;
    if (!upper) return;
    upper.addEventListener('touchstart', this.onTouchStart, { passive: false });
    upper.addEventListener('touchmove', this.onTouchMove, { passive: false });
    upper.addEventListener('touchend', this.onTouchEnd);
  }

  private unbindTouch(): void {
    const upper = this.upperCanvasEl;
    if (!upper) return;
    upper.removeEventListener('touchstart', this.onTouchStart);
    upper.removeEventListener('touchmove', this.onTouchMove);
    upper.removeEventListener('touchend', this.onTouchEnd);
  }

  private readonly onTouchStart = (event: TouchEvent): void => {
    if (event.touches.length !== 2) return;
    this.touchDistance = this.touchSpan(event);
    this.touchCenter = this.touchMidpoint(event);
  };

  private readonly onTouchMove = (event: TouchEvent): void => {
    const canvas = this.canvas;
    if (!canvas || event.touches.length !== 2) return;
    event.preventDefault();

    const distance = this.touchSpan(event);
    const center = this.touchMidpoint(event);

    if (this.touchDistance > 0) {
      const zoom = Math.max(0.1, Math.min(5, canvas.getZoom() * (distance / this.touchDistance)));
      canvas.zoomToPoint(new fabric.Point(center.x, center.y), zoom);
    }

    const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    vpt[4] += center.x - this.touchCenter.x;
    vpt[5] += center.y - this.touchCenter.y;
    canvas.setViewportTransform(vpt);

    this.touchDistance = distance;
    this.touchCenter = center;
    this.syncPatternOffset();
    canvas.requestRenderAll();
  };

  private readonly onTouchEnd = (): void => {
    this.touchDistance = 0;
  };

  private touchSpan(event: TouchEvent): number {
    const [first, second] = Array.from(event.touches);
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  }

  private touchMidpoint(event: TouchEvent): Point2D {
    const rect = this.upperCanvasEl?.getBoundingClientRect();
    const [first, second] = Array.from(event.touches);
    return {
      x: (first.clientX + second.clientX) / 2 - (rect?.left ?? 0),
      y: (first.clientY + second.clientY) / 2 - (rect?.top ?? 0),
    };
  }

  // --- Selection & inspector ----------------------------------------------

  private keyFor(object: fabric.Object): string {
    let key = this.objectKeys.get(object);
    if (!key) {
      key = `obj_${++this.keySeq}`;
      this.objectKeys.set(object, key);
    }
    return key;
  }

  selectByKey(key: string): void {
    const canvas = this.canvas;
    const object = this.liveObjects.get(key);
    if (!canvas || !object) return;
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    this.syncSelection();
  }

  /**
   * Selects an occurrence of a model element, so a problem in the validation panel can jump to
   * the shape that shows it. Returns false when the element is not drawn in this view.
   */
  selectElement(elementKey: string): boolean {
    const shape = this.allShapes().find((item) => item.archimateElementKey === elementKey);
    if (!shape) return false;
    this.selectByKey(shape.archimateId);
    this.ensureVisible(shape);
    return true;
  }

  /** Pans just enough to bring an object into view; the zoom stays where the user left it. */
  private ensureVisible(object: fabric.Object): void {
    const canvas = this.canvas;
    if (!canvas) return;
    const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    const zoom = vpt[0] || 1;
    const bounds = object.getBoundingRect(true);
    const left = -vpt[4] / zoom;
    const top = -vpt[5] / zoom;
    const right = left + canvas.getWidth() / zoom;
    const bottom = top + canvas.getHeight() / zoom;
    const visible =
      bounds.left >= left &&
      bounds.top >= top &&
      bounds.left + bounds.width <= right &&
      bounds.top + bounds.height <= bottom;
    if (visible) return;

    const center = object.getCenterPoint();
    vpt[4] = canvas.getWidth() / 2 - center.x * zoom;
    vpt[5] = canvas.getHeight() / 2 - center.y * zoom;
    canvas.setViewportTransform(vpt);
    this.syncPatternOffset();
    canvas.requestRenderAll();
  }

  /**
   * Bendpoint handles are transient helpers: whenever one is selected or dragged,
   * the connection it belongs to is treated as the active object so the line keeps
   * its highlight, properties and toolbar.
   */
  private resolveActiveObject(): fabric.Object | null {
    const active = (this.canvas?.getActiveObject() ?? null) as
      | (fabric.Object & Partial<BendpointHandle>)
      | null;
    if (!active) return null;
    return active.isBendpoint && active.connection ? active.connection.line : active;
  }

  private syncSelection(): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const rawActive = (canvas.getActiveObject() ?? null) as
      | (fabric.Object & Partial<BendpointHandle>)
      | null;
    const activeHandle = rawActive?.isBendpoint && rawActive.connection ? rawActive : null;
    const active = activeHandle?.connection?.line ?? rawActive;

    this.setLineHighlight(active as ConnectionLine | null);

    const connection = active as ConnectionLine | null;
    const diagramConnection = connection?.isConnection
      ? this.connections.find((candidate) => candidate.line === connection)
      : undefined;

    if (activeHandle) {
      this.setLineHighlight(activeHandle.connection!.line);
    } else if (diagramConnection) {
      this.showBendpoints(diagramConnection);
    } else {
      this.clearBendpoints();
    }

    // A viewer only selects an object to inspect it, so surface its properties.
    if (this.readOnly && active) this.store.setSidebarTab('properties');

    this.refreshTree();
    this.refreshProperties();
    this.updateToolbar();
    canvas.requestRenderAll();
  }

  /**
   * Counts where each element is drawn: once per shape on the canvas, and once per shape in the
   * stored snapshots of the views that are not currently loaded.
   */
  private elementUsage(): Map<string, { occurrences: number; views: number }> {
    const usage = new Map<string, { occurrences: number; views: Set<string> }>();
    const record = (key: string, viewId: string): void => {
      const entry = usage.get(key) ?? { occurrences: 0, views: new Set<string>() };
      entry.occurrences++;
      entry.views.add(viewId);
      usage.set(key, entry);
    };

    for (const [viewId, snapshot] of this.snapshots) {
      if (viewId === this.activeViewId) continue;
      for (const shape of snapshot.shapes ?? []) record(compactKey('el', shape.elementKey || shape.id), viewId);
    }
    for (const shape of this.allShapes()) {
      const key = shape.archimateElementKey;
      if (key) record(key, this.activeViewId);
    }

    return new Map(
      [...usage].map(([key, entry]) => [
        key,
        { occurrences: entry.occurrences, views: entry.views.size },
      ]),
    );
  }

  private refreshTree(): void {
    const canvas = this.canvas;
    this.liveObjects = new Map();

    const views: ViewSummary[] = [...this.views.entries()].map(([id, view]) => ({
      id,
      name: view.name,
      viewpoint: view.viewpoint,
      contentType: view.contentType,
      isActive: id === this.activeViewId,
    }));
    this.store.setViews(views);
    this.store.setActiveView(this.activeViewId);

    // The repository is the model itself, so it lists every element once no matter how many
    // views draw it, with a badge saying where it is already used.
    const usage = this.elementUsage();
    const repositoryLayers = new Map<ArchimateLayer, RepositoryLayer['items']>();
    for (const element of this.store.elements()) {
      const palette = paletteItemFor(element.archimateType);
      const items = repositoryLayers.get(element.layer) ?? [];
      const used = usage.get(element.key);
      items.push({
        id: element.key,
        elementKey: element.key,
        label: element.name,
        icon: palette?.icon ?? '▭',
        color: palette?.color ?? '#ffffff',
        occurrences: used?.occurrences ?? 0,
        viewCount: used?.views ?? 0,
      });
      repositoryLayers.set(element.layer, items);
    }
    this.store.repository.set(
      [...repositoryLayers.entries()]
        .sort((a, b) => compareLayers(a[0], b[0]))
        .map(([layer, items]) => ({
          layer,
          items: [...items].sort((a, b) => a.label.localeCompare(b.label)),
        })),
    );

    const activeObject = this.resolveActiveObject();
    const layerMap = new Map<ArchimateLayer, ShapeSummary[]>();

    if (canvas) {
      for (const obj of canvas.getObjects()) {
        const shape = obj as ArchimateShape;
        if (!shape.isShape) continue;

        const key = this.keyFor(shape);
        this.liveObjects.set(key, shape);
        const summary: ShapeSummary = {
          id: key,
          label: this.labelOf(shape),
          icon: this.iconOf(shape),
          layer: layerOf(shape.archimateLayer),
          color: shape.originalColor,
          isActive: activeObject === shape,
        };
        const shapes = layerMap.get(summary.layer) ?? [];
        shapes.push(summary);
        layerMap.set(summary.layer, shapes);
      }
    }

    this.store.layers.set(
      [...layerMap.entries()]
        .sort((a, b) => compareLayers(a[0], b[0]))
        .map(([layer, shapes]) => ({ layer, shapes })),
    );

    const relationships: RelationshipSummary[] = this.connections.map((conn, index) => {
      const key = this.keyFor(conn.line);
      this.liveObjects.set(key, conn.line);
      return {
        index,
        key,
        type: conn.type,
        label: this.formatType(conn.type),
        sourceName: this.labelOf(conn.source),
        targetName: this.labelOf(conn.target),
        isActive: activeObject === conn.line,
      };
    });
    this.store.relationships.set(relationships);
  }

  private refreshProperties(): void {
    const canvas = this.canvas;
    const active = this.resolveActiveObject() as fabric.Object | undefined;
    if (!active) {
      this.store.resetSelection();
      return;
    }

    const connection = active as ConnectionLine;
    if (connection.isConnection) {
      this.store.selection.set({
        kind: 'connection',
        name: '',
        parentId: '',
        linkedView: '',
        color: '#ffffff',
        connType: connection.connType,
        doc: connection.archimateDoc ?? '',
        canCollapse: false,
        isCollapsed: false,
        elementKey: '',
        availableParentGroups: [],
        availableLinkedViews: [],
      });
      return;
    }

    const shape = active as ArchimateShape;
    if (!shape.isShape) {
      this.store.resetSelection();
      return;
    }

    const rects = shape.getObjects().filter((child) => child.type === 'rect') as fabric.Rect[];
    const icon = this.iconOf(shape);
    const isGroupShape =
      this.isContainerShape(shape) || (shape.archimateLayer === 'Physical' && icon === '⌂');
    const hasCompositionTargets = this.connections.some(
      (conn) => conn.source === shape && conn.type === 'composition',
    );

    const parentGroups = (canvas?.getObjects() ?? [])
      .map((obj) => obj as ArchimateShape)
      .filter(
        (candidate) =>
          candidate.isShape && candidate !== shape && this.isContainerShape(candidate),
      )
      .map((candidate) => ({ id: candidate.archimateId, name: this.labelOf(candidate) }));

    const availableLinkedViews = [...this.views.entries()]
      .filter(([id]) => id !== this.activeViewId)
      .map(([id, view]) => ({ id, name: view.name }));

    const selection: SelectionProperties = {
      kind: 'shape',
      name: this.labelOf(shape),
      parentId: shape.parentId ?? '',
      linkedView: shape.linkedView ?? '',
      color: rects.length > 0 ? this.hexToRgbStr(rects[0].fill) : '#ffffff',
      connType: 'association',
      doc: shape.archimateDoc ?? '',
      canCollapse: isGroupShape || hasCompositionTargets,
      isCollapsed: shape.isCollapsed,
      elementKey: shape.archimateElementKey ?? '',
      availableParentGroups: parentGroups,
      availableLinkedViews,
    };
    this.store.selection.set(selection);
  }

  private updateToolbar(): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const hide = (): void => this.store.toolbar.set({ visible: false, left: 0, top: 0 });
    const active = this.resolveActiveObject();
    if (
      !active ||
      active.type === 'activeSelection' ||
      this.store.connectionMode() ||
      this.isPanning ||
      this.isShiftDragging
    ) {
      hide();
      return;
    }

    const isConnection = (active as ConnectionLine).isConnection === true;
    const isShape = (active as ArchimateShape).isShape === true;
    if (!isConnection && !isShape) {
      hide();
      return;
    }

    // Every toolbar action mutates the diagram, so viewers get no toolbar.
    if (this.readOnly) {
      hide();
      return;
    }

    // `getBoundingRect` already maps scene coordinates through the viewport
    // transform, so it returns CSS pixels relative to the canvas element, which
    // is exactly the coordinate space the toolbar is positioned in.
    const bounds = active.getBoundingRect(false, true);
    const above = bounds.top - TOOLBAR_OFFSET;
    this.store.toolbar.set({
      visible: true,
      left: bounds.left + bounds.width / 2,
      // Flip below the object when there is no room above it, so the toolbar
      // never gets pinned to the top of the canvas.
      top: above >= TOOLBAR_MIN_TOP ? above : bounds.top + bounds.height + TOOLBAR_GAP,
    });
  }

  private labelOf(shape: ArchimateShape): string {
    const textbox = shape.getObjects().find((child) => child.type === 'textbox') as
      | fabric.Textbox
      | undefined;
    return textbox?.text || 'Unnamed';
  }

  private iconOf(shape: ArchimateShape): string {
    const icon = shape.getObjects().find((child) => child.type === 'text') as
      | fabric.Text
      | undefined;
    return icon?.text ?? '';
  }

  /** Grouping and Location (both `Generic`) render as containers that hold other shapes. */
  private isContainerShape(shape: ArchimateShape): boolean {
    return GROUP_SHAPE_ICONS.includes(this.iconOf(shape)) || shape.archimateLayer === 'Generic';
  }

  private hexToRgbStr(fill: string | fabric.Pattern | fabric.Gradient | null | undefined): string {
    if (!fill || typeof fill !== 'string') return '#ffffff';
    if (/^#[0-9a-f]{6}$/i.test(fill)) return fill;

    const channels = fill.match(/\d+/g);
    if (channels && channels.length >= 3) {
      return `#${channels
        .slice(0, 3)
        .map((channel) => Number(channel).toString(16).padStart(2, '0'))
        .join('')}`;
    }
    return '#ffffff';
  }

  private formatType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  // --- Inspector actions ---------------------------------------------------

  private openLabelDialog(shape: ArchimateShape): void {
    const textbox = shape.getObjects().find((child) => child.type === 'textbox') as
      | fabric.Textbox
      | undefined;
    if (!textbox) return;

    this.editShape = shape;
    this.editTextbox = textbox;
    this.store.editDialogValue.set(textbox.text ?? '');
  }

  saveLabel(text: string): void {
    const shape = this.editShape;
    const textbox = this.editTextbox;
    if (this.readOnly) {
      this.closeLabelDialog();
      return;
    }
    this.closeLabelDialog();

    if (!shape || !textbox) return;

    const label = text.trim() || 'Unnamed';
    textbox.set('text', label);
    this.syncElementName(shape, label);
    this.canvas?.requestRenderAll();
    this.refreshTree();
    this.refreshProperties();
    this.commitHistory();
  }

  closeLabelDialog(): void {
    this.editShape = null;
    this.editTextbox = null;
    this.store.editDialogValue.set(null);
  }

  editActiveObject(): void {
    if (this.readOnly) return;
    const active = this.canvas?.getActiveObject() as ArchimateShape | undefined;
    if (active?.isShape) {
      this.openLabelDialog(active);
      return;
    }
    this.store.setSidebarTab('properties');
  }

  updateProperty(property: 'name' | 'parent' | 'link' | 'color' | 'type' | 'doc', value: string): void {
    const canvas = this.canvas;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || this.readOnly) return;

    const shape = active as ArchimateShape;
    const connection = active as ConnectionLine;

    switch (property) {
      case 'name': {
        if (!shape.isShape) return;
        const label = value || 'Unnamed';
        if (this.store.elementFor(shape.archimateElementKey)) {
          this.updateElement({ name: label });
          return;
        }
        const textbox = shape.getObjects().find((child) => child.type === 'textbox') as
          | fabric.Textbox
          | undefined;
        if (textbox) textbox.set('text', label);
        this.syncElementName(shape, label);
        canvas.requestRenderAll();
        this.refreshTree();
        this.commitHistory();
        return;
      }
      case 'parent': {
        if (!shape.isShape) return;
        shape.parentId = value || null;
        this.refreshTree();
        this.commitHistory();
        return;
      }
      case 'link': {
        if (!shape.isShape) return;
        shape.linkedView = value;
        this.commitHistory();
        return;
      }
      case 'color': {
        if (!shape.isShape) return;
        const rect = shape.getObjects().find((child) => child.type === 'rect') as
          | fabric.Rect
          | undefined;
        if (rect) rect.set('fill', value);
        canvas.requestRenderAll();
        this.refreshProperties();
        this.commitHistory();
        return;
      }
      case 'type': {
        if (!connection.isConnection) return;
        this.changeConnectionType(connection, value as RelationshipType);
        return;
      }
      case 'doc': {
        if (connection.isConnection) {
          connection.archimateDoc = value;
          this.commitHistory();
          return;
        }
        if (shape.isShape && this.store.elementFor(shape.archimateElementKey)) {
          this.updateElement({ documentation: value });
          return;
        }
        if (shape.isShape) shape.archimateDoc = value;
        this.commitHistory();
        return;
      }
    }
  }

  /**
   * Applies a semantics edit to the element behind the selected shape. Because occurrences share
   * one element, the name, type and documentation also change on every other view.
   */
  updateElement(change: Partial<Omit<ModelElement, 'key'>>): void {
    const canvas = this.canvas;
    const active = canvas?.getActiveObject() as ArchimateShape | undefined;
    if (!canvas || !active?.isShape || this.readOnly) return;

    const existing = this.store.elementFor(active.archimateElementKey);
    if (!existing) return;

    const element: ModelElement = { ...existing, ...change, key: existing.key };
    this.store.upsertElement(element);
    this.applyElementToOccurrences(element);
    this.refreshTree();
    this.refreshProperties();
    canvas.requestRenderAll();
    this.commitHistory();
  }

  /**
   * Applies a semantics edit to a model element from outside the canvas, so a catalogue row can
   * change what every occurrence of the element shows.
   */
  updateElementByKey(key: string, change: Partial<Omit<ModelElement, 'key'>>): void {
    if (this.readOnly) return;
    const existing = this.store.elementFor(key);
    if (!existing) return;

    const element: ModelElement = { ...existing, ...change, key: existing.key };
    this.store.upsertElement(element);
    this.applyElementToOccurrences(element);
    this.refreshTree();
    this.refreshProperties();
    this.canvas?.requestRenderAll();
    this.commitHistory();
  }

  private applyElementToOccurrences(element: ModelElement): void {
    for (const shape of this.allShapes()) {
      if (shape.archimateElementKey === element.key) this.applyElementToShape(shape, element);
    }

    // Other views are only kept as snapshots, so their occurrences are patched in place and
    // pick the change up the next time the view is shown.
    for (const [viewId, snapshot] of this.snapshots) {
      if (viewId === this.activeViewId) continue;
      for (const other of snapshot.shapes ?? []) {
        if ((other.elementKey ?? other.id) !== element.key) continue;
        other.label = element.name;
        other.doc = element.documentation;
      }
    }
  }

  private applyElementToShape(shape: ArchimateShape, element: ModelElement): void {
    const label = shape.getObjects().find((child) => child.type === 'textbox') as
      | fabric.Textbox
      | undefined;
    if (label) label.set('text', element.name);

    // The glyph is the only thing that tracks the type; the outline was built for the shape kind
    // it was created as, so a box never turns into a container or the other way round.
    const icon = shape.getObjects().find((child) => child.type === 'text') as
      | fabric.Text
      | undefined;
    const nextIcon = iconForType(element.archimateType);
    const wasContainer = GROUP_SHAPE_ICONS.includes(icon?.text ?? '');
    const isContainer = nextIcon !== null && GROUP_SHAPE_ICONS.includes(nextIcon);
    if (icon && nextIcon && wasContainer === isContainer) icon.set('text', nextIcon);

    shape.archimateDoc = element.documentation;
    shape.setCoords();
  }

  resetColor(): void {
    const canvas = this.canvas;
    const active = canvas?.getActiveObject() as ArchimateShape | undefined;
    if (!canvas || !active?.isShape || this.readOnly) return;

    const rect = active.getObjects().find((child) => child.type === 'rect') as
      | fabric.Rect
      | undefined;
    if (rect) rect.set('fill', active.originalColor);
    canvas.requestRenderAll();
    this.refreshProperties();
    this.commitHistory();
  }

  private changeConnectionType(connection: ConnectionLine, type: RelationshipType): void {
    const canvas = this.canvas;
    const conn = this.connections.find((candidate) => candidate.line === connection);
    if (!canvas || !conn) return;

    conn.type = type;
    connection.connType = type;
    connection.set('strokeDashArray', DASHED_TYPES.includes(type) ? [6, 4] : undefined);

    if (conn.sourceDec) canvas.remove(conn.sourceDec);
    if (conn.targetDec) canvas.remove(conn.targetDec);

    const isDark = this.theme.isDark();
    const color = isDark ? '#94a3b8' : '#334155';
    conn.sourceDec = this.createSourceDecoration(type, color, isDark);
    conn.targetDec = this.createTargetDecoration(type, color, isDark);
    connection.sourceDec = conn.sourceDec;
    connection.targetDec = conn.targetDec;
    if (conn.sourceDec) canvas.add(conn.sourceDec);
    if (conn.targetDec) canvas.add(conn.targetDec);

    this.setLineHighlight(connection);
    this.updateAllConnections();
    this.refreshProperties();
    this.refreshTree();
    canvas.requestRenderAll();
    this.commitHistory();
  }

  deleteActive(): void {
    const canvas = this.canvas;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || this.readOnly) return;

    const targets =
      active.type === 'activeSelection'
        ? [...((active as fabric.ActiveSelection).getObjects() as fabric.Object[])]
        : [active];

    // Drop the selection before removing members: fabric keeps transforming a live
    // active selection and breaks when one of its objects disappears.
    canvas.discardActiveObject();

    for (const target of targets) {
      const bendpoint = target as BendpointHandle;
      if (bendpoint.isBendpoint) {
        this.deleteBendpoint(bendpoint);
        continue;
      }

      const connection = target as ConnectionLine;
      if (connection.isConnection) {
        this.removeConnection(connection);
        continue;
      }

      const shape = target as ArchimateShape;
      if (shape.isShape) this.removeShape(shape);
    }

    canvas.requestRenderAll();
    this.clearBendpoints();
    this.syncSelection();
    this.commitHistory();
  }

  private removeConnection(line: ConnectionLine): void {
    const canvas = this.canvas;
    const index = this.connections.findIndex((candidate) => candidate.line === line);
    if (!canvas || index === -1) return;

    const conn = this.connections[index];
    canvas.remove(conn.line);
    if (conn.sourceDec) canvas.remove(conn.sourceDec);
    if (conn.targetDec) canvas.remove(conn.targetDec);
    this.connections.splice(index, 1);
    this.updateAllConnections();
  }

  private removeShape(shape: ArchimateShape): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const related = this.connections.filter(
      (conn) => conn.source === shape || conn.target === shape,
    );
    for (const conn of related) this.removeConnection(conn.line);

    for (const obj of canvas.getObjects()) {
      const child = obj as ArchimateShape;
      if (child.isShape && child.parentId === shape.archimateId) child.parentId = null;
    }

    canvas.remove(shape);
    this.updateAllConnections();
    this.releaseElement(shape);
  }

  bringToFront(): void {
    const active = this.resolveActiveObject();
    if (!active || this.readOnly) return;
    active.bringToFront();
    for (const handle of this.bendpointHandles) handle.bringToFront();
    this.canvas?.requestRenderAll();
    this.commitHistory();
  }

  sendToBack(): void {
    const active = this.resolveActiveObject();
    if (!active || this.readOnly) return;
    active.sendToBack();
    this.canvas?.requestRenderAll();
    this.commitHistory();
  }

  toggleConnectionMode(): void {
    if (this.readOnly) return;
    this.store.toggleConnectionMode();
    this.applyConnectionMode(this.store.connectionMode());
  }

  private applyConnectionMode(enabled: boolean): void {
    const canvas = this.canvas;
    if (!canvas) return;

    this.connectionSource = null;
    canvas.discardActiveObject();
    canvas.selection = !enabled;
    const stroke = this.theme.isDark() ? '#475569' : '#94a3b8';

    for (const obj of canvas.getObjects()) {
      const shape = obj as ArchimateShape;
      if (!shape.isShape) continue;
      shape.set({ selectable: !enabled, evented: true });
      shape.hoverCursor = enabled ? 'crosshair' : 'move';
      if (!enabled) {
        const rect = shape.getObjects().find((child) => child.type === 'rect') as
          | fabric.Rect
          | undefined;
        rect?.set('stroke', stroke);
      }
    }

    this.store.connectionHint.set(CONNECT_MODE_HINT);
    canvas.requestRenderAll();
    this.syncSelection();
  }

  private handleConnectionClick(shape: ArchimateShape): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const defaultStroke = this.theme.isDark() ? '#475569' : '#94a3b8';

    if (!this.connectionSource) {
      this.connectionSource = shape;
      const rect = shape.getObjects().find((child) => child.type === 'rect') as
        | fabric.Rect
        | undefined;
      rect?.set('stroke', '#3b82f6');
      this.store.connectionHint.set(CONNECT_TARGET_HINT);
      canvas.requestRenderAll();
      return;
    }

    if (this.connectionSource === shape) return;

    const source = this.connectionSource;
    this.connectionSource = null;

    const sourceRect = source.getObjects().find((child) => child.type === 'rect') as
      | fabric.Rect
      | undefined;
    sourceRect?.set('stroke', defaultStroke);

    this.createConnection(source, shape);
    this.store.connectionHint.set(CONNECT_DONE_HINT);
    this.store.showToast('Connection created.');
    this.refreshTree();
    canvas.requestRenderAll();
    this.commitHistory();
  }

  // --- Collapse / expand ---------------------------------------------------

  toggleCollapseExpand(): void {
    const canvas = this.canvas;
    const shape = canvas?.getActiveObject() as ArchimateShape | undefined;
    if (!canvas || !shape?.isShape || this.readOnly) return;

    const children = this.collectLogicalChildren(shape);
    const previousPosition = shape.getPointByOrigin('left', 'top');
    const rects = shape.getObjects().filter((child) => child.type === 'rect') as fabric.Rect[];
    const body = rects[rects.length - 1];
    if (!body) return;

    if (shape.isCollapsed) {
      if (typeof shape.expandedHeight === 'number') body.set({ height: shape.expandedHeight });
      shape.isCollapsed = false;
      for (const child of children) child.set({ visible: true, selectable: true, evented: true });
      this.store.showToast('Group expanded.');
    } else {
      shape.expandedHeight = body.height;
      body.set({ height: 5 });
      shape.isCollapsed = true;
      for (const child of children) child.set({ visible: false, selectable: false, evented: false });
      this.store.showToast('Group collapsed.');
    }

    shape.addWithUpdate();
    shape.setPositionByOrigin(new fabric.Point(previousPosition.x, previousPosition.y), 'left', 'top');

    this.updateAllConnections();
    this.refreshProperties();
    this.refreshTree();
    canvas.requestRenderAll();
    this.commitHistory();
  }

  private collectLogicalChildren(shape: ArchimateShape): Set<ArchimateShape> {
    const children = new Set<ArchimateShape>();
    this.collectByParent(shape.archimateId, children);
    this.collectByComposition(shape, children);
    children.delete(shape);
    return children;
  }

  private collectByParent(parentId: string, children: Set<ArchimateShape>): void {
    for (const obj of this.canvas?.getObjects() ?? []) {
      const candidate = obj as ArchimateShape;
      if (!candidate.isShape || candidate.parentId !== parentId) continue;
      if (children.has(candidate)) continue;
      children.add(candidate);
      this.collectByParent(candidate.archimateId, children);
    }
  }

  private collectByComposition(shape: ArchimateShape, children: Set<ArchimateShape>): void {
    for (const conn of this.connections) {
      if (conn.source !== shape || conn.type !== 'composition') continue;
      if (children.has(conn.target)) continue;
      children.add(conn.target);
      this.collectByComposition(conn.target, children);
    }
  }

  // --- Undo / redo ---------------------------------------------------------

  /** Undo and redo are whole-view snapshots: cheaper to keep correct than commands. */
  private readonly sameSnapshot = (a: ViewSnapshot, b: ViewSnapshot): boolean =>
    JSON.stringify(a) === JSON.stringify(b);

  private historyFor(viewId: string): HistoryStack<ViewSnapshot> {
    let stack = this.history.get(viewId);
    if (!stack) {
      stack = new HistoryStack<ViewSnapshot>(HISTORY_LIMIT, this.sameSnapshot);
      this.history.set(viewId, stack);
    }
    return stack;
  }

  /** Starts the timeline of the active view if it has none yet. */
  private ensureHistory(): void {
    if (!this.activeViewId) return;
    const stack = this.historyFor(this.activeViewId);
    if (!stack.current()) stack.reset(this.captureSnapshot());
    this.syncHistoryState();
  }

  private syncHistoryState(): void {
    const stack = this.activeViewId ? this.history.get(this.activeViewId) : undefined;
    this.store.canUndo.set(stack?.canUndo ?? false);
    this.store.canRedo.set(stack?.canRedo ?? false);
  }

  /**
   * Records the current state as one undo step. Cheap to call defensively: a state
   * identical to the last one is ignored, so grouped operations stay a single step.
   */
  private commitHistory(): void {
    if (this.restoringHistory || !this.canvas || !this.activeViewId) return;
    if (this.historyFor(this.activeViewId).push(this.captureSnapshot())) {
      this.syncHistoryState();
      this.store.markDocumentChanged();
    }
  }

  undo(): void {
    if (this.readOnly) return;
    this.stepHistory('undo', 'Nothing to undo.');
  }

  redo(): void {
    if (this.readOnly) return;
    this.stepHistory('redo', 'Nothing to redo.');
  }

  private stepHistory(direction: 'undo' | 'redo', emptyMessage: string): void {
    if (!this.canvas || !this.activeViewId) return;

    const stack = this.historyFor(this.activeViewId);
    const snapshot = direction === 'undo' ? stack.undo() : stack.redo();
    if (!snapshot) {
      this.store.showToast(emptyMessage);
      this.syncHistoryState();
      return;
    }

    this.restoreSnapshot(snapshot);
    this.syncHistoryState();
    this.store.markDocumentChanged();
    this.store.showToast(direction === 'undo' ? 'Undo.' : 'Redo.');
  }

  /** Rebuilds the whole canvas from plain data, without recording a history step. */
  private restoreSnapshot(snapshot: ViewSnapshot): void {
    const canvas = this.canvas;
    if (!canvas) return;

    this.restoringHistory = true;
    try {
      this.clearBendpoints();
      this.connectionSource = null;
      if (this.store.connectionMode()) {
        this.store.exitConnectionMode();
        this.applyConnectionMode(false);
      }

      canvas.discardActiveObject();
      canvas.clear();
      this.connections = [];
      this.setupGridPattern();

      const byId = new Map<string, ArchimateShape>();
      for (const snap of snapshot.shapes) {
        // Revisions may hold snapshots written by an older schema; never let one bad entry abort the render.
        const id = typeof snap?.id === 'string' ? snap.id : '';
        if (!id) continue;
        const shape = this.addShape({
          label: asText(snap.label),
          color: asText(snap.color) || '#ffffff',
          icon: asText(snap.icon),
          layer: layerOf(asText(snap.layer)),
          x: asNumber(snap.left, 0),
          y: asNumber(snap.top, 0),
          width: asNumber(snap.width, 0) || null,
          height: asNumber(snap.height, 0) || null,
          forceId: id,
          parentId: typeof snap.parentId === 'string' ? snap.parentId : null,
          isImport: true,
        });
        if (!shape) continue;

        shape.linkedView = snap.linkedView;
        shape.archimateDoc = snap.doc;
        shape.archimateElementKey =
          typeof snap.elementKey === 'string' && snap.elementKey ? snap.elementKey : id;
        shape.isCollapsed = snap.isCollapsed;
        shape.expandedHeight = snap.expandedHeight ?? undefined;
        this.applySnapshotRects(shape, snap);
        byId.set(snap.id, shape);
      }

      // `addShape` sends group shapes to the back, so replay the stacking order.
      const ordered = snapshot.shapes
        .map((snap) => byId.get(snap.id))
        .filter((shape): shape is ArchimateShape => Boolean(shape));
      for (const shape of ordered) canvas.remove(shape);
      for (const shape of ordered) canvas.add(shape);

      for (const snap of snapshot.connections) {
        const source = byId.get(snap?.sourceId);
        const target = byId.get(snap?.targetId);
        if (!source || !target || !snap.type) continue;
        const conn = this.createConnection(
          source,
          target,
          snap.type,
          Array.isArray(snap.bendpoints) ? snap.bendpoints : [],
        );
        if (conn) conn.line.archimateDoc = snap.doc;
      }

      for (const shape of ordered) {
        if (!shape.isCollapsed) continue;
        for (const child of this.collectLogicalChildren(shape)) {
          child.set({ visible: false, selectable: false, evented: false });
        }
      }

      if (!this.restoreSelection(snapshot.selection, byId)) {
        this.updateAllConnections();
        this.refreshTree();
        this.refreshProperties();
        this.updateToolbar();
        canvas.requestRenderAll();
      }

      this.saveCurrentViewState();
    } finally {
      this.restoringHistory = false;
    }
  }

  /** Puts a rebuilt shape back to the exact child boxes it had when captured. */
  private applySnapshotRects(shape: ArchimateShape, snap: SnapshotShape): void {
    const rects = shape.getObjects().filter((child) => child.type === 'rect') as fabric.Rect[];
    let resized = false;

    (Array.isArray(snap.rects) ? snap.rects : []).forEach((saved, index) => {
      const rect = rects[index];
      if (!rect) return;
      if (
        Math.round(rect.width ?? 0) !== saved.width ||
        Math.round(rect.height ?? 0) !== saved.height
      ) {
        rect.set({ width: saved.width, height: saved.height });
        resized = true;
      }
      if (saved.fill && typeof rect.fill === 'string' && rect.fill !== saved.fill) {
        rect.set('fill', saved.fill);
      }
    });

    if (!resized) return;

    shape.addWithUpdate();
    shape.setPositionByOrigin(new fabric.Point(snap.left, snap.top), 'left', 'top');
    shape.lastLeft = snap.left;
    shape.lastTop = snap.top;
    shape.setCoords();
  }

  private restoreSelection(
    selection: SnapshotSelection,
    byId: Map<string, ArchimateShape>,
  ): boolean {
    const canvas = this.canvas;
    if (!canvas || !selection) return false;

    if (selection.kind === 'shape') {
      const shape = byId.get(selection.id);
      if (!shape) return false;
      canvas.setActiveObject(shape);
      this.syncSelection();
      return true;
    }

    const conn = this.connections[selection.index];
    if (!conn) return false;
    canvas.setActiveObject(conn.line);
    this.syncSelection();
    return true;
  }

  private captureSnapshot(): ViewSnapshot {
    const shapes: SnapshotShape[] = this.allShapes().map((shape) => {
      this.normalizeShapeScale(shape);

      const rects = shape.getObjects().filter((child) => child.type === 'rect') as fabric.Rect[];
      const body = rects[rects.length - 1];
      const isGroupShape = rects.length > 1;
      const bodyWidth = Math.round(body?.width ?? shape.width ?? 0);
      const bodyHeight = Math.round(body?.height ?? shape.height ?? 0);
      const expandedHeight = shape.expandedHeight ?? bodyHeight;

      return {
        id: shape.archimateId,
        elementKey: shape.archimateElementKey ?? shape.archimateId,
        label: this.labelOf(shape),
        icon: this.iconOf(shape),
        layer: layerOf(shape.archimateLayer),
        color: shape.originalColor,
        doc: shape.archimateDoc ?? '',
        linkedView: shape.linkedView ?? '',
        parentId: shape.parentId ?? null,
        isCollapsed: Boolean(shape.isCollapsed),
        expandedHeight: shape.expandedHeight ?? null,
        left: Math.round(shape.left ?? 0),
        top: Math.round(shape.top ?? 0),
        width: bodyWidth,
        height: isGroupShape
          ? Math.max(GROUP_TAB_HEIGHT, expandedHeight + GROUP_TAB_HEIGHT - 1)
          : expandedHeight,
        rects: rects.map((rect) => ({
          width: Math.round(rect.width ?? 0),
          height: Math.round(rect.height ?? 0),
          fill: typeof rect.fill === 'string' ? rect.fill : '',
        })),
      };
    });

    const connections = this.connections.map((conn) => ({
      sourceId: conn.source.archimateId,
      targetId: conn.target.archimateId,
      type: conn.type,
      doc: conn.line.archimateDoc ?? '',
      bendpoints: conn.bendpoints.map((point) => ({ x: point.x, y: point.y })),
    }));

    return { shapes, connections, selection: this.captureSelection() };
  }

  private captureSelection(): SnapshotSelection {
    const active = this.resolveActiveObject();
    if (!active || active.type === 'activeSelection') return null;

    const shape = active as ArchimateShape;
    if (shape.isShape) return { kind: 'shape', id: shape.archimateId };

    const index = this.connections.findIndex(
      (conn) => conn.line === (active as ConnectionLine),
    );
    return index >= 0 ? { kind: 'connection', index } : null;
  }

  // --- Views ---------------------------------------------------------------

  private saveCurrentViewState(): void {
    const canvas = this.canvas;
    if (!canvas || !this.activeViewId) return;

    const existing = this.views.get(this.activeViewId);
    const objects = canvas.getObjects().filter((obj) => (obj as ArchimateShape).isShape);
    this.views.set(this.activeViewId, {
      name: existing?.name ?? 'View',
      viewpoint: existing?.viewpoint ?? null,
      contentType: existing?.contentType ?? 'diagram',
      objects: [...objects],
      connections: [...this.connections],
    });
    this.snapshots.set(this.activeViewId, this.captureSnapshot());
  }

  selectView(viewId: string): void {
    const canvas = this.canvas;
    if (!canvas || viewId === this.activeViewId) return;

    this.saveCurrentViewState();
    this.clearBendpoints();
    this.connectionSource = null;
    if (this.store.connectionMode()) {
      this.store.exitConnectionMode();
      this.applyConnectionMode(false);
    }

    this.activeViewId = viewId;

    const snapshot = this.snapshots.get(viewId);
    if (snapshot) {
      // Restoring the plain-data snapshot is the only lossless way back to a saved view.
      this.restoreSnapshot(snapshot);
      this.store.setActiveView(viewId);
      this.updateAllConnections();
      this.refreshTree();
      this.refreshProperties();
      this.updateToolbar();
      this.ensureHistory();
      this.applyReadOnly(this.readOnly);
      return;
    }

    canvas.discardActiveObject();
    canvas.clear();
    this.connections = [];
    this.setupGridPattern();

    const view = this.views.get(viewId);
    const parsed = this.parsedViews.get(viewId);

    if (view) {
      if (view.objects.length === 0 && view.connections.length === 0 && parsed) {
        this.renderParsedView(parsed);
      } else {
        for (const obj of view.objects) canvas.add(obj);
        this.connections = [...view.connections];
        for (const conn of this.connections) {
          canvas.add(conn.line);
          if (conn.sourceDec) canvas.add(conn.sourceDec);
          if (conn.targetDec) canvas.add(conn.targetDec);
        }
      }
    }

    // Views rendered lazily from an import have no snapshot until the user switches
    // away, so capture one now and a save never persists them as empty.
    this.snapshots.set(viewId, this.captureSnapshot());

    this.store.setActiveView(viewId);
    canvas.requestRenderAll();
    this.updateAllConnections();
    this.refreshTree();
    this.refreshProperties();
    this.updateToolbar();
    this.ensureHistory();
    this.applyReadOnly(this.readOnly);
  }

  /**
   * Replaces all local view state with the server copy of a diagram. Works both before
   * and after the canvas is attached; the first view is rendered in either case.
   */
  loadDiagram(diagram: DiagramDto): void {
    this.views.clear();
    this.snapshots.clear();
    this.parsedViews.clear();
    this.history.clear();
    this.connections = [];
    this.activeViewId = '';

    const ordered = [...diagram.views].sort((a, b) => a.position - b.position);
    for (const view of ordered) {
      this.views.set(view.viewKey, {
        name: view.name,
        viewpoint: view.viewpoint ?? null,
        contentType: view.contentType ?? 'diagram',
        objects: [],
        connections: [],
      });
      this.snapshots.set(view.viewKey, this.normalizeSnapshot(view));
    }
    if (this.views.size === 0) {
      this.views.set(DEFAULT_VIEW_ID, { name: 'Default View', viewpoint: null, contentType: 'diagram', objects: [], connections: [] });
      this.snapshots.set(DEFAULT_VIEW_ID, EMPTY_SNAPSHOT);
    }

    const first = this.views.keys().next().value ?? DEFAULT_VIEW_ID;
    this.pendingViewId = first;

    if (this.canvas) {
      this.pendingViewId = null;
      this.selectView(first);
      return;
    }

    this.refreshTree();
    this.refreshProperties();
    this.updateToolbar();
    this.store.canUndo.set(false);
    this.store.canRedo.set(false);
  }

  /** Serializes every view into the payload the server persists. */
  buildViewDrafts(): DiagramViewDto[] {
    if (this.canvas) {
      this.serializePendingImports();
      this.saveCurrentViewState();
    }
    this.syncCatalogue();
    return [...this.views.entries()].map(([viewKey, view], index) => ({
      viewKey,
      name: view.name,
      position: index,
      viewpoint: view.viewpoint,
      contentType: view.contentType,
      plateau: null,
      snapshot: this.snapshots.get(viewKey) ?? EMPTY_SNAPSHOT,
    }));
  }

  /**
   * Gives every drawn shape a model element so the catalogue never lags behind the canvas. Derived
   * elements do not mark the document dirty: the shape that produced them already did.
   */
  private syncCatalogue(): void {
    const known = this.store.elementByKey();
    const derived: ModelElement[] = [];
    /** Snapshot shapes reference elements by occurrence id, so translate before deriving relationships. */
    const elementKeyById = new Map<string, string>();

    for (const snapshot of this.snapshots.values()) {
      for (const shape of snapshot.shapes ?? []) {
        const key = compactKey('el', shape.elementKey || shape.id);
        elementKeyById.set(shape.id, key);
        if (known.has(key) || derived.some((element) => element.key === key)) continue;
        const layer = layerOf(shape.layer);
        derived.push({
          ...emptyModelElement(
            key,
            shape.label || 'Untitled',
            archimateTypeForIcon(shape.icon, layer),
            layer,
          ),
          documentation: shape.doc ?? '',
        });
      }
    }

    this.store.registerElements(derived);

    const relationships = new Map<string, ModelRelationship>();
    for (const snapshot of this.snapshots.values()) {
      for (const connection of snapshot.connections ?? []) {
        const sourceKey = elementKeyById.get(connection.sourceId);
        const targetKey = elementKeyById.get(connection.targetId);
        if (!sourceKey || !targetKey || sourceKey === targetKey) continue;
        const key = relationshipKey(sourceKey, targetKey, connection.type);
        if (relationships.has(key)) continue;
        relationships.set(key, {
          key,
          type: connection.type,
          sourceKey,
          targetKey,
          name: null,
          documentation: connection.doc ?? '',
          properties: {},
        });
      }
    }

    this.store.reconcileRelationships([...relationships.values()]);
  }

  /**
   * Imported views are rendered lazily, so walk them once before a save to avoid
   * persisting empty snapshots for views the user has not opened yet.
   */
  private serializePendingImports(): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const pending = [...this.views.keys()].filter(
      (id) => !this.snapshots.has(id) && this.parsedViews.has(id),
    );
    if (pending.length === 0) return;

    const current = this.activeViewId;
    for (const id of pending) {
      this.selectView(id);
    }
    if (current && this.views.has(current)) {
      this.selectView(current);
    }
    this.saveCurrentViewState();
  }

  private normalizeSnapshot(view: DiagramViewDto): ViewSnapshot {
    const snapshot = view.snapshot;
    if (!snapshot || !Array.isArray(snapshot.shapes) || !Array.isArray(snapshot.connections)) {
      return EMPTY_SNAPSHOT;
    }
    return { ...snapshot, selection: snapshot.selection ?? null };
  }

  createView(
    name: string,
    viewpoint: string | null = null,
    contentType: ViewContentType = 'diagram',
  ): void {
    const canvas = this.canvas;
    if (!canvas || this.readOnly) return;

    this.saveCurrentViewState();
    const id = `view_${Date.now()}`;
    this.views.set(id, {
      name: name.trim() || 'New View',
      viewpoint,
      contentType,
      objects: [],
      connections: [],
    });
    this.snapshots.set(id, EMPTY_SNAPSHOT);
    this.store.newViewDialogOpen.set(false);
    this.activeViewId = '';
    this.selectView(id);
    this.store.markDocumentChanged();
  }

  /** Scopes a view to a viewpoint. The palette, the validator and the assistant follow it. */
  setViewpoint(viewId: string, viewpoint: string | null): void {
    const view = this.views.get(viewId);
    if (!view || this.readOnly) return;
    if (view.viewpoint === viewpoint) return;

    view.viewpoint = viewpoint;
    this.refreshTree();
    this.store.markDocumentChanged();
  }

  /** Switches a view between canvas, catalogue and matrix content. */
  setContentType(viewId: string, contentType: ViewContentType): void {
    const view = this.views.get(viewId);
    if (!view || this.readOnly) return;
    if (view.contentType === contentType) return;

    view.contentType = contentType;
    this.refreshTree();
    this.store.markDocumentChanged();
  }

  private renderParsedView(view: ParsedView): void {
    const canvas = this.canvas;
    if (!canvas) return;

    this.clearBendpoints();
    this.connections = [];
    canvas.clear();
    this.setupGridPattern();

    const created = new Map<string, ArchimateShape>();
    const ordered = [...view.shapes].sort(
      (a, b) => Number(Boolean(a.parentDiagId)) - Number(Boolean(b.parentDiagId)),
    );

    for (const parsedShape of ordered) {
      const typeInfo = getArchimateTypeInfo(parsedShape.archimateType);
      const parent = parsedShape.parentDiagId ? created.get(parsedShape.parentDiagId) : undefined;
      const shape = this.addShape({
        label: parsedShape.name,
        color: typeInfo.color,
        icon: typeInfo.icon,
        layer: typeInfo.layer,
        x: parsedShape.x,
        y: parsedShape.y,
        width: parsedShape.width,
        height: parsedShape.height,
        forceId: parsedShape.elementId,
        // The exchange file names the modelled element, so the same one shared by two views
        // stays a single model element here as well.
        elementKey: parsedShape.elementId,
        archimateType: parsedShape.archimateType,
        parentId: parent?.archimateId ?? null,
        isImport: true,
      });
      if (shape) created.set(parsedShape.diagId, shape);
    }

    const centers = new Map<string, Point2D>();
    for (const [diagId, shape] of created) centers.set(diagId, shape.getCenterPoint());

    for (const parsedConnection of view.connections) {
      const source = created.get(parsedConnection.sourceDiagId);
      const target = created.get(parsedConnection.targetDiagId);
      if (!source || !target) continue;

      const center = centers.get(parsedConnection.sourceDiagId) ?? source.getCenterPoint();
      const bendpoints = parsedConnection.bendpoints.map((point) => ({
        x: center.x + point.x,
        y: center.y + point.y,
      }));
      this.createConnection(source, target, parsedConnection.type, bendpoints);
    }

    canvas.requestRenderAll();
    this.refreshTree();
    this.refreshProperties();
  }

  importFile(file: File): void {
    if (this.readOnly) return;
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const model = this.importer.parse(String(reader.result ?? ''));
        this.parsedViews.clear();
        this.views.clear();
        this.snapshots.clear();
        this.history.clear();

        for (const view of model.views) {
          this.views.set(view.id, {
            name: view.name,
            viewpoint: null,
            contentType: 'diagram',
            objects: [],
            connections: [],
          });
          this.parsedViews.set(view.id, view);
        }

        if (model.views.length === 0) {
          this.views.set(DEFAULT_VIEW_ID, { name: 'Default View', viewpoint: null, contentType: 'diagram', objects: [], connections: [] });
          this.snapshots.set(DEFAULT_VIEW_ID, EMPTY_SNAPSHOT);
          this.activeViewId = DEFAULT_VIEW_ID;
          this.store.showToast('Parsed successfully, but no visual views found.');
          this.refreshTree();
          this.ensureHistory();
          this.store.markDocumentChanged();
          return;
        }

        this.store.showToast('File loaded successfully.');
        this.activeViewId = '';
        this.selectView(model.firstViewId ?? model.views[0].id);
        this.store.markDocumentChanged();
      } catch {
        this.store.showToast('Failed to parse the .archimate file. Ensure it is valid XML.', true);
      }
    };

    reader.onerror = () => this.store.showToast('Failed to read the selected file.', true);
    reader.readAsText(file);
  }

  exportImage(): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'architecture-diagram.png';
    link.click();
    this.store.showToast('Export successful.');
  }

  /** Writes the active view as a vector SVG, which keeps text crisp when it is embedded. */
  exportSvg(): void {
    const canvas = this.canvas;
    if (!canvas) return;

    const svg = canvas.toSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'architecture-diagram.svg';
    link.click();
    URL.revokeObjectURL(url);
    this.store.showToast('Export successful.');
  }

  /** Writes every view, element and relationship as an Archi exchange file. */
  exportArchimate(): void {
    this.saveCurrentViewState();

    const views: ExchangeView[] = [];
    for (const [viewId, snapshot] of this.snapshots) {
      const stored = this.views.get(viewId);
      if (stored && stored.contentType !== 'diagram') continue;

      const elementKeyByDiagId = new Map<string, string>();
      for (const shape of snapshot.shapes) {
        elementKeyByDiagId.set(shape.id, shape.elementKey ?? shape.id);
      }

      views.push({
        id: viewId,
        name: stored?.name ?? viewId,
        viewpoint: stored?.viewpoint ?? null,
        shapes: snapshot.shapes.map((shape) => ({
          diagId: shape.id,
          parentDiagId: shape.parentId,
          elementKey: shape.elementKey ?? null,
          name: shape.label,
          archimateType: archimateTypeForIcon(shape.icon, shape.layer),
          x: shape.left,
          y: shape.top,
          width: shape.width,
          height: shape.height,
        })),
        connections: snapshot.connections.map((connection) => ({
          sourceDiagId: connection.sourceId,
          targetDiagId: connection.targetId,
          relationshipKey: relationshipKey(
            elementKeyByDiagId.get(connection.sourceId) ?? connection.sourceId,
            elementKeyByDiagId.get(connection.targetId) ?? connection.targetId,
            connection.type,
          ),
          type: connection.type,
        })),
      });
    }

    const xml = buildArchimateExchange({
      name: 'EAsync Model',
      elements: this.store.elements(),
      relationships: this.store.modelRelationships(),
      views,
    });

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'easync-model.archimate';
    link.click();
    URL.revokeObjectURL(url);
    this.store.showToast('Export successful.');
  }

  clearAll(): void {
    const canvas = this.canvas;
    if (!canvas || this.readOnly) return;

    canvas.clear();
    this.connections = [];
    this.clearBendpoints();
    this.parsedViews.clear();
    this.views.clear();
    this.snapshots.clear();
    this.views.set(DEFAULT_VIEW_ID, { name: 'Default View', viewpoint: null, contentType: 'diagram', objects: [], connections: [] });
    this.snapshots.set(DEFAULT_VIEW_ID, EMPTY_SNAPSHOT);
    this.activeViewId = DEFAULT_VIEW_ID;

    this.setupGridPattern();
    this.store.clearDialogOpen.set(false);
    this.store.showToast('Canvas and Global Repository cleared.');
    canvas.requestRenderAll();
    this.refreshTree();
    this.refreshProperties();
    this.updateToolbar();
    this.history.clear();
    this.ensureHistory();
    this.store.markDocumentChanged();
  }
}





