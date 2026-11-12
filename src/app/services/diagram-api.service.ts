import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';
import type {
  DiagramDto,
  RevisionDto,
  RevisionSummary,
  SaveDiagramRequest,
} from '../models/api.models';

/** Thin typed wrapper over the diagram and revision endpoints. */
@Service()
export class DiagramApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private get url(): string {
    return `${this.baseUrl}/api/diagrams`;
  }

  get(diagramId: number): Observable<DiagramDto> {
    return this.http.get<DiagramDto>(`${this.url}/${diagramId}`);
  }

  save(diagramId: number, request: SaveDiagramRequest): Observable<DiagramDto> {
    return this.http.put<DiagramDto>(`${this.url}/${diagramId}`, request);
  }

  remove(diagramId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${diagramId}`);
  }

  revisions(diagramId: number): Observable<RevisionSummary[]> {
    return this.http.get<RevisionSummary[]>(`${this.url}/${diagramId}/revisions`);
  }

  revision(diagramId: number, revisionId: number): Observable<RevisionDto> {
    return this.http.get<RevisionDto>(`${this.url}/${diagramId}/revisions/${revisionId}`);
  }

  createRevision(diagramId: number, label: string): Observable<RevisionSummary> {
    return this.http.post<RevisionSummary>(`${this.url}/${diagramId}/revisions`, { label });
  }

  restoreRevision(diagramId: number, revisionId: number, version: number): Observable<DiagramDto> {
    return this.http.post<DiagramDto>(`${this.url}/${diagramId}/revisions/${revisionId}/restore`, {
      version,
    });
  }
}
