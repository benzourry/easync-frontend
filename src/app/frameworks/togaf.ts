/**
 * TOGAF ADM reference data used to steer the assistant.
 *
 * The assistant produces ArchiMate 3.2 models, so every entry here maps TOGAF
 * terminology (phases, artefacts, domains) onto the ArchiMate palette and the
 * kind of diagram that phase is expected to deliver.
 */

export type TogafPhaseId =
  | 'preliminary'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'requirements';

export interface TogafPhase {
  id: TogafPhaseId;
  /** ADM code shown in the UI, e.g. `Phase B`. */
  code: string;
  name: string;
  purpose: string;
  /** Typical TOGAF artefacts produced in this phase. */
  artifacts: string[];
  /** ArchiMate layers this phase normally draws on. */
  layers: string[];
  /** Phase-specific modelling instructions for the assistant. */
  guidance: string;
}

export const TOGAF_PHASES: TogafPhase[] = [
  {
    id: 'preliminary',
    code: 'Preliminary',
    name: 'Architecture Capability',
    purpose: 'Establish the architecture practice, its principles and its governance.',
    artifacts: ['Architecture Principles', 'Architecture Repository', 'Request for Architecture Work'],
    layers: ['Motivation', 'Generic'],
    guidance:
      'Model principles, drivers, goals and stakeholders as Motivation elements and use Groupings to organise the repository. Do not model solutions or technology here.',
  },
  {
    id: 'a',
    code: 'Phase A',
    name: 'Architecture Vision',
    purpose: 'Agree scope, stakeholders, concerns and a high-level target vision.',
    artifacts: [
      'Stakeholder Map matrix',
      'Solution Concept diagram',
      'Value Chain diagram',
      'Architecture Vision',
    ],
    layers: ['Motivation', 'Strategy', 'Business'],
    guidance:
      'Produce one high-level sketch: stakeholders, drivers, goals, the key capabilities and the solution concept. Stay around a dozen elements and push detail into later phases.',
  },
  {
    id: 'b',
    code: 'Phase B',
    name: 'Business Architecture',
    purpose: 'Describe the baseline and target business architecture.',
    artifacts: [
      'Capability Map',
      'Value Stream Map',
      'Business Process Map',
      'Organization Map',
      'Business Service/Function Catalog',
    ],
    layers: ['Strategy', 'Business'],
    guidance:
      'Capabilities and value streams come first, then the business services and processes that realise them, then the actors and roles that perform them. Decompose capabilities with composition or aggregation and use Groupings for value-stream stages.',
  },
  {
    id: 'c',
    code: 'Phase C',
    name: 'Information Systems Architectures',
    purpose: 'Describe the data and application architectures.',
    artifacts: [
      'Application Portfolio Catalog',
      'Application Communication diagram',
      'Data Entity / Data Component Catalog',
      'Application and User Location diagram',
    ],
    layers: ['Application'],
    guidance:
      'One Application Component per real system, grouped by domain or portfolio segment. Application Services are what the business consumes, Application Interfaces sit between components, and Data Objects are accessed by components rather than owned by services.',
  },
  {
    id: 'd',
    code: 'Phase D',
    name: 'Technology Architecture',
    purpose: 'Describe the technology and physical architecture that hosts the applications.',
    artifacts: [
      'Technology Standards Catalog',
      'Technology Portfolio Catalog',
      'Environments and Locations diagram',
      'Platform Decomposition diagram',
    ],
    layers: ['Tech & Physical'],
    guidance:
      'One Technology Node per environment or platform host, with System Software and Artifacts inside it and Networks between nodes. Technology elements serve applications; they never depend on business elements.',
  },
  {
    id: 'e',
    code: 'Phase E',
    name: 'Opportunities and Solutions',
    purpose: 'Group the work into projects and identify transition architectures.',
    artifacts: [
      'Project Context diagram',
      'Benefits diagram',
      'Work Package definitions',
      'Consolidated Gaps, Solutions and Dependencies',
    ],
    layers: ['Implementation', 'Application', 'Technology'],
    guidance:
      'Represent initiatives as Work Packages that realise the capabilities or services they deliver. Keep the landscape summary-level; this is not a detailed design view.',
  },
  {
    id: 'f',
    code: 'Phase F',
    name: 'Migration Planning',
    purpose: 'Sequence work packages into plateaus and produce the roadmap.',
    artifacts: [
      'Implementation and Migration Plan',
      'Architecture Roadmap',
      'Transition Architecture definitions',
    ],
    layers: ['Implementation'],
    guidance:
      'Lay Plateaus out left to right as target states with Work Packages between them and use triggering relationships for sequencing. Keep roadmap elements out of Phase B–D views.',
  },
  {
    id: 'g',
    code: 'Phase G',
    name: 'Implementation Governance',
    purpose: 'Govern delivery against the agreed target architecture.',
    artifacts: ['Architecture Contract', 'Compliance Assessment', 'Architecture Compliance Review'],
    layers: ['Implementation', 'Motivation'],
    guidance:
      'Show Work Packages and Deliverables with the requirements they satisfy, linking Deliverables to the target elements they realise.',
  },
  {
    id: 'h',
    code: 'Phase H',
    name: 'Architecture Change Management',
    purpose: 'Manage change to the deployed architecture.',
    artifacts: [
      'Change Request',
      'Architecture Requirements Specification',
      'Architecture Change Management plan',
    ],
    layers: ['Motivation', 'Implementation'],
    guidance:
      'Model the change drivers and requirements together with the elements they affect. Keep the scope of a change view deliberately small.',
  },
  {
    id: 'requirements',
    code: 'Requirements',
    name: 'Continuous Requirements Management',
    purpose: 'Capture and govern requirements across every phase (the centre of the ADM).',
    artifacts: [
      'Requirements Catalog',
      'Requirements Impact Assessment',
      'Architecture Requirements Specification',
    ],
    layers: ['Motivation', 'Generic'],
    guidance:
      'Model Requirements with the drivers, goals and stakeholders that justify them, and use realization to tie each Requirement to the element that satisfies it.',
  },
];

