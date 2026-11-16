import { describe, expect, it } from 'vitest';
import { emptyModelElement, relationshipKey } from '../models/model.models';
import type { ModelElement, ModelRelationship } from '../models/model.models';
import { buildArchimateExchange } from './archimate-export.service';
import type { ExchangeView } from './archimate-export.service';

function element(key: string, name: string, archimateType: string, layer: ModelElement['layer']): ModelElement {
  return { ...emptyModelElement(key, name, archimateType, layer), key };
}

const ELEMENTS: ModelElement[] = [
  element('crm', 'CRM', 'ApplicationComponent', 'Application'),
  element('api', 'API Gateway', 'ApplicationComponent', 'Application'),
  element('goal', 'Sell more', 'Goal', 'Motivation'),
];

const RELATIONSHIPS: ModelRelationship[] = [
  {
    key: relationshipKey('crm', 'api', 'serving'),
    type: 'serving',
    sourceKey: 'crm',
    targetKey: 'api',
    name: null,
    documentation: '',
    properties: {},
  },
];

const VIEW: ExchangeView = {
  id: 'view-1',
  name: 'Application &amp; API',
  viewpoint: null,
  shapes: [
    {
      diagId: 'shape-1',
      parentDiagId: null,
      elementKey: 'crm',
      name: 'CRM',
      archimateType: 'ApplicationComponent',
      x: 10,
      y: 20,
      width: 120,
      height: 60,
    },
    {
      diagId: 'shape-2',
      parentDiagId: null,
      elementKey: 'api',
      name: 'API Gateway',
      archimateType: 'ApplicationComponent',
      x: 200,
      y: 20,
      width: 120,
      height: 60,
    },
  ],
  connections: [
    {
      sourceDiagId: 'shape-1',
      targetDiagId: 'shape-2',
      relationshipKey: RELATIONSHIPS[0].key,
      type: 'serving',
    },
  ],
};

describe('archimate exchange export', () => {
  const xml = buildArchimateExchange({
    name: 'Test Model',
    elements: ELEMENTS,
    relationships: RELATIONSHIPS,
    views: [VIEW],
  });

  it('writes a parseable document with the Archi namespace', () => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');

    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.documentElement.tagName).toBe('archimate:model');
    expect(doc.documentElement.getAttribute('name')).toBe('Test Model');
  });

  it('files every element under the folder of its layer', () => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const folders = Array.from(doc.getElementsByTagName('folder'));
    const application = folders.find((folder) => folder.getAttribute('type') === 'application');
    const motivation = folders.find((folder) => folder.getAttribute('type') === 'motivation');

    expect(application?.getElementsByTagName('element')).toHaveLength(2);
    expect(motivation?.getElementsByTagName('element')).toHaveLength(1);
  });

  it('keeps relationship endpoints pointing at exported elements', () => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const relations = Array.from(doc.getElementsByTagName('folder')).find(
      (folder) => folder.getAttribute('type') === 'relations',
    );
    const relationship = relations?.getElementsByTagName('element')[0];

    expect(relationship?.getAttribute('xsi:type')).toBe('archimate:ServingRelationship');
    expect(relationship?.getAttribute('source')).toBeTruthy();
    expect(relationship?.getAttribute('target')).toBeTruthy();
    expect(relationship?.getAttribute('source')).not.toBe(relationship?.getAttribute('target'));
  });

  it('writes view children with bounds and the connection that links them', () => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const views = Array.from(doc.getElementsByTagName('folder')).find(
      (folder) => folder.getAttribute('type') === 'diagram',
    );
    const view = views?.getElementsByTagName('element')[0];
    const children = Array.from(view?.getElementsByTagName('child') ?? []);
    const connection = view?.getElementsByTagName('sourceConnection')[0];

    expect(children).toHaveLength(2);
    expect(children[0].getElementsByTagName('bounds')[0].getAttribute('x')).toBe('10');
    expect(children[0].getAttribute('archimateElement')).toBeTruthy();
    expect(connection?.getAttribute('source')).toBeTruthy();
    expect(connection?.getAttribute('archimateRelationship')).toBeTruthy();
  });

  it('escapes names instead of emitting invalid XML', () => {
    expect(xml).toContain('name="Application &amp;amp; API"');
  });

  it('creates an element for a shape that has no model element', () => {
    const orphan = buildArchimateExchange({
      name: 'Orphan',
      elements: [],
      relationships: [],
      views: [
        {
          ...VIEW,
          shapes: [VIEW.shapes[0]],
          connections: [],
        },
      ],
    });
    const doc = new DOMParser().parseFromString(orphan, 'application/xml');
    const elements = Array.from(doc.getElementsByTagName('element')).filter((node) =>
      node.getAttribute('xsi:type')?.startsWith('archimate:Application'),
    );

    expect(elements).toHaveLength(1);
    expect(elements[0].getAttribute('name')).toBe('CRM');
  });
});
