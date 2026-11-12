import { Component, inject } from '@angular/core';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';

@Component({
  selector: 'app-header',
  template: `
    <header
      class="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 h-auto min-h-16 py-2 flex flex-wrap items-center justify-between px-3 md:px-6 shrink-0 shadow-sm z-30 transition-colors duration-200"
    >
      <div
        class="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start mb-2 md:mb-0"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="md:hidden p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
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
          <div
            class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-lg"
            aria-hidden="true"
          >
            E
          </div>
          <h1 class="text-lg md:text-xl font-bold text-gray-800 dark:text-white tracking-tight hidden sm:block">
            EAsync
          </h1>
        </div>

        <div class="flex items-center gap-2 md:hidden">
          <button
            type="button"
            class="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
            [attr.aria-label]="store.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
            (click)="store.toggleTheme()"
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
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <button
            type="button"
            class="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
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
        </div>
      </div>

      <div
        class="flex items-center gap-2 md:gap-4 flex-wrap w-full md:w-auto justify-center md:justify-end"
      >
        <button
          type="button"
          class="hidden md:flex p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
          [attr.aria-label]="store.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          [attr.title]="store.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
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

        <div class="h-6 w-px bg-gray-300 dark:bg-slate-600 mx-1 hidden sm:block"></div>

        <button
          type="button"
          class="flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors text-xs md:text-sm font-medium"
          title="Open .archimate file"
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
          <span class="hidden sm:inline">Open</span>
        </button>
        <input
          #upload
          type="file"
          accept=".archimate,.xml"
          class="hidden"
          aria-label="Open .archimate file"
          (change)="onFileSelected($event)"
        />

        <button
          type="button"
          class="px-2 md:px-4 py-1.5 md:py-2 text-gray-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors text-xs md:text-sm font-medium"
          (click)="store.clearDialogOpen.set(true)"
        >
          Clear
        </button>

        <button
          type="button"
          class="flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium"
          title="Export to PNG"
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
          <span class="hidden sm:inline">Export</span>
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
