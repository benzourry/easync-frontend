import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody } from '../models/api.models';

/** Turns any thrown value into a message that is safe to show in the UI. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<ApiErrorBody> | null;
    if (body?.fields && Object.keys(body.fields).length > 0) {
      return Object.values(body.fields).join(' ');
    }
    if (body?.message) return body.message;
    if (error.status === 0) {
      return 'Cannot reach the EAsync server. Check that it is running and that CORS allows this origin.';
    }
    if (error.status === 401) return 'Your session expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    if (error.status === 404) return 'The requested item no longer exists.';
    return `${error.status} ${error.statusText || 'Request failed'}`;
  }
  if (error instanceof Error) return error.message;
  return 'Unexpected error.';
}

/** True when a save was rejected because someone else advanced the diagram version. */
export function isStaleVersion(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) return false;
  const body = error.error as Partial<ApiErrorBody> | null;
  return body?.code === 'stale_version';
}
