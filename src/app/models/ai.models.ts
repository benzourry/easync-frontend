import type { RelationshipType } from './archimate.models';
import type { TogafDomainId, TogafPhaseId } from './togaf.models';

/** A single canvas mutation proposed by the assistant. */
export type AiOp =
  | { op: 'clearView' }
  | {
      op: 'addShape';
      key: string;
      label: string;
      elementType?: string;
      layer?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      parent?: string | null;
    }
  | { op: 'addConnection'; source: string; target: string; type: RelationshipType }
  | { op: 'removeConnection'; source: string; target: string; type?: RelationshipType }
  | { op: 'removeShape'; key: string }
  | { op: 'renameShape'; key: string; label: string }
  | { op: 'moveShape'; key: string; x: number; y: number }
  | { op: 'setParent'; key: string; parent: string | null };

/**
 * The TOGAF position the user is working from. It steers the assistant's
 * vocabulary, the artefacts it produces and the layers it is allowed to use.
 */
export interface AiContext {
  phase: TogafPhaseId;
  domain: TogafDomainId;
}

export const DEFAULT_AI_CONTEXT: AiContext = { phase: 'b', domain: 'cross' };

/** Why the assistant modelled the view the way it did (TOGAF traceability). */
export interface AiRationale {
  /** ADM phase the plan was produced against, e.g. `Phase B – Business Architecture`. */
  phase: string;
  /** TOGAF viewpoint / artefact the view represents, e.g. `Capability Map`. */
  viewpoint: string;
  /** Governing principles the plan complies with. */
  principles: string[];
}

/** The assistant's answer: a short explanation plus the operations to run. */
export interface AiPlan {
  summary: string;
  rationale: AiRationale | null;
  ops: AiOp[];
}

/** Any OpenAI-compatible chat completion endpoint. */
export interface AiProviderSettings {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export const DEFAULT_AI_SETTINGS: AiProviderSettings = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: '',
};
