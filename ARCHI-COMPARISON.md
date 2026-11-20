# EAsync and Archi Feature Comparison

## Overall Assessment

**Estimated functional coverage: approximately 68% of Archi's core ArchiMate modelling functionality.**

This is a **product-category estimate**, not a benchmark score:

- Based on approximately 21 comparable capabilities.
- **Full match = 1**, **partial match = 0.5**, **missing = 0**.
- Optional paid/third-party plugins are treated separately.
- Archi's advanced ecosystem is broad, while EAsync is more focused on browser collaboration and modelling governance.

| Coverage level | Capabilities |
|---|---|
| Full | 11-12 |
| Partial | 5-6 |
| Missing | 4-5 |
| **Estimated coverage** | **65-70%** |

## Evidence Sources

- EAsync manual: [USER-MANUAL.md](USER-MANUAL.md)
- ArchiMate palette: [archimate.models.ts](src/app/models/archimate.models.ts)
- ArchiMate import: [archimate-import.service.ts](src/app/services/archimate-import.service.ts)
- ArchiMate export: [archimate-export.service.ts](src/app/services/archimate-export.service.ts)
- Archi official overview: [archimatetool.com](https://www.archimatetool.com/)
- Archi plugins and ecosystem: [Archi Plug-ins](https://www.archimatetool.com/plugins/)

## Detailed Side-by-Side Comparison

| Capability | EAsync | Archi | Status | Assessment |
|---|---|---|---|---|
| ArchiMate 3.2 elements | Complete palette across all standard layers | Complete ArchiMate 3.2 palette | Full | Both support standard elements and connectors |
| ArchiMate relationship types | 11 standard relationship types | Full ArchiMate relationship support | Full | EAsync does not cover every advanced relationship presentation option |
| Magic connector | Context-aware relationship suggestions | Magic Connector | Full | Similar core idea |
| Diagram editing | Add, move, resize, copy, paste, delete, undo, redo | Mature desktop diagram editor | Full | EAsync is less mature but covers normal editing |
| Bendpoints | Insert, move and remove bendpoints | Advanced connection routing and bendpoints | Partial | Basic routing is present; fewer routing/layout controls |
| Element nesting | Containers, composition and collapse/expand | Advanced nested objects and groups | Full | Core nesting is well covered |
| Z-order | Bring to front and send to back | Bring to front/back and complex object stacking | Partial | Basic support only |
| Rubber-band selection | Multi-object selection | Multi-object selection | Full | Covered |
| Keyboard operation | Common editing and AI shortcuts | Extensive desktop shortcuts | Partial | EAsync has fewer shortcuts |
| Shared model repository | Elements shared between views | Model Tree and repository | Partial | EAsync has repository and explorer views but lacks Archi's complete model-tree structure |
| Multiple views | Diagram, catalogue and matrix views | Multiple ArchiMate views | Full | EAsync extends the concept with catalogue/matrix views |
| Viewpoints | 22 ArchiMate, 14 TOGAF and 5 MyGovEA | Built-in standard ArchiMate viewpoints | Full | EAsync viewpoint count is broader and framework-aware |
| Element metadata | Domain, plateau, lifecycle, owner, reference and custom properties | Properties, documentation and user properties | Full | Import/export of every property is not complete |
| Relationship metadata | Name, type and view representation | Name, documentation, properties and relationship styling | Partial | EAsync is less detailed |
| Model documentation | Limited element documentation support | Rich documentation and property editor | Partial | EAsync's properties are usable but less comprehensive |
| Hints/help | Viewpoint descriptions and magic choices | Dedicated Hints view for elements, relationships and viewpoints | Partial | EAsync has contextual help but no comparable reference view |
| Model Visualiser | Not available | Radial relationship visualisation | Missing | Significant modelling-analysis gap |
| Navigator | Not available | Model Navigator for hierarchical exploration | Missing | Significant navigation gap |
| Sketch View | Not available | Stickies and sketch modelling | Missing | Only formal ArchiMate modelling is supported |
| Canvas Modelling Toolkit | Not available | Canvas templates and canvas models | Missing | EAsync has no reusable canvas toolkit |
| ArchiMate exchange import | Imports `.archimate`/XML and visual views | Native Open Exchange import | Partial | Bounded to common elements, views, relationships and geometry |
| ArchiMate exchange export | Exports elements, relationships and diagram views | Mature native Open Exchange export | Partial | EAsync export does not preserve full styles, properties or every Archi feature |
| PNG export | 2x PNG of active view | PNG export and high-quality rendering options | Full | Core export is covered |
| SVG export | SVG export | SVG/vector export | Full | Basic vector export is covered |
| Image export quality | Browser/Fabric rendering | Mature Eclipse rendering engine | Partial | Advanced print and presentation settings are not covered |
| Model validation | Continuous ArchiMate relationship validation | Relationship and model validation may rely on tools/plugins | Full | EAsync gives it a prominent integrated workflow |
| Validation reporting | CSV validation report | Plugin-dependent or external reporting | Full for EAsync, stronger in EAsync | EAsync has a direct export workflow |
| Catalogue | Searchable, sortable and exportable table | Available through plugins/tools such as Archi Export to Excel | Full for EAsync | EAsync has this natively |
| Matrix | Layer-by-layer relationship matrix | Primarily achieved by plugins or external tools | Full for EAsync | EAsync has native matrix analysis |
| Plateau/gap analysis | Baseline -> transition -> target and work-package grouping | May use plugins or manual migration modelling | Extra in EAsync | Not native core Archi functionality |
| TOGAF integration | ADM phases and viewpoint mappings | Compatible with TOGAF but requires project conventions/plugins | Extra in EAsync | EAsync provides tighter built-in integration |
| MyGovEA | MyGovEA viewpoints and framework | Not a standard Archi core feature | Extra in EAsync | Strong Malaysian-government context |
| Collaboration | Project membership, roles and server autosave | coArchi plugin provides Git collaboration | Full conceptually, different implementation | EAsync is server-managed; coArchi is Git-based |
| Conflict handling | Save conflicts with reload/overwrite options | Depends on coArchi/Git or local working conventions | Partial | EAsync handles save conflict; less powerful than Git history |
| Version history | Automatic revisions and named snapshots | Core/local history may be limited; coArchi supplies Git history | Partial | EAsync has a more visible snapshot workflow |
| Desktop availability | Browser only | Windows, macOS and Linux desktop | Different | EAsync has deployment and browser advantages |
| Accessibility | English/BM UI and accessibility-oriented controls | Desktop accessibility depends on Eclipse and platform | Partial | EAsync is stronger for responsive browser use |
| AI modelling assistant | Prompt review and apply workflow | Not an official core feature | Extra in EAsync | Archi would require an external plugin or workflow |
| JavaScript scripting | Not available | jArchi scripting plugin | Missing | Major automation difference |
| Git collaboration | Not available | coArchi/coArchi2 | Missing | Archi is stronger for branch-oriented model collaboration |
| Excel reporting | CSV export rather than native Excel | Archi Export to Excel plugin | Partial | Data export is covered, but Excel formatting is weaker |
| Print and publishing | PNG/SVG and browser presentation | Desktop print, export and publishing tools | Partial | EAsync lacks formal publishing/layout workflows |
| Plugin ecosystem | Not implemented | Large ecosystem of plugins | Missing | Archi is much more extensible |
| Offline operation | Requires API/network | Primarily local/offline desktop application | Different | Archi works better without network access |
| Cross-platform install | Runs in a modern browser | Native Windows/macOS/Linux | Full conceptually | EAsync avoids installation; Archi provides native performance |

## What EAsync Has That Archi Does Not Have as a Standard Core Feature

| EAsync advantage | Value |
|---|---|
| Browser-based architecture modelling | No desktop installation and easier institutional access |
| Server-side project and membership management | Owner/Editor/Viewer roles |
| Optimistic server autosave | Saves and conflict detection |
| Automatic revisions and named snapshots | Easy rollback of diagram state |
| Built-in catalogue view | Inventory and sortable metadata review |
| Built-in matrix view | Cross-layer relationship analysis |
| Plateau gap analysis | Baseline, transition and target change detection |
| Work-package grouping | Migration changes grouped by TOGAF phases |
| AI-assisted modelling | Generates and previews model operations before applying them |
| 41 focused viewpoints | ArchiMate, TOGAF and MyGovEA viewpoints |
| TOGAF ADM context | Links architecture artefacts and phases to the modelling workflow |
| MyGovEA support | Government EA practices and artefacts built into the product |
| Validation report export | Direct CSV validation report |
| English and Bahasa Malaysia UI | Suitable for Malaysian multi-language teams |
| Light/dark themes | Modern browser UX and display options |
| Responsive mobile/tablet controls | Archi's desktop UI is less suited to touch/mobile use |
| Central API deployment | Administrative control and organisation-wide browser access |
| Combined catalogue, matrix and diagram presentations | Three views over one shared model |

Some of these can be added to Archi through plugins or external workflows, but they are not standard core features of Archi.

## What Archi Has That EAsync Does Not Cover

| Missing or weak capability | Importance |
|---|---|
| Model Visualiser | High |
| Navigator | High |
| Sketch View | Medium |
| Canvas Modelling Toolkit | Medium |
| Complete model Tree/folder hierarchy | High |
| JavaScript scripting through jArchi | High |
| coArchi/coArchi2 Git collaboration | High |
| Archi plug-in ecosystem | High |
| Comprehensive print and publishing controls | Medium |
| Extensive desktop rendering and layout controls | High |
| Advanced diagram formatting and styles | High |
| Full property/documentation exchange fidelity | High |
| Native Excel reporting | Medium |
| Offline-first operation | Medium |
| Native Windows/macOS/Linux application | Medium |
| Dedicated Hints reference view | Medium |
| Mature import/export round-trip fidelity | High |
| Advanced relationship routing and layer management | Medium |
| Plugin-defined custom analysis and automation | High |

### Highest-impact missing areas

1. Archi Visualiser and Navigator
2. Full ArchiMate exchange round-trip fidelity
3. jArchi scripting
4. coArchi Git-based collaboration
5. Plugin ecosystem
6. Advanced desktop formatting and layout
7. Sketch and Canvas toolkits

## Simple Side-by-Side Summary

| Topic | EAsync | Archi |
|---|---|---|
| Overall purpose | Browser EA modelling and governance | Desktop ArchiMate modelling toolkit |
| Core ArchiMate modelling | Strong | Very strong |
| Diagram editing | Strong basic support | Mature and complete |
| Viewpoints | 41 viewpoints across 3 frameworks | Standard ArchiMate viewpoints |
| Collaboration | Server roles and save conflicts | coArchi plugin and Git |
| History | Revisions and named snapshots | Git/plugins or local history |
| Validation | Built-in and exportable | Limited/plugin-dependent |
| Catalogues | Built in | External/plugin workflow |
| Matrices | Built in | External/plugin workflow |
| Gap analysis | Built in | Not core |
| AI assistance | Built in | Not core |
| Automation | Not available | jArchi scripting |
| Visual analysis | No visualiser | Visualiser included |
| Sketching/canvas | Not available | Included |
| Import/export | Basic to strong `.archimate` support | Mature `.archimate` ecosystem |
| Reporting | PNG, SVG, CSV | PDF, images, Excel/plugins and exchange |
| Platform | Modern browser | Windows, macOS and Linux |
| Offline use | Limited | Strong |
| Extensibility | No plugin system | Strong plugin ecosystem |
| Estimated core coverage | Approximately 68% | Baseline 100% |

## Bottom Line

EAsync is a strong ArchiMate modelling product with distinctive browser collaboration, validation, catalogue/matrix, migration planning and AI capabilities. It replaces a large portion of normal Archi diagram-authoring workflows, but it is not yet as deep as Archi in model navigation, visualisation, exchange fidelity, scripting, Git collaboration or desktop publishing.
