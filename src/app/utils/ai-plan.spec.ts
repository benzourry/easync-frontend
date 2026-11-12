import {
  describePlan,
  elementStyleFor,
  normalizeRelationshipType,
  parsePlan,
} from './ai-plan';

describe('ai-plan TOGAF support', () => {
  it('maps TOGAF element vocabulary onto palette entries', () => {
    expect(elementStyleFor('Business Capability').layer).toBe('Strategy');
    expect(elementStyleFor('Business Capability').icon).toBe('◩');
    expect(elementStyleFor('Application System').layer).toBe('Application');
    expect(elementStyleFor('Technology Platform').layer).toBe('Tech & Physical');
    expect(elementStyleFor('Platform Software').layer).toBe('Tech & Physical');
    expect(elementStyleFor('Middleware').icon).toBe('Ⓞ');
    expect(elementStyleFor('API').layer).toBe('Application');
    expect(elementStyleFor('Project').layer).toBe('Implementation');
  });

  it('maps TOGAF relationship phrasing onto ArchiMate relationship types', () => {
    expect(normalizeRelationshipType('serves')).toBe('serving');
    expect(normalizeRelationshipType('accesses')).toBe('access');
    expect(normalizeRelationshipType('realizes')).toBe('realization');
    expect(normalizeRelationshipType('aggregates')).toBe('aggregation');
    expect(normalizeRelationshipType('assigned to')).toBe('assignment');
    expect(normalizeRelationshipType('precedes')).toBe('triggering');
  });

  it('keeps the association fallback for unrecognised relationship names', () => {
    expect(normalizeRelationshipType('pings')).toBe('association');
    expect(normalizeRelationshipType(null)).toBe('association');
  });

  it('parses the rationale block of a TOGAF plan', () => {
    const plan = parsePlan(
      JSON.stringify({
        summary: 'Capability map for retail banking',
        rationale: {
          phase: 'Phase B - Business Architecture',
          viewpoint: 'Capability Map',
          principles: ['Capability-based planning', 'Reuse before buy, buy before build'],
        },
        ops: [{ op: 'addShape', key: 'a1', label: 'Payments Capability', elementType: 'Business Capability' }],
      }),
    );

    expect(plan.rationale?.phase).toBe('Phase B - Business Architecture');
    expect(plan.rationale?.viewpoint).toBe('Capability Map');
    expect(plan.rationale?.principles).toEqual([
      'Capability-based planning',
      'Reuse before buy, buy before build',
    ]);
    expect(plan.ops).toHaveLength(1);
  });

  it('accepts a plan without a rationale block', () => {
    const plan = parsePlan(
      JSON.stringify({ summary: 'Add a node', ops: [{ op: 'addShape', key: 'a1', label: 'Node' }] }),
    );

    expect(plan.rationale).toBeNull();
    expect(describePlan(plan.ops, new Map())).toEqual(['Add element “Node”']);
  });
});
