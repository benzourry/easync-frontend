export type RelationshipType =
  | 'flow'
  | 'association'
  | 'triggering'
  | 'realization'
  | 'specialization'
  | 'serving'
  | 'access'
  | 'influence'
  | 'composition'
  | 'aggregation'
  | 'assignment';

export interface PaletteItem {
  label: string;
  displayLabel: string;
  color: string;
  icon: string;
  layer: string;
  isDashed?: boolean;
}

export interface PaletteCategory {
  title: string;
  layerName: string;
  dotColor: string;
  items: PaletteItem[];
}

export interface GlobalElement {
  id: string;
  label: string;
  color: string;
  icon: string;
  layer: string;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface FabricObjectLike {
  type?: string;
  text?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[] | null;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  visible?: boolean;
  selectable?: boolean;
  evented?: boolean;
  hoverCursor?: string;
  dirty?: boolean;
  path?: unknown;
  pathOffset?: Point2D;
  isShape?: boolean;
  isConnection?: boolean;
  isBendpoint?: boolean;
  connType?: RelationshipType;
  connRef?: DiagramConnection;
  bpIndex?: number;
  sourceDec?: FabricObjectLike | null;
  targetDec?: FabricObjectLike | null;
  archimateId?: string;
  archimateLayer?: string;
  originalColor?: string;
  archimateDoc?: string;
  isCollapsed?: boolean;
  expandedHeight?: number;
  parentId?: string | null;
  linkedView?: string;
  lastLeft?: number;
  lastTop?: number;
  hasControls?: boolean;
  set(keyOrProps: string | Record<string, unknown>, value?: unknown): void;
  setCoords(): void;
  getObjects(): FabricObjectLike[];
  item(index: number): FabricObjectLike;
  getCenterPoint(): Point2D;
  getBoundingRect(): { left: number; top: number; width: number; height: number };
  getPointByOrigin(originX: string, originY: string): Point2D;
  setPositionByOrigin(pos: Point2D, originX: string, originY: string): void;
  addWithUpdate(): void;
  sendToBack(): void;
  bringToFront(): void;
  _calcDimensions(): { left: number; top: number; width: number; height: number };
}

export interface DiagramConnection {
  line: FabricObjectLike;
  sourceDec: FabricObjectLike | null;
  targetDec: FabricObjectLike | null;
  source: FabricObjectLike;
  target: FabricObjectLike;
  type: RelationshipType;
  bendpoints: Point2D[];
  corePoints?: Point2D[];
}

export interface ViewData {
  id: string;
  name: string;
  objects: FabricObjectLike[];
  connections: DiagramConnection[];
}

export interface ShapeSummary {
  archimateId: string;
  label: string;
  icon: string;
  layer: string;
  color: string;
  isActive: boolean;
  objectRef: FabricObjectLike;
}

export interface RelationshipSummary {
  index: number;
  type: RelationshipType;
  typeFormatted: string;
  sourceName: string;
  targetName: string;
  isActive: boolean;
  lineRef: FabricObjectLike;
}

export interface FloatingToolbarState {
  visible: boolean;
  left: number;
  top: number;
}

export interface ActiveSelectionProps {
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

export const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: 'flow', label: 'Flow' },
  { value: 'association', label: 'Association' },
  { value: 'triggering', label: 'Triggering' },
  { value: 'realization', label: 'Realization' },
  { value: 'specialization', label: 'Specialization' },
  { value: 'serving', label: 'Serving' },
  { value: 'access', label: 'Access' },
  { value: 'influence', label: 'Influence' },
  { value: 'composition', label: 'Composition' },
  { value: 'aggregation', label: 'Aggregation' },
  { value: 'assignment', label: 'Assignment' },
];

