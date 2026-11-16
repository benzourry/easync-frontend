import type { TogafPhaseId } from '../frameworks/togaf';
import type { ArchimateLayer } from './archimate.models';
import type { LifecycleState, ModelElement, Plateau } from './model.models';

/**
 * What has to happen to an element when moving from one plateau to the next.
 * - `retire` exists in the source plateau only,
 * - `introduce` exists in the destination plateau only,
 * - `align` is staged in the middle plateau and needs migration work,
 * - `retain` has no plateau, so it is common to both and unchanged.
 */
export type GapKind = 'retire' | 'introduce' | 'align' | 'retain';

export const GAP_KINDS: readonly GapKind[] = ['retire', 'introduce', 'align', 'retain'];

export interface PlateauGapEntry {
  key: string;
  name: string;
  archimateType: string;
  layer: ArchimateLayer;
  domain: string | null;
  plateau: Plateau | null;
  lifecycleState: LifecycleState | null;
  kind: GapKind;
}

export interface PlateauGap {
  /** Source plateau; `null` when the gap could not be computed. */
  from: Plateau;
  to: Plateau;
  entries: PlateauGapEntry[];
  counts: Record<GapKind, number>;
}

function emptyCounts(): Record<GapKind, number> {
  return { retire: 0, introduce: 0, align: 0, retain: 0 };
}

/** Plateaus that are neither the source nor the destination, e.g. `transition` for baseline → target. */
function kindOf(plateau: Plateau | null, from: Plateau, to: Plateau): GapKind {
  if (plateau === null) return 'retain';
  if (plateau === from) return 'retire';
  if (plateau === to) return 'introduce';
  return 'align';
}

/**
 * Classifies every element by the work it implies between two plateaus. Comparing a plateau with
 * itself yields no gap, because nothing has to change.
 */
export function analysePlateauGap(
  elements: readonly ModelElement[],
  from: Plateau,
  to: Plateau,
): PlateauGap {
  if (from === to) {
    return { from, to, entries: [], counts: emptyCounts() };
  }

  const entries: PlateauGapEntry[] = [];
  const counts = emptyCounts();
  for (const element of elements) {
    const kind = kindOf(element.plateau, from, to);
    counts[kind] += 1;
    entries.push({
      key: element.key,
      name: element.name,
      archimateType: element.archimateType,
      layer: element.layer,
      domain: element.domain,
      plateau: element.plateau,
      lifecycleState: element.lifecycleState,
      kind,
    });
  }

  const order = (entry: PlateauGapEntry) =>
    GAP_KINDS.indexOf(entry.kind) * 1000 + entry.layer.localeCompare(entry.layer);
  entries.sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));

  return { from, to, entries, counts };
}

/**
 * The ADM phase whose architecture work defines elements of `layer`. Motivation and generic
 * elements come from the preliminary phase, and implementation elements are sequenced during
 * migration planning.
 */
const PHASE_BY_LAYER: Record<ArchimateLayer, TogafPhaseId> = {
  Strategy: 'a',
  Business: 'b',
  Application: 'c',
  'Tech & Physical': 'd',
  Physical: 'd',
  Implementation: 'f',
  Motivation: 'preliminary',
  Generic: 'preliminary',
  Connector: 'f',
  Other: 'preliminary',
};

export function phaseForLayer(layer: ArchimateLayer): TogafPhaseId {
  return PHASE_BY_LAYER[layer] ?? 'f';
}

export interface WorkPackage {
  id: string;
  /** ADM phase that plans this package. */
  phase: TogafPhaseId;
  kind: Exclude<GapKind, 'retain'>;
  layer: ArchimateLayer;
  elementKeys: string[];
}

const WORK_KINDS: readonly Exclude<GapKind, 'retain'>[] = ['retire', 'introduce', 'align'];

/**
 * Groups the change implied by a gap into work packages: one per kind and layer, ordered so the
 * packages that remove baseline come after the ones that add the target.
 */
export function planWorkPackages(gap: PlateauGap): WorkPackage[] {
  const packages: WorkPackage[] = [];
  const byId = new Map<string, WorkPackage>();

  for (const entry of gap.entries) {
    if (entry.kind === 'retain') continue;
    const id = `${entry.kind}:${entry.layer}`;
    let workPackage = byId.get(id);
    if (!workPackage) {
      workPackage = {
        id,
        phase: phaseForLayer(entry.layer),
        kind: entry.kind,
        layer: entry.layer,
        elementKeys: [],
      };
      byId.set(id, workPackage);
      packages.push(workPackage);
    }
    workPackage.elementKeys.push(entry.key);
  }

  packages.sort(
    (a, b) =>
      WORK_KINDS.indexOf(a.kind) - WORK_KINDS.indexOf(b.kind) || a.layer.localeCompare(b.layer),
  );
  return packages;
}
