import type { ViewContentType, ViewSnapshot } from './diagram.models';
import type { ArchimateLayer, RelationshipType } from './archimate.models';
import type { FrameworkId } from './framework.models';
import type { Plateau } from './model.models';

/** Shapes of the payloads exchanged with the EAsync Spring Boot backend. */

export type ProjectRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface UserDto {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  provider: string | null;
}

export interface TokenPair {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
  user: UserDto;
}

/** One OAuth provider advertised by `GET /api/auth/providers`. */
export interface AuthProvider {
  id: string;
  displayName: string;
  loginUrl: string;
}

export interface ProjectSummary {
  id: number;
  name: string;
  description: string | null;
  /** Framework profile id, e.g. `togaf`. */
  framework: FrameworkId;
  role: ProjectRole;
  ownerName: string | null;
  diagramCount: number;
  memberCount: number;
  updatedAt: string;
}

export interface MemberDto {
  userId: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: ProjectRole;
  /** True while the member is only an email invitation and has never signed in. */
  pending: boolean;
  joinedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
  framework?: FrameworkId;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string | null;
  framework?: FrameworkId;
}

export interface AddMemberRequest {
  email: string;
  role: Exclude<ProjectRole, 'OWNER'>;
}

export interface DiagramSummary {
  id: number;
  projectId: number;
  name: string;
  version: number;
  viewCount: number;
  lastModifiedBy: string | null;
  updatedAt: string;
}

export interface DiagramViewDto {
  viewKey: string;
  name: string;
  position: number;
  /** Viewpoint id from the catalogue; absent on views created before viewpoints existed. */
  viewpoint?: string | null;
  /** `diagram` (default), `catalogue` or `matrix`. */
  contentType?: ViewContentType | null;
  /** `baseline`, `target` or `transition`, when the view documents a plateau. */
  plateau?: Plateau | null;
  snapshot: ViewSnapshot;
}

export interface DiagramDto {
  id: number;
  projectId: number;
  name: string;
  version: number;
  lastModifiedBy: string | null;
  updatedAt: string;
  views: DiagramViewDto[];
  /** Present once the diagram has been saved with a model; older diagrams omit it. */
  elements?: ModelElementDto[] | null;
  relationships?: ModelRelationshipDto[] | null;
}

/** One element of a diagram's model, as stored by the server. */
export interface ModelElementDto {
  elementKey: string;
  name: string;
  archimateType: string;
  layer: ArchimateLayer;
  domain?: string | null;
  plateau?: string | null;
  lifecycleState?: string | null;
  referenceModel?: string | null;
  refCode?: string | null;
  classification?: string | null;
  owner?: string | null;
  documentation?: string | null;
  properties?: Record<string, string> | null;
}

/** A relationship between two model elements, addressed by element key. */
export interface ModelRelationshipDto {
  relationshipKey: string;
  type: RelationshipType;
  sourceKey: string;
  targetKey: string;
  name?: string | null;
  documentation?: string | null;
  properties?: Record<string, string> | null;
}

export interface SaveDiagramRequest {
  version: number;
  views: DiagramViewDto[];
  /** Omitted by clients that only edit the canvas; the server then leaves the model alone. */
  elements?: ModelElementDto[];
  relationships?: ModelRelationshipDto[];
  revisionLabel?: string;
}

export type RevisionKind = 'AUTO' | 'NAMED';

export interface RevisionSummary {
  id: number;
  version: number;
  label: string | null;
  kind: RevisionKind;
  createdBy: string | null;
  createdAt: string;
}

export interface RevisionDto extends RevisionSummary {
  document: {
    version: number;
    views: DiagramViewDto[];
    elements?: ModelElementDto[] | null;
    relationships?: ModelRelationshipDto[] | null;
  };
}

/** Body of every error returned by `GlobalExceptionHandler`. */
export interface ApiErrorBody {
  status: number;
  error: string;
  message: string;
  timestamp?: string;
  /** Present on `409 Conflict` responses caused by a stale diagram version. */
  code?: string;
  expectedVersion?: number;
  actualVersion?: number;
  fields?: Record<string, string>;
}
