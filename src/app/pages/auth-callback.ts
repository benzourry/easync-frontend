import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../core/http-error';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  imports: [RouterLink],
  template: `
    <div class="app-page d-flex align-items-center justify-content-center p-4">
      <div class="card shadow-sm text-center" style="max-width: 26rem">
        <div class="card-body p-4">
          @if (errorMessage(); as message) {
            <h1 class="h4">Sign-in did not complete</h1>
            <p class="text-secondary" role="alert">{{ message }}</p>
            <a class="btn btn-primary" routerLink="/login">Back to sign in</a>
          } @else {
            <div class="spinner-border text-primary mb-3" role="status" aria-hidden="true"></div>
            <h1 class="h5">Finishing sign-in…</h1>
            <p class="text-secondary mb-0">You will be redirected to your projects.</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class AuthCallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const handoff = this.route.snapshot.queryParamMap.get('handoff');
    if (!handoff) {
      this.errorMessage.set('The sign-in response did not include a handoff token.');
      return;
    }

    this.auth.exchangeHandoff(handoff).subscribe({
      next: () => {
        void this.router.navigate(['/projects'], { replaceUrl: true });
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }
}
