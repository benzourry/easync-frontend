/**
 * Viewpoint catalogue.
 *
 * Three families live here: the ArchiMate 3.2 standard viewpoints, the ones the TOGAF ADM phases
 * are normally expected to produce, and the MyGovEA architecture views. They are deliberately data:
 * the palette filter, the validator's scope and the assistant prompt all read this table instead of
 * hard-coding a framework.
 *
 * `elements` holds palette labels (see `PALETTE_CATEGORIES`); `layers` admits a whole layer so a
 * layer-level viewpoint does not have to enumerate every element type.
 */

import type { ArchimateLayer } from '../models/archimate.models';
import type { FrameworkId, Viewpoint } from '../models/framework.models';

const ALL_LAYERS: ArchimateLayer[] = [
  'Strategy',
  'Business',
  'Application',
  'Tech & Physical',
  'Physical',
  'Motivation',
  'Implementation',
];

/** ArchiMate 3.2 standard viewpoints (specification §13). */
export const ARCHIMATE_VIEWPOINTS: Viewpoint[] = [
  {
    id: 'organization',
    name: 'Organization',
    concern: 'Who carries out the work and how is the organisation structured?',
    stakeholders: ['Business Architect', 'Process Owner'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Business Actor',
      'Business Role',
      'Business Collaboration',
      'Business Interface',
      'Location',
      'Grouping',
    ],
    relationships: ['composition', 'aggregation', 'assignment', 'specialization'],
    guidance:
      'Draw the active business structure: actors nested in locations, roles assigned to actors, ' +
      'collaborations where responsibilities meet. Avoid behaviour elements on this view.',
  },
  {
    id: 'business-process-cooperation',
    name: 'Business Process Cooperation',
    concern: 'How do business processes, services and objects cooperate to deliver value?',
    stakeholders: ['Business Architect', 'Process Owner', 'Business Analyst'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Business Process',
      'Business Function',
      'Business Interaction',
      'Business Event',
      'Business Service',
      'Business Object',
      'Business Actor',
      'Business Role',
      'Location',
      'Grouping',
    ],
    relationships: ['flow', 'triggering', 'serving', 'access', 'composition', 'aggregation', 'realization'],
    guidance:
      'Order the behaviour by value flow, show the service each process exposes and the objects it ' +
      'reads or writes. Group processes into functions where they share a purpose.',
  },
  {
    id: 'product',
    name: 'Product',
    concern: 'What does the organisation offer, and what services and contracts make it up?',
    stakeholders: ['Product Owner', 'Business Architect'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Product',
      'Business Service',
      'Application Service',
      'Contract',
      'Business Interface',
      'Business Object',
      'Value',
      'Business Actor',
      'Business Role',
    ],
    relationships: ['composition', 'aggregation', 'realization', 'serving', 'access', 'association'],
    guidance:
      'A product aggregates business services and is formalised by a contract. Include the value it ' +
      'delivers to the customer.',
  },
  {
    id: 'application-cooperation',
    name: 'Application Cooperation',
    concern: 'How do applications share data and services?',
    stakeholders: ['Application Architect', 'Integration Architect'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Application Component',
      'Application Collaboration',
      'Application Interface',
      'Application Service',
      'Application Function',
      'Application Process',
      'Application Interaction',
      'Application Event',
      'Data Object',
      'Technology Service',
      'Grouping',
    ],
    relationships: ['flow', 'triggering', 'serving', 'access', 'composition', 'aggregation', 'realization'],
    guidance:
      'Show applications as components exposing interfaces, the services behind them, and the data ' +
      'objects exchanged over those interfaces.',
  },
  {
    id: 'application-usage',
    name: 'Application Usage',
    concern: 'Which applications support which business processes?',
    stakeholders: ['Application Architect', 'Business Architect'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Application Service',
      'Application Component',
      'Application Interface',
      'Data Object',
      'Business Process',
      'Business Function',
      'Business Actor',
      'Business Role',
      'Business Object',
    ],
    relationships: ['serving', 'realization', 'access', 'flow', 'assignment'],
    guidance:
      'Keep the business behaviour on top and the application services that realise it below, joined ' +
      'by serving or realization.',
  },
  {
    id: 'implementation-deployment',
    name: 'Implementation and Deployment',
    concern: 'Which work packages deliver which plateaus, and how is the result deployed?',
    stakeholders: ['Programme Manager', 'Solution Architect', 'Operations'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Work Package',
      'Deliverable',
      'Implementation Event',
      'Plateau',
      'Gap',
      'Technology Node',
      'Technology Device',
      'System Software',
      'Technology Service',
      'Artifact',
      'Application Component',
      'Location',
      'Business Actor',
      'Grouping',
    ],
    relationships: ['composition', 'aggregation', 'realization', 'assignment', 'triggering', 'association'],
    guidance:
      'Work packages realise deliverables and lead to a plateau. Deployment elements show where the ' +
      'delivered architecture is hosted.',
  },
  {
    id: 'technology',
    name: 'Technology',
    concern: 'Which infrastructure, platforms and networks run the applications?',
    stakeholders: ['Technology Architect', 'Infrastructure Engineer', 'Operations'],
    framework: 'archimate',
    phase: null,
    elements: [],
    layers: ['Tech & Physical', 'Physical'],
    relationships: ['composition', 'aggregation', 'serving', 'realization', 'assignment', 'flow', 'access'],
    guidance:
      'Model nodes, devices and system software as a hosting hierarchy; expose technology services ' +
      'that the application layer consumes.',
  },
  {
    id: 'information-structure',
    name: 'Information Structure',
    concern: 'What is the meaning, structure and representation of the information used?',
    stakeholders: ['Data Architect', 'Information Manager'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Business Object',
      'Data Object',
      'Representation',
      'Meaning',
      'Product',
      'Business Actor',
      'Business Role',
      'Business Process',
      'Business Function',
      'Business Service',
      'Application Component',
    ],
    relationships: ['composition', 'aggregation', 'association', 'access', 'realization', 'specialization'],
    guidance:
      'Data objects compose business objects and are realised by representations. Attach meaning and ' +
      'record which behaviour accesses the data.',
  },
  {
    id: 'service-realization',
    name: 'Service Realization',
    concern: 'How is a service realised by the behaviour underneath it?',
    stakeholders: ['Solution Architect', 'Business Architect'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Business Service',
      'Application Service',
      'Technology Service',
      'Business Process',
      'Business Function',
      'Business Interaction',
      'Application Component',
      'Application Function',
      'Application Process',
      'Technology Node',
      'Technology Device',
      'System Software',
      'Technology Function',
      'Grouping',
    ],
    relationships: ['realization', 'composition', 'aggregation', 'serving'],
    guidance:
      'Chain the three service layers explicitly: each service is realised by behaviour in its own ' +
      'layer and serves the layer above.',
  },
  {
    id: 'goal-realization',
    name: 'Goal Realization',
    concern: 'Which goals, requirements and capabilities together realise an outcome?',
    stakeholders: ['Enterprise Architect', 'Sponsor'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Goal',
      'Outcome',
      'Value',
      'Principle',
      'Requirement',
      'Constraint',
      'Driver',
      'Assessment',
      'Stakeholder',
      'Capability',
      'Resource',
      'Course of Action',
      'Value Stream',
      'Business Actor',
      'Business Role',
      'Grouping',
    ],
    relationships: ['realization', 'aggregation', 'composition', 'influence', 'association', 'specialization'],
    guidance:
      'Drive from the stakeholder expectation down to the capability or resource that satisfies it. ' +
      'Use realization for "is realised by", influence for softer impact.',
  },
  {
    id: 'goal-contribution',
    name: 'Goal Contribution',
    concern: 'How do outcomes and requirements contribute to goals?',
    stakeholders: ['Enterprise Architect', 'Portfolio Manager'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Goal',
      'Outcome',
      'Value',
      'Driver',
      'Assessment',
      'Stakeholder',
      'Principle',
      'Requirement',
      'Constraint',
      'Capability',
      'Resource',
      'Course of Action',
    ],
    relationships: ['influence', 'association', 'realization', 'aggregation'],
    guidance:
      'Contribution is qualitative: connect elements with influence and annotate the strength in the ' +
      'element documentation.',
  },
  {
    id: 'principles',
    name: 'Principles',
    concern: 'Which principles govern the architecture, and what do they require?',
    stakeholders: ['Architecture Board', 'Enterprise Architect'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Principle',
      'Requirement',
      'Constraint',
      'Goal',
      'Driver',
      'Stakeholder',
      'Assessment',
      'Course of Action',
      'Capability',
    ],
    relationships: ['realization', 'influence', 'association', 'aggregation'],
    guidance:
      'One principle per node, with the driver that motivates it and the requirements that quantify ' +
      'it. Compliance statements belong in the element documentation.',
  },
  {
    id: 'requirements-realization',
    name: 'Requirements Realization',
    concern: 'Which core elements realise each requirement, and how is compliance evidenced?',
    stakeholders: ['Solution Architect', 'Architecture Board'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Requirement',
      'Constraint',
      'Goal',
      'Outcome',
      'Deliverable',
      'Work Package',
      'Business Actor',
      'Business Role',
      'Business Process',
      'Business Service',
      'Application Component',
      'Application Service',
      'Technology Node',
      'Technology Service',
      'Grouping',
    ],
    relationships: ['realization', 'association', 'composition', 'aggregation', 'influence'],
    guidance:
      'Each requirement should point at the element that satisfies it; state the acceptance evidence ' +
      'in the requirement documentation.',
  },
  {
    id: 'motivation',
    name: 'Motivation',
    concern: 'Why does the architecture look like this?',
    stakeholders: ['Enterprise Architect', 'Sponsor', 'Architecture Board'],
    framework: 'archimate',
    phase: null,
    elements: [],
    layers: ['Motivation'],
    relationships: ['association', 'influence', 'realization', 'aggregation', 'specialization'],
    guidance:
      'Model the motivation chain stakeholder → driver → assessment → goal → outcome, then attach ' +
      'principles and requirements.',
  },
  {
    id: 'strategy',
    name: 'Strategy',
    concern: 'Which capabilities and courses of action pursue the strategy?',
    stakeholders: ['Enterprise Architect', 'Strategy Office', 'Sponsor'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Resource',
      'Capability',
      'Course of Action',
      'Value Stream',
      'Business Actor',
      'Business Role',
      'Business Collaboration',
      'Outcome',
      'Goal',
      'Value',
      'Grouping',
    ],
    relationships: ['composition', 'aggregation', 'realization', 'association', 'specialization', 'serving'],
    guidance:
      'A capability is realised by resources, a course of action is realised by capabilities, and a ' +
      'value stream stages the outcomes the strategy promises.',
  },
  {
    id: 'capability-map',
    name: 'Capability Map',
    concern: 'What can the organisation do, and at which maturity?',
    stakeholders: ['Enterprise Architect', 'Portfolio Manager', 'Sponsor'],
    framework: 'archimate',
    phase: null,
    elements: ['Capability', 'Resource', 'Business Actor', 'Business Role', 'Grouping', 'Outcome', 'Value'],
    relationships: ['composition', 'aggregation', 'realization', 'specialization'],
    guidance:
      'Use grouping bands as capability levels (level 1 → level 3) and keep relations to composition ' +
      'and aggregation so the map stays readable.',
  },
  {
    id: 'outcome-realization',
    name: 'Outcome Realization',
    concern: 'Which outcomes and values are produced by the strategy?',
    stakeholders: ['Enterprise Architect', 'Sponsor'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Outcome',
      'Value',
      'Goal',
      'Capability',
      'Course of Action',
      'Resource',
      'Value Stream',
      'Grouping',
    ],
    relationships: ['realization', 'aggregation', 'association', 'influence'],
    guidance: 'State measurable outcomes; tie each one to the capability or course of action producing it.',
  },
  {
    id: 'resource-map',
    name: 'Resource Map',
    concern: 'Which resources underpin which capabilities?',
    stakeholders: ['Enterprise Architect', 'Portfolio Manager'],
    framework: 'archimate',
    phase: null,
    elements: ['Resource', 'Capability', 'Course of Action', 'Value Stream', 'Business Actor', 'Grouping'],
    relationships: ['composition', 'aggregation', 'realization', 'access'],
    guidance: 'Group resources by type (human, financial, information, physical) and map them to capabilities.',
  },
  {
    id: 'value-stream',
    name: 'Value Stream',
    concern: 'How does value flow from trigger to customer outcome?',
    stakeholders: ['Business Architect', 'Product Owner', 'Sponsor'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Value Stream',
      'Capability',
      'Course of Action',
      'Business Service',
      'Business Process',
      'Business Actor',
      'Business Role',
      'Value',
      'Outcome',
      'Grouping',
    ],
    relationships: ['triggering', 'flow', 'composition', 'aggregation', 'realization', 'serving'],
    guidance:
      'One lane per value stream stage; each stage is assigned the capability that performs it and ' +
      'the service it delivers.',
  },
  {
    id: 'physical',
    name: 'Physical',
    concern: 'Which physical equipment, facilities and materials matter?',
    stakeholders: ['Technology Architect', 'Facilities Manager'],
    framework: 'archimate',
    phase: null,
    elements: ['Equipment', 'Facility', 'Distribution Network', 'Material', 'Location', 'Path', 'Grouping'],
    relationships: ['composition', 'aggregation', 'association', 'flow', 'access', 'serving'],
    guidance: 'Model the physical world separately from the logical technology layer, joined by serving.',
  },
  {
    id: 'stakeholder',
    name: 'Stakeholder',
    concern: 'Who has an interest in the architecture and what do they want from it?',
    stakeholders: ['Enterprise Architect', 'Sponsor', 'Architecture Board'],
    framework: 'archimate',
    phase: null,
    elements: [
      'Stakeholder',
      'Driver',
      'Assessment',
      'Goal',
      'Outcome',
      'Value',
      'Requirement',
      'Constraint',
      'Principle',
      'Grouping',
    ],
    relationships: ['association', 'influence', 'realization', 'aggregation'],
    guidance: 'A stakeholder node per role, with its drivers and the assessments that quantify them.',
  },
  {
    id: 'layered',
    name: 'Layered',
    concern: 'How do the three service layers stack up end to end?',
    stakeholders: ['Enterprise Architect', 'Solution Architect'],
    framework: 'archimate',
    phase: null,
    elements: [],
    layers: ALL_LAYERS,
    relationships: ['serving', 'realization', 'composition', 'aggregation', 'flow', 'access'],
    guidance:
      'One band per layer, services on the seams: business serves the customer, application serves ' +
      'the business, technology serves the application.',
  },
];

