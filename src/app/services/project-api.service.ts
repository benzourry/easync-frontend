import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';
import type {
  AddMemberRequest,
  CreateProjectRequest,
  DiagramDto,
  DiagramSummary,
  MemberDto,
  ProjectRole,
  ProjectSummary,
  UpdateProjectRequest,
} from '../models/api.models';

/** Thin typed wrapper over the project, member and project-diagram endpoints. */
@Service()
export class ProjectApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private get url(): string {
    return `${this.baseUrl}/api/projects`;
  }

  list(): Observable<ProjectSummary[]> {
    return this.http.get<ProjectSummary[]>(this.url);
  }

  get(projectId: number): Observable<ProjectSummary> {
    return this.http.get<ProjectSummary>(`${this.url}/${projectId}`);
  }

  create(request: CreateProjectRequest): Observable<ProjectSummary> {
    return this.http.post<ProjectSummary>(this.url, request);
  }

  update(projectId: number, request: UpdateProjectRequest): Observable<ProjectSummary> {
    return this.http.put<ProjectSummary>(`${this.url}/${projectId}`, request);
  }

  remove(projectId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${projectId}`);
  }

  members(projectId: number): Observable<MemberDto[]> {
    return this.http.get<MemberDto[]>(`${this.url}/${projectId}/members`);
  }

  addMember(projectId: number, request: AddMemberRequest): Observable<MemberDto[]> {
    return this.http.post<MemberDto[]>(`${this.url}/${projectId}/members`, request);
  }

  updateMember(projectId: number, userId: number, role: ProjectRole): Observable<MemberDto[]> {
    return this.http.patch<MemberDto[]>(`${this.url}/${projectId}/members/${userId}`, { role });
  }

  removeMember(projectId: number, userId: number): Observable<MemberDto[]> {
    return this.http.delete<MemberDto[]>(`${this.url}/${projectId}/members/${userId}`);
  }

  diagrams(projectId: number): Observable<DiagramSummary[]> {
    return this.http.get<DiagramSummary[]>(`${this.url}/${projectId}/diagrams`);
  }

  createDiagram(projectId: number, name: string): Observable<DiagramDto> {
    return this.http.post<DiagramDto>(`${this.url}/${projectId}/diagrams`, { name });
  }
}
