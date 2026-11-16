import type { ArchimateLayer, Point2D, RelationshipType } from './archimate.models';

export type SidebarTab = 'explorer' | 'properties' | 'problems';

export interface ViewSummary {
  id: string;
  name: string;
  /** Viewpoint the view answers, from the catalogue in `frameworks/viewpoints.ts`. */
  viewpoint: string | null;
  /** What the view holds, so the editor can render a canvas, a table or a grid. */
  contentType: ViewContentType;
  isActive: boolean;
}

/** What a view holds: a canvas, a catalogue table or a matrix grid. */
export type ViewContentType = 'diagram' | 'catalogue' | 'matrix';

export interface ShapeSummary {
  id: string;
  label: string;
  icon: string;
  layer: ArchimateLayer;
  color: string;
  isActive: boolean;
}

export interface LayerGroup {
  layer: ArchimateLayer;
  shapes: ShapeSummary[];
}

export interface RepositoryLayer {
  layer: ArchimateLayer;
  items: {
    /** Row identity; for a model element this is its key. */
    id: string;
    /** Model element the row stands for; drops reuse it instead of creating another element. */
    elementKey: string;
    label: string;
    icon: string;
    color: string;
    /** How many shapes currently draw this element, across every view. */
    occurrences: number;
    /** How many views show this element; `0` means it is modelled but not drawn yet. */
    viewCount: number;
  }[];
}

export interface RelationshipSummary {
  index: number;
  key: string;
  type: RelationshipType;
  label: string;
  sourceName: string;
  targetName: string;
  isActive: boolean;
}

export interface FloatingToolbarState {
  visible: boolean;
  left: number;
  top: number;
}

export interface SelectionProperties {
  kind: 'none' | 'shape' | 'connection';
  name: string;
  parentId: string;
  linkedView: string;
  color: string;
  connType: RelationshipType;
  doc: string;
  canCollapse: boolean;
  isCollapsed: boolean;
  /** Model element the selected shape is an occurrence of; empty when nothing modelled is selected. */
  elementKey: string;
  availableParentGroups: { id: string; name: string }[];
  availableLinkedViews: { id: string; name: string }[];
}

export interface ToastMessage {
  text: string;
  isError: boolean;
}

/** Element description accepted by `DiagramCanvasService.createShape`. */
export interface ShapeSpec {
  label: string;
  layer?: ArchimateLayer;
  color?: string;
  icon?: string;
  x?: number;
  y?: number;
  width?: number | null;
  height?: number | null;
  parentId?: string | null;
}

/** Flat snapshot of an element, safe to hand to non-UI consumers such as the assistant. */
export interface DiagramShapeInfo {
  id: string;
  label: string;
  layer: ArchimateLayer;
  icon: string;
  parentId: string | null;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Flat snapshot of a relationship. */
export interface DiagramConnectionInfo {
  sourceId: string;
  targetId: string;
  type: RelationshipType;
}

/** A shape resolved from an imported `.archimate` exchange file. */
export interface ParsedShape {
  diagId: string;
  parentDiagId: string | null;
  elementId: string | null;
  name: string;
  archimateType: string;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
}

/** A relationship resolved from an imported `.archimate` exchange file. */
export interface ParsedConnection {
  sourceDiagId: string;
  targetDiagId: string;
  type: RelationshipType;
  /** Bendpoints are relative to the source shape center, as stored in the exchange format. */
  bendpoints: { x: number; y: number }[];
}

export interface ParsedView {
  id: string;
  name: string;
  shapes: ParsedShape[];
  connections: ParsedConnection[];
}

export interface ParsedModel {
  views: ParsedView[];
  firstViewId: string | null;
}

/** Child box of a snapshot shape, so collapse and colour state survive a rebuild. */
export interface SnapshotRect {
  width: number;
  height: number;
  fill: string;
}

/** Plain-data description of one element, used to rebuild the canvas for undo/redo. */
export interface SnapshotShape {
  id: string;
  /** Model element this shape shows; absent in snapshots written before the model existed. */
  elementKey?: string;
  label: string;
  icon: string;
  layer: ArchimateLayer;
  color: string;
  doc: string;
  linkedView: string;
  parentId: string | null;
  isCollapsed: boolean;
  expandedHeight: number | null;
  left: number;
  top: number;
  width: number;
  height: number;
  rects: SnapshotRect[];
}

/** Plain-data description of one relationship, including its routing. */
export interface SnapshotConnection {
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  doc: string;
  bendpoints: Point2D[];
}

export type SnapshotSelection =
  | { kind: 'shape'; id: string }
  | { kind: 'connection'; index: number }
  | null;

/** Complete undoable state of one view. */
export interface ViewSnapshot {
  shapes: SnapshotShape[];
  connections: SnapshotConnection[];
  selection: SnapshotSelection;
}