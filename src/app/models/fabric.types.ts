import type { fabric } from 'fabric';
import type { ArchimateLayer, GlobalElement, RelationshipType } from './archimate.models';
import type { ViewContentType } from './diagram.models';

/** Extra metadata attached to every ArchiMate shape group drawn on the canvas. */
export interface ShapeMetadata {
  isShape: true;
  archimateId: string;
  /** Key of the model element this shape shows; defaults to the shape id until it is bound. */
  archimateElementKey?: string;
  archimateLayer: ArchimateLayer;
  originalColor: string;
  archimateDoc: string;
  isCollapsed: boolean;
  parentId: string | null;
  linkedView: string;
  expandedHeight?: number;
  lastLeft?: number;
  lastTop?: number;
}

export type ArchimateShape = fabric.Group & ShapeMetadata;

export interface ConnectionMetadata {
  isConnection: true;
  connType: RelationshipType;
  archimateDoc: string;
  sourceDec: fabric.Object | null;
  targetDec: fabric.Object | null;
}

export type ConnectionLine = fabric.Path & ConnectionMetadata;

export interface BendpointMetadata {
  isBendpoint: true;
  connection: DiagramConnection;
  bpIndex: number;
}

export type BendpointHandle = fabric.Circle & BendpointMetadata;

/** A relationship drawn between two shapes, including its decorations and routing. */
export interface DiagramConnection {
  line: ConnectionLine;
  sourceDec: fabric.Object | null;
  targetDec: fabric.Object | null;
  source: ArchimateShape;
  target: ArchimateShape;
  type: RelationshipType;
  bendpoints: { x: number; y: number }[];
  corePoints?: { x: number; y: number }[];
}

/** Currently rendered view, kept in memory so switching views is lossless. */
export interface StoredView {
  name: string;
  viewpoint: string | null;
  contentType: ViewContentType;
  objects: fabric.Object[];
  connections: DiagramConnection[];
}

export interface DiagramSnapshot {
  shapes: ArchimateShape[];
  connections: DiagramConnection[];
}

/** Canvas-level view of a repository element (used by the tree view). */
export type RepositoryEntry = GlobalElement;