export const PALETTE_CATEGORIES: PaletteCategory[] = [
  {
    title: 'Generic',
    layerName: 'Generic',
    dotColor: '#ffffff',
    items: [
      {
        label: 'Grouping',
        displayLabel: 'Grouping',
        color: '#ffffff',
        icon: '⊞',
        layer: 'Generic',
        isDashed: true,
      },
    ],
  },
  {
    title: 'Motivation',
    layerName: 'Motivation',
    dotColor: '#ccccff',
    items: [
      { label: 'Stakeholder', displayLabel: 'Stakeholder', color: '#ccccff', icon: '웃', layer: 'Motivation' },
      { label: 'Driver', displayLabel: 'Driver', color: '#ccccff', icon: '⚑', layer: 'Motivation' },
      { label: 'Goal', displayLabel: 'Goal', color: '#ccccff', icon: '◎', layer: 'Motivation' },
      { label: 'Requirement', displayLabel: 'Requirement', color: '#ccccff', icon: '▱', layer: 'Motivation' },
    ],
  },
  {
    title: 'Strategy',
    layerName: 'Strategy',
    dotColor: '#f5deaa',
    items: [
      { label: 'Resource', displayLabel: 'Resource', color: '#f5deaa', icon: '▤', layer: 'Strategy' },
      { label: 'Capability', displayLabel: 'Capability', color: '#f5deaa', icon: '◩', layer: 'Strategy' },
      { label: 'Value Stream', displayLabel: 'Value Stream', color: '#f5deaa', icon: '❯', layer: 'Strategy' },
    ],
  },
  {
    title: 'Business',
    layerName: 'Business',
    dotColor: '#ffffb5',
    items: [
      { label: 'Business Actor', displayLabel: 'Actor', color: '#ffffb5', icon: '웃', layer: 'Business' },
      { label: 'Business Role', displayLabel: 'Role', color: '#ffffb5', icon: '◪', layer: 'Business' },
      { label: 'Business Process', displayLabel: 'Process', color: '#ffffb5', icon: '⇨', layer: 'Business' },
      { label: 'Business Function', displayLabel: 'Function', color: '#ffffb5', icon: 'ᐱ', layer: 'Business' },
      { label: 'Business Event', displayLabel: 'Event', color: '#ffffb5', icon: '◷', layer: 'Business' },
      { label: 'Business Object', displayLabel: 'Object', color: '#ffffb5', icon: '■', layer: 'Business' },
      { label: 'Product', displayLabel: 'Product', color: '#ffffb5', icon: '⬒', layer: 'Business' },
    ],
  },
  {
    title: 'Application',
    layerName: 'Application',
    dotColor: '#b5ffff',
    items: [
      { label: 'Application Component', displayLabel: 'Component', color: '#b5ffff', icon: '◫', layer: 'Application' },
      { label: 'Application Service', displayLabel: 'Service', color: '#b5ffff', icon: '⌓', layer: 'Application' },
      { label: 'Application Interface', displayLabel: 'Interface', color: '#b5ffff', icon: '⭘', layer: 'Application' },
      { label: 'Application Function', displayLabel: 'Function', color: '#b5ffff', icon: 'ᐱ', layer: 'Application' },
      { label: 'Data Object', displayLabel: 'Data Object', color: '#b5ffff', icon: '⊟', layer: 'Application' },
    ],
  },
  {
    title: 'Tech & Physical',
    layerName: 'Tech & Physical',
    dotColor: '#c9e7b7',
    items: [
      { label: 'Technology Node', displayLabel: 'Node', color: '#c9e7b7', icon: '⚀', layer: 'Tech & Physical' },
      { label: 'Technology Device', displayLabel: 'Device', color: '#c9e7b7', icon: '⬚', layer: 'Tech & Physical' },
      { label: 'System Software', displayLabel: 'Sys. Software', color: '#c9e7b7', icon: 'Ⓞ', layer: 'Tech & Physical' },
      { label: 'Network', displayLabel: 'Network', color: '#c9e7b7', icon: '⛧', layer: 'Tech & Physical' },
      { label: 'Artifact', displayLabel: 'Artifact', color: '#c9e7b7', icon: '☰', layer: 'Tech & Physical' },
      { label: 'Facility', displayLabel: 'Facility', color: '#c9e7b7', icon: '⌂', layer: 'Tech & Physical' },
      { label: 'Equipment', displayLabel: 'Equipment', color: '#c9e7b7', icon: '⚙', layer: 'Tech & Physical' },
    ],
  },
  {
    title: 'Implementation',
    layerName: 'Implementation',
    dotColor: '#ffe0e0',
    items: [
      { label: 'Work Package', displayLabel: 'Work Package', color: '#ffe0e0', icon: '◧', layer: 'Implementation' },
      { label: 'Deliverable', displayLabel: 'Deliverable', color: '#ffe0e0', icon: '◨', layer: 'Implementation' },
      { label: 'Plateau', displayLabel: 'Plateau', color: '#ffe0e0', icon: '▤', layer: 'Implementation' },
      { label: 'Gap', displayLabel: 'Gap', color: '#ffe0e0', icon: '◫', layer: 'Implementation' },
    ],
  },
];

