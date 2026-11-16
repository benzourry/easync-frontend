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

/** ArchiMate 3.2 layers, listed in the order they stack in an architecture. */
export type ArchimateLayer =
  | 'Strategy'
  | 'Business'
  | 'Application'
  | 'Tech & Physical'
  | 'Physical'
  | 'Motivation'
  | 'Implementation'
  | 'Generic'
  | 'Connector'
  | 'Other';

/** Canonical layer order, used for trees, repository groups and palette sections. */
export const LAYER_ORDER: readonly ArchimateLayer[] = [
  'Strategy',
  'Business',
  'Application',
  'Tech & Physical',
  'Physical',
  'Motivation',
  'Implementation',
  'Generic',
  'Connector',
  'Other',
];

const LAYER_RANK = new Map<string, number>(LAYER_ORDER.map((layer, index) => [layer, index]));

/** Coerces a persisted or imported layer to a known layer, defaulting to `Other`. */
export function layerOf(value: string | null | undefined): ArchimateLayer {
  if (!value) return 'Other';
  const needle = value.trim().toLowerCase();
  return LAYER_ORDER.find((layer) => layer.toLowerCase() === needle) ?? 'Other';
}

/** Layer sort comparator: canonical order first, unknown layers last and alphabetical. */
export function compareLayers(a: string, b: string): number {
  const rankA = LAYER_RANK.get(a) ?? LAYER_ORDER.length;
  const rankB = LAYER_RANK.get(b) ?? LAYER_ORDER.length;
  return rankA === rankB ? a.localeCompare(b) : rankA - rankB;
}

export interface PaletteItem {
  label: string;
  displayLabel: string;
  color: string;
  icon: string;
  layer: ArchimateLayer;
  isDashed?: boolean;
}

export interface PaletteCategory {
  title: string;
  layerName: ArchimateLayer;
  dotColor: string;
  items: PaletteItem[];
}

