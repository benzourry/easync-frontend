import type { MessageKey } from '../i18n/messages';
import type { ModelCatalogue, ModelElement } from './model.models';
import {
  allowedRelationshipTypes,
  isKnownPair,
  isStructuralFromGroupingOrLocation,
  matrixConceptFor,
} from './relationship-rules';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationCode =
  | 'missing-element'
  | 'self-relationship'
  | 'duplicate-relationship'
  | 'pair-not-allowed'
  | 'type-not-allowed'
  | 'unknown-element-type'
  | 'unnamed-element'
  | 'mixed-junction';

const MESSAGE_KEY_BY_CODE: Record<ValidationCode, MessageKey> = {
  'missing-element': 'validation.missingElement',
  'self-relationship': 'validation.selfRelationship',
  'duplicate-relationship': 'validation.duplicateRelationship',
  'pair-not-allowed': 'validation.pairNotAllowed',
  'type-not-allowed': 'validation.typeNotAllowed',
  'unknown-element-type': 'validation.unknownElementType',
  'unnamed-element': 'validation.unnamedElement',
  'mixed-junction': 'validation.mixedJunction',
};

/**
 * One problem found in the model. The message is a translation key and the specifics live in
 * `detail`, so a report reads the same in either interface language.
 */
export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  code: ValidationCode;
  messageKey: MessageKey;
  /** Language-neutral specifics, e.g. `Business Object → Business Actor · assignment`. */
  detail: string;
  /** Element the problem belongs to, so the panel can select it on the canvas. */
  elementKey: string | null;
  relationshipKey: string | null;
}

export interface ValidationSummary {
  errors: number;
  warnings: number;
  infos: number;
  total: number;
}

const SEVERITY_RANK: Record<ValidationSeverity, number> = { error: 0, warning: 1, info: 2 };

function issue(
  code: ValidationCode,
  severity: ValidationSeverity,
  detail: string,
  elementKey: string | null,
  relationshipKey: string | null = null,
): ValidationIssue {
  return {
    id: `${code}:${relationshipKey ?? elementKey ?? detail}`,
    severity,
    code,
    messageKey: MESSAGE_KEY_BY_CODE[code],
    detail,
    elementKey,
    relationshipKey,
  };
}

function relationshipDetail(
  type: string,
  source: ModelElement,
  target: ModelElement,
): string {
  return `${source.name || source.archimateType} → ${target.name || target.archimateType} · ${type}`;
}

/**
 * Checks the model against the ArchiMate 3.2 relationship matrix and a few structural rules.
 * Pure: takes the catalogue and returns problems in severity order, so it can run on every save
 * without touching the canvas.
 */
export function validateModel(catalogue: ModelCatalogue): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byKey = new Map<string, ModelElement>();
  for (const element of catalogue.elements) byKey.set(element.key, element);

  for (const element of catalogue.elements) {
    if (!element.name.trim()) {
      issues.push(
        issue(
          'unnamed-element',
          'warning',
          element.archimateType || element.key,
          element.key,
        ),
      );
    }
    if (element.archimateType && !matrixConceptFor(element.archimateType)) {
      issues.push(
        issue('unknown-element-type', 'warning', element.archimateType, element.key),
      );
    }
  }

  const seen = new Set<string>();
  const incidentTypes = new Map<string, Set<string>>();

  for (const relationship of catalogue.relationships) {
    const source = byKey.get(relationship.sourceKey);
    const target = byKey.get(relationship.targetKey);
    const endpoint = source ?? target ?? null;

    if (!source || !target) {
      const missing = [source ? null : relationship.sourceKey, target ? null : relationship.targetKey]
        .filter((key): key is string => key !== null)
        .join(', ');
      issues.push(
        issue(
          'missing-element',
          'error',
          `${relationship.type} → ${missing}`,
          endpoint?.key ?? null,
          relationship.key,
        ),
      );
      continue;
    }

    if (relationship.sourceKey === relationship.targetKey) {
      issues.push(
        issue(
          'self-relationship',
          'error',
          relationshipDetail(relationship.type, source, target),
          source.key,
          relationship.key,
        ),
      );
      continue;
    }

    const signature = `${relationship.sourceKey}|${relationship.targetKey}|${relationship.type}`;
    if (seen.has(signature)) {
      issues.push(
        issue(
          'duplicate-relationship',
          'warning',
          relationshipDetail(relationship.type, source, target),
          source.key,
          relationship.key,
        ),
      );
    }
    seen.add(signature);

    const known = isKnownPair(source.archimateType, target.archimateType);
    const permitted = allowedRelationshipTypes(source.archimateType, target.archimateType);
    if (known && permitted.length === 0) {
      issues.push(
        issue(
          'pair-not-allowed',
          'error',
          relationshipDetail(relationship.type, source, target),
          source.key,
          relationship.key,
        ),
      );
    } else if (permitted.length && !permitted.includes(relationship.type)) {
      issues.push(
        issue(
          'type-not-allowed',
          'error',
          relationshipDetail(relationship.type, source, target),
          source.key,
          relationship.key,
        ),
      );
    }

    for (const element of [source, target]) {
      if (matrixConceptFor(element.archimateType) !== 'Junction') continue;
      const other = source.key === element.key ? target : source;
      if (isStructuralFromGroupingOrLocation(other.archimateType, relationship.type)) continue;
      const types = incidentTypes.get(element.key) ?? new Set<string>();
      types.add(relationship.type);
      incidentTypes.set(element.key, types);
    }
  }

  for (const [elementKey, types] of incidentTypes) {
    if (types.size < 2) continue;
    issues.push(issue('mixed-junction', 'warning', [...types].sort().join(', '), elementKey));
  }

  return issues.sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severity !== 0) return severity;
    return a.detail.localeCompare(b.detail);
  });
}

export function summarizeIssues(issues: readonly ValidationIssue[]): ValidationSummary {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const item of issues) {
    if (item.severity === 'error') errors++;
    else if (item.severity === 'warning') warnings++;
    else infos++;
  }
  return { errors, warnings, infos, total: issues.length };
}