/**
 * TOGAF ADM viewpoints: which standard view each phase is normally expected to produce. Phase ids
 * match `TOGAF_PROFILE.phases`.
 */
export const TOGAF_VIEWPOINTS: Viewpoint[] = [
  {
    id: 'togaf-preliminary-principles',
    name: 'Architecture Principles',
    concern: 'Which principles and governance rules bind the architecture?',
    stakeholders: ['Architecture Board', 'Chief Architect'],
    framework: 'togaf',
    phase: 'preliminary',
    elements: ['Principle', 'Requirement', 'Constraint', 'Goal', 'Driver', 'Stakeholder', 'Grouping'],
    relationships: ['realization', 'influence', 'association', 'aggregation'],
    guidance: 'Import the framework principles as Principle elements and show the driver behind each one.',
  },
  {
    id: 'togaf-a-stakeholder-map',
    name: 'Stakeholder Map',
    concern: 'Who cares about the architecture and what are their concerns?',
    stakeholders: ['Architecture Board', 'Sponsor'],
    framework: 'togaf',
    phase: 'a',
    elements: ['Stakeholder', 'Driver', 'Assessment', 'Goal', 'Outcome', 'Value', 'Grouping'],
    relationships: ['association', 'influence', 'realization'],
    guidance: 'One stakeholder per role with its concerns recorded in the element documentation.',
  },
  {
    id: 'togaf-a-motivation',
    name: 'Motivation Overview',
    concern: 'Why is this architecture effort justified?',
    stakeholders: ['Sponsor', 'Enterprise Architect'],
    framework: 'togaf',
    phase: 'a',
    elements: [],
    layers: ['Motivation'],
    relationships: ['association', 'influence', 'realization', 'aggregation'],
    guidance: 'Keep this view short: two or three drivers, the assessments behind them, the goals.',
  },
  {
    id: 'togaf-b-business-architecture',
    name: 'Business Architecture',
    concern: 'How does the business operate today and how should it operate?',
    stakeholders: ['Business Architect', 'Process Owner'],
    framework: 'togaf',
    phase: 'b',
    elements: [
      'Business Actor',
      'Business Role',
      'Business Collaboration',
      'Business Process',
      'Business Function',
      'Business Interaction',
      'Business Event',
      'Business Service',
      'Business Object',
      'Product',
      'Value Stream',
      'Capability',
      'Course of Action',
      'Location',
      'Grouping',
    ],
    relationships: ['composition', 'aggregation', 'assignment', 'flow', 'triggering', 'serving', 'access', 'realization'],
    guidance:
      'Cover structure, behaviour and value: organisation chart, process landscape, value streams and ' +
      'the products they deliver.',
  },
  {
    id: 'togaf-b-business-service-catalogue',
    name: 'Business Service Catalogue',
    concern: 'Which business services exist and who owns them?',
    stakeholders: ['Business Architect', 'Service Owner'],
    framework: 'togaf',
    phase: 'b',
    elements: ['Business Service', 'Business Actor', 'Business Role', 'Business Process', 'Grouping'],
    relationships: ['realization', 'assignment', 'composition', 'serving'],
    guidance: 'A catalogue view: one row per service, owner in the element properties.',
  },
  {
    id: 'togaf-c-information-systems',
    name: 'Information Systems Architecture',
    concern: 'Which applications and data support the business services?',
    stakeholders: ['Application Architect', 'Data Architect'],
    framework: 'togaf',
    phase: 'c',
    elements: [],
    layers: ['Application'],
    relationships: ['composition', 'aggregation', 'serving', 'realization', 'access', 'flow', 'triggering'],
    guidance: 'Split data from application concerns: data objects on one band, application services on the other.',
  },
  {
    id: 'togaf-c-application-communication',
    name: 'Application Communication',
    concern: 'Which applications exchange which data, and over which interfaces?',
    stakeholders: ['Application Architect', 'Integration Architect'],
    framework: 'togaf',
    phase: 'c',
    elements: [
      'Application Component',
      'Application Collaboration',
      'Application Interface',
      'Application Service',
      'Application Function',
      'Application Process',
      'Data Object',
    ],
    relationships: ['flow', 'serving', 'triggering', 'access', 'composition', 'aggregation', 'realization'],
    guidance: 'Every connection is an interface plus a flow; label the flow with the data object carried.',
  },
  {
    id: 'togaf-c-data-entity-relationship',
    name: 'Data Entity Relationship',
    concern: 'Which business data entities exist and how do they relate?',
    stakeholders: ['Data Architect', 'Information Manager'],
    framework: 'togaf',
    phase: 'c',
    elements: ['Data Object', 'Business Object', 'Representation', 'Meaning', 'Grouping'],
    relationships: ['composition', 'aggregation', 'association', 'specialization', 'access'],
    guidance: 'Entity-relationship style: data objects joined by association, composition for owned parts.',
  },
  {
    id: 'togaf-d-technology-architecture',
    name: 'Technology Architecture',
    concern: 'Which platforms, networks and infrastructure realise the applications?',
    stakeholders: ['Technology Architect', 'Infrastructure Engineer'],
    framework: 'togaf',
    phase: 'd',
    elements: [],
    layers: ['Tech & Physical', 'Physical'],
    relationships: ['composition', 'aggregation', 'serving', 'realization', 'assignment', 'flow'],
    guidance: 'Hosting hierarchy first, then the technology services the application layer consumes.',
  },
  {
    id: 'togaf-d-environments-locations',
    name: 'Environments and Locations',
    concern: 'Where does the architecture run, and across which environments?',
    stakeholders: ['Technology Architect', 'Operations'],
    framework: 'togaf',
    phase: 'd',
    elements: ['Location', 'Technology Node', 'Technology Device', 'System Software', 'Technology Service', 'Grouping'],
    relationships: ['composition', 'aggregation', 'assignment', 'serving', 'association'],
    guidance: 'A location band per site or environment; nodes inside, services on the seam.',
  },
  {
    id: 'togaf-e-opportunities-solutions',
    name: 'Opportunities and Solutions',
    concern: 'Which work packages close which gaps?',
    stakeholders: ['Programme Manager', 'Enterprise Architect'],
    framework: 'togaf',
    phase: 'e',
    elements: ['Work Package', 'Deliverable', 'Gap', 'Plateau', 'Capability', 'Course of Action', 'Grouping'],
    relationships: ['realization', 'triggering', 'composition', 'aggregation', 'association'],
    guidance: 'Group work packages by capability; each one closes a named gap and produces a deliverable.',
  },
  {
    id: 'togaf-f-g-migration',
    name: 'Migration Planning',
    concern: 'In which order does the transition happen?',
    stakeholders: ['Programme Manager', 'Portfolio Manager'],
    framework: 'togaf',
    phase: 'f',
    elements: ['Work Package', 'Deliverable', 'Plateau', 'Implementation Event', 'Gap', 'Grouping'],
    relationships: ['triggering', 'composition', 'aggregation', 'realization'],
    guidance: 'Plateaus left to right, work packages above the transition they deliver, triggering between them.',
  },
  {
    id: 'togaf-h-change-requests',
    name: 'Architecture Change',
    concern: 'Which requirements drive the next architecture change?',
    stakeholders: ['Architecture Board', 'Chief Architect'],
    framework: 'togaf',
    phase: 'h',
    elements: ['Requirement', 'Constraint', 'Goal', 'Driver', 'Assessment', 'Plateau', 'Grouping'],
    relationships: ['realization', 'association', 'influence', 'triggering'],
    guidance: 'Each change request is a Requirement linked to the driver that raised it and the plateau it targets.',
  },
  {
    id: 'togaf-requirements',
    name: 'Requirements Realization',
    concern: 'Which elements satisfy each requirement across the whole ADM?',
    stakeholders: ['Enterprise Architect', 'Architecture Board'],
    framework: 'togaf',
    phase: 'requirements',
    elements: [
      'Requirement',
      'Constraint',
      'Goal',
      'Outcome',
      'Deliverable',
      'Work Package',
      'Business Actor',
      'Business Role',
      'Business Process',
      'Business Service',
      'Application Component',
      'Application Service',
      'Technology Node',
      'Technology Service',
      'Grouping',
    ],
    relationships: ['realization', 'association', 'composition', 'aggregation', 'influence'],
    guidance: 'Requirements management is continuous: reuse the same requirement elements across phases.',
  },
];

