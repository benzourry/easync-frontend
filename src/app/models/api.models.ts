import type { ViewSnapshot } from './diagram.models';

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
  joinedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string | null;
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
}

export interface SaveDiagramRequest {
  version: number;
  views: DiagramViewDto[];
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
