import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';
import { AuthService } from '../services/auth.service';

function isAuthEndpoint(url: string, baseUrl: string): boolean {
  return url.startsWith(`${baseUrl}/api/auth/`);
}

/** Adds the bearer token and transparently refreshes it once on `401`. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const baseUrl = inject(API_BASE_URL);
  const auth = inject(AuthService);

  if (!request.url.startsWith(baseUrl)) return next(request);

  const token = auth.accessToken();
  if (!token || isAuthEndpoint(request.url, baseUrl)) return next(request);

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap((pair) =>
          next(request.clone({ setHeaders: { Authorization: `Bearer ${pair.accessToken}` } })),
        ),
        catchError(() => {
          auth.expireSession();
          return throwError(() => error);
        }),
      );
    }),
  );
};
