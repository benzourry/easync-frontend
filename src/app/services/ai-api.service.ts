import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';
import type { AiPlanRequest, AiSettings, AiSettingsPatch } from '../models/ai.models';

/**
 * Typed wrapper over the server-side assistant. The provider credential and the
 * prompt both live on the server, so nothing here ever sees the API key.
 */
@Service()
export class AiApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  settings(): Observable<AiSettings> {
    return this.http.get<AiSettings>(`${this.baseUrl}/api/me/ai-settings`);
  }

  saveSettings(patch: AiSettingsPatch): Observable<AiSettings> {
    return this.http.put<AiSettings>(`${this.baseUrl}/api/me/ai-settings`, patch);
  }

  /** Asks the server to build a plan; the reply is normalised by {@link parsePlan}. */
  createPlan(diagramId: number, request: AiPlanRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/api/diagrams/${diagramId}/ai/plan`, request);
  }
}
