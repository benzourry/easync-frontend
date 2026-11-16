/**
 * MyGovEA — the Malaysian Government Enterprise Architecture framework.
 *
 * The profile is populated from the official JDN sources (MyGovEA Master Plan
 * and the MyGovEA portal). Content is added progressively; `mygovea-content`
 * fills phases, domains, principles and reference models from the verified
 * source material.
 */

import type { FrameworkProfile } from '../models/framework.models';

export const MYGOVEA_PROFILE: FrameworkProfile = {
  id: 'mygovea',
  name: 'Malaysian Government Enterprise Architecture',
  shortName: 'MyGovEA',
  mandate: 'PKPA Bil. 1/2020 dan MyGovEA Master Plan',
  source: {
    url: 'https://mygovea.jdn.gov.my/',
    verified: true,
    note: 'Mandate, BDAT domains, methodology phases, reference models and the twelve principles are taken from the official MyGovEA portal and principles diagram.',
  },
  defaultLayers: [
    'Motivation',
    'Strategy',
    'Business',
    'Application',
    'Tech & Physical',
    'Physical',
    'Implementation',
  ],
  phases: [],
  domains: [],
  principles: [],
  levels: [],
  referenceModels: [],
  roles: [],
  artifacts: [],
};
