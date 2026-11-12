import { Component, OnInit, inject, isDevMode, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { apiErrorMessage } from '../core/http-error';
import type { AuthProvider } from '../models/api.models';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';

const ERROR_MESSAGES: Record<string, string> = {
  session_expired: 'Your session expired. Sign in again to continue.',
  missing_email: 'The identity provider did not share an email address.',
  unsupported_provider: 'That sign-in provider is not configured on the server.',
};

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class LoginPage implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly providers = signal<AuthProvider[]>([]);
  protected readonly loadingProviders = signal(true);
  protected readonly providersError = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly devLoginEnabled = isDevMode();
  protected readonly devEmail = signal('');
  protected readonly devName = signal('');
  protected readonly devBusy = signal(false);
  protected readonly devError = signal<string | null>(null);

  constructor() {
    this.auth
      .providers()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (providers) => {
          this.providers.set(providers);
          this.loadingProviders.set(false);
        },
        error: (error: unknown) => {
          this.providersError.set(apiErrorMessage(error));
          this.loadingProviders.set(false);
        },
      });
  }

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('error');
    if (code) {
      this.errorMessage.set(ERROR_MESSAGES[code] ?? `Sign-in failed (${code}). Please try again.`);
    }
  }

  protected startLogin(provider: AuthProvider): void {
    this.auth.startLogin(provider.loginUrl);
  }

  protected onDevEmail(event: Event): void {
    this.devEmail.set((event.target as HTMLInputElement).value);
  }

  protected onDevName(event: Event): void {
    this.devName.set((event.target as HTMLInputElement).value);
  }

  protected devLogin(event: Event): void {
    event.preventDefault();
    const email = this.devEmail().trim();
    const displayName = this.devName().trim();
    if (!email || !displayName) {
      this.devError.set('Enter both an email address and a display name.');
      return;
    }
    this.devBusy.set(true);
    this.devError.set(null);
    this.auth.devLogin(email, displayName).subscribe({
      next: () => {
        this.devBusy.set(false);
        void this.router.navigate(['/projects']);
      },
      error: (error: unknown) => {
        this.devBusy.set(false);
        this.devError.set(apiErrorMessage(error));
      },
    });
  }
}