export function getArchimateTypeInfo(typeString: string): { color: string; icon: string; layer: string } {
  const map: Record<string, { color: string; icon: string; layer: string }> = {
    // Motivation
    Stakeholder: { color: '#ccccff', icon: '웃', layer: 'Motivation' },
    Driver: { color: '#ccccff', icon: '⚑', layer: 'Motivation' },
    Assessment: { color: '#ccccff', icon: '⚖', layer: 'Motivation' },
    Goal: { color: '#ccccff', icon: '◎', layer: 'Motivation' },
    Outcome: { color: '#ccccff', icon: '◎', layer: 'Motivation' },
    Principle: { color: '#ccccff', icon: '§', layer: 'Motivation' },
    Requirement: { color: '#ccccff', icon: '▱', layer: 'Motivation' },
    Constraint: { color: '#ccccff', icon: '⬒', layer: 'Motivation' },
    Meaning: { color: '#ccccff', icon: '✧', layer: 'Motivation' },
    Value: { color: '#ccccff', icon: 'Ⓞ', layer: 'Motivation' },

    // Strategy
    Resource: { color: '#f5deaa', icon: '▤', layer: 'Strategy' },
    Capability: { color: '#f5deaa', icon: '◩', layer: 'Strategy' },
    CourseOfAction: { color: '#f5deaa', icon: '⤞', layer: 'Strategy' },
    ValueStream: { color: '#f5deaa', icon: '❯', layer: 'Strategy' },

    // Business
    BusinessActor: { color: '#ffffb5', icon: '웃', layer: 'Business' },
    BusinessRole: { color: '#ffffb5', icon: '◪', layer: 'Business' },
    BusinessCollaboration: { color: '#ffffb5', icon: '⬣', layer: 'Business' },
    BusinessInterface: { color: '#ffffb5', icon: '⭘', layer: 'Business' },
    BusinessProcess: { color: '#ffffb5', icon: '⇨', layer: 'Business' },
    BusinessFunction: { color: '#ffffb5', icon: 'ᐱ', layer: 'Business' },
    BusinessInteraction: { color: '#ffffb5', icon: '⇄', layer: 'Business' },
    BusinessEvent: { color: '#ffffb5', icon: '◷', layer: 'Business' },
    BusinessService: { color: '#ffffb5', icon: '⌓', layer: 'Business' },
    BusinessObject: { color: '#ffffb5', icon: '■', layer: 'Business' },
    Contract: { color: '#ffffb5', icon: '☰', layer: 'Business' },
    Representation: { color: '#ffffb5', icon: '🖹', layer: 'Business' },
    Product: { color: '#ffffb5', icon: '⬒', layer: 'Business' },

    // Application
    ApplicationComponent: { color: '#b5ffff', icon: '◫', layer: 'Application' },
    ApplicationCollaboration: { color: '#b5ffff', icon: '⬣', layer: 'Application' },
    ApplicationInterface: { color: '#b5ffff', icon: '⭘', layer: 'Application' },
    ApplicationFunction: { color: '#b5ffff', icon: 'ᐱ', layer: 'Application' },
    ApplicationInteraction: { color: '#b5ffff', icon: '⇄', layer: 'Application' },
    ApplicationProcess: { color: '#b5ffff', icon: '⇨', layer: 'Application' },
    ApplicationEvent: { color: '#b5ffff', icon: '◷', layer: 'Application' },
    ApplicationService: { color: '#b5ffff', icon: '⌓', layer: 'Application' },
    DataObject: { color: '#b5ffff', icon: '⊟', layer: 'Application' },

    // Technology
    Node: { color: '#c9e7b7', icon: '⚀', layer: 'Technology' },
    Device: { color: '#c9e7b7', icon: '⬚', layer: 'Technology' },
    SystemSoftware: { color: '#c9e7b7', icon: 'Ⓞ', layer: 'Technology' },
    TechnologyCollaboration: { color: '#c9e7b7', icon: '⬣', layer: 'Technology' },
    TechnologyInterface: { color: '#c9e7b7', icon: '⭘', layer: 'Technology' },
    Path: { color: '#c9e7b7', icon: '⤞', layer: 'Technology' },
    CommunicationNetwork: { color: '#c9e7b7', icon: '⛧', layer: 'Technology' },
    TechnologyFunction: { color: '#c9e7b7', icon: 'ᐱ', layer: 'Technology' },
    TechnologyProcess: { color: '#c9e7b7', icon: '⇨', layer: 'Technology' },
    TechnologyInteraction: { color: '#c9e7b7', icon: '⇄', layer: 'Technology' },
    TechnologyEvent: { color: '#c9e7b7', icon: '◷', layer: 'Technology' },
    TechnologyService: { color: '#c9e7b7', icon: '⌓', layer: 'Technology' },
    Artifact: { color: '#c9e7b7', icon: '☰', layer: 'Technology' },

    // Physical
    Equipment: { color: '#c9e7b7', icon: '⚙', layer: 'Physical' },
    Facility: { color: '#c9e7b7', icon: '⌂', layer: 'Physical' },
    DistributionNetwork: { color: '#c9e7b7', icon: '⛧', layer: 'Physical' },
    Material: { color: '#c9e7b7', icon: '▤', layer: 'Physical' },

    // Implementation & Migration
    WorkPackage: { color: '#ffe0e0', icon: '◧', layer: 'Implementation' },
    Deliverable: { color: '#ffe0e0', icon: '◨', layer: 'Implementation' },
    ImplementationEvent: { color: '#ffe0e0', icon: '◷', layer: 'Implementation' },
    Plateau: { color: '#ffe0e0', icon: '▤', layer: 'Implementation' },
    Gap: { color: '#ffe0e0', icon: '◫', layer: 'Implementation' },

    // Grouping
    Grouping: { color: '#ffffff', icon: '⊞', layer: 'Generic' },
  };
  return map[typeString] || { color: '#e2e8f0', icon: '⬚', layer: 'Other' };
}

export function getArchimateRelType(relTypeStr: string): RelationshipType {
  const relMap: Record<string, RelationshipType> = {
    AssociationRelationship: 'association',
    FlowRelationship: 'flow',
    TriggeringRelationship: 'triggering',
    RealizationRelationship: 'realization',
    SpecializationRelationship: 'specialization',
    ServingRelationship: 'serving',
    AccessRelationship: 'access',
    InfluenceRelationship: 'influence',
    CompositionRelationship: 'composition',
    AggregationRelationship: 'aggregation',
    AssignmentRelationship: 'assignment',
  };
  return relMap[relTypeStr] || 'association';
}
