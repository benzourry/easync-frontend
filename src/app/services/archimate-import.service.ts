import { Service } from '@angular/core';
import { getArchimateRelType, type RelationshipType } from '../models/archimate.models';
import type { ParsedConnection, ParsedModel, ParsedShape, ParsedView } from '../models/diagram.models';

interface ExchangeElement {
  isRelationship: boolean;
  type: string;
  name?: string;
}

/** Parses Archi `.archimate` exchange files into a canvas-independent scene description. */
@Service()
export class ArchimateImportService {
  parse(xmlText: string): ParsedModel {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid XML format');
    }

    const elements = this.collectElements(doc);
    const viewNodes = Array.from(doc.getElementsByTagName('*')).filter(
      (node) =>
        node.getAttribute('xsi:type') === 'archimate:ArchimateDiagramModel' || node.tagName === 'view',
    );

    const views = viewNodes.map((viewNode, index) => this.parseView(viewNode, elements, index));

    return { views, firstViewId: views.length > 0 ? views[0].id : null };
  }

  private collectElements(doc: Document): Map<string, ExchangeElement> {
    const elements = new Map<string, ExchangeElement>();

    for (const node of Array.from(doc.getElementsByTagName('*'))) {
      const xsiType = node.getAttribute('xsi:type');
      const id = node.getAttribute('id');
      if (!xsiType?.startsWith('archimate:') || !id) continue;

      const type = xsiType.split(':')[1];
      if (type.endsWith('Relationship')) {
        elements.set(id, { isRelationship: true, type });
      } else if (type !== 'ArchimateDiagramModel' && type !== 'DiagramModelReference') {
        elements.set(id, { isRelationship: false, type, name: node.getAttribute('name') || type });
      }
    }

    return elements;
  }

  private parseView(viewNode: Element, elements: Map<string, ExchangeElement>, index: number): ParsedView {
    const id = viewNode.getAttribute('id') ?? `imported_view_${index}`;
    const shapes: ParsedShape[] = [];

    const walk = (parent: Element, offsetX: number, offsetY: number, parentDiagId: string | null): void => {
      const children = Array.from(parent.children).filter(
        (child) => child.tagName === 'child' || child.tagName === 'node',
      );

      for (const child of children) {
        const diagId = child.getAttribute('id');
        const elementId = child.getAttribute('archimateElement');
        const bounds = Array.from(child.children).find((node) => node.tagName === 'bounds');

        let x = offsetX;
        let y = offsetY;
        let width: number | null = null;
        let height: number | null = null;

        if (bounds) {
          x += Number.parseInt(bounds.getAttribute('x') ?? '', 10) || 0;
          y += Number.parseInt(bounds.getAttribute('y') ?? '', 10) || 0;
          width = Number.parseInt(bounds.getAttribute('width') ?? '', 10) || null;
          height = Number.parseInt(bounds.getAttribute('height') ?? '', 10) || null;
        }

        let childParentId = parentDiagId;
        const element = elementId ? elements.get(elementId) : undefined;

        if (element && !element.isRelationship && bounds && diagId) {
          shapes.push({
            diagId,
            parentDiagId,
            elementId,
            name: element.name ?? element.type,
            archimateType: element.type,
            x,
            y,
            width,
            height,
          });
          childParentId = diagId;
        } else if (child.getAttribute('xsi:type') === 'archimate:Group' && bounds && diagId) {
          shapes.push({
            diagId,
            parentDiagId,
            elementId: null,
            name: child.getAttribute('name') || 'Group',
            archimateType: 'Grouping',
            x,
            y,
            width,
            height,
          });
          childParentId = diagId;
        }

        walk(child, x, y, childParentId);
      }
    };

    walk(viewNode, 0, 0, null);

    return { id, name: viewNode.getAttribute('name') || id, shapes, connections: this.parseConnections(viewNode, elements) };
  }

  private parseConnections(viewNode: Element, elements: Map<string, ExchangeElement>): ParsedConnection[] {
    const connections: ParsedConnection[] = [];

    for (const connNode of Array.from(viewNode.getElementsByTagName('sourceConnection'))) {
      const sourceDiagId = connNode.getAttribute('source') || connNode.parentElement?.getAttribute('id') || '';
      const targetDiagId = connNode.getAttribute('target') ?? '';
      const relationshipId = connNode.getAttribute('archimateRelationship');
      const relationship = relationshipId ? elements.get(relationshipId) : undefined;

      if (!relationship?.isRelationship) continue;

      connections.push({
        sourceDiagId,
        targetDiagId,
        type: getArchimateRelType(relationship.type) as RelationshipType,
        bendpoints: Array.from(connNode.getElementsByTagName('bendpoint')).map((bendpoint) => ({
          x: Number.parseInt(bendpoint.getAttribute('startX') ?? bendpoint.getAttribute('x') ?? '', 10) || 0,
          y: Number.parseInt(bendpoint.getAttribute('startY') ?? bendpoint.getAttribute('y') ?? '', 10) || 0,
        })),
      });
    }

    return connections;
  }
}
