import { describe, expect, it } from 'vitest';
import {
  ARCHIMATE_VIEWPOINTS,
  MYGOVEA_VIEWPOINTS,
  TOGAF_VIEWPOINTS,
  VIEWPOINTS,
  viewpointAdmits,
  viewpointById,
  viewpointsForFramework,
  viewpointsForPhase,
  viewpointUsesRelationship,
} from './viewpoints';
import { TOGAF_PROFILE } from './togaf';

describe('viewpoint catalogue', () => {
  it('uses unique ids across every family', () => {
    const ids = VIEWPOINTS.map((viewpoint) => viewpoint.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every viewpoint a concern, stakeholders and guidance', () => {
    for (const viewpoint of VIEWPOINTS) {
      expect(viewpoint.concern.length, viewpoint.id).toBeGreaterThan(0);
      expect(viewpoint.stakeholders.length, viewpoint.id).toBeGreaterThan(0);
      expect(viewpoint.guidance.length, viewpoint.id).toBeGreaterThan(0);
      expect(viewpoint.relationships.length, viewpoint.id).toBeGreaterThan(0);
    }
  });

  it('admits at least one element or one whole layer', () => {
    for (const viewpoint of VIEWPOINTS) {
      const hasElements = viewpoint.elements.length > 0;
      const hasLayers = (viewpoint.layers?.length ?? 0) > 0;
      expect(hasElements || hasLayers, viewpoint.id).toBe(true);
    }
  });

  it('only names TOGAF phases that the profile defines', () => {
    const phases = new Set(TOGAF_PROFILE.phases.map((phase) => phase.id));
    for (const viewpoint of TOGAF_VIEWPOINTS) {
      expect(viewpoint.phase, viewpoint.id).not.toBeNull();
      expect(phases.has(viewpoint.phase ?? ''), viewpoint.id).toBe(true);
    }
  });

  it('leaves ArchiMate viewpoints framework-neutral', () => {
    for (const viewpoint of ARCHIMATE_VIEWPOINTS) {
      expect(viewpoint.phase, viewpoint.id).toBeNull();
      expect(viewpoint.framework, viewpoint.id).toBe('archimate');
    }
  });

  it('scopes every MyGovEA viewpoint to a MyGovEA phase', () => {
    const phaseIds = new Set(['permulaan', 'penilaian', 'penakrifan', 'pelaksanaan', 'pemantauan']);
    for (const viewpoint of MYGOVEA_VIEWPOINTS) {
      expect(phaseIds.has(viewpoint.phase ?? ''), viewpoint.id).toBe(true);
    }
  });

  it('looks viewpoints up by id', () => {
    expect(viewpointById('capability-map')?.name).toBe('Capability Map');
    expect(viewpointById('does-not-exist')).toBeUndefined();
    expect(viewpointById(null)).toBeUndefined();
  });

  it('always offers the ArchiMate set plus the framework set', () => {
    const togaf = viewpointsForFramework('togaf');
    expect(togaf).toContain(ARCHIMATE_VIEWPOINTS[0]);
    expect(togaf.some((viewpoint) => viewpoint.id === 'togaf-b-business-architecture')).toBe(true);
    expect(togaf.some((viewpoint) => viewpoint.framework === 'mygovea')).toBe(false);

    const mygovea = viewpointsForFramework('mygovea');
    expect(mygovea.some((viewpoint) => viewpoint.id === 'mygovea-ea-blueprint')).toBe(true);
    expect(mygovea.some((viewpoint) => viewpoint.framework === 'togaf')).toBe(false);

    expect(viewpointsForFramework('archimate')).toEqual(ARCHIMATE_VIEWPOINTS);
  });

  it('groups viewpoints by producing phase', () => {
    expect(viewpointsForPhase('b').map((viewpoint) => viewpoint.id)).toEqual([
      'togaf-b-business-architecture',
      'togaf-b-business-service-catalogue',
    ]);
    expect(viewpointsForPhase(null)).toEqual([]);
  });

  describe('admission', () => {
    const organization = ARCHIMATE_VIEWPOINTS.find((viewpoint) => viewpoint.id === 'organization')!;
    const technology = ARCHIMATE_VIEWPOINTS.find((viewpoint) => viewpoint.id === 'technology')!;

    it('admits a listed element by label', () => {
      expect(viewpointAdmits(organization, 'Business Role', 'Business')).toBe(true);
      expect(viewpointAdmits(organization, 'Application Component', 'Application')).toBe(false);
    });

    it('admits every element of a declared layer', () => {
      expect(viewpointAdmits(technology, 'Communication Network', 'Tech & Physical')).toBe(true);
      expect(viewpointAdmits(technology, 'Material', 'Physical')).toBe(true);
      expect(viewpointAdmits(technology, 'Business Process', 'Business')).toBe(false);
    });

    it('ignores punctuation and case when matching labels', () => {
      expect(viewpointAdmits(organization, 'business-role', 'Business')).toBe(true);
    });

    it('reports whether a relationship type belongs to the viewpoint', () => {
      expect(viewpointUsesRelationship(organization, 'assignment')).toBe(true);
      expect(viewpointUsesRelationship(organization, 'flow')).toBe(false);
    });
  });
});
