import { InjectionToken } from '@angular/core';

declare global {
  interface Window {
    /** Set by the hosting page to point the SPA at a non-default backend. */
    __EASYNC_CONFIG__?: { apiBaseUrl?: string };
  }
}

const DEFAULT_API_BASE_URL = 'http://localhost:8080';

function resolveApiBaseUrl(): string {
  const configured = typeof window === 'undefined' ? undefined : window.__EASYNC_CONFIG__?.apiBaseUrl;
  return (configured || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
}

/** Base URL of the EAsync REST API, without a trailing slash. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: resolveApiBaseUrl,
});