export interface GlobalElement {
  id: string;
  label: string;
  color: string;
  icon: string;
  layer: ArchimateLayer;
  /** Model element this entry stands for; several entries can share one. */
  elementKey?: string;
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
  layer: ArchimateLayer;
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

/**
 * Every ArchiMate 3.2 element Archi 5.x offers in its palette, grouped the way
 * Archi groups them. Composite elements keep the `Generic` layer because that
 * layer is what draws an element as a container.
 */
export const PALETTE_CATEGORIES: PaletteCategory[] = [
  {
    title: 'Composite',
    layerName: 'Generic',
    dotColor: '#ffffff',
    items: [
      { label: 'Grouping', displayLabel: 'Grouping', color: '#ffffff', icon: '⊞', layer: 'Generic', isDashed: true },
      { label: 'Location', displayLabel: 'Location', color: '#ffffff', icon: '⌖', layer: 'Generic', isDashed: true },
    ],
  },
  {
    title: 'Motivation',
    layerName: 'Motivation',
    dotColor: '#ccccff',
    items: [
      { label: 'Stakeholder', displayLabel: 'Stakeholder', color: '#ccccff', icon: '웃', layer: 'Motivation' },
      { label: 'Driver', displayLabel: 'Driver', color: '#ccccff', icon: '⚑', layer: 'Motivation' },
      { label: 'Assessment', displayLabel: 'Assessment', color: '#ccccff', icon: '⚖', layer: 'Motivation' },
      { label: 'Goal', displayLabel: 'Goal', color: '#ccccff', icon: '◎', layer: 'Motivation' },
      { label: 'Outcome', displayLabel: 'Outcome', color: '#ccccff', icon: '◉', layer: 'Motivation' },
      { label: 'Principle', displayLabel: 'Principle', color: '#ccccff', icon: '§', layer: 'Motivation' },
      { label: 'Requirement', displayLabel: 'Requirement', color: '#ccccff', icon: '▱', layer: 'Motivation' },
      { label: 'Constraint', displayLabel: 'Constraint', color: '#ccccff', icon: '⬓', layer: 'Motivation' },
      { label: 'Meaning', displayLabel: 'Meaning', color: '#ccccff', icon: '✧', layer: 'Motivation' },
      { label: 'Value', displayLabel: 'Value', color: '#ccccff', icon: '◍', layer: 'Motivation' },
    ],
  },
  {
    title: 'Strategy',
    layerName: 'Strategy',
    dotColor: '#f5deaa',
    items: [
      { label: 'Resource', displayLabel: 'Resource', color: '#f5deaa', icon: '▤', layer: 'Strategy' },
      { label: 'Capability', displayLabel: 'Capability', color: '#f5deaa', icon: '◩', layer: 'Strategy' },
      { label: 'Course of Action', displayLabel: 'Course of Action', color: '#f5deaa', icon: '⤞', layer: 'Strategy' },
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
      { label: 'Business Collaboration', displayLabel: 'Collaboration', color: '#ffffb5', icon: '⬣', layer: 'Business' },
      { label: 'Business Interface', displayLabel: 'Interface', color: '#ffffb5', icon: '⭘', layer: 'Business' },
      { label: 'Business Process', displayLabel: 'Process', color: '#ffffb5', icon: '⇨', layer: 'Business' },
      { label: 'Business Function', displayLabel: 'Function', color: '#ffffb5', icon: 'ᐱ', layer: 'Business' },
      { label: 'Business Interaction', displayLabel: 'Interaction', color: '#ffffb5', icon: '⇄', layer: 'Business' },
      { label: 'Business Event', displayLabel: 'Event', color: '#ffffb5', icon: '◷', layer: 'Business' },
      { label: 'Business Service', displayLabel: 'Service', color: '#ffffb5', icon: '⌓', layer: 'Business' },
      { label: 'Business Object', displayLabel: 'Object', color: '#ffffb5', icon: '■', layer: 'Business' },
      { label: 'Contract', displayLabel: 'Contract', color: '#ffffb5', icon: '≣', layer: 'Business' },
      { label: 'Representation', displayLabel: 'Representation', color: '#ffffb5', icon: '🖹', layer: 'Business' },
      { label: 'Product', displayLabel: 'Product', color: '#ffffb5', icon: '⬒', layer: 'Business' },
    ],
  },
  {
    title: 'Application',
    layerName: 'Application',
    dotColor: '#b5ffff',
    items: [
      { label: 'Application Component', displayLabel: 'Component', color: '#b5ffff', icon: '◫', layer: 'Application' },
      { label: 'Application Collaboration', displayLabel: 'Collaboration', color: '#b5ffff', icon: '⬣', layer: 'Application' },
      { label: 'Application Interface', displayLabel: 'Interface', color: '#b5ffff', icon: '⭘', layer: 'Application' },
      { label: 'Application Function', displayLabel: 'Function', color: '#b5ffff', icon: 'ᐱ', layer: 'Application' },
      { label: 'Application Interaction', displayLabel: 'Interaction', color: '#b5ffff', icon: '⇄', layer: 'Application' },
      { label: 'Application Process', displayLabel: 'Process', color: '#b5ffff', icon: '⇨', layer: 'Application' },
      { label: 'Application Event', displayLabel: 'Event', color: '#b5ffff', icon: '◷', layer: 'Application' },
      { label: 'Application Service', displayLabel: 'Service', color: '#b5ffff', icon: '⌓', layer: 'Application' },
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
      { label: 'Technology Collaboration', displayLabel: 'Collaboration', color: '#c9e7b7', icon: '⬣', layer: 'Tech & Physical' },
      { label: 'Technology Interface', displayLabel: 'Interface', color: '#c9e7b7', icon: '⭘', layer: 'Tech & Physical' },
      { label: 'Path', displayLabel: 'Path', color: '#c9e7b7', icon: '⇝', layer: 'Tech & Physical' },
      { label: 'Communication Network', displayLabel: 'Network', color: '#c9e7b7', icon: '⛧', layer: 'Tech & Physical' },
      { label: 'Technology Function', displayLabel: 'Function', color: '#c9e7b7', icon: 'ᐱ', layer: 'Tech & Physical' },
      { label: 'Technology Process', displayLabel: 'Process', color: '#c9e7b7', icon: '⇨', layer: 'Tech & Physical' },
      { label: 'Technology Interaction', displayLabel: 'Interaction', color: '#c9e7b7', icon: '⇄', layer: 'Tech & Physical' },
      { label: 'Technology Event', displayLabel: 'Event', color: '#c9e7b7', icon: '◷', layer: 'Tech & Physical' },
      { label: 'Technology Service', displayLabel: 'Service', color: '#c9e7b7', icon: '⌓', layer: 'Tech & Physical' },
      { label: 'Artifact', displayLabel: 'Artifact', color: '#c9e7b7', icon: '☰', layer: 'Tech & Physical' },
      { label: 'Equipment', displayLabel: 'Equipment', color: '#c9e7b7', icon: '⚙', layer: 'Physical' },
      { label: 'Facility', displayLabel: 'Facility', color: '#c9e7b7', icon: '⌂', layer: 'Physical' },
      { label: 'Distribution Network', displayLabel: 'Distr. Network', color: '#c9e7b7', icon: '▦', layer: 'Physical' },
      { label: 'Material', displayLabel: 'Material', color: '#c9e7b7', icon: '▩', layer: 'Physical' },
    ],
  },
  {
    title: 'Implementation',
    layerName: 'Implementation',
    dotColor: '#ffe0e0',
    items: [
      { label: 'Work Package', displayLabel: 'Work Package', color: '#ffe0e0', icon: '◧', layer: 'Implementation' },
      { label: 'Deliverable', displayLabel: 'Deliverable', color: '#ffe0e0', icon: '◨', layer: 'Implementation' },
      { label: 'Implementation Event', displayLabel: 'Event', color: '#ffe0e0', icon: '◷', layer: 'Implementation' },
      { label: 'Plateau', displayLabel: 'Plateau', color: '#ffe0e0', icon: '▤', layer: 'Implementation' },
      { label: 'Gap', displayLabel: 'Gap', color: '#ffe0e0', icon: '◫', layer: 'Implementation' },
    ],
  },
  {
    title: 'Connectors',
    layerName: 'Connector',
    dotColor: '#ffffff',
    items: [
      { label: 'Junction', displayLabel: 'Junction', color: '#ffffff', icon: '◆', layer: 'Connector', isDashed: true },
    ],
  },
];

export function getArchimateTypeInfo(typeString: string): {
  color: string;
  icon: string;
  layer: ArchimateLayer;
} {
  const map: Record<string, { color: string; icon: string; layer: ArchimateLayer }> = {
    // Motivation
    Stakeholder: { color: '#ccccff', icon: '웃', layer: 'Motivation' },
    Driver: { color: '#ccccff', icon: '⚑', layer: 'Motivation' },
    Assessment: { color: '#ccccff', icon: '⚖', layer: 'Motivation' },
    Goal: { color: '#ccccff', icon: '◎', layer: 'Motivation' },
    Outcome: { color: '#ccccff', icon: '◉', layer: 'Motivation' },
    Principle: { color: '#ccccff', icon: '§', layer: 'Motivation' },
    Requirement: { color: '#ccccff', icon: '▱', layer: 'Motivation' },
    Constraint: { color: '#ccccff', icon: '⬓', layer: 'Motivation' },
    Meaning: { color: '#ccccff', icon: '✧', layer: 'Motivation' },
    Value: { color: '#ccccff', icon: '◍', layer: 'Motivation' },

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
    Contract: { color: '#ffffb5', icon: '≣', layer: 'Business' },
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

    // Technology & physical
    Node: { color: '#c9e7b7', icon: '⚀', layer: 'Tech & Physical' },
    TechnologyNode: { color: '#c9e7b7', icon: '⚀', layer: 'Tech & Physical' },
    Device: { color: '#c9e7b7', icon: '⬚', layer: 'Tech & Physical' },
    TechnologyDevice: { color: '#c9e7b7', icon: '⬚', layer: 'Tech & Physical' },
    SystemSoftware: { color: '#c9e7b7', icon: 'Ⓞ', layer: 'Tech & Physical' },
    TechnologyCollaboration: { color: '#c9e7b7', icon: '⬣', layer: 'Tech & Physical' },
    TechnologyInterface: { color: '#c9e7b7', icon: '⭘', layer: 'Tech & Physical' },
    Path: { color: '#c9e7b7', icon: '⇝', layer: 'Tech & Physical' },
    CommunicationNetwork: { color: '#c9e7b7', icon: '⛧', layer: 'Tech & Physical' },
    TechnologyFunction: { color: '#c9e7b7', icon: 'ᐱ', layer: 'Tech & Physical' },
    TechnologyProcess: { color: '#c9e7b7', icon: '⇨', layer: 'Tech & Physical' },
    TechnologyInteraction: { color: '#c9e7b7', icon: '⇄', layer: 'Tech & Physical' },
    TechnologyEvent: { color: '#c9e7b7', icon: '◷', layer: 'Tech & Physical' },
    TechnologyService: { color: '#c9e7b7', icon: '⌓', layer: 'Tech & Physical' },
    Artifact: { color: '#c9e7b7', icon: '☰', layer: 'Tech & Physical' },

    // Physical
    Equipment: { color: '#c9e7b7', icon: '⚙', layer: 'Physical' },
    Facility: { color: '#c9e7b7', icon: '⌂', layer: 'Physical' },
    DistributionNetwork: { color: '#c9e7b7', icon: '▦', layer: 'Physical' },
    Material: { color: '#c9e7b7', icon: '▩', layer: 'Physical' },

    // Implementation & Migration
    WorkPackage: { color: '#ffe0e0', icon: '◧', layer: 'Implementation' },
    Deliverable: { color: '#ffe0e0', icon: '◨', layer: 'Implementation' },
    ImplementationEvent: { color: '#ffe0e0', icon: '◷', layer: 'Implementation' },
    Plateau: { color: '#ffe0e0', icon: '▤', layer: 'Implementation' },
    Gap: { color: '#ffe0e0', icon: '◫', layer: 'Implementation' },

    // Composite & connectors
    Grouping: { color: '#ffffff', icon: '⊞', layer: 'Generic' },
    // Archi's exchange format calls a Grouping `Group`.
    Group: { color: '#ffffff', icon: '⊞', layer: 'Generic' },
    Location: { color: '#ffffff', icon: '⌖', layer: 'Generic' },
    Junction: { color: '#ffffff', icon: '◆', layer: 'Connector' },
    AndJunction: { color: '#ffffff', icon: '◆', layer: 'Connector' },
    OrJunction: { color: '#ffffff', icon: '◆', layer: 'Connector' },
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
