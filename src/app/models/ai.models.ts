import type { RelationshipType } from './archimate.models';

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

/** The assistant's answer: a short explanation plus the operations to run. */
export interface AiPlan {
  summary: string;
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
