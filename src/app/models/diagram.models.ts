import type { RelationshipType } from './archimate.models';

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
