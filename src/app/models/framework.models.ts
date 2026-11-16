/**
 * Framework profiles.
 *
 * A framework profile is *data*, not code: it describes the governed set of
 * phases, domains, principles, levels and artifacts an architecture practice is
 * measured against. The editor, the assistant and the backend all read the same
 * shape so that adding a framework (TOGAF, MyGovEA, a local variant) never
 * requires a code change.
 */

import type { ArchimateLayer, RelationshipType } from './archimate.models';

export type FrameworkId = 'togaf' | 'mygovea';

/** A governing principle the architecture must demonstrably respect. */
export interface ArchitecturePrinciple {
  id: string;
  /** Grouping shown in the UI, e.g. `Data`, `Aplikasi`, `General`. */
  category: string;
  name: string;
  /** One-sentence normative statement. */
  statement: string;
  rationale?: string;
  /** What the principle forces teams to do differently. */
  implications?: string[];
}

/** A stage of the framework's method (TOGAF ADM phase, MyGovEA methodology phase). */
export interface FrameworkPhase {
  id: string;
  /** Short code shown in the UI, e.g. `Phase B` or `Penilaian`. */
  code: string;
  name: string;
  purpose: string;
  /** Typical artifacts produced in this phase. */
  artifacts: string[];
  /** ArchiMate layers this phase normally draws on. */
  layers: ArchimateLayer[];
  /** Phase-specific modelling instructions for the assistant. */
  guidance: string;
}

/** A domain (segment) the framework separates the architecture into. */
export interface FrameworkDomain {
  id: string;
  label: string;
  /** ArchiMate layers considered in scope. */
  layers: ArchimateLayer[];
  guidance: string;
}

/** A named deliverable that can be laid out on the canvas. */
export interface FrameworkArtifact {
  name: string;
  /** Id of the {@link FrameworkPhase} that produces it. */
  phase: string;
  kind: 'catalogue' | 'matrix' | 'diagram';
  /** Modelling recipe for the assistant. */
  recipe: string;
}

/** A planning horizon (national, programme, project …). */
export interface FrameworkLevel {
  id: string;
  name: string;
  description: string;
  /** Documents expected at this level. */
  deliverables: string[];
}

/** A reference model the framework mandates (BRM, ARM, TRM …). */
export interface FrameworkReferenceModel {
  id: string;
  name: string;
  description: string;
  /** ArchiMate layers the model is populated from. */
  layers: ArchimateLayer[];
}

/** An accountable role in the framework's governance. */
export interface FrameworkRole {
  id: string;
  name: string;
  responsibility: string;
}

/** Provenance of the profile's content, so unverified data is never presented as authoritative. */
export interface FrameworkSource {
  url: string;
  verified: boolean;
  note?: string;
}

export interface FrameworkProfile {
  id: FrameworkId;
  name: string;
  shortName: string;
  /** Statute, standard or mandate the profile implements. */
  mandate: string;
  source: FrameworkSource;
  /** Layers the profile treats as in scope by default. */
  defaultLayers: ArchimateLayer[];
  phases: FrameworkPhase[];
  domains: FrameworkDomain[];
  principles: ArchitecturePrinciple[];
  levels: FrameworkLevel[];
  referenceModels: FrameworkReferenceModel[];
  roles: FrameworkRole[];
  artifacts: FrameworkArtifact[];
}

/**
 * A viewpoint is the modelling question a view answers: who it is for, which elements belong on
 * it and which relationships make sense there. Keeping it as data lets the palette, the validator
 * and the assistant filter by viewpoint without knowing any specific framework.
 */
export interface Viewpoint {
  id: string;
  name: string;
  /** The single question the view answers, e.g. "How do applications support the business?". */
  concern: string;
  /** Roles that read this view, e.g. `Application Architect`. */
  stakeholders: string[];
  /** `archimate` for the standard library, otherwise the framework profile that owns it. */
  framework: FrameworkId | 'archimate';
  /** Id of the owning {@link FrameworkPhase}, when a phase produces this view. */
  phase: string | null;
  /** Palette labels admitted by the viewpoint. */
  elements: string[];
  /** Layers admitted wholesale, so a layer-level viewpoint need not list every element. */
  layers?: ArchimateLayer[];
  /** Relationship types that are meaningful in this view. */
  relationships: RelationshipType[];
  /** What the view should show, used by the assistant and by empty-state hints. */
  guidance: string;
}
