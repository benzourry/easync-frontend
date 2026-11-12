import { PALETTE_CATEGORIES, RELATIONSHIP_OPTIONS } from '../models/archimate.models';
import type { RelationshipType } from '../models/archimate.models';
import type { AiOp, AiPlan } from '../models/ai.models';

/** Styling of a palette element type, used to colour the shapes the assistant asks for. */
export interface ElementStyle {
  color: string;
  icon: string;
  layer: string;
}

const FALLBACK_STYLE: ElementStyle = { color: '#ffffff', icon: '▭', layer: 'Generic' };

const ELEMENT_STYLES = PALETTE_CATEGORIES.flatMap((category) =>
  category.items.map((item) => ({
    keys: [normalizeKey(item.label), normalizeKey(item.displayLabel)],
    layer: normalizeKey(item.layer),
    style: { color: item.color, icon: item.icon, layer: item.layer } as ElementStyle,
  })),
);

const RELATIONSHIP_TYPES = new Set<string>(RELATIONSHIP_OPTIONS.map((option) => option.value));

/** Lowercases and strips separators so `Application Component` matches `applicationComponent`. */
export function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Maps an ArchiMate element type name onto the palette entry that draws it. */
export function elementStyleFor(elementType?: string | null, layer?: string | null): ElementStyle {
  const typeKey = normalizeKey(elementType ?? '');
  const layerKey = normalizeKey(layer ?? '');
  const candidates = typeKey ? ELEMENT_STYLES.filter((entry) => entry.keys.includes(typeKey)) : [];
  const match =
    candidates.find((entry) => layerKey && entry.layer === layerKey) ?? candidates[0] ?? null;
  if (match) return match.style;

  const layerStyle = layerKey
    ? ELEMENT_STYLES.find((entry) => entry.layer === layerKey)?.style
    : undefined;
  if (layerStyle) return { ...layerStyle, icon: FALLBACK_STYLE.icon };

  return layer ? { ...FALLBACK_STYLE, layer } : FALLBACK_STYLE;
}

/** Falls back to an association so a slightly off type name never loses a relationship. */
export function normalizeRelationshipType(value: string | null): RelationshipType {
  const key = (value ?? '').trim().toLowerCase();
  if (RELATIONSHIP_TYPES.has(key)) return key as RelationshipType;
  return 'association';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Pulls the first JSON object out of a reply that may be wrapped in prose or a code fence. */
export function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < candidate.length; index++) {
    const char = candidate[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) return candidate.slice(start, index + 1);
    }
  }

  return null;
}

function normalizeOp(raw: unknown): AiOp | null {
  const record = asRecord(raw);
  if (!record) return null;

  const name = normalizeKey(asString(record['op']) ?? asString(record['action']) ?? '');
  const key = asString(record['key']) ?? asString(record['id']);
  const parent = asString(record['parent']);

  switch (name) {
    case 'clearview':
    case 'cleardiagram':
    case 'reset':
      return { op: 'clearView' };

    case 'addshape':
    case 'createelement':
    case 'addelement': {
      const label = asString(record['label']) ?? asString(record['name']);
      if (!key || !label) return null;
      return {
        op: 'addShape',
        key,
        label,
        elementType: asString(record['elementType']) ?? asString(record['type']) ?? undefined,
        layer: asString(record['layer']) ?? undefined,
        x: asNumber(record['x']) ?? undefined,
        y: asNumber(record['y']) ?? undefined,
        width: asNumber(record['width']) ?? undefined,
        height: asNumber(record['height']) ?? undefined,
        parent,
      };
    }

    case 'addconnection':
    case 'addrelationship':
    case 'connect': {
      const source = asString(record['source']) ?? asString(record['from']);
      const target = asString(record['target']) ?? asString(record['to']);
      if (!source || !target) return null;
      return {
        op: 'addConnection',
        source,
        target,
        type: normalizeRelationshipType(asString(record['type'])),
      };
    }

    case 'removeconnection':
    case 'removerelationship':
    case 'disconnect': {
      const source = asString(record['source']) ?? asString(record['from']);
      const target = asString(record['target']) ?? asString(record['to']);
      if (!source || !target) return null;
      const type = asString(record['type']);
      return {
        op: 'removeConnection',
        source,
        target,
        type: type ? normalizeRelationshipType(type) : undefined,
      };
    }

    case 'removeshape':
    case 'removeelement':
    case 'deleteelement': {
      if (!key) return null;
      return { op: 'removeShape', key };
    }

    case 'renameshape':
    case 'renameelement':
    case 'rename': {
      const label = asString(record['label']) ?? asString(record['name']);
      if (!key || !label) return null;
      return { op: 'renameShape', key, label };
    }

    case 'moveshape':
    case 'moveelement':
    case 'move': {
      const x = asNumber(record['x']);
      const y = asNumber(record['y']);
      if (!key || x === null || y === null) return null;
      return { op: 'moveShape', key, x, y };
    }

    case 'setparent':
    case 'nest': {
      if (!key) return null;
      return { op: 'setParent', key, parent };
    }

    default:
      return null;
  }
}

/** Parses and validates an assistant reply, throwing a user-facing message on bad input. */
export function parsePlan(reply: string): AiPlan {
  const json = extractJsonObject(reply);
  if (!json) throw new Error('The assistant reply did not contain any JSON.');

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('The assistant returned malformed JSON.');
  }

  const record = asRecord(data);
  if (!record) throw new Error('The assistant returned an unexpected reply.');

  const rawOps = Array.isArray(record['ops'])
    ? record['ops']
    : Array.isArray(record['operations'])
      ? record['operations']
      : Array.isArray(record['changes'])
        ? record['changes']
        : [];

  const ops = rawOps
    .map((entry) => normalizeOp(entry))
    .filter((entry): entry is AiOp => entry !== null);

  if (!ops.length) throw new Error('The assistant did not propose any changes.');

  return {
    summary: asString(record['summary']) ?? 'Proposed changes',
    ops,
  };
}

/** Human-readable one-liners shown before the plan is applied. */
export function describePlan(ops: AiOp[], labels: Map<string, string>): string[] {
  const name = (key: string | null | undefined): string =>
    key ? (labels.get(key) ?? key) : '(none)';

  return ops.map((op) => {
    switch (op.op) {
      case 'clearView':
        return 'Clear the current view';
      case 'addShape':
        return `Add ${op.elementType ?? op.layer ?? 'element'} “${op.label}”`;
      case 'addConnection':
        return `Connect ${name(op.source)} → ${name(op.target)} (${op.type})`;
      case 'removeConnection':
        return `Remove ${op.type ? `${op.type} ` : ''}connection ${name(op.source)} → ${name(op.target)}`;
      case 'removeShape':
        return `Delete “${name(op.key)}”`;
      case 'renameShape':
        return `Rename “${name(op.key)}” to “${op.label}”`;
      case 'moveShape':
        return `Move “${name(op.key)}” to ${Math.round(op.x)}, ${Math.round(op.y)}`;
      case 'setParent':
        return op.parent
          ? `Nest “${name(op.key)}” inside “${name(op.parent)}”`
          : `Un-nest “${name(op.key)}”`;
    }
  });
}
