import { LAYER_ORDER, PALETTE_CATEGORIES } from './archimate.models';
import type { ArchimateLayer, RelationshipType } from './archimate.models';
import type { ModelElementDto, ModelRelationshipDto } from './api.models';
import type { ViewSnapshot } from './diagram.models';

/** Longest key the server accepts, matching the column widths in `V5__model_elements.sql`. */
export const MAX_KEY_LENGTH = 64;

/** Planning horizon of an element: where it is in the transition from baseline to target. */
export type Plateau = 'baseline' | 'transition' | 'target';

/** Time-relative state used for portfolio and roadmap views. */
export type LifecycleState = 'current' | 'planned' | 'phasing-out';

export const PLATEAU_OPTIONS: readonly { value: Plateau; label: string }[] = [
  { value: 'baseline', label: 'Baseline' },
  { value: 'transition', label: 'Transition' },
  { value: 'target', label: 'Target' },
];

export const LIFECYCLE_OPTIONS: readonly { value: LifecycleState; label: string }[] = [
  { value: 'current', label: 'Current' },
  { value: 'planned', label: 'Planned' },
  { value: 'phasing-out', label: 'Phasing out' },
];

/**
 * The modelled thing, independent of where it is drawn. A shape is one occurrence of an element,
 * so the same element can appear on several views.
 */
export interface ModelElement {
  /** Stable identity inside the diagram; shapes on a canvas point at it. */
  key: string;
  name: string;
  /** ArchiMate 3.2 type name, e.g. `ApplicationComponent`. */
  archimateType: string;
  layer: ArchimateLayer;
  /** Framework domain or BDAT segment, e.g. `aplikasi`. */
  domain: string | null;
  plateau: Plateau | null;
  lifecycleState: LifecycleState | null;
  /** Reference model code, e.g. `ARM`. */
  referenceModel: string | null;
  /** Identifier in that reference model, e.g. `ARM-014`. */
  refCode: string | null;
  classification: string | null;
  owner: string | null;
  documentation: string;
  properties: Record<string, string>;
}

export interface ModelRelationship {
  key: string;
  type: RelationshipType;
  sourceKey: string;
  targetKey: string;
  name: string | null;
  documentation: string;
  properties: Record<string, string>;
}

export interface ModelCatalogue {
  elements: ModelElement[];
  relationships: ModelRelationship[];
}

export const EMPTY_CATALOGUE: ModelCatalogue = { elements: [], relationships: [] };

/** ArchiMate type of the first palette entry per layer, used when nothing else identifies a shape. */
const FALLBACK_TYPE_BY_LAYER = new Map<string, string>();
/** Palette icon to ArchiMate type, so a legacy snapshot can be read back as a typed element. */
const TYPE_BY_ICON = new Map<string, string>();
/** ArchiMate type to palette icon, so a type change can be shown on existing shapes. */
const ICON_BY_TYPE = new Map<string, string>();
/** ArchiMate type to the palette entry that draws it, used to build repository rows. */
const PALETTE_BY_TYPE = new Map<string, { layer: ArchimateLayer; icon: string; color: string }>();
for (const category of PALETTE_CATEGORIES) {
  for (const item of category.items) {
    if (!TYPE_BY_ICON.has(item.icon)) TYPE_BY_ICON.set(item.icon, item.label);
    if (!ICON_BY_TYPE.has(item.label)) ICON_BY_TYPE.set(item.label, item.icon);
    if (!PALETTE_BY_TYPE.has(item.label)) {
      PALETTE_BY_TYPE.set(item.label, {
        layer: item.layer,
        icon: item.icon,
        color: item.color,
      });
    }
    if (!FALLBACK_TYPE_BY_LAYER.has(item.layer)) FALLBACK_TYPE_BY_LAYER.set(item.layer, item.label);
  }
}

/** Palette icon used to draw `archimateType`, or `null` when the type is not in the palette. */
export function iconForType(archimateType: string): string | null {
  return ICON_BY_TYPE.get(archimateType) ?? null;
}

/** How the palette draws `archimateType`, so repository rows match what a drop creates. */
export function paletteItemFor(
  archimateType: string,
): { layer: ArchimateLayer; icon: string; color: string } | null {
  return PALETTE_BY_TYPE.get(archimateType) ?? null;
}

/** The ArchiMate types offered when changing an element's type, grouped by palette category. */
export const TYPE_OPTIONS: readonly { layer: ArchimateLayer; types: readonly string[] }[] =
  PALETTE_CATEGORIES.map((category) => ({
    layer: category.layerName,
    types: category.items.map((item) => item.label),
  }));

export function emptyModelElement(
  key: string,
  name: string,
  archimateType: string,
  layer: ArchimateLayer,
): ModelElement {
  return {
    key,
    name,
    archimateType,
    layer,
    domain: null,
    plateau: null,
    lifecycleState: null,
    referenceModel: null,
    refCode: null,
    classification: null,
    owner: null,
    documentation: '',
    properties: {},
  };
}

