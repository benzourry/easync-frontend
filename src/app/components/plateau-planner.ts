import { Component, computed, inject, signal } from '@angular/core';
import { findTogafPhase } from '../frameworks/togaf';
import { PLATEAU_OPTIONS } from '../models/model.models';
import type { Plateau } from '../models/model.models';
import { GAP_KINDS, analysePlateauGap, planWorkPackages } from '../models/plateau.models';
import type { GapKind } from '../models/plateau.models';
import { DiagramCanvasService } from '../services/diagram-canvas.service';
import { DiagramStore } from '../services/diagram-store';
import { TranslationService } from '../services/translation.service';

/**
 * Compares two plateaus and turns the difference into work packages, so the model itself produces
 * the transition plan TOGAF phase E and F ask for.
 */
@Component({
  selector: 'app-plateau-planner',
  template: `
    <details class="mb-1">
      <summary class="app-tree-summary">{{ i18n.t('plateau.title') }}</summary>
      <div class="px-2 pb-2">
        <div class="d-flex gap-2 mb-2">
          <div class="flex-fill">
            <label class="form-label small mb-1" for="plateau-from">{{ i18n.t('plateau.from') }}</label>
            <select
              id="plateau-from"
              class="form-select form-select-sm"
              [value]="from()"
              (change)="onFromChange($event)"
            >
              @for (option of options; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
          <div class="flex-fill">
            <label class="form-label small mb-1" for="plateau-to">{{ i18n.t('plateau.to') }}</label>
            <select
              id="plateau-to"
              class="form-select form-select-sm"
              [value]="to()"
              (change)="onToChange($event)"
            >
              @for (option of options; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
        </div>

        @if (gap().entries.length === 0) {
          <p class="small text-body-secondary mb-0">{{ i18n.t('plateau.noGap') }}</p>
        } @else {
          <div class="d-flex flex-wrap gap-1 mb-2">
            @for (kind of kinds; track kind) {
              <span [class]="badgeClass(kind)">{{ kindLabel(kind) }} {{ gap().counts[kind] }}</span>
            }
          </div>

          @if (changes().length > 0) {
            <ul class="list-unstyled small mb-2 app-scroll" style="max-height: 12rem; overflow: auto">
              @for (entry of changes(); track entry.key) {
                <li class="d-flex align-items-center gap-1">
                  <span [class]="badgeClass(entry.kind)">{{ kindLabel(entry.kind) }}</span>
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0 text-start text-truncate"
                    [title]="entry.layer + ' · ' + entry.archimateType"
                    (click)="diagram.selectByKey(entry.key)"
                  >
                    {{ entry.name }}
                  </button>
                </li>
              }
            </ul>
          }

          @if (workPackages().length > 0) {
            <h3 class="app-tree-summary">{{ i18n.t('plateau.workPackages') }}</h3>
            <ul class="list-unstyled small mb-0">
              @for (workPackage of workPackages(); track workPackage.id) {
                <li class="d-flex align-items-center gap-1">
                  <span class="badge bg-body-secondary text-body-secondary flex-shrink-0">{{
                    phaseCode(workPackage.phase)
                  }}</span>
                  <span class="text-truncate"
                    >{{ kindLabel(workPackage.kind) }} · {{ workPackage.layer }} ·
                    {{ i18n.t('plateau.elementCount', { count: workPackage.elementKeys.length }) }}</span
                  >
                </li>
              }
            </ul>
          }
        }
      </div>
    </details>
  `,
})
export class PlateauPlanner {
  private readonly store = inject(DiagramStore);
  protected readonly diagram = inject(DiagramCanvasService);
  protected readonly i18n = inject(TranslationService);

  protected readonly options = PLATEAU_OPTIONS;
  protected readonly kinds = GAP_KINDS;

  protected readonly from = signal<Plateau>('baseline');
  protected readonly to = signal<Plateau>('target');

  protected readonly gap = computed(() =>
    analysePlateauGap(this.store.elements(), this.from(), this.to()),
  );
  protected readonly changes = computed(() => this.gap().entries.filter((e) => e.kind !== 'retain'));
  protected readonly workPackages = computed(() => planWorkPackages(this.gap()));

  protected onFromChange(event: Event): void {
    this.from.set((event.target as HTMLSelectElement).value as Plateau);
  }

  protected onToChange(event: Event): void {
    this.to.set((event.target as HTMLSelectElement).value as Plateau);
  }

  protected phaseCode(phase: Parameters<typeof findTogafPhase>[0]): string {
    return findTogafPhase(phase).code;
  }

  protected kindLabel(kind: GapKind): string {
    switch (kind) {
      case 'retire':
        return this.i18n.t('plateau.kind.retire');
      case 'introduce':
        return this.i18n.t('plateau.kind.introduce');
      case 'align':
        return this.i18n.t('plateau.kind.align');
      default:
        return this.i18n.t('plateau.kind.retain');
    }
  }

  protected badgeClass(kind: GapKind): string {
    switch (kind) {
      case 'retire':
        return 'badge text-bg-danger flex-shrink-0';
      case 'introduce':
        return 'badge text-bg-success flex-shrink-0';
      case 'align':
        return 'badge text-bg-warning flex-shrink-0';
      default:
        return 'badge bg-body-secondary text-body-secondary flex-shrink-0';
    }
  }
}
