import { Service, computed, inject, signal } from '@angular/core';
import { PALETTE_CATEGORIES, RELATIONSHIP_OPTIONS } from '../models/archimate.models';
import { DEFAULT_AI_CONTEXT, DEFAULT_AI_SETTINGS } from '../models/ai.models';
import type { AiContext, AiOp, AiPlan, AiProviderSettings } from '../models/ai.models';
import type { DiagramShapeInfo } from '../models/diagram.models';
import {
  TOGAF_ARTIFACT_PLAYBOOK,
  TOGAF_DEFAULT_PRINCIPLES,
  findTogafDomain,
  findTogafPhase,
} from '../models/togaf.models';
import { describePlan, elementStyleFor, parsePlan } from '../utils/ai-plan';
import { DiagramCanvasService } from './diagram-canvas.service';
import { DiagramStore } from './diagram-store';

const STORAGE_KEY = 'easync.ai.settings';
const CONTEXT_KEY = 'easync.ai.context';
const REQUEST_TIMEOUT_MS = 60_000;
const AUTO_LAYOUT_COLUMNS = 3;
const AUTO_LAYOUT_CELL_WIDTH = 180;
const AUTO_LAYOUT_CELL_HEIGHT = 110;
const AUTO_LAYOUT_ORIGIN = 60;
const LAYOUT_GRID = 15;
const DEFAULT_SHAPE_WIDTH = 140;
const DEFAULT_SHAPE_HEIGHT = 70;

/** Requests that genuinely ask for an empty canvas. Anything else must stay additive. */
const CLEAR_INTENT =
  /\b(clear|wipe|reset|start (over|fresh|again)|from scratch|new diagram|new view|empty (the )?(canvas|diagram|view)|replace (the |this )?(whole |entire )?(diagram|canvas|view))\b/i;

/** Element names the assistant is allowed to use, taken straight from the palette. */
const ELEMENT_CATALOG = PALETTE_CATEGORIES.flatMap((category) =>
  category.items.map((item) => item.label),
).join(', ');

const RELATIONSHIP_CATALOG = RELATIONSHIP_OPTIONS.map((option) => option.value).join(', ');

/** TOGAF vocabulary the assistant may say in "label", mapped to the ArchiMate type to model. */
const TERMINOLOGY_MAP = `Business Capability->Capability, Value Stream / Value Stage->Value Stream, Business Service / Process Step->Business Process, Organization Unit / Team->Business Actor, Role->Business Role, Application / Application System / System->Application Component, Application Service->Application Service, Interface / API->Application Interface, Data Entity / Data Set->Data Object, Technology Platform / Environment / Server->Technology Node, Platform Software / Middleware / Database->System Software, Project / Initiative / Programme->Work Package, Transition Architecture / Transition State->Plateau, Architecture Principle / Constraint / Business Rule->Requirement, Stakeholder Concern->Stakeholder`;

/** The TOGAF working practice the assistant must follow on every request. */
const TOGAF_RULES = `TOGAF modelling rules:
- Baseline and target: when the request evolves an existing landscape, keep the elements already on the canvas as the baseline and add the target state next to them. Never delete baseline elements unless the request asks for it.
- Layered dependency direction: business on top, application in the middle, technology at the bottom. Technology elements serve applications; business elements are never served by nothing. Use serving, realization and access relationships to express the dependency, never plain association.
- Capability-based planning: capabilities are the anchor. Business processes, business services and application services realise capabilities; application components serve business services; technology serves applications.
- Portfolio hygiene: model one element per real capability, system or platform. Do not create an element per screen, feature or team.
- Roadmap discipline: keep Work Packages, Plateaus and Implementation Events out of architecture views, and keep business, application and technology elements out of roadmap views.
- Gap analysis: represent each difference between baseline and target with a Gap element associated to the baseline element it replaces and to the target element that closes it.
- Motivation traceability: stakeholders, drivers, goals, requirements and principles belong in Motivation views, linked with influence, realization or association. Do not mix them into application or technology layers.
- View size: a view should read as one artefact. Aim for 8 to 20 elements; summarise instead of dumping a full inventory.`;

