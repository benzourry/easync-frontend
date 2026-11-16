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
