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
          class="btn btn-sm btn-light d-md-none d-flex align-items-center justify-content-center"
          aria-label="Toggle elements palette"
          (click)="store.togglePalette()"
        >
          <svg class="app-icon" aria-hidden="true"><use href="icons.svg#list"></use></svg>
        </button>

        <div class="app-logo bg-primary text-white rounded fw-bold" aria-hidden="true">E</div>

        <h1 class="h5 mb-0 fw-bold d-none d-sm-block">EAsync</h1>
      </div>

      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn btn-sm btn-light d-flex align-items-center justify-content-center"
          [attr.aria-label]="store.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          [ngbTooltip]="store.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          (click)="store.toggleTheme()"
        >
          <svg class="app-icon" aria-hidden="true">
            <use [attr.href]="store.isDark() ? 'icons.svg#sun' : 'icons.svg#moon-stars'"></use>
          </svg>
        </button>

        <button
          type="button"
          class="btn btn-sm btn-light d-md-none d-flex align-items-center justify-content-center"
          aria-label="Toggle explorer panel"
          (click)="store.toggleExplorer()"
        >
          <svg class="app-icon" aria-hidden="true">
            <use href="icons.svg#layout-sidebar-inset-reverse"></use>
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
          <svg class="app-icon" aria-hidden="true"><use href="icons.svg#folder2-open"></use></svg>
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
          <svg class="app-icon" aria-hidden="true"><use href="icons.svg#download"></use></svg>
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