/** Builds the system prompt for one ADM phase and architecture domain. */
function buildSystemPrompt(context: AiContext): string {
  const phase = findTogafPhase(context.phase);
  const domain = findTogafDomain(context.domain);
  const recipes = TOGAF_ARTIFACT_PLAYBOOK.filter((entry) => entry.phase === phase.id)
    .map((entry) => `- ${entry.artifact}: ${entry.recipe}`)
    .join('\n');

  return `You are a TOGAF-certified enterprise architect working inside EAsync, an ArchiMate 3.2 modelling tool.
You produce ADM deliverables on an ArchiMate canvas. You change the canvas only by returning a JSON plan.
Reply with JSON and nothing else.

Working context
- ADM phase: ${phase.code} - ${phase.name}
- Phase purpose: ${phase.purpose}
- Architecture domain: ${domain.label} (layers in scope: ${domain.layers.join(', ')})
- Phase artefacts to expect: ${phase.artifacts.join(', ')}
- Phase guidance: ${phase.guidance}
- Domain guidance: ${domain.guidance}
${recipes ? `\nArtefact recipes\n${recipes}\n` : ''}
Governing principles (cite the ones your plan complies with):
${TOGAF_DEFAULT_PRINCIPLES.map((principle) => `- ${principle}`).join('\n')}

${TOGAF_RULES}

Terminology: name elements with TOGAF wording, but "elementType" must always be an ArchiMate type from the catalog below.
Use this mapping when the request uses TOGAF terms: ${TERMINOLOGY_MAP}.
Names are title-case noun phrases with no numbering or verbs, for example "Customer Onboarding Capability" or "Order Management Service".

JSON shape:
{"summary":"one short sentence describing the change","rationale":{"phase":"${phase.code} - ${phase.name}","viewpoint":"artefact or viewpoint name, e.g. Capability Map","principles":["the governing principle this plan complies with"]},"ops":[...]}

Supported operations:
{"op":"clearView"}
{"op":"addShape","key":"a1","label":"Order Service","elementType":"Application Component","x":60,"y":60,"width":140,"height":70}
{"op":"addConnection","source":"a1","target":"a2","type":"serving"}
{"op":"removeConnection","source":"a1","target":"a2","type":"serving"}
{"op":"removeShape","key":"a1"}
{"op":"renameShape","key":"a1","label":"New name"}
{"op":"moveShape","key":"a1","x":300,"y":120}
{"op":"setParent","key":"a1","parent":"a0"}

Rules:
- "key" is a short id you invent for a new element (a1, a2, ...). Elements already on the canvas are referenced by the "id" shown in the diagram description. Do not invent ids for existing elements.
- "elementType" must be one of: ${ELEMENT_CATALOG}.
- "type" of a relationship must be one of: ${RELATIONSHIP_CATALOG}.
- Coordinates are canvas pixels: x grows to the right, y grows downwards. Omit x and y to let the app place elements automatically.
- "parent" refers to a Grouping element that visually contains the element; omit it for top-level elements.
- Composition and aggregation lines between a container and its children are hidden automatically, so do not add them for nested elements.
- Only emit the operations the request needs. Return {"summary":"No changes","rationale":{"phase":"${phase.code} - ${phase.name}","viewpoint":"","principles":[]},"ops":[]} when nothing should change.
- The canvas usually already has content. Treat every request as an incremental edit: add only what is missing, and reuse the ids shown in the diagram description for existing elements instead of recreating them.
- Use {"op":"clearView"} only when the user explicitly asks to clear, wipe, reset or replace the whole diagram. Never clear the view just because the request introduces new layers or sections.
- Never repeat an element that already exists with the same meaning; rename or move it instead.
- Keep names short and in the language of the request.`;
}

/** Applies an assistant plan to the canvas. */
@Service()
export class AiDiagramService {
  private readonly canvas = inject(DiagramCanvasService);
  private readonly store = inject(DiagramStore);

  private readonly settingsSignal = signal<AiProviderSettings>(readSettings());
  private readonly contextSignal = signal<AiContext>(readContext());
  private readonly busySignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly planSignal = signal<AiPlan | null>(null);
  private readonly previewSignal = signal<string[]>([]);
  private readonly noticeSignal = signal<string[]>([]);

  readonly settings = this.settingsSignal.asReadonly();
  readonly context = this.contextSignal.asReadonly();
  readonly busy = this.busySignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly plan = this.planSignal.asReadonly();
  readonly preview = this.previewSignal.asReadonly();
  readonly notices = this.noticeSignal.asReadonly();
  readonly hasPreview = computed(() => this.planSignal() !== null);
  readonly isConfigured = computed(() => {
    const { baseUrl, model } = this.settingsSignal();
    return baseUrl.trim().length > 0 && model.trim().length > 0;
  });

  updateSettings(patch: Partial<AiProviderSettings>): void {
    const next = { ...this.settingsSignal(), ...patch };
    this.settingsSignal.set(next);
    writeSettings(next);
  }

  /** Changes the ADM phase / architecture domain the assistant works from. */
  updateContext(patch: Partial<AiContext>): void {
    const next = { ...this.contextSignal(), ...patch };
    this.contextSignal.set(next);
    writeContext(next);
  }

