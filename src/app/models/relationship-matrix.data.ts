/**
 * ArchiMate 3.2 permitted-relationship matrix, transcribed from Archi's own model data
 * (`com.archimatetool.model/model/relationships.xml` in archimatetool/archi), which
 * implements ArchiMate 3.2 Appendix B. Each row is one source concept and each column is
 * one target concept, both in `MATRIX_CONCEPTS` order; a `.` means no relationship of any
 * kind may exist between the pair, otherwise the character indexes `MATRIX_MASKS`.
 *
 * Archi marks every entry as derivation-level, so a present mask means the relationship is
 * permitted rather than that the modeller must draw it.
 * Generated from the Archi repository; edit the generator, not this file.
 */

export const MATRIX_CONCEPTS: readonly string[] = [
  'ApplicationCollaboration', 'ApplicationComponent', 'ApplicationEvent', 'ApplicationFunction',
  'ApplicationInteraction', 'ApplicationInterface', 'ApplicationProcess', 'ApplicationService',
  'Artifact', 'Assessment', 'BusinessActor', 'BusinessCollaboration',
  'BusinessEvent', 'BusinessFunction', 'BusinessInteraction', 'BusinessInterface',
  'BusinessObject', 'BusinessProcess', 'BusinessRole', 'BusinessService',
  'Capability', 'CommunicationNetwork', 'Constraint', 'Contract',
  'CourseOfAction', 'DataObject', 'Deliverable', 'Device',
  'DistributionNetwork', 'Driver', 'Equipment', 'Facility',
  'Gap', 'Goal', 'Grouping', 'ImplementationEvent',
  'Junction', 'Location', 'Material', 'Meaning',
  'Node', 'Outcome', 'Path', 'Plateau',
  'Principle', 'Product', 'Relationship', 'Representation',
  'Requirement', 'Resource', 'Stakeholder', 'SystemSoftware',
  'TechnologyCollaboration', 'TechnologyEvent', 'TechnologyFunction', 'TechnologyInteraction',
  'TechnologyInterface', 'TechnologyProcess', 'TechnologyService', 'Value',
  'ValueStream', 'WorkPackage',
];

/** Key letters Archi uses, in the order the letters appear inside a mask. */
export const MATRIX_KEYS = 'acfginorstv';

export const MATRIX_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

/** Every distinct set of permitted relationship letters in the matrix. */
export const MATRIX_MASKS: readonly string[] = [
  '', 'acfginorst', 'acfginorstv', 'acfgnorst', 'acfgnorstv', 'acfgnost', 'acgio', 'acgiors',
  'acgo', 'acgors', 'afinortv', 'aio', 'aior', 'ao', 'aor', 'cfginorstv',
  'cfgiorstv', 'cfgiortv', 'cfgiost', 'cfgiostv', 'cfgiotv', 'cfgnorstv', 'cfgorst', 'cfgorstv',
  'cfgortv', 'cfgost', 'cfgostv', 'cfgotv', 'cginor', 'cginors', 'cgio', 'cgno',
  'cgnor', 'cgnors', 'cgnos', 'cgo', 'cgor', 'cgors', 'cgos', 'fgiortv',
  'fgiotv', 'fgortv', 'fgotv', 'fiortv', 'fiot', 'fiotv', 'fort', 'fortv',
  'fot', 'fotv', 'ino', 'inor', 'io', 'no', 'nor', 'o',
  'or',
];

