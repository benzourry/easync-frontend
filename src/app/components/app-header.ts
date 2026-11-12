import { Component, inject } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap/tooltip';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';

@Component({
  selector: 'app-header',
  imports: [NgbTooltip],
  template: `
    <header
      class="navbar bg-body-tertiary border-bottom flex-wrap gap-2 px-3 py-2 shadow-sm z-3 flex-shrink-0"
    >
      <div class="d-flex align-items-center gap-2 me-auto">
        <button
          type="button"
          class="btn btn-sm btn-light d-md-none"
          aria-label="Toggle elements palette"
          (click)="store.togglePalette()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div class="app-logo bg-primary text-white rounded fw-bold" aria-hidden="true">E</div>

        <h1 class="h5 mb-0 fw-bold d-none d-sm-block">EAsync</h1>
      </div>

      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn btn-sm btn-light"
          [attr.aria-label]="store.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          [ngbTooltip]="store.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          (click)="store.toggleTheme()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>

        <button
          type="button"
          class="btn btn-sm btn-light d-md-none"
          aria-label="Toggle explorer panel"
          (click)="store.toggleExplorer()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
        </button>

        <div class="vr d-none d-sm-block opacity-25"></div>

        <button
          type="button"
          class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
          aria-label="Open .archimate file"
          ngbTooltip="Open .archimate file"
          (click)="upload.click()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <span class="d-none d-sm-inline">Open</span>
        </button>
        <input
          #upload
          type="file"
          accept=".archimate,.xml"
          class="d-none"
          aria-label="Open .archimate file"
          (change)="onFileSelected($event)"
        />

        <button type="button" class="btn btn-sm btn-outline-danger" (click)="store.clearDialogOpen.set(true)">
          Clear
        </button>

        <button
          type="button"
          class="btn btn-sm btn-primary d-flex align-items-center gap-2"
          aria-label="Export to PNG"
          ngbTooltip="Export to PNG"
          (click)="diagram.exportImage()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          <span class="d-none d-sm-inline">Export</span>
        </button>
      </div>
    </header>
  `,
})
export class AppHeader {
  protected readonly store = inject(DiagramStore);
  protected readonly diagram = inject(DiagramCanvasService);

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.diagram.importFile(file);
    input.value = '';
  }
}
