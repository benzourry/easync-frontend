import { describe, expect, it } from 'vitest';
import type { DiagramViewDto } from './api.models';
import type { ViewSnapshot } from './diagram.models';
import {
  MAX_KEY_LENGTH,
  catalogueFromDto,
  compactKey,
  deriveCatalogueFromViews,
  elementToDto,
  emptyModelElement,
} from './model.models';

function snapshot(partial: Partial<ViewSnapshot>): ViewSnapshot {
  return { shapes: [], connections: [], selection: null, ...partial };
}

describe('model catalogue', () => {
  it('gives every drawn shape an element and every connection a relationship', () => {
    const views: DiagramViewDto[] = [
      {
        viewKey: 'view_default',
        name: 'Default',
        position: 0,
        snapshot: snapshot({
          shapes: [
            {
              id: 'el_1_1',
              elementKey: 'el_1_1',
              label: 'Payroll System',
              icon: '▣',
              layer: 'Application',
              color: '#ffffff',
              doc: 'Runs payroll.',
              linkedView: '',
              parentId: null,
              isCollapsed: false,
              expandedHeight: null,
              left: 0,
              top: 0,
              width: 160,
              height: 80,
              rects: [],
            },
            {
              id: 'el_2_2',
              elementKey: 'el_2_2',
              label: 'Payroll Service',
              icon: '◈',
              layer: 'Business',
              color: '#ffffff',
              doc: '',
              linkedView: '',
              parentId: null,
              isCollapsed: false,
              expandedHeight: null,
              left: 200,
              top: 0,
              width: 160,
              height: 80,
              rects: [],
            },
          ],
          connections: [
            { sourceId: 'el_2_2', targetId: 'el_1_1', type: 'serving', doc: '', bendpoints: [] },
          ],
        }),
      },
    ];

    const catalogue = deriveCatalogueFromViews(views);
    expect(catalogue.elements.map((element) => element.name)).toEqual([
      'Payroll System',
      'Payroll Service',
    ]);
    expect(catalogue.elements[0].documentation).toBe('Runs payroll.');
    expect(catalogue.relationships).toHaveLength(1);
    expect(catalogue.relationships[0]).toMatchObject({
      type: 'serving',
      sourceKey: 'el_2_2',
      targetKey: 'el_1_1',
    });
  });

  it('drops relationships whose ends are not on any view', () => {
    const views: DiagramViewDto[] = [
      {
        viewKey: 'view_default',
        name: 'Default',
        position: 0,
        snapshot: snapshot({
          connections: [
            { sourceId: 'missing', targetId: 'el_1_1', type: 'flow', doc: '', bendpoints: [] },
          ],
        }),
      },
    ];
    expect(deriveCatalogueFromViews(views).relationships).toHaveLength(0);
  });

  it('folds identifiers that would not fit the server column', () => {
    const long = 'x'.repeat(MAX_KEY_LENGTH + 10);
    const compact = compactKey('el', long);
    expect(compact.length).toBeLessThanOrEqual(MAX_KEY_LENGTH);
    expect(compact).toBe(compactKey('el', long));
    expect(compactKey('el', 'el_1700000000000_1')).toBe('el_1700000000000_1');
  });

  it('round-trips an element through the wire format', () => {
    const element = {
      ...emptyModelElement('el_1', 'Payroll System', 'ApplicationComponent', 'Application'),
      documentation: 'Runs payroll.',
      properties: { criticality: 'high' },
    };
    const restored = catalogueFromDto([elementToDto(element)], []);
    expect(restored.elements).toEqual([element]);
  });

  it('ignores unknown plateau and lifecycle values', () => {
    const restored = catalogueFromDto(
      [
        {
          elementKey: 'el_1',
          name: 'Payroll',
          archimateType: 'ApplicationComponent',
          layer: 'Application',
          plateau: 'someday',
          lifecycleState: 'current',
        },
      ],
      [],
    );
    expect(restored.elements[0].plateau).toBeNull();
    expect(restored.elements[0].lifecycleState).toBe('current');
  });
});
