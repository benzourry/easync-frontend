import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MAGIC_CONNECTOR } from '../models/archimate.models';
import { emptyModelElement, type ModelRelationship } from '../models/model.models';
import { DiagramStore } from './diagram-store';

function relationship(
  key: string,
  sourceKey: string,
  targetKey: string,
): ModelRelationship {
  return {
    key,
    type: 'serving',
    sourceKey,
    targetKey,
    name: null,
    documentation: '',
    properties: {},
  };
}

function createStore(): DiagramStore {
  TestBed.configureTestingModule({});
  return TestBed.inject(DiagramStore);
}

describe('DiagramStore model catalogue', () => {
  it('registers derived elements without marking the diagram dirty', () => {
    const store = createStore();
    const revision = store.documentRevision();

    store.registerElements([emptyModelElement('el_1', 'Payroll', 'ApplicationComponent', 'Application')]);

    expect(store.elements()).toHaveLength(1);
    expect(store.documentRevision()).toBe(revision);
  });

  it('marks the diagram dirty when an element is edited or removed', () => {
    const store = createStore();
    const element = emptyModelElement('el_1', 'Payroll', 'ApplicationComponent', 'Application');
    store.registerElements([element]);
    const revision = store.documentRevision();

    store.upsertElement({ ...element, name: 'Payroll Core' });
    expect(store.elementFor('el_1')?.name).toBe('Payroll Core');
    expect(store.documentRevision()).toBe(revision + 1);

    store.removeElement('el_1');
    expect(store.elements()).toHaveLength(0);
    expect(store.documentRevision()).toBe(revision + 2);
  });

  it('drops relationships that pointed at a removed element', () => {
    const store = createStore();
    store.setCatalogue({
      elements: [
        emptyModelElement('el_1', 'Payroll', 'ApplicationComponent', 'Application'),
        emptyModelElement('el_2', 'Finance', 'ApplicationComponent', 'Application'),
      ],
      relationships: [relationship('rel_1', 'el_1', 'el_2'), relationship('rel_2', 'el_2', 'el_1')],
    });

    store.removeElement('el_1');

    expect(store.modelRelationships()).toEqual([]);
  });

  it('keeps typed metadata when the same relationship is seen again on the canvas', () => {
    const store = createStore();
    const typed = { ...relationship('rel_1', 'el_1', 'el_2'), documentation: 'Payroll feeds finance.' };
    store.setCatalogue({
      elements: [
        emptyModelElement('el_1', 'Payroll', 'ApplicationComponent', 'Application'),
        emptyModelElement('el_2', 'Finance', 'ApplicationComponent', 'Application'),
      ],
      relationships: [typed],
    });

    store.reconcileRelationships([relationship('rel_1', 'el_1', 'el_2')]);

    expect(store.modelRelationships()).toEqual([typed]);
  });

  it('drops relationships no view draws any more', () => {
    const store = createStore();
    store.setCatalogue({
      elements: [
        emptyModelElement('el_1', 'Payroll', 'ApplicationComponent', 'Application'),
        emptyModelElement('el_2', 'Finance', 'ApplicationComponent', 'Application'),
      ],
      relationships: [relationship('rel_1', 'el_1', 'el_2')],
    });
    const revision = store.documentRevision();

    store.reconcileRelationships([relationship('rel_2', 'el_2', 'el_1')]);

    expect(store.modelRelationships().map((rel) => rel.key)).toEqual(['rel_2']);
    expect(store.documentRevision()).toBe(revision);
  });

  it('resolves occurrences to their element and ignores unknown keys', () => {
    const store = createStore();
    store.registerElements([
      emptyModelElement('el_1', 'Payroll', 'ApplicationComponent', 'Application'),
    ]);

    expect(store.elementFor('el_1')?.name).toBe('Payroll');
    expect(store.elementFor('missing')).toBeUndefined();
    expect(store.elementFor(null)).toBeUndefined();
  });
});

describe('DiagramStore viewpoint scoping', () => {
  /** An access relationship from an active-structure element is always illegal. */
  function poisonedStore(): DiagramStore {
    const store = createStore();
    store.setCatalogue({
      elements: [
        emptyModelElement('el_actor', 'Clerk', 'BusinessActor', 'Business'),
        emptyModelElement('el_node', 'Server', 'Node', 'Tech & Physical'),
      ],
      relationships: [
        {
          ...relationship('rel_bad', 'el_node', 'el_actor'),
          type: 'access',
        },
      ],
    });
    return store;
  }

  it('reports every problem when the view has no viewpoint', () => {
    const store = poisonedStore();

    expect(store.activeViewpoint()).toBeNull();
    expect(store.viewpointIssues()).toEqual(store.validationIssues());
    expect(store.validationIssues().length).toBeGreaterThan(0);
  });

  it('keeps problems whose element the viewpoint admits', () => {
    const store = poisonedStore();
    store.setViews([
      { id: 'view_tech', name: 'Technology', viewpoint: 'technology', contentType: 'diagram', isActive: true },
    ]);
    store.setActiveView('view_tech');

    expect(store.activeViewpoint()?.id).toBe('technology');
    expect(store.viewpointIssues()).toEqual(store.validationIssues());
    expect(store.viewpointIssues().length).toBeGreaterThan(0);
  });

  it('hides problems that belong to elements the viewpoint does not admit', () => {
    const store = poisonedStore();
    store.setViews([
      { id: 'view_org', name: 'Organization', viewpoint: 'organization', contentType: 'diagram', isActive: true },
    ]);
    store.setActiveView('view_org');

    expect(store.activeViewpoint()?.id).toBe('organization');
    expect(store.validationIssues().length).toBeGreaterThan(0);
    expect(store.viewpointIssues()).toEqual([]);
  });

  it('tells the editor what the active view holds', () => {
    const store = createStore();
    expect(store.activeContentType()).toBe('diagram');

    store.setViews([
      { id: 'view_table', name: 'Catalogue', viewpoint: 'technology', contentType: 'catalogue', isActive: true },
      { id: 'view_canvas', name: 'Canvas', viewpoint: null, contentType: 'diagram', isActive: false },
    ]);
    store.setActiveView('view_table');
    expect(store.activeContentType()).toBe('catalogue');

    store.setActiveView('view_canvas');
    expect(store.activeContentType()).toBe('diagram');
  });
});

describe('DiagramStore connection tool', () => {
  it('defaults to the Magic Connector', () => {
    const store = createStore();
    expect(store.connectionType()).toBe(MAGIC_CONNECTOR);
  });
});
