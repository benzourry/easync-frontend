import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import type { MessageKey } from '../i18n/messages';
import type { ValidationIssue, ValidationSeverity } from '../models/validation.models';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';
import { TranslationService } from '../services/translation.service';

type SeverityFilter = ValidationSeverity | 'all';

const SEVERITY_BADGE: Record<ValidationSeverity, string> = {
  error: 'text-bg-danger',
  warning: 'text-bg-warning',
  info: 'text-bg-info',
};

const SEVERITY_LABEL: Record<ValidationSeverity, MessageKey> = {
  error: 'validation.errors',
  warning: 'validation.warnings',
  info: 'validation.infos',
};

/** Lists the problems the ArchiMate rules find in the model and jumps to the element behind one. */
@Component({
  selector: 'app-validation-panel',
  template: `
    <section class="d-flex flex-column gap-2 p-2">
      <div class="d-flex align-items-center gap-2">
        <label class="visually-hidden" for="validation-filter">{{
          i18n.t('validation.filter')
        }}</label>
        <select
          id="validation-filter"
          class="form-select form-select-sm"
          [value]="filter()"
          (change)="onFilter($event)"
        >
          <option value="all">{{ i18n.t('validation.all') }}</option>
          <option value="error">{{ i18n.t('validation.errors') }}</option>
          <option value="warning">{{ i18n.t('validation.warnings') }}</option>
          <option value="info">{{ i18n.t('validation.infos') }}</option>
        </select>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary text-nowrap"
          [disabled]="issues().length === 0"
          (click)="exportReport()"
        >
          {{ i18n.t('validation.export') }}
        </button>
      </div>

      <p class="small text-body-secondary mb-0">
        {{ i18n.t('validation.hint') }}
        @if (issues().length > 0) {
          <span class="d-block">{{ summaryLine() }}</span>
        }
      </p>

      @if (store.activeViewpoint(); as viewpoint) {
        <div class="form-check form-switch small mb-0">
          <input
            class="form-check-input"
            type="checkbox"
            role="switch"
            id="validation-scope"
            [checked]="scopeToViewpoint()"
            (change)="onScopeChange($event)"
          />
          <label class="form-check-label" for="validation-scope">
            {{ i18n.t('validation.scopeViewpoint') }} — {{ viewpoint.name }}
          </label>
        </div>
      }

      @if (visible().length === 0) {
        <p class="small text-body-secondary mb-0">{{ i18n.t('validation.empty') }}</p>
      } @else {
        <ul class="list-unstyled d-flex flex-column gap-1 mb-0">
          @for (issue of visible(); track issue.id) {
            <li>
              <button
                type="button"
                class="app-issue w-100 text-start border-0 bg-transparent rounded px-2 py-1"
                [class.app-issue-link]="issue.elementKey !== null"
                (click)="goTo(issue)"
              >
                <span class="badge {{ severityClass(issue.severity) }}">{{
                  i18n.t(severityLabel(issue.severity))
                }}</span>
                <span class="small d-block">{{ i18n.t(issue.messageKey) }}</span>
                <span class="small text-body-secondary d-block text-truncate">{{
                  issue.detail
                }}</span>
              </button>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .app-issue-link:hover {
      background-color: var(--bs-tertiary-bg);
    }
  `,
})
export class ValidationPanel {
  protected readonly store = inject(DiagramStore);
  protected readonly i18n = inject(TranslationService);
  private readonly diagram = inject(DiagramCanvasService);
  private readonly document = inject(DOCUMENT);

  protected readonly issues = computed(() =>
    this.scopeToViewpoint() ? this.store.viewpointIssues() : this.store.validationIssues(),
  );
  protected readonly filter = signal<SeverityFilter>('all');
  /** Hide problems the active viewpoint does not admit; meaningless without a viewpoint. */
  protected readonly scopeToViewpoint = signal(true);

  protected readonly visible = computed(() => {
    const filter = this.filter();
    const issues = this.issues();
    return filter === 'all' ? issues : issues.filter((issue) => issue.severity === filter);
  });

  protected readonly summaryLine = computed(() => {
    const issues = this.issues();
    const count = (severity: ValidationSeverity) =>
      issues.filter((issue) => issue.severity === severity).length;
    const parts: string[] = [];
    const errors = count('error');
    const warnings = count('warning');
    const infos = count('info');
    if (errors) parts.push(`${errors} ${this.i18n.t('validation.errors')}`);
    if (warnings) parts.push(`${warnings} ${this.i18n.t('validation.warnings')}`);
    if (infos) parts.push(`${infos} ${this.i18n.t('validation.infos')}`);
    return parts.join(' · ');
  });

  protected onScopeChange(event: Event): void {
    this.scopeToViewpoint.set((event.target as HTMLInputElement).checked);
  }

  protected onFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filter.set(value === 'error' || value === 'warning' || value === 'info' ? value : 'all');
  }

  protected severityClass(severity: ValidationSeverity): string {
    return SEVERITY_BADGE[severity];
  }

  protected severityLabel(severity: ValidationSeverity): MessageKey {
    return SEVERITY_LABEL[severity];
  }

  /** Selects the element on the canvas, falling back to the relationship it belongs to. */
  protected goTo(issue: ValidationIssue): void {
    if (issue.elementKey && this.diagram.selectElement(issue.elementKey)) return;
    if (issue.relationshipKey) this.diagram.selectByKey(issue.relationshipKey);
  }

  protected exportReport(): void {
    const rows = this.issues().map((issue) =>
      [
        issue.severity,
        this.i18n.t(issue.messageKey),
        issue.detail,
        issue.code,
      ]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(','),
    );
    const csv = ['"Severity","Issue","Detail","Code"', ...rows].join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = 'easync-validation.csv';
    this.document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
