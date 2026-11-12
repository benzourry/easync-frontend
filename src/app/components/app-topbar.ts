import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';

/** Shared application bar for the non-canvas pages. */
@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  template: `
    <header class="app-topbar d-flex align-items-center">
      <a
        routerLink="/projects"
        class="d-flex align-items-center gap-2 text-decoration-none text-body flex-shrink-0"
        aria-label="EAsync projects"
      >
        <img class="app-logo" src="easync-logo.png" alt="" aria-hidden="true" />
      </a>

      @if (title()) {
        <span class="text-secondary" aria-hidden="true">/</span>
        <span class="app-crumb text-truncate">{{ title() }}</span>
      }

      <div class="ms-auto d-flex align-items-center gap-2 flex-shrink-0">
        <button
          type="button"
          class="btn btn-sm btn-light app-icon-btn"
          [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          (click)="theme.toggle()"
        >
          <svg class="app-icon" aria-hidden="true">
            <use [attr.href]="theme.isDark() ? 'icons.svg#sun' : 'icons.svg#moon-stars'"></use>
          </svg>
        </button>

        <span class="d-none d-sm-inline small text-secondary">{{ auth.displayName() }}</span>
        <span
          class="app-avatar"
          [attr.aria-label]="auth.displayName()"
        >
          {{ auth.initials() }}
        </span>

        <button
          type="button"
          class="btn btn-sm btn-outline-secondary text-nowrap"
          (click)="auth.signOut()"
        >
          Sign out
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
        flex-shrink: 0;
      }
    `,
  ],
})
export class AppTopbar {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  readonly title = input<string | null>(null);
}
