import type { RelationshipType } from './archimate.models';
import {
  MATRIX_ALPHABET,
  MATRIX_CONCEPTS,
  MATRIX_MASKS,
  MATRIX_ROWS,
} from './relationship-matrix.data';

/** Relationship type each Archi key letter stands for. */
const TYPE_BY_KEY: Record<string, RelationshipType> = {
  a: 'access',
  c: 'composition',
  f: 'flow',
  g: 'aggregation',
  i: 'assignment',
  n: 'influence',
  o: 'association',
  r: 'realization',
  s: 'specialization',
  t: 'triggering',
  v: 'serving',
};

/**
 * Palette labels that do not squash onto an Archi concept name. Technology elements drop the
 * layer prefix in Archi and both junction kinds share the single `Junction` concept.
 */
const CONCEPT_ALIASES: Record<string, string> = {
  technologynode: 'Node',
  technologydevice: 'Device',
  andjunction: 'Junction',
  orjunction: 'Junction',
};

function squash(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const CONCEPT_BY_LABEL = new Map<string, string>();
for (const concept of MATRIX_CONCEPTS) CONCEPT_BY_LABEL.set(squash(concept), concept);

/** Masks are tiny, so each distinct set is decoded once at module load. */
const TYPES_BY_MASK = new Map<string, readonly RelationshipType[]>();
const PERMITTED = new Map<string, Map<string, readonly RelationshipType[]>>();

function decodeMask(mask: string): readonly RelationshipType[] {
  const cached = TYPES_BY_MASK.get(mask);
  if (cached) return cached;
  const types: RelationshipType[] = [];
  for (const letter of mask) {
    const type = TYPE_BY_KEY[letter];
    if (type && !types.includes(type)) types.push(type);
  }
  TYPES_BY_MASK.set(mask, types);
  return types;
}

for (let row = 0; row < MATRIX_ROWS.length; row++) {
  const source = MATRIX_CONCEPTS[row];
  const targets = new Map<string, readonly RelationshipType[]>();
  const cells = MATRIX_ROWS[row];
  for (let column = 0; column < cells.length; column++) {
    const cell = cells[column];
    if (cell === '.') continue;
    const maskIndex = MATRIX_ALPHABET.indexOf(cell);
    const mask = MATRIX_MASKS[maskIndex] ?? '';
    targets.set(MATRIX_CONCEPTS[column], decodeMask(mask));
  }
  PERMITTED.set(source, targets);
}

/**
 * Archi concept for a palette label or element type, e.g. `Business Actor` -> `BusinessActor`
 * and `Technology Node` -> `Node`. Returns null when the model uses a type Archi does not know,
 * which lets callers skip legality checks instead of reporting false problems.
 */
export function matrixConceptFor(type: string | null | undefined): string | null {
  if (!type) return null;
  const squashed = squash(type);
  if (!squashed) return null;
  return CONCEPT_ALIASES[squashed] ?? CONCEPT_BY_LABEL.get(squashed) ?? null;
}

/** True when ArchiMate defines some relationship between the two element types. */
export function isKnownPair(
  sourceType: string | null | undefined,
  targetType: string | null | undefined,
): boolean {
  const source = matrixConceptFor(sourceType);
  const target = matrixConceptFor(targetType);
  if (!source || !target) return false;
  return PERMITTED.get(source)?.has(target) ?? false;
}

/**
 * Relationship types ArchiMate permits from `sourceType` to `targetType`, in the order the
 * specification tables list them. Empty for an unknown pair, so check `isKnownPair` first when
 * the difference between "not allowed" and "not described" matters.
 */
export function allowedRelationshipTypes(
  sourceType: string | null | undefined,
  targetType: string | null | undefined,
): readonly RelationshipType[] {
  const source = matrixConceptFor(sourceType);
  const target = matrixConceptFor(targetType);
  if (!source || !target) return [];
  return PERMITTED.get(source)?.get(target) ?? [];
}

/** True when ArchiMate permits the relationship, and false for unknown types. */
export function isRelationshipAllowed(
  sourceType: string | null | undefined,
  targetType: string | null | undefined,
  type: RelationshipType,
): boolean {
  return allowedRelationshipTypes(sourceType, targetType).includes(type);
}

/**
 * Order Archi tries relationship types in when several are permitted, taken from its
 * `ArchimateModelUtils.getRelationsClasses()` so the Magic Connector agrees with Archi.
 */
const PREFERRED_TYPES: readonly RelationshipType[] = [
  'composition',
  'aggregation',
  'assignment',
  'realization',
  'serving',
  'access',
  'influence',
  'triggering',
  'flow',
  'specialization',
  'association',
];

/** Sorts relationship types into Archi's preferred order; unknown types keep their place last. */
export function orderedRelationshipTypes(
  types: readonly RelationshipType[],
): RelationshipType[] {
  const rank = (type: RelationshipType): number => {
    const index = PREFERRED_TYPES.indexOf(type);
    return index === -1 ? PREFERRED_TYPES.length : index;
  };
  return [...types].sort((left, right) => rank(left) - rank(right));
}

/** One relationship the Magic Connector offers, and the direction it runs in. */
export interface MagicConnectionOption {
  type: RelationshipType;
  /** True when the relationship runs from the second shape back to the first. */
  reverse: boolean;
}

/**
 * Every relationship the Magic Connector offers between two element types: the permitted types in
 * Archi's preferred order, then the ones only the opposite direction permits, so the user can pick
 * instead of the tool guessing. Types the matrix does not describe keep the plain `flow` default;
 * an empty list means ArchiMate permits no relationship at all.
 */
export function magicConnectionOptions(
  sourceType: string | null | undefined,
  targetType: string | null | undefined,
): MagicConnectionOption[] {
  if (!matrixConceptFor(sourceType) || !matrixConceptFor(targetType)) {
    return [{ type: 'flow', reverse: false }];
  }
  const forward = orderedRelationshipTypes(allowedRelationshipTypes(sourceType, targetType));
  const reverse = orderedRelationshipTypes(allowedRelationshipTypes(targetType, sourceType));
  const options: MagicConnectionOption[] = forward.map((type) => ({ type, reverse: false }));
  for (const type of reverse) {
    if (!options.some((option) => option.type === type)) options.push({ type, reverse: true });
  }
  return options;
}

/**
 * Relationship the Magic Connector draws without asking: the first type the rules permit in the
 * direction the user drew, in Archi's preferred order. Null means ArchiMate permits nothing in
 * that direction, so the caller can refuse instead of drawing an invalid relationship.
 */
export function magicRelationshipType(
  sourceType: string | null | undefined,
  targetType: string | null | undefined,
): RelationshipType | null {
  return (
    magicConnectionOptions(sourceType, targetType).find((option) => !option.reverse)?.type ??
    null
  );
}

/**
 * Junctions must join one relationship type so the model reads as a single branch. Grouping and
 * Location may additionally aggregate or compose anything, including a junction.
 */
export function isStructuralFromGroupingOrLocation(
  sourceType: string | null | undefined,
  type: RelationshipType,
): boolean {
  const source = matrixConceptFor(sourceType);
  if (source !== 'Grouping' && source !== 'Location') return false;
  return type === 'aggregation' || type === 'composition';
}
