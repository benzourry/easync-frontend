import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap/dropdown';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap/tooltip';
import { AuthService } from '../services/auth.service';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramPersistenceService } from '../services/diagram-persistence.service';
import { DiagramStore } from '../services/diagram-store';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-header',
  imports: [NgbDropdownModule, NgbTooltip, RouterLink],
  template: `
    <header class="app-header navbar flex-wrap z-3">
      <div class="d-flex align-items-center gap-2 me-auto">
        @if (persistence.projectId(); as projectId) {
          <a
            class="btn btn-sm btn-light app-icon-btn"
            [routerLink]="['/projects', projectId]"
            [attr.aria-label]="i18n.t('header.backToProject')"
            [ngbTooltip]="i18n.t('header.backToProject')"
          >
            <svg class="app-icon" aria-hidden="true"><use href="icons.svg#back"></use></svg>
          </a>
        }

        <button
          type="button"
          class="btn btn-sm btn-light d-lg-none app-icon-btn"
          [attr.aria-label]="i18n.t('header.togglePalette')"
          (click)="store.togglePalette()"
        >
          <svg class="app-icon" aria-hidden="true"><use href="icons.svg#list"></use></svg>
        </button>

        <img
          class="app-logo d-none d-sm-block"
          src="easync-logo.png"
          alt=""
          aria-hidden="true"
        />

        <div class="app-header-title d-flex flex-column lh-1">
          <span class="app-title fw-semibold text-truncate">
            {{ persistence.diagramName() }}
          </span>
          <span class="small text-secondary d-flex align-items-center gap-1" aria-live="polite">
            @if (store.readOnly()) {
              <span class="badge text-bg-secondary">{{ i18n.t('header.readOnly') }}</span>
            } @else {
              {{ saveLabel() }}
            }
          </span>
        </div>
      </div>

      <div class="app-header-actions d-flex align-items-center gap-2 ms-auto">
        <div
          class="btn-group btn-group-sm"
          role="group"
          [attr.aria-label]="i18n.t('language.label')"
        >
          <button
            type="button"
            class="btn btn-light"
            [class.active]="i18n.language() === 'en'"
            [attr.aria-pressed]="i18n.language() === 'en'"
            (click)="i18n.setLanguage('en')"
          >
            EN
          </button>
          <button
            type="button"
            class="btn btn-light"
            [class.active]="i18n.language() === 'bm'"
            [attr.aria-pressed]="i18n.language() === 'bm'"
            (click)="i18n.setLanguage('bm')"
          >
            BM
          </button>
        </div>

        <button
          type="button"
          class="btn btn-sm btn-light app-icon-btn"
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
          class="btn btn-sm btn-light d-lg-none app-icon-btn"
          [attr.aria-label]="i18n.t('header.toggleExplorer')"
          (click)="store.toggleExplorer()"
        >
          <svg class="app-icon" aria-hidden="true">
            <use href="icons.svg#layout-sidebar-inset-reverse"></use>
          </svg>
        </button>


        @if (!store.readOnly()) {
          <div class="vr d-none d-md-block"></div>

          <div class="btn-group btn-group-sm" role="group" [attr.aria-label]="i18n.t('header.history')">
            <button
              type="button"
              class="btn btn-light app-icon-btn"
              [attr.aria-label]="i18n.t('header.undo')"
              [ngbTooltip]="i18n.t('header.undo')"
              [disabled]="!store.canUndo()"
              (click)="diagram.undo()"
            >
              <svg class="app-icon" aria-hidden="true">
                <use href="icons.svg#arrow-counterclockwise"></use>
              </svg>
            </button>
            <button
              type="button"
              class="btn btn-light app-icon-btn"
              [attr.aria-label]="i18n.t('header.redo')"
              [ngbTooltip]="i18n.t('header.redo')"
              [disabled]="!store.canRedo()"
              (click)="diagram.redo()"
            >
              <svg class="app-icon" aria-hidden="true"><use href="icons.svg#arrow-clockwise"></use></svg>
            </button>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-primary d-flex align-items-center gap-2"
            [disabled]="persistence.saving()"
            [ngbTooltip]="i18n.t('header.saveNow')"
            (click)="persistence.saveNow()"
          >
            @if (persistence.saving()) {
              <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            }
            <span>{{ persistence.saving() ? i18n.t('header.saving') : i18n.t('header.save') }}</span>
          </button>
        }

        <!-- Full action set from the medium breakpoint up. -->
        <div class="d-none d-md-flex align-items-center gap-2">
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            [attr.aria-label]="i18n.t('header.revisions')"
            [ngbTooltip]="i18n.t('header.revisions')"
            (click)="store.revisionsDialogOpen.set(true)"
          >
            <svg class="app-icon" aria-hidden="true"><use href="icons.svg#window-stack"></use></svg>
            <span class="d-none d-lg-inline">{{ i18n.t('header.revisions') }}</span>
          </button>

          @if (!store.readOnly()) {
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
              [attr.aria-label]="i18n.t('header.import')"
              [ngbTooltip]="i18n.t('header.import')"
              (click)="upload.click()"
            >
              <svg class="app-icon" aria-hidden="true"><use href="icons.svg#folder2-open"></use></svg>
              <span class="d-none d-lg-inline">{{ i18n.t('header.import') }}</span>
            </button>

            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              (click)="store.clearDialogOpen.set(true)"
            >
              {{ i18n.t('header.clear') }}
            </button>
          }

          <button
            type="button"
            class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            [attr.aria-label]="i18n.t('header.exportPng')"
            [ngbTooltip]="i18n.t('header.exportPng')"
            (click)="diagram.exportImage()"
          >
            <svg class="app-icon" aria-hidden="true"><use href="icons.svg#download"></use></svg>
            <span class="d-none d-lg-inline">{{ i18n.t('header.exportPng') }}</span>
          </button>

          <button
            type="button"
            class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            [attr.aria-label]="i18n.t('header.exportArchimate')"
            [ngbTooltip]="i18n.t('header.exportArchimate')"
            (click)="diagram.exportArchimate()"
          >
            <svg class="app-icon" aria-hidden="true"><use href="icons.svg#download"></use></svg>
            <span class="d-none d-xl-inline">{{ i18n.t('header.exportArchimate') }}</span>
          </button>

          <div class="vr"></div>

          <span class="small text-secondary d-none d-xl-inline">{{ auth.displayName() }}</span>
          <span class="app-avatar" [attr.aria-label]="auth.displayName()">
            {{ auth.initials() }}
          </span>
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="auth.signOut()">
            {{ i18n.t('header.signOut') }}
          </button>
        </div>

        <!-- Below the medium breakpoint the secondary actions move into a menu. -->
        <div class="d-md-none" ngbDropdown display="dynamic" placement="bottom-end">
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary app-icon-btn"
            ngbDropdownToggle
            [attr.aria-label]="i18n.t('header.moreActions')"
          >
            <svg class="app-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="3" r="1.4"></circle>
              <circle cx="8" cy="8" r="1.4"></circle>
              <circle cx="8" cy="13" r="1.4"></circle>
            </svg>
          </button>
          <div ngbDropdownMenu class="app-header-menu dropdown-menu-end">
            <button type="button" ngbDropdownItem (click)="store.revisionsDialogOpen.set(true)">
              <svg class="app-icon" aria-hidden="true"><use href="icons.svg#window-stack"></use></svg>
              <span>{{ i18n.t('header.revisions') }}</span>
            </button>
            @if (!store.readOnly()) {
              <button type="button" ngbDropdownItem (click)="upload.click()">
                <svg class="app-icon" aria-hidden="true"><use href="icons.svg#folder2-open"></use></svg>
                <span>{{ i18n.t('header.import') }}</span>
              </button>
            }
            <button type="button" ngbDropdownItem (click)="diagram.exportImage()">
              <svg class="app-icon" aria-hidden="true"><use href="icons.svg#download"></use></svg>
              <span>{{ i18n.t('header.exportPng') }}</span>
            </button>
            <button type="button" ngbDropdownItem (click)="diagram.exportSvg()">
              <svg class="app-icon" aria-hidden="true"><use href="icons.svg#download"></use></svg>
              <span>{{ i18n.t('header.exportSvg') }}</span>
            </button>
            <button type="button" ngbDropdownItem (click)="diagram.exportArchimate()">
              <svg class="app-icon" aria-hidden="true"><use href="icons.svg#download"></use></svg>
              <span>{{ i18n.t('header.exportArchimate') }}</span>
            </button>
            @if (!store.readOnly()) {
              <div class="dropdown-divider"></div>
              <button
                type="button"
                ngbDropdownItem
                class="text-danger"
                (click)="store.clearDialogOpen.set(true)"
              >
                <svg class="app-icon" aria-hidden="true"><use href="icons.svg#trash3"></use></svg>
                <span>{{ i18n.t('header.clearDiagram') }}</span>
              </button>
            }
            <div class="dropdown-divider"></div>
            <div class="dropdown-item-text d-flex align-items-center gap-2">
              <span class="app-avatar" aria-hidden="true">{{ auth.initials() }}</span>
              <span class="text-truncate">{{ auth.displayName() }}</span>
            </div>
            <button type="button" ngbDropdownItem (click)="auth.signOut()">
              {{ i18n.t('header.signOut') }}
            </button>
          </div>
        </div>
      </div>

      <input
        #upload
        type="file"
        accept=".archimate,.xml"
        class="d-none"
        [attr.aria-label]="i18n.t('header.import')"
        (change)="onFileSelected($event)"
      />
    </header>
  `,
})
export class AppHeader {
  protected readonly store = inject(DiagramStore);
  protected readonly diagram = inject(DiagramCanvasService);
  protected readonly persistence = inject(DiagramPersistenceService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(TranslationService);

  protected readonly saveLabel = computed(() => {
    switch (this.persistence.saveState()) {
      case 'saving':
        return this.i18n.t('header.saving');
      case 'dirty':
        return this.i18n.t('header.dirty');
      case 'error':
        return this.i18n.t('header.saveFailed');
      default:
        return this.i18n.t('header.saved');
    }
  });

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.diagram.importFile(file);
    input.value = '';
  }
}