  /** Sends the prompt together with the current diagram description and stores the preview. */
  async generate(prompt: string): Promise<void> {
    const request = prompt.trim();
    if (!request || this.busySignal()) return;
    if (!this.isConfigured()) {
      this.errorSignal.set('Set the API base URL and model before asking the assistant.');
      return;
    }

    this.busySignal.set(true);
    this.errorSignal.set(null);
    this.discardPlan();
    try {
      const reply = await this.requestPlan(request);
      const plan = this.withRationale(this.protectExistingDiagram(parsePlan(reply), request));
      this.planSignal.set(plan);
      this.previewSignal.set(describePlan(plan.ops, this.labelsFor(plan.ops)));
    } catch (error) {
      this.errorSignal.set(error instanceof Error ? error.message : 'The assistant request failed.');
    } finally {
      this.busySignal.set(false);
    }
  }

  applyPlan(): void {
    const plan = this.planSignal();
    if (!plan) return;

    const ids = new Map<string, string>();
    for (const shape of this.canvas.describeShapes()) ids.set(shape.id, shape.id);

    const resolve = (key: string | null | undefined): string | null =>
      key ? (ids.get(key) ?? key) : null;

    const shapes = this.canvas.describeShapes();
    const origin = plan.ops.some((op) => op.op === 'clearView')
      ? { x: AUTO_LAYOUT_ORIGIN, y: AUTO_LAYOUT_ORIGIN }
      : this.autoLayoutOrigin(shapes);
    const shift = plan.ops.some((op) => op.op === 'clearView')
      ? 0
      : this.overlapShift(shapes, plan.ops);
    let slot = 0;
    let applied = 0;
    let failed = 0;
    const pendingParents: { key: string; parent: string | null }[] = [];

    for (const op of plan.ops) {
      switch (op.op) {
        case 'clearView':
          this.canvas.clearAll();
          ids.clear();
          applied++;
          break;

        case 'addShape': {
          const style = elementStyleFor(op.elementType, op.layer);
          const position =
            op.x !== undefined && op.y !== undefined
              ? { x: op.x, y: op.y + shift }
              : this.autoLayoutSlot(origin, slot++);
          const id = this.canvas.createShape({
            label: op.label,
            color: style.color,
            icon: style.icon,
            layer: op.layer ?? style.layer,
            x: position.x,
            y: position.y,
            width: op.width ?? null,
            height: op.height ?? null,
          });
          if (!id) {
            failed++;
            break;
          }
          ids.set(op.key, id);
          applied++;
          if (op.parent) pendingParents.push({ key: op.key, parent: op.parent });
          break;
        }

        case 'addConnection': {
          const source = resolve(op.source);
          const target = resolve(op.target);
          if (source && target && this.canvas.connectByIds(source, target, op.type)) applied++;
          else failed++;
          break;
        }

        case 'removeConnection': {
          const source = resolve(op.source);
          const target = resolve(op.target);
          if (source && target && this.canvas.disconnectByIds(source, target, op.type)) applied++;
          else failed++;
          break;
        }

        case 'removeShape': {
          const id = resolve(op.key);
          if (id && this.canvas.removeShapeById(id)) applied++;
          else failed++;
          break;
        }

        case 'renameShape': {
          const id = resolve(op.key);
          if (id && this.canvas.renameShapeById(id, op.label)) applied++;
          else failed++;
          break;
        }

        case 'moveShape': {
          const id = resolve(op.key);
          if (id && this.canvas.moveShapeById(id, op.x, op.y)) applied++;
          else failed++;
          break;
        }

        case 'setParent':
          pendingParents.push({ key: op.key, parent: op.parent ?? null });
          break;
      }
    }

    for (const { key, parent } of pendingParents) {
      const id = resolve(key);
      const parentId = resolve(parent);
      if (id) this.canvas.setShapeParentById(id, parentId);
    }

    this.canvas.commitProgrammaticChanges();
    const notices = this.noticeSignal();
    this.discardPlan();

    this.store.showToast(
      failed
        ? `Applied ${applied} change${applied === 1 ? '' : 's'}; ${failed} could not be applied.`
        : notices.length
          ? `Applied ${applied} change${applied === 1 ? '' : 's'}; existing content was kept.`
          : `Applied ${applied} change${applied === 1 ? '' : 's'} to the diagram.`,
    );
  }

