import { getArchimateTypeInfo, type RelationshipType } from '../models/archimate.models';
import type { ModelElement, ModelRelationship } from '../models/model.models';

/** A shape as it appears on one view, in the coordinates the exporter writes. */
export interface ExchangeShape {
  diagId: string;
  parentDiagId: string | null;
  elementKey: string | null;
  name: string;
  archimateType: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExchangeConnection {
  sourceDiagId: string;
  targetDiagId: string;
  relationshipKey: string | null;
  /** Used when the connection has no modelled relationship to point at. */
  type: RelationshipType;
}

export interface ExchangeView {
  id: string;
  name: string;
  viewpoint: string | null;
  shapes: ExchangeShape[];
  connections: ExchangeConnection[];
}

export interface ExchangeModel {
  name: string;
  elements: readonly ModelElement[];
  relationships: readonly ModelRelationship[];
  views: readonly ExchangeView[];
}

const RELATIONSHIP_CLASS: Record<RelationshipType, string> = {
  association: 'AssociationRelationship',
  flow: 'FlowRelationship',
  triggering: 'TriggeringRelationship',
  realization: 'RealizationRelationship',
  specialization: 'SpecializationRelationship',
  serving: 'ServingRelationship',
  access: 'AccessRelationship',
  influence: 'InfluenceRelationship',
  composition: 'CompositionRelationship',
  aggregation: 'AggregationRelationship',
  assignment: 'AssignmentRelationship',
};

/** Archi's own folder type per ArchiMate layer, so the file opens organised in the Archi tree. */
const FOLDER_TYPE_BY_LAYER: Record<string, string> = {
  Strategy: 'strategy',
  Business: 'business',
  Application: 'application',
  'Tech & Physical': 'technology',
  Physical: 'technology',
  Motivation: 'motivation',
  Implementation: 'implementation',
};

const FOLDER_LABEL_BY_TYPE: Record<string, string> = {
  strategy: 'Strategy',
  business: 'Business',
  application: 'Application',
  technology: 'Technology',
  motivation: 'Motivation',
  implementation: 'Implementation',
  other: 'Other',
  relations: 'Relations',
  diagram: 'Views',
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Archi requires an id on everything; this keeps ids stable per export without a uuid dependency. */
function idFor(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

interface ResolvedElement {
  id: string;
  type: string;
  name: string;
  folder: string;
}

interface ElementEntry {
  id: string;
  type: string;
  name: string;
  folder: string;
}

/** Archi references relationships by id, so the id has to be derivable from the model key. */
function relationshipExchangeId(key: string): string {
  return `rel-${key.replace(/[^A-Za-z0-9_-]/g, '-')}`;
}

function elementLayer(archimateType: string): string {
  return getArchimateTypeInfo(archimateType).layer;
}

/**
 * Builds an Archi `.archimate` exchange file for the whole model: every element, every
 * relationship and every view with its shapes and connections. Archi 5.x opens the result, which
 * makes the model portable to the rest of an enterprise architecture toolchain.
 */
export function buildArchimateExchange(model: ExchangeModel): string {
  const folders = new Map<string, ElementEntry[]>();
  /** Model element key -> exchange id, so shapes and relationships can point at elements. */
  const keyToId = new Map<string, string>();
  /** Synthetic element per shape that has no model element behind it. */
  const shapeToId = new Map<string, string>();
  let sequence = 0;

  const addElement = (type: string, name: string, folder: string): ElementEntry => {
    sequence += 1;
    const entry: ElementEntry = { id: `el-${sequence}`, type, name, folder };
    const bucket = folders.get(folder) ?? [];
    bucket.push(entry);
    folders.set(folder, bucket);
    return entry;
  };

  for (const element of model.elements) {
    if (keyToId.has(element.key)) continue;
    const entry = addElement(
      element.archimateType,
      element.name,
      FOLDER_TYPE_BY_LAYER[element.layer] ?? 'other',
    );
    keyToId.set(element.key, entry.id);
  }

  // A shape without a model element still needs an element, otherwise Archi shows an empty box.
  for (const view of model.views) {
    for (const shape of view.shapes) {
      if (shape.elementKey && keyToId.has(shape.elementKey)) continue;
      const entry = addElement(
        shape.archimateType,
        shape.name,
        FOLDER_TYPE_BY_LAYER[elementLayer(shape.archimateType)] ?? 'other',
      );
      shapeToId.set(shape.diagId, entry.id);
      if (shape.elementKey) keyToId.set(shape.elementKey, entry.id);
    }
  }

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<archimate:model xmlns:archimate="http://www.archimatetool.com/archimate" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="${escapeXml(model.name)}" id="model-1">`,
  );

  for (const [type, elements] of folders) {
    lines.push(`  <folder name="${FOLDER_LABEL_BY_TYPE[type] ?? type}" id="folder-${type}" type="${type}">`);
    for (const element of elements) {
      lines.push(
        `    <element id="${element.id}" xsi:type="archimate:${element.type}" name="${escapeXml(element.name)}"/>`,
      );
    }
    lines.push('  </folder>');
  }

  lines.push('  <folder name="Relations" id="folder-relations" type="relations">');
  for (const relationship of model.relationships) {
    const sourceId = keyToId.get(relationship.sourceKey);
    const targetId = keyToId.get(relationship.targetKey);
    if (!sourceId || !targetId) continue;
    lines.push(
      `    <element id="${relationshipExchangeId(relationship.key)}" xsi:type="archimate:${RELATIONSHIP_CLASS[relationship.type] ?? 'AssociationRelationship'}" name="${escapeXml(relationship.name ?? '')}" source="${sourceId}" target="${targetId}"/>`,
    );
  }
  lines.push('  </folder>');

  lines.push('  <folder name="Views" id="folder-views" type="diagram">');
  for (const [index, view] of model.views.entries()) {
    const viewId = idFor('view', index + 1);
    lines.push(
      `    <element id="${viewId}" xsi:type="archimate:ArchimateDiagramModel" name="${escapeXml(view.name)}">`,
    );

    const childIdByDiagId = new Map<string, string>();
    for (const [shapeIndex, shape] of view.shapes.entries()) {
      childIdByDiagId.set(shape.diagId, idFor(`${viewId}-child`, shapeIndex + 1));
    }

    const renderShape = (shape: ExchangeShape, indent: string): void => {
      const childId = childIdByDiagId.get(shape.diagId);
      if (!childId) return;
      const elementId =
        (shape.elementKey ? keyToId.get(shape.elementKey) : undefined) ?? shapeToId.get(shape.diagId);
      const elementAttribute = elementId ? ` archimateElement="${elementId}"` : '';
      lines.push(
        `${indent}<child id="${childId}"${elementAttribute} xsi:type="archimate:DiagramObject">`,
      );
      lines.push(
        `${indent}  <bounds x="${Math.round(shape.x)}" y="${Math.round(shape.y)}" width="${Math.round(shape.width)}" height="${Math.round(shape.height)}"/>`,
      );
      for (const child of view.shapes.filter((candidate) => candidate.parentDiagId === shape.diagId)) {
        renderShape(child, `${indent}  `);
      }
      lines.push(`${indent}</child>`);
    };

    for (const shape of view.shapes.filter((candidate) => !candidate.parentDiagId)) {
      renderShape(shape, '      ');
    }

    let connectionIndex = 0;
    for (const connection of view.connections) {
      const source = childIdByDiagId.get(connection.sourceDiagId);
      const target = childIdByDiagId.get(connection.targetDiagId);
      if (!source || !target) continue;
      const relationship = connection.relationshipKey
        ? model.relationships.find(
            (candidate) =>
              candidate.key === connection.relationshipKey &&
              keyToId.has(candidate.sourceKey) &&
              keyToId.has(candidate.targetKey),
          )
        : undefined;
      if (!relationship) continue;
      connectionIndex += 1;
      lines.push(
        `      <sourceConnection id="${viewId}-conn-${connectionIndex}" xsi:type="archimate:Connection" source="${source}" target="${target}" archimateRelationship="${relationshipExchangeId(relationship.key)}"/>`,
      );
    }

    lines.push('    </element>');
  }
  lines.push('  </folder>');
  lines.push('</archimate:model>');

  return lines.join('\n');
}
