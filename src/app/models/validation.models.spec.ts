import { describe, expect, it } from 'vitest';
import { EMPTY_CATALOGUE, emptyModelElement } from './model.models';
import type { ModelCatalogue, ModelElement } from './model.models';
import type { RelationshipType } from './archimate.models';
import {
  allowedRelationshipTypes,
  isKnownPair,
  isRelationshipAllowed,
  matrixConceptFor,
} from './relationship-rules';
import { summarizeIssues, validateModel } from './validation.models';

function element(key: string, archimateType: string, name = key): ModelElement {
  return { ...emptyModelElement(key, name, archimateType, 'Business'), key };
}

function catalogue(
  elements: ModelElement[],
  relationships: { source: string; target: string; type: RelationshipType }[],
): ModelCatalogue {
  return {
    elements,
    relationships: relationships.map((item, index) => ({
      key: `rel-${index}`,
      type: item.type,
      sourceKey: item.source,
      targetKey: item.target,
      name: null,
      documentation: '',
      properties: {},
    })),
  };
}

describe('relationship matrix', () => {
  it('maps palette labels and technology aliases to Archi concepts', () => {
    expect(matrixConceptFor('Business Actor')).toBe('BusinessActor');
    expect(matrixConceptFor('Technology Node')).toBe('Node');
    expect(matrixConceptFor('Technology Device')).toBe('Device');
    expect(matrixConceptFor('And Junction')).toBe('Junction');
    expect(matrixConceptFor('Not A Thing')).toBeNull();
  });

  it('permits association but not assignment from a business object to an actor', () => {
    const permitted = allowedRelationshipTypes('Business Object', 'Business Actor');
    expect(permitted).toContain('association');
    expect(permitted).not.toContain('assignment');
  });

  it('permits realization and serving up the application to business stack', () => {
    expect(isRelationshipAllowed('Application Service', 'Business Service', 'realization')).toBe(
      true,
    );
    expect(isRelationshipAllowed('Application Service', 'Business Service', 'assignment')).toBe(
      false,
    );
  });

  it('allows grouping to compose and aggregate anything', () => {
    const permitted = allowedRelationshipTypes('Grouping', 'Business Actor');
    expect(permitted).toContain('composition');
    expect(permitted).toContain('aggregation');
  });

  it('reports unknown types as no known pair', () => {
    expect(isKnownPair('Business Actor', 'Not A Thing')).toBe(false);
    expect(allowedRelationshipTypes('Not A Thing', 'Business Actor')).toEqual([]);
  });
});

describe('validateModel', () => {
  it('returns nothing for an empty catalogue', () => {
    expect(validateModel(EMPTY_CATALOGUE)).toEqual([]);
    expect(summarizeIssues([])).toEqual({ errors: 0, warnings: 0, infos: 0, total: 0 });
  });

  it('flags a relationship type the matrix does not allow', () => {
    const issues = validateModel(
      catalogue(
        [element('obj', 'Business Object'), element('actor', 'Business Actor')],
        [{ source: 'obj', target: 'actor', type: 'assignment' }],
      ),
    );
    expect(issues.map((issue) => issue.code)).toEqual(['type-not-allowed']);
    expect(issues[0].severity).toBe('error');
  });

  it('flags dangling endpoints, self relationships and duplicates', () => {
    const issues = validateModel(
      catalogue(
        [element('a', 'Business Actor'), element('b', 'Business Role')],
        [
          { source: 'a', target: 'b', type: 'association' },
          { source: 'a', target: 'b', type: 'association' },
          { source: 'a', target: 'a', type: 'association' },
          { source: 'a', target: 'ghost', type: 'association' },
        ],
      ),
    );
    const codes = issues.map((issue) => issue.code).sort();
    expect(codes).toEqual(['duplicate-relationship', 'missing-element', 'self-relationship']);
  });

  it('flags unnamed elements and unknown types as warnings', () => {
    const issues = validateModel({
      elements: [element('a', 'Business Actor', '  '), element('b', 'Mystery Thing')],
      relationships: [],
    });
    expect(issues.map((issue) => issue.severity)).toEqual(['warning', 'warning']);
    expect(issues.map((issue) => issue.code).sort()).toEqual([
      'unknown-element-type',
      'unnamed-element',
    ]);
  });

  it('flags a junction that joins more than one relationship type', () => {
    const issues = validateModel(
      catalogue(
        [
          element('a', 'Business Actor'),
          element('b', 'Business Role'),
          element('j', 'And Junction'),
        ],
        [
          { source: 'a', target: 'j', type: 'flow' },
          { source: 'j', target: 'b', type: 'serving' },
        ],
      ),
    );
    expect(issues.map((issue) => issue.code)).toContain('mixed-junction');
    expect(issues.find((issue) => issue.code === 'mixed-junction')?.elementKey).toBe('j');
  });

  it('orders issues by severity', () => {
    const issues = validateModel({
      elements: [element('a', 'Business Actor', '')],
      relationships: [
        {
          key: 'rel-x',
          type: 'flow',
          sourceKey: 'x',
          targetKey: 'y',
          name: null,
          documentation: '',
          properties: {},
        },
      ],
    });
    expect(issues.map((issue) => issue.severity)).toEqual(['error', 'warning']);
  });
});
