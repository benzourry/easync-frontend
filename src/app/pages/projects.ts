import { DatePipe } from '@angular/common';
import { Component, OnInit, TemplateRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, type NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal';
import { AppTopbar } from '../components/app-topbar';
import { apiErrorMessage } from '../core/http-error';
import type { ProjectRole, ProjectSummary } from '../models/api.models';
import { ProjectApiService } from '../services/project-api.service';

const DIALOG_OPTIONS = { size: 'sm', centered: true, backdrop: 'static' as const };

@Component({
  selector: 'app-projects',
  imports: [RouterLink, DatePipe, AppTopbar, NgbModalModule],
  templateUrl: './projects.html',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class ProjectsPage implements OnInit {
  private readonly api = inject(ProjectApiService);
  private readonly modal = inject(NgbModal);

  protected readonly projects = signal<ProjectSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly createName = signal('');
  protected readonly createDescription = signal('');
  protected readonly createError = signal<string | null>(null);
  protected readonly createBusy = signal(false);

  protected readonly editing = signal<ProjectSummary | null>(null);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editError = signal<string | null>(null);
  protected readonly editBusy = signal(false);

  protected readonly deleting = signal<ProjectSummary | null>(null);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly deleteBusy = signal(false);

  private readonly createTpl = viewChild.required<TemplateRef<unknown>>('createTpl');
  private readonly editTpl = viewChild.required<TemplateRef<unknown>>('editTpl');
  private readonly deleteTpl = viewChild.required<TemplateRef<unknown>>('deleteTpl');

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.list().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected canEdit(project: ProjectSummary): boolean {
    return project.role !== 'VIEWER';
  }

  protected roleClass(role: ProjectRole): string {
    switch (role) {
      case 'OWNER':
        return 'text-bg-primary';
      case 'EDITOR':
        return 'text-bg-info';
      default:
        return 'text-bg-secondary';
    }
  }

  protected openCreate(): void {
    this.createName.set('');
    this.createDescription.set('');
    this.createError.set(null);
    this.createBusy.set(false);
    this.modal.open(this.createTpl(), { ...DIALOG_OPTIONS, ariaLabelledBy: 'create-project-title' });
  }

  protected onCreateName(event: Event): void {
    this.createName.set((event.target as HTMLInputElement).value);
  }

  protected onCreateDescription(event: Event): void {
    this.createDescription.set((event.target as HTMLInputElement).value);
  }

  protected submitCreate(modal: NgbModalRef): void {
    const name = this.createName().trim();
    if (!name) {
      this.createError.set('Enter a project name.');
      return;
    }
    this.createBusy.set(true);
    this.createError.set(null);
    this.api.create({ name, description: this.createDescription().trim() || null }).subscribe({
      next: () => {
        this.createBusy.set(false);
        this.refresh(modal);
      },
      error: (error: unknown) => {
        this.createBusy.set(false);
        this.createError.set(apiErrorMessage(error));
      },
    });
  }

  protected openEdit(project: ProjectSummary): void {
    this.editing.set(project);
    this.editName.set(project.name);
    this.editDescription.set(project.description ?? '');
    this.editError.set(null);
    this.editBusy.set(false);
    const ref = this.modal.open(this.editTpl(), {
      ...DIALOG_OPTIONS,
      ariaLabelledBy: 'edit-project-title',
    });
    ref.closed.subscribe(() => this.editing.set(null));
    ref.dismissed.subscribe(() => this.editing.set(null));
  }

  protected onEditName(event: Event): void {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  protected onEditDescription(event: Event): void {
    this.editDescription.set((event.target as HTMLInputElement).value);
  }

  protected submitEdit(modal: NgbModalRef): void {
    const project = this.editing();
    if (!project) return;
    const name = this.editName().trim();
    if (!name) {
      this.editError.set('Enter a project name.');
      return;
    }
    this.editBusy.set(true);
    this.editError.set(null);
    this.api
      .update(project.id, { name, description: this.editDescription().trim() || null })
      .subscribe({
        next: () => {
          this.editBusy.set(false);
          this.modal.dismissAll();
          this.load();
        },
        error: (error: unknown) => {
          this.editBusy.set(false);
          this.editError.set(apiErrorMessage(error));
        },
      });
  }

  protected openDelete(project: ProjectSummary): void {
    this.deleting.set(project);
    this.deleteError.set(null);
    this.deleteBusy.set(false);
    const ref = this.modal.open(this.deleteTpl(), {
      ...DIALOG_OPTIONS,
      ariaLabelledBy: 'delete-project-title',
    });
    ref.closed.subscribe(() => this.deleting.set(null));
    ref.dismissed.subscribe(() => this.deleting.set(null));
  }

  protected submitDelete(modal: NgbModalRef): void {
    const project = this.deleting();
    if (!project) return;
    this.deleteBusy.set(true);
    this.deleteError.set(null);
    this.api.remove(project.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.refresh(modal);
      },
      error: (error: unknown) => {
        this.deleteBusy.set(false);
        this.deleteError.set(apiErrorMessage(error));
      },
    });
  }

  private refresh(modal: NgbModalRef): void {
    modal.close();
    this.load();
  }
}
