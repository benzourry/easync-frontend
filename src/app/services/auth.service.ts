import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { API_BASE_URL } from '../core/api.config';
import type { AuthProvider, TokenPair, UserDto } from '../models/api.models';

const ACCESS_TOKEN_KEY = 'easync.accessToken';
const REFRESH_TOKEN_KEY = 'easync.refreshToken';
const USER_KEY = 'easync.user';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private-mode browsers can refuse storage; the session then only lives in memory.
  }
}

function readStoredUser(): UserDto | null {
  const raw = readStorage(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserDto;
  } catch {
    return null;
  }
}

/** Owns the bearer session: sign-in handoff, token refresh, current user and sign-out. */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = inject(API_BASE_URL);

  private refreshRequest: Observable<TokenPair> | null = null;

  readonly user = signal<UserDto | null>(readStoredUser());
  readonly accessToken = signal<string | null>(readStorage(ACCESS_TOKEN_KEY));
  readonly refreshToken = signal<string | null>(readStorage(REFRESH_TOKEN_KEY));

  readonly isAuthenticated = computed(() => this.user() !== null && this.accessToken() !== null);
  readonly displayName = computed(() => this.user()?.displayName ?? '');
  readonly initials = computed(() => {
    const name = this.user()?.displayName?.trim() || this.user()?.email || '?';
    const parts = name.split(/[\s@._-]+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  providers(): Observable<AuthProvider[]> {
    return this.http.get<AuthProvider[]>(`${this.baseUrl}/api/auth/providers`);
  }

  /** Full-page navigation: the backend must run the OAuth dance, a fetch cannot. */
  startLogin(loginUrl: string): void {
    window.location.assign(loginUrl);
  }

  exchangeHandoff(handoff: string): Observable<TokenPair> {
    return this.http
      .post<TokenPair>(`${this.baseUrl}/api/auth/session`, { handoff })
      .pipe(tap((pair) => this.applySession(pair)));
  }

  devLogin(email: string, displayName: string): Observable<TokenPair> {
    return this.http
      .post<TokenPair>(`${this.baseUrl}/api/auth/dev-login`, { email, displayName })
      .pipe(tap((pair) => this.applySession(pair)));
  }

  /** Rotates the refresh token; concurrent callers share the same request. */
  refresh(): Observable<TokenPair> {
    const token = this.refreshToken();
    if (!token) return throwError(() => new Error('No refresh token available.'));

    if (!this.refreshRequest) {
      this.refreshRequest = this.http
        .post<TokenPair>(`${this.baseUrl}/api/auth/refresh`, { refreshToken: token })
        .pipe(
          tap((pair) => this.applySession(pair)),
          catchError((error: unknown) => {
            this.clearSession();
            return throwError(() => error);
          }),
          finalize(() => (this.refreshRequest = null)),
          shareReplay(1),
        );
    }
    return this.refreshRequest;
  }

  signOut(): void {
    const token = this.refreshToken();
    const finish = () => {
      this.clearSession();
      void this.router.navigate(['/login']);
    };

    if (!token) {
      finish();
      return;
    }
    this.http
      .post<void>(`${this.baseUrl}/api/auth/logout`, { refreshToken: token })
      .subscribe({ next: finish, error: finish });
  }

  /** Called when a refresh fails: drop the session and send the user back to sign-in. */
  expireSession(): void {
    this.clearSession();
    void this.router.navigate(['/login'], { queryParams: { error: 'session_expired' } });
  }

  clearSession(): void {
    writeStorage(ACCESS_TOKEN_KEY, null);
    writeStorage(REFRESH_TOKEN_KEY, null);
    writeStorage(USER_KEY, null);
    this.user.set(null);
    this.accessToken.set(null);
    this.refreshToken.set(null);
  }

  private applySession(pair: TokenPair): void {
    writeStorage(ACCESS_TOKEN_KEY, pair.accessToken);
    writeStorage(REFRESH_TOKEN_KEY, pair.refreshToken);
    writeStorage(USER_KEY, JSON.stringify(pair.user));
    this.user.set(pair.user);
    this.accessToken.set(pair.accessToken);
    this.refreshToken.set(pair.refreshToken);
  }
}