export const MATRIX_ROWS: readonly string[] = [
  'QfhhhOhhDrnnllllDlnlunsDuDtnnrnnts2t2nDrnsntsntDsurnnnnnnnnrut', // ApplicationCollaboration
  'nNhhhOhhDrnnllllDlnlunsDuDtnnrnnts2t2nDrnsntsntDsurnnnnnnnnrut', // ApplicationComponent
  'nnQnnnnnDrnnlnnnDnnntnsDtDtnnrnnts4t2nDrnsntsntDstrnnnnnnnnrtt', // ApplicationEvent
  'nnnQRnRlDrnnnllnDlnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnnnnnnrut', // ApplicationFunction
  'nnnRQnRlDrnnnllnDlnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnnnnnnrut', // ApplicationInteraction
  'nnnnnQnjDrnnnnnlDnnlunsDuDtnnrnnts2t2nDrnsntsntDsurnnnnnnnnrut', // ApplicationInterface
  'nnnRRnQlDrnnnllnDlnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnnnnnnrut', // ApplicationProcess
  'nnnnnnnQDrnnnnnnDnnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnnnnnnrut', // ApplicationService
  'uuuuuuuubrttuuuuuutuutsuuutttrtttsXt2ttrtsttstttsurutuuuuuurut', // Artifact
  'tttttttttYttttttttttttrttttttrtttrYt2ttrtrttrtttrtrttttttttrtt', // Assessment
  'nnnnnnnnDrQnjjjKDjjhunsDuDtnnrnnts2q2nDrnsntsntDsuonnnnnnnnruq', // BusinessActor
  'nnnnnnnnDrgQjjjKDjehunsDuDtnnrnnts2q2nDrnsntsntDsuonnnnnnnnruq', // BusinessCollaboration
  'nnnnnnnnDrnnQnnnDnnntnsDtDtnnrnnts4t2nDrnsntsntDstrnnnnnnnnrtt', // BusinessEvent
  'nnnnnnnnDrnnnQRnDRnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnnnnnnrut', // BusinessFunction
  'nnnnnnnnDrnnnRQnDRnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnnnnnnrut', // BusinessInteraction
  'nnnnnnnnDrnnnnnQDnnjunsDuDtnnrnnts2t2nDrnsntsntDsurnnnnnnnnrut', // BusinessInterface
  'tttttttttrttttttctttutscuttttrtttsXt2ttrtsttstttsurttttttttrut', // BusinessObject
  'nnnnnnnnDrnnnRRnDQnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnnnnnnrut', // BusinessProcess
  'nnnnnnnnDrnnjjjRDjQhunsDuDtnnrnnts2q2nDrnsntsntDsuonnnnnnnnruq', // BusinessRole
  'nnnnnnnnDrnnnnnnDnnQunsDuDtnnrnnts4t2nDrnsntsntDstrnnnnnnnnrut', // BusinessService
  'tttttttttrttttttttttQtstlttttrtttsLt2ttrtsttstttsnrttttttttrnt', // Capability
  'llllllllBrllllllDllluQsDuDtfnrllts2t2nDrlsltsntDsusdlhhhdhhrut', // CommunicationNetwork
  'tttttttttrttttttttttttYttttttrtttsXt2ttrtsttstttYtrttttttttrtt', // Constraint
  'tttttttttrttttttctttutscuttttrtttsXt2ttrtsttstttsurttttttttrut', // Contract
  'tttttttttrttttttttttntstQttttrtttsLt2ttrtsttstttsnrttttttttrnt', // CourseOfAction
  'tttttttttrttttttutttutsuuctttrtttsXt2ttrtsttstttsurttttttttrut', // DataObject
  'uuuuuuuuuruuuuuuuuuuuusuuucuuruutsXt2uurusuusutususuuuuuuuurut', // Deliverable
  'llllllllBrnnllllDlnlunsDuDtQnrnnts2t2nDrnsntsntDsurHnhhhHhhrut', // Device
  'llllllllBrhhhhhhDhhhunsDuDtdQrddts2q2nBrdsltsntDsupdlhhhdhhruq', // DistributionNetwork
  'tttttttttrttttttttttttrttttttYtttrYt2ttrtrttrtttrtrttttttttrtt', // Driver
  'llllllllBrnnllllDlnlunsDuDtOnrNnts2t2nBrnsntsntDsurHnhhhHhhrut', // Equipment
  'llllllllBrjjhhhhDhjhunsDuDtHnrHJts2q2nBrKsntsntDsuoHnhhhHhhruq', // Facility
  'ttttttttttttttttttttttttttttttttctct2ttttttttttttttttttttttttt', // Gap
  'tttttttttrttttttttttttrttttttrtttYYt2ttrtrttrtttrtrttttttttrtt', // Goal
  'NNGGGNGG7YGGGGGG9GGGGNX9N99GNYGGcX2I2N7YGXNMXNZ9XNTGNGGGGGGYGI', // Grouping
  'tttttttttrttttttttttttrtttDttrtttr5P2ttrtrtmrtttrtrttttttttrtm', // ImplementationEvent
  'llhhhlhhCrhhhhhhEhhhhlsElEEhlrhhtsAi2lCrhslksl0Eslphlhhhhhhrhi', // Junction
  'OOHHHOHH6VHHHHHH8HHHaRW8a8ZHRVHHZW2U2Q6VHWOZWRZ8WaSHOHHHHHHVaU', // Location
  'uuuuuuuuurttuuuuuutuutsuuututruttsXt2tbrtsttstttsurutuuuuuurut', // Material
  'tttttttttrttttttttttttrttttttrtttrYt2ttYtrttrtttrtrttttttttrtt', // Meaning
  'llllllllBrjjhhhhDhjhunsDuDtHnrHKts2q2nBrJsntsntDsuoHnhhhHhhruq', // Node
  'tttttttttrttttttttttttrttttttrtttsXt2ttrtYttrtttrtrttttttttrtt', // Outcome
  'llllllllBrjjhhhhDhjhunsDuDtdnrdets2q2nBresQtsntDsuodghhhdhhruq', // Path
  'aaaaaaaaaraaaaaaaaaaaaWaaaDaaraatW1m2aaraWaPsaZaWapaaaaaaaaram', // Plateau
  'tttttttttrttttttttttttrttttttrtttsXt2ttrtsttYtttrtrttttttttrtt', // Principle
  'lllllllO8rnnllll8lnOuns8u8tlnrlnts4t2n8rnsntsQt8surlnlllllOrut', // Product
  'tttttttttttttttttttttttttttttttttttt0ttttttttt0ttttttttttttttt', // Relationship
  'tttttttttrttttttutttutsuuttttrtttsXt2ttrtsttsttcsurttttttttrut', // Representation
  'tttttttttrttttttttttttYttttttrtttsXt2ttrtsttstttYtrttttttttrtt', // Requirement
  'tttttttttrttttttttttjtstlttttrtttsFt2ttrtsttstttsQrttttttttrjt', // Resource
  'tttttttttrttttttttttttrttttttrtttrYt2ttrtrttrtttrtYttttttttrtt', // Stakeholder
  'llllllllBrnnllllDlnlunsDuDtnnrnnts2t2nDrnsntsntDsurGnhhhHhhrut', // SystemSoftware
  'llllllllBrjjhhhhDhjhunsDuDtdnrdets2q2nBresntsntDsuodQhhhHhhruq', // TechnologyCollaboration
  'nnlnnnnnDrnnlnnnDnnntnsDtDtnnrnnts4t2nDrnsntsntDstrnnQnnnnnrtt', // TechnologyEvent
  'nnnllnllDrnnnllnDlnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnQRnRlrut', // TechnologyFunction
  'nnnllnllDrnnnllnDlnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnRQnRlrut', // TechnologyInteraction
  'nnnnnlnlDrnnnnnlDnnlunsDuDtnnrnnts2t2nDrnsntsntDsurnnnnnQnjrut', // TechnologyInterface
  'nnnllnllDrnnnllnDlnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnRRnQlrut', // TechnologyProcess
  'nnnnnnnlDrnnnnnnDnnlunsDuDtnnrnnts4t2nDrnsntsntDstrnnnnnnnQrut', // TechnologyService
  'tttttttttrttttttttttttrttttttrtttrYt2ttrtrttrtttrtrttttttttYtt', // Value
  'tttttttttrttttttttttntstlttttrtttsLt2ttrtsttstttsnrttttttttrQt', // ValueStream
  'uuuuuuuuuruuuuuuuuuuuusuuuEuuruuts3m2uurusuksutususuuuuuuuuruP', // WorkPackage
];
