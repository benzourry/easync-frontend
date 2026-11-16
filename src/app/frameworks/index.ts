/**
 * Framework registry.
 *
 * Everything that needs to be framework-aware (palette, assistant, properties
 * panel, reports) reads profiles from here rather than importing a specific
 * framework module.
 */

import type { FrameworkId, FrameworkProfile } from '../models/framework.models';
import { MYGOVEA_PROFILE } from './mygovea';
import { TOGAF_PROFILE } from './togaf';

export const FRAMEWORK_PROFILES: Record<FrameworkId, FrameworkProfile> = {
  togaf: TOGAF_PROFILE,
  mygovea: MYGOVEA_PROFILE,
};

export const FRAMEWORK_IDS: FrameworkId[] = Object.keys(FRAMEWORK_PROFILES) as FrameworkId[];

export const DEFAULT_FRAMEWORK_ID: FrameworkId = 'togaf';

/** Coerces an arbitrary string (URL segment, stored project setting) to a known profile id. */
export function frameworkIdOf(value: string | null | undefined): FrameworkId {
  return value === 'mygovea' ? 'mygovea' : DEFAULT_FRAMEWORK_ID;
}

export function frameworkProfile(id: string | null | undefined): FrameworkProfile {
  return FRAMEWORK_PROFILES[frameworkIdOf(id)];
}

export function frameworkPhases(id: string | null | undefined) {
  return frameworkProfile(id).phases;
}

export function frameworkDomains(id: string | null | undefined) {
  return frameworkProfile(id).domains;
}

export function frameworkPrinciples(id: string | null | undefined) {
  return frameworkProfile(id).principles;
}

export {
  ARCHIMATE_VIEWPOINTS,
  MYGOVEA_VIEWPOINTS,
  TOGAF_VIEWPOINTS,
  VIEWPOINTS,
  viewpointAdmits,
  viewpointById,
  viewpointsForFramework,
  viewpointsForPhase,
  viewpointUsesRelationship,
} from './viewpoints';
