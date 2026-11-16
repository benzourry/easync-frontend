import { describe, expect, it } from 'vitest';
import { emptyModelElement } from '../models/model.models';
import type { ModelElement, Plateau } from '../models/model.models';
import { analysePlateauGap, phaseForLayer, planWorkPackages } from '../models/plateau.models';

function element(name: string, plateau: Plateau | null, layer: ModelElement['layer'] = 'Application'): ModelElement {
  const created = emptyModelElement(name.toLowerCase(), name, 'ApplicationComponent', layer);
  return { ...created, plateau };
}

describe('plateau gap analysis', () => {
  it('classifies elements by the work each implies', () => {
    const gap = analysePlateauGap(
      [
        element('Old CRM', 'baseline'),
        element('New CRM', 'target'),
        element('Shared Service', null),
        element('Bridge', 'transition'),
      ],
      'baseline',
      'target',
    );

    expect(gap.counts).toEqual({ retire: 1, introduce: 1, align: 1, retain: 1 });
    expect(gap.entries.map((entry) => entry.kind)).toEqual([
      'retire',
      'introduce',
      'align',
      'retain',
    ]);
  });

  it('finds no gap when the plateaus are the same', () => {
    const gap = analysePlateauGap([element('Old CRM', 'baseline')], 'baseline', 'baseline');

    expect(gap.entries).toEqual([]);
    expect(gap.counts).toEqual({ retire: 0, introduce: 0, align: 0, retain: 0 });
  });

  it('treats the middle plateau as source when that is what was asked for', () => {
    const gap = analysePlateauGap(
      [element('Bridge', 'transition'), element('New CRM', 'target')],
      'transition',
      'target',
    );

    expect(gap.counts.retire).toBe(1);
    expect(gap.counts.introduce).toBe(1);
    expect(gap.counts.align).toBe(0);
  });
});

describe('work packages', () => {
  it('groups changes by kind and layer and ignores retained elements', () => {
    const gap = analysePlateauGap(
      [
        element('Old CRM', 'baseline'),
        element('Old Portal', 'baseline'),
        element('New CRM', 'target', 'Tech & Physical'),
        element('Shared Service', null),
      ],
      'baseline',
      'target',
    );

    const packages = planWorkPackages(gap);

    expect(packages.map((workPackage) => workPackage.id)).toEqual([
      'retire:Application',
      'introduce:Tech & Physical',
    ]);
    expect(packages[0].elementKeys).toEqual(['old crm', 'old portal']);
    expect(packages[1].elementKeys).toEqual(['new crm']);
  });

  it('plans each package in the ADM phase that owns its layer', () => {
    expect(phaseForLayer('Business')).toBe('b');
    expect(phaseForLayer('Application')).toBe('c');
    expect(phaseForLayer('Tech & Physical')).toBe('d');
    expect(phaseForLayer('Motivation')).toBe('preliminary');
  });
});