export function findTogafPhase(id: TogafPhaseId): TogafPhase {
  return TOGAF_PHASES.find((phase) => phase.id === id) ?? TOGAF_PHASES[2];
}

export type TogafDomainId = 'business' | 'data' | 'application' | 'technology' | 'cross';

export interface TogafDomain {
  id: TogafDomainId;
  label: string;
  /** ArchiMate layers considered in scope. */
  layers: string[];
  guidance: string;
}

export const TOGAF_DOMAINS: TogafDomain[] = [
  {
    id: 'business',
    label: 'Business Architecture',
    layers: ['Strategy', 'Business'],
    guidance:
      'Business domain: capabilities, value streams, processes, actors and roles, business objects. Keep application and technology elements out unless the request explicitly asks for them.',
  },
  {
    id: 'data',
    label: 'Data Architecture',
    layers: ['Business', 'Application'],
    guidance:
      'Data domain: Business Objects and Data Objects, their decomposition and the components that access them. Model data structure and ownership, not application behaviour.',
  },
  {
    id: 'application',
    label: 'Application Architecture',
    layers: ['Application'],
    guidance:
      'Application domain: components, services, interfaces and functions. Applications serve business services and realise business capabilities; avoid technology detail.',
  },
  {
    id: 'technology',
    label: 'Technology Architecture',
    layers: ['Tech & Physical'],
    guidance:
      'Technology domain: nodes, devices, system software, networks, artifacts and facilities. Technology serves applications and never depends on business elements.',
  },
  {
    id: 'cross',
    label: 'Cross-domain',
    layers: ['Motivation', 'Strategy', 'Business', 'Application', 'Tech & Physical'],
    guidance:
      'Cross-domain view: keep business, application and technology content in clearly separated bands. The canonical reading order is business on top, application in the middle, technology at the bottom.',
  },
];

export function findTogafDomain(id: TogafDomainId): TogafDomain {
  return TOGAF_DOMAINS.find((domain) => domain.id === id) ?? TOGAF_DOMAINS[4];
}

/** The eight TOGAF artefacts this assistant knows how to lay out on a canvas. */
export const TOGAF_ARTIFACT_PLAYBOOK: { artifact: string; phase: TogafPhaseId; recipe: string }[] = [
  {
    artifact: 'Capability map',
    phase: 'b',
    recipe:
      'Business Capabilities composed into level-1 and level-2 capabilities; one Grouping per level-1 capability when it exceeds four children.',
  },
  {
    artifact: 'Business process / value stream',
    phase: 'b',
    recipe:
      'Value Stream stages as Groupings left to right, the Business Processes realising each stage, and the Business Actors or Roles performing them.',
  },
  {
    artifact: 'Application portfolio and catalog',
    phase: 'c',
    recipe:
      'Application Components grouped by portfolio segment, with the Application Services they expose and the business capabilities or services they serve.',
  },
  {
    artifact: 'Technology blueprint',
    phase: 'd',
    recipe:
      'Technology Nodes per environment hosting System Software and Artifacts, Networks between nodes, and serving relationships up to the applications hosted.',
  },
  {
    artifact: 'Architecture roadmap and work packages',
    phase: 'f',
    recipe:
      'Plateaus for the transition states, Work Packages between them, and triggering relationships showing execution order.',
  },
  {
    artifact: 'Gap analysis (baseline to target)',
    phase: 'e',
    recipe:
      'Baseline elements on the left, target elements on the right, and a Gap element associated with each element that changes.',
  },
  {
    artifact: 'Stakeholder and viewpoint definition',
    phase: 'a',
    recipe:
      'Stakeholders associated with the Drivers, Goals and Requirements they own, visually separated by Groupings or lanes per stakeholder group.',
  },
  {
    artifact: 'Architecture principles and requirements',
    phase: 'preliminary',
    recipe:
      'Principles as Requirement or Goal elements with the Driver that motivates each one, and realization links to the elements that comply.',
  },
];

/** Fallback governing principles, used when the user has not supplied their own. */
export const TOGAF_DEFAULT_PRINCIPLES = [
  'Business-led, technology-enabled: business outcomes drive every technology choice.',
  'Capability-based planning: increment around business capabilities, not systems.',
  'Reuse before buy, buy before build.',
  'Interoperability through published services and interfaces.',
  'Data is a shared asset governed at enterprise level.',
];
