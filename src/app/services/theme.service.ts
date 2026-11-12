import { Service, signal } from '@angular/core';

/** Keeps the Bootstrap `data-bs-theme` attribute on the document root in sync with the selected theme. */
@Service()
export class ThemeService {
  private readonly dark = signal(false);

  readonly isDark = this.dark.asReadonly();

  constructor() {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    this.apply(prefersDark);
  }

  toggle(): void {
    this.apply(!this.dark());
  }

  private apply(isDark: boolean): void {
    this.dark.set(isDark);
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
  }
}