  discardPlan(): void {
    this.planSignal.set(null);
    this.previewSignal.set([]);
    this.noticeSignal.set([]);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private labelsFor(ops: AiOp[]): Map<string, string> {
    const labels = new Map<string, string>();
    for (const shape of this.canvas.describeShapes()) labels.set(shape.id, shape.label);
    for (const op of ops) {
      if (op.op === 'addShape') labels.set(op.key, op.label);
    }
    return labels;
  }

  /**
   * Follow-up prompts must not wipe the diagram. The model occasionally emits `clearView`
   * for requests like "add the technology layer", so the op is dropped unless the user
   * explicitly asked for an empty canvas.
   */
  private protectExistingDiagram(plan: AiPlan, request: string): AiPlan {
    const wantsClear = plan.ops.some((op) => op.op === 'clearView');
    if (!wantsClear) return plan;

    if (CLEAR_INTENT.test(request) || !this.canvas.describeShapes().length) return plan;

    const ops = plan.ops.filter((op) => op.op !== 'clearView');
    this.noticeSignal.set([
      'Kept the existing diagram. The assistant wanted to clear the canvas, but the request did not ask for that.',
    ]);
    return ops.length ? { ...plan, ops } : { ...plan, ops: [] };
  }

  /**
   * The preview always states the ADM phase the plan was produced against, even when the
   * model omits the rationale block, so the user can see the TOGAF traceability.
   */
  private withRationale(plan: AiPlan): AiPlan {
    const phase = findTogafPhase(this.contextSignal().phase);
    const fallback = `${phase.code} - ${phase.name}`;
    const rationale = plan.rationale;
    if (!rationale) return { ...plan, rationale: { phase: fallback, viewpoint: '', principles: [] } };
    return { ...plan, rationale: { ...rationale, phase: rationale.phase || fallback } };
  }

  private autoLayoutOrigin(shapes: DiagramShapeInfo[]): { x: number; y: number } {
    if (!shapes.length) return { x: AUTO_LAYOUT_ORIGIN, y: AUTO_LAYOUT_ORIGIN };

    // Stack new content below what is already on the canvas, keeping the columns aligned.
    const left = Math.min(...shapes.map((shape) => shape.left));
    const bottom = Math.max(...shapes.map((shape) => shape.top + shape.height));
    return {
      x: Math.floor(left / LAYOUT_GRID) * LAYOUT_GRID,
      y: Math.ceil((bottom + AUTO_LAYOUT_ORIGIN) / LAYOUT_GRID) * LAYOUT_GRID,
    };
  }

  /** Vertical offset that keeps model-supplied coordinates from covering existing elements. */
  private overlapShift(shapes: DiagramShapeInfo[], ops: AiOp[]): number {
    if (!shapes.length) return 0;

    const planned = ops.filter(
      (op): op is Extract<AiOp, { op: 'addShape' }> =>
        op.op === 'addShape' && op.x !== undefined && op.y !== undefined,
    );
    if (!planned.length) return 0;

    const collides = planned.some((op) => {
      const left = op.x ?? 0;
      const top = op.y ?? 0;
      const right = left + (op.width ?? DEFAULT_SHAPE_WIDTH);
      const bottom = top + (op.height ?? DEFAULT_SHAPE_HEIGHT);
      return shapes.some(
        (shape) =>
          left < shape.left + shape.width &&
          right > shape.left &&
          top < shape.top + shape.height &&
          bottom > shape.top,
      );
    });
    if (!collides) return 0;

    const existingBottom = Math.max(...shapes.map((shape) => shape.top + shape.height));
    const plannedTop = Math.min(...planned.map((op) => op.y ?? 0));
    return Math.ceil((existingBottom + AUTO_LAYOUT_ORIGIN - plannedTop) / LAYOUT_GRID) * LAYOUT_GRID;
  }

  private autoLayoutSlot(origin: { x: number; y: number }, index: number): { x: number; y: number } {
    return {
      x: origin.x + (index % AUTO_LAYOUT_COLUMNS) * AUTO_LAYOUT_CELL_WIDTH,
      y: origin.y + Math.floor(index / AUTO_LAYOUT_COLUMNS) * AUTO_LAYOUT_CELL_HEIGHT,
    };
  }

  private describeDiagram(): string {
    const shapes = this.canvas.describeShapes();
    const connections = this.canvas.describeConnections();
    const byId = new Map(shapes.map((shape) => [shape.id, shape]));
    const lines: string[] = [
      `Current diagram: ${shapes.length} element(s), ${connections.length} relationship(s).`,
    ];

    if (shapes.length) {
      lines.push('Elements:');
      for (const shape of shapes.slice(0, 80)) {
        const parent = shape.parentId ? `, parent=${shape.parentId}` : '';
        lines.push(
          `- id=${shape.id} label="${shape.label}" layer=${shape.layer} icon=${shape.icon} at (${shape.left},${shape.top}) size ${shape.width}x${shape.height}${parent}`,
        );
      }
    }

    const visible = connections.filter(
      (conn) => byId.has(conn.sourceId) && byId.has(conn.targetId),
    );
    if (visible.length) {
      lines.push('Relationships:');
      for (const conn of visible.slice(0, 80)) {
        const source = byId.get(conn.sourceId);
        const target = byId.get(conn.targetId);
        lines.push(
          `- ${conn.sourceId} ("${source?.label}") --${conn.type}--> ${conn.targetId} ("${target?.label}")`,
        );
      }
    }

    return lines.join('\n');
  }

  private async requestPlan(prompt: string): Promise<string> {
    const { baseUrl, model, apiKey } = this.settingsSignal();
    const context = this.contextSignal();
    const phase = findTogafPhase(context.phase);
    const domain = findTogafDomain(context.domain);
    const url = chatEndpoint(baseUrl);
    const messages = [
      { role: 'system', content: buildSystemPrompt(context) },
      {
        role: 'user',
        content: `${this.describeDiagram()}\n\nADM phase: ${phase.code} - ${phase.name}. Architecture domain: ${domain.label}.\nRequest: ${prompt}`,
      },
    ];

    const first = await this.post(url, apiKey, { model, messages, temperature: 0.2 });
    if (first.ok) return first.content;

    // Some OpenAI-compatible servers reject response_format; retry without it.
    if (/response_format/i.test(first.error ?? '')) {
      const retry = await this.post(url, apiKey, { model, messages, temperature: 0.2 }, false);
      if (retry.ok) return retry.content;
      throw new Error(retry.error ?? 'The assistant request failed.');
    }

    throw new Error(first.error ?? 'The assistant request failed.');
  }

  private async post(
    url: string,
    apiKey: string,
    body: Record<string, unknown>,
    withJsonMode = true,
  ): Promise<{ ok: boolean; content: string; error?: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey.trim()) headers['Authorization'] = `Bearer ${apiKey.trim()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify(
          withJsonMode ? { ...body, response_format: { type: 'json_object' } } : body,
        ),
      });

      const raw = await response.text();
      let data: unknown = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        return { ok: false, content: '', error: describeHttpError(response.status, data) };
      }

      const content = readContent(data);
      if (!content) return { ok: false, content: '', error: 'The assistant returned an empty reply.' };
      return { ok: true, content };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { ok: false, content: '', error: 'The assistant request timed out.' };
      }
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, content: '', error: `Could not reach the AI endpoint: ${message}` };
    } finally {
      clearTimeout(timer);
    }
  }
}

function chatEndpoint(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}

function readContent(data: unknown): string {
  const choices = (data as { choices?: unknown } | null)?.choices;
  if (!Array.isArray(choices) || !choices.length) return '';
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  const content = message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : String((part as { text?: string }).text ?? '')))
      .join('');
  }
  return '';
}

function describeHttpError(status: number, data: unknown): string {
  const message = (data as { error?: { message?: unknown } } | null)?.error?.message;
  const detail = typeof message === 'string' && message ? `: ${message}` : '';
  if (status === 401 || status === 403) return `The AI endpoint rejected the API key (${status})${detail}`;
  if (status === 404) return `The AI endpoint or model was not found (404)${detail}`;
  if (status === 429) return `The AI endpoint is rate limiting requests (429)${detail}`;
  return `The AI endpoint returned ${status}${detail}`;
}

function readSettings(): AiProviderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AiProviderSettings>;
    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : DEFAULT_AI_SETTINGS.baseUrl,
      model: typeof parsed.model === 'string' ? parsed.model : DEFAULT_AI_SETTINGS.model,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
    };
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

function writeSettings(settings: AiProviderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing or a full quota: settings simply do not persist.
  }
}

function readContext(): AiContext {
  try {
    const raw = localStorage.getItem(CONTEXT_KEY);
    if (!raw) return { ...DEFAULT_AI_CONTEXT };
    const parsed = JSON.parse(raw) as Partial<AiContext>;
    return {
      phase: findTogafPhase(parsed.phase ?? DEFAULT_AI_CONTEXT.phase).id,
      domain: findTogafDomain(parsed.domain ?? DEFAULT_AI_CONTEXT.domain).id,
    };
  } catch {
    return { ...DEFAULT_AI_CONTEXT };
  }
}

function writeContext(context: AiContext): void {
  try {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // Private browsing or a full quota: the context simply does not persist.
  }
}
