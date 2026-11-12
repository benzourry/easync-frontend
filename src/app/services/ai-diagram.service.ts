import { HttpErrorResponse } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { apiErrorMessage } from '../core/http-error';
import { DEFAULT_AI_CONTEXT } from '../models/ai.models';
import type { AiContext, AiOp, AiPlan, AiSettings, AiSettingsPatch } from '../models/ai.models';
import type { DiagramShapeInfo } from '../models/diagram.models';
import { findTogafDomain, findTogafPhase } from '../models/togaf.models';
import { describePlan, elementStyleFor, parsePlan } from '../utils/ai-plan';
import { AiApiService } from './ai-api.service';
import { DiagramCanvasService } from './diagram-canvas.service';
import { DiagramPersistenceService } from './diagram-persistence.service';
import { DiagramStore } from './diagram-store';

const CONTEXT_KEY = 'easync.ai.context';
const REQUEST_TIMEOUT_MS = 60_000;
const AUTO_LAYOUT_COLUMNS = 3;
const AUTO_LAYOUT_CELL_WIDTH = 180;
const AUTO_LAYOUT_CELL_HEIGHT = 110;
const AUTO_LAYOUT_ORIGIN = 60;
const LAYOUT_GRID = 15;
const DEFAULT_SHAPE_WIDTH = 140;
const DEFAULT_SHAPE_HEIGHT = 70;

/** The API answers 502 when the upstream model provider fails, which is fixed in the settings form. */
function isProviderFailure(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 502;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError';
}

/** Requests that genuinely ask for an empty canvas. Anything else must stay additive. */
const CLEAR_INTENT =
  /\b(clear|wipe|reset|start (over|fresh|again)|from scratch|new diagram|new view|empty (the )?(canvas|diagram|view)|replace (the |this )?(whole |entire )?(diagram|canvas|view))\b/i;

/** Applies an assistant plan to the canvas. */
@Service()
export class AiDiagramService {
  private readonly canvas = inject(DiagramCanvasService);
  private readonly store = inject(DiagramStore);
  private readonly api = inject(AiApiService);
  private readonly persistence = inject(DiagramPersistenceService);

  private readonly settingsSignal = signal<AiSettings>({
    baseUrl: '',
    model: '',
    hasApiKey: false,
  });
  private readonly settingsLoadedSignal = signal(false);
  private readonly settingsBusySignal = signal(false);
  private readonly settingsErrorSignal = signal<string | null>(null);
  private readonly contextSignal = signal<AiContext>(readContext());
  private readonly busySignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly providerFailedSignal = signal(false);
  private readonly planSignal = signal<AiPlan | null>(null);
  private readonly previewSignal = signal<string[]>([]);
  private readonly noticeSignal = signal<string[]>([]);

  readonly settings = this.settingsSignal.asReadonly();
  readonly settingsLoaded = this.settingsLoadedSignal.asReadonly();
  readonly settingsBusy = this.settingsBusySignal.asReadonly();
  readonly settingsError = this.settingsErrorSignal.asReadonly();
  readonly context = this.contextSignal.asReadonly();
  readonly busy = this.busySignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  /** True when the last request failed inside the provider, so the stored key/model needs review. */
  readonly providerFailed = this.providerFailedSignal.asReadonly();
  readonly plan = this.planSignal.asReadonly();
  readonly preview = this.previewSignal.asReadonly();
  readonly notices = this.noticeSignal.asReadonly();
  readonly hasPreview = computed(() => this.planSignal() !== null);
  readonly isConfigured = computed(() => this.settingsSignal().hasApiKey);

  /** Reads the signed-in user's assistant settings from the server. */
  loadSettings(onLoaded?: () => void): void {
    if (this.settingsLoadedSignal() || this.settingsBusySignal()) return;
    this.settingsBusySignal.set(true);
    this.api.settings().subscribe({
      next: (settings) => {
        this.settingsSignal.set(settings);
        this.settingsLoadedSignal.set(true);
        this.settingsBusySignal.set(false);
        onLoaded?.();
      },
      error: (error: unknown) => {
        this.settingsErrorSignal.set(apiErrorMessage(error));
        this.settingsBusySignal.set(false);
      },
    });
  }

  /** Stores new assistant settings for the signed-in user. The key stays on the server. */
  saveSettings(patch: AiSettingsPatch, onSaved?: () => void): void {
    if (this.settingsBusySignal()) return;
    this.settingsBusySignal.set(true);
    this.settingsErrorSignal.set(null);
    this.api.saveSettings(patch).subscribe({
      next: (settings) => {
        this.settingsSignal.set(settings);
        this.settingsLoadedSignal.set(true);
        this.settingsBusySignal.set(false);
        // A new credential makes any earlier "provider rejected the key" complaint stale.
        this.errorSignal.set(null);
        this.providerFailedSignal.set(false);
        onSaved?.();
      },
      error: (error: unknown) => {
        this.settingsErrorSignal.set(apiErrorMessage(error));
        this.settingsBusySignal.set(false);
      },
    });
  }

  clearSettingsError(): void {
    this.settingsErrorSignal.set(null);
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
      this.settingsErrorSignal.set('Add your AI API key in the assistant settings first.');
      return;
    }

    const diagramId = this.persistence.diagram()?.id;
    if (diagramId === undefined) {
      this.errorSignal.set('Open a diagram before asking the assistant.');
      return;
    }
    if (this.store.readOnly()) {
      this.errorSignal.set('You only have view access to this diagram.');
      return;
    }

    this.busySignal.set(true);
    this.errorSignal.set(null);
    this.providerFailedSignal.set(false);
    this.discardPlan();
    try {
      const context = this.contextSignal();
      const reply = await firstValueFrom(
        this.api
          .createPlan(diagramId, {
            prompt: request,
            phase: findTogafPhase(context.phase).id,
            domain: findTogafDomain(context.domain).id,
            diagram: this.describeDiagram(),
          })
          .pipe(timeout(REQUEST_TIMEOUT_MS)),
      );
      const plan = this.withRationale(
        this.protectExistingDiagram(parsePlan(JSON.stringify(reply)), request),
      );
      this.planSignal.set(plan);
      this.previewSignal.set(describePlan(plan.ops, this.labelsFor(plan.ops)));
    } catch (error) {
      this.providerFailedSignal.set(isProviderFailure(error));
      this.errorSignal.set(
        isTimeout(error)
          ? 'The AI provider did not answer in time. Try a shorter prompt or a faster model.'
          : apiErrorMessage(error),
      );
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