/**
 * MyGovEA views. Phase ids match the five methodology phases (`permulaan`, `penilaian`,
 * `penakrifan`, `pelaksanaan`, `pemantauan`) that `MYGOVEA_PROFILE` owns.
 */
export const MYGOVEA_VIEWPOINTS: Viewpoint[] = [
  {
    id: 'mygovea-ea-blueprint',
    name: 'EA Blueprint',
    concern: 'What is the whole-of-agency architecture, expressed across the BDAT domains?',
    stakeholders: ['Chief Information Officer', 'Enterprise Architect', 'Agency Architecture Team'],
    framework: 'mygovea',
    phase: 'penakrifan',
    elements: [],
    layers: ALL_LAYERS,
    relationships: ['serving', 'realization', 'composition', 'aggregation', 'flow', 'access', 'assignment'],
    guidance:
      'The agency blueprint: one band per BDAT domain (Perkhidmatan, Data, Aplikasi, Teknologi) with ' +
      'the cross-cutting Umum elements in a separate group.',
  },
  {
    id: 'mygovea-domain-architecture',
    name: 'Domain Architecture',
    concern: 'What does one BDAT domain contain, and how does it serve the others?',
    stakeholders: ['Domain Architect', 'Agency Architecture Team'],
    framework: 'mygovea',
    phase: 'penakrifan',
    elements: [],
    layers: ['Business', 'Application', 'Tech & Physical', 'Physical', 'Motivation'],
    relationships: ['composition', 'aggregation', 'serving', 'realization', 'access', 'flow', 'assignment'],
    guidance:
      'Scope to a single domain. Tag every element with its `domain` property so the catalogue and the ' +
      'matrix can be filtered by Perkhidmatan, Data, Aplikasi, Teknologi or Umum.',
  },
  {
    id: 'mygovea-service-architecture',
    name: 'Service Architecture',
    concern: 'Which services are delivered, to which channel, and on which applications and data?',
    stakeholders: ['Service Owner', 'Business Architect', 'Agency PMO'],
    framework: 'mygovea',
    phase: 'penakrifan',
    elements: [
      'Business Service',
      'Business Process',
      'Business Actor',
      'Business Role',
      'Business Object',
      'Application Service',
      'Application Component',
      'Application Interface',
      'Data Object',
      'Technology Service',
      'Grouping',
    ],
    relationships: ['serving', 'realization', 'flow', 'access', 'composition', 'aggregation'],
    guidance:
      'One lane per service; record the channel (G2G / G2C / G2B / G2E) and whether the service uses ' +
      'a national data object (IDN, MyCoID, MyPesona, MyPerniagaan) in the element properties.',
  },
  {
    id: 'mygovea-implementation',
    name: 'Implementation Plan',
    concern: 'Which projects deliver the target architecture, and in which phase?',
    stakeholders: ['Agency PMO', 'Programme Manager', 'Agency Change Management Office'],
    framework: 'mygovea',
    phase: 'pelaksanaan',
    elements: ['Work Package', 'Deliverable', 'Plateau', 'Implementation Event', 'Gap', 'Capability', 'Grouping'],
    relationships: ['realization', 'triggering', 'composition', 'aggregation'],
    guidance: 'Group by programme; each work package names the delivering agency in its properties.',
  },
  {
    id: 'mygovea-monitoring',
    name: 'Compliance and Monitoring',
    concern: 'Is the architecture complying with the MyGovEA principles and reference models?',
    stakeholders: ['Agency Architecture Team', 'Enterprise Architect'],
    framework: 'mygovea',
    phase: 'pemantauan',
    elements: ['Principle', 'Requirement', 'Constraint', 'Goal', 'Assessment', 'Business Service', 'Grouping'],
    relationships: ['realization', 'association', 'influence', 'aggregation'],
    guidance:
      'One Principle element per MyGovEA principle, linked to the service or application assessed ' +
      'against it. Record the compliance finding in the element documentation.',
  },
];