export function archimateTypeForIcon(
  icon: string | null | undefined,
  layer: ArchimateLayer,
): string {
  return (
    (icon ? TYPE_BY_ICON.get(icon) : undefined) ?? FALLBACK_TYPE_BY_LAYER.get(layer) ?? 'Grouping'
  );
}

/**
 * FNV-1a in base 36. Derived keys have to stay under the column width, and an imported model can
 * carry identifiers longer than that, so over-long values are folded instead of rejected.
 */
function hashKey(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** Keeps an identifier usable as a model key without losing its stability. */
export function compactKey(prefix: string, value: string): string {
  return value.length <= MAX_KEY_LENGTH ? value : `${prefix}_${hashKey(value)}`;
}

/** Stable relationship key, so the same connection on two views maps to one model relationship. */
export function relationshipKey(sourceKey: string, targetKey: string, type: string): string {
  return `rel_${hashKey(`${sourceKey}|${targetKey}|${type}`)}`;
}

export function asPlateau(value: string | null | undefined): Plateau | null {
  return PLATEAU_OPTIONS.some((option) => option.value === value) ? (value as Plateau) : null;
}

export function asLifecycleState(value: string | null | undefined): LifecycleState | null {
  return LIFECYCLE_OPTIONS.some((option) => option.value === value)
    ? (value as LifecycleState)
    : null;
}

export function catalogueFromDto(
  elements: readonly ModelElementDto[] | null | undefined,
  relationships: readonly ModelRelationshipDto[] | null | undefined,
): ModelCatalogue {
  return {
    elements: (elements ?? []).map((dto) => ({
      key: dto.elementKey,
      name: dto.name,
      archimateType: dto.archimateType,
      layer: dto.layer,
      domain: dto.domain ?? null,
      plateau: asPlateau(dto.plateau),
      lifecycleState: asLifecycleState(dto.lifecycleState),
      referenceModel: dto.referenceModel ?? null,
      refCode: dto.refCode ?? null,
      classification: dto.classification ?? null,
      owner: dto.owner ?? null,
      documentation: dto.documentation ?? '',
      properties: dto.properties ?? {},
    })),
    relationships: (relationships ?? []).map((dto) => ({
      key: dto.relationshipKey,
      type: dto.type,
      sourceKey: dto.sourceKey,
      targetKey: dto.targetKey,
      name: dto.name ?? null,
      documentation: dto.documentation ?? '',
      properties: dto.properties ?? {},
    })),
  };
}

export function elementToDto(element: ModelElement): ModelElementDto {
  return {
    elementKey: element.key,
    name: element.name,
    archimateType: element.archimateType,
    layer: element.layer,
    domain: element.domain,
    plateau: element.plateau,
    lifecycleState: element.lifecycleState,
    referenceModel: element.referenceModel,
    refCode: element.refCode,
    classification: element.classification,
    owner: element.owner,
    documentation: element.documentation,
    properties: element.properties,
  };
}

export function relationshipToDto(relationship: ModelRelationship): ModelRelationshipDto {
  return {
    relationshipKey: relationship.key,
    type: relationship.type,
    sourceKey: relationship.sourceKey,
    targetKey: relationship.targetKey,
    name: relationship.name,
    documentation: relationship.documentation,
    properties: relationship.properties,
  };
}

/**
 * Rebuilds a catalogue from `views` alone, so diagrams saved before the model existed still open
 * with every shape addressable by key. Layer and icon are all a snapshot records, so the ArchiMate
 * type comes from the palette rather than from the shape.
 */
export function deriveCatalogueFromViews(
  views: readonly { snapshot: ViewSnapshot }[],
): ModelCatalogue {
  const elements = new Map<string, ModelElement>();
  const relationships = new Map<string, ModelRelationship>();

  for (const view of views) {
    for (const shape of view.snapshot.shapes ?? []) {
      const key = compactKey('el', shape.elementKey || shape.id);
      if (elements.has(key)) continue;
      const layer = LAYER_ORDER.includes(shape.layer) ? shape.layer : 'Generic';
      elements.set(key, {
        ...emptyModelElement(
          key,
          shape.label || 'Untitled',
          archimateTypeForIcon(shape.icon, layer),
          layer,
        ),
        documentation: shape.doc ?? '',
      });
    }

    for (const connection of view.snapshot.connections ?? []) {
      const sourceKey = compactKey('el', connection.sourceId);
      const targetKey = compactKey('el', connection.targetId);
      if (!elements.has(sourceKey) || !elements.has(targetKey)) continue;
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

  return { elements: [...elements.values()], relationships: [...relationships.values()] };
}
