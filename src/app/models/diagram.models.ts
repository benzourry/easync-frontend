import type { Point2D, RelationshipType } from './archimate.models';

export type SidebarTab = 'explorer' | 'properties';

export interface ViewSummary {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ShapeSummary {
  id: string;
  label: string;
  icon: string;
  layer: string;
  color: string;
  isActive: boolean;
}

export interface LayerGroup {
  layer: string;
  shapes: ShapeSummary[];
}

export interface RepositoryLayer {
  layer: string;
  items: { id: string; label: string; icon: string; color: string }[];
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
  layer?: string;
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
  layer: string;
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
  label: string;
  icon: string;
  layer: string;
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