/** Every viewpoint, in catalogue order. */
export const VIEWPOINTS: Viewpoint[] = [
  ...ARCHIMATE_VIEWPOINTS,
  ...TOGAF_VIEWPOINTS,
  ...MYGOVEA_VIEWPOINTS,
];

const VIEWPOINT_BY_ID = new Map<string, Viewpoint>(VIEWPOINTS.map((viewpoint) => [viewpoint.id, viewpoint]));

export function viewpointById(id: string | null | undefined): Viewpoint | undefined {
  return id ? VIEWPOINT_BY_ID.get(id) : undefined;
}

/** Viewpoints offered for a project's framework, always including the framework-neutral ArchiMate set. */
export function viewpointsForFramework(framework: FrameworkId | 'archimate' | string | null | undefined): Viewpoint[] {
  if (framework === 'archimate') return ARCHIMATE_VIEWPOINTS;
  return VIEWPOINTS.filter((viewpoint) => viewpoint.framework === 'archimate' || viewpoint.framework === framework);
}

export function viewpointsForPhase(phase: string | null | undefined): Viewpoint[] {
  return phase ? VIEWPOINTS.filter((viewpoint) => viewpoint.phase === phase) : [];
}

const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Whether a viewpoint admits an element, either by name or because its layer is admitted. */
export function viewpointAdmits(viewpoint: Viewpoint, label: string, layer: ArchimateLayer | string): boolean {
  if (viewpoint.layers?.includes(layer as ArchimateLayer)) return true;
  const needle = squash(label);
  return viewpoint.elements.some((element) => squash(element) === needle);
}

/** Whether a relationship type is meaningful inside a viewpoint. */
export function viewpointUsesRelationship(viewpoint: Viewpoint, type: string): boolean {
  return viewpoint.relationships.some((allowed) => allowed === type);
}
