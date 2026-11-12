import { DatePipe } from '@angular/common';
import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, type NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal';
import { forkJoin } from 'rxjs';
import { AppTopbar } from '../components/app-topbar';
import { apiErrorMessage } from '../core/http-error';
import type { DiagramSummary, MemberDto, ProjectRole, ProjectSummary } from '../models/api.models';
import { AuthService } from '../services/auth.service';
import { DiagramApiService } from '../services/diagram-api.service';
import { ProjectApiService } from '../services/project-api.service';

const DIALOG_OPTIONS = { size: 'sm', centered: true, backdrop: 'static' as const };

@Component({
  selector: 'app-project-diagrams',
  imports: [RouterLink, DatePipe, AppTopbar, NgbModalModule],
  templateUrl: './project-diagrams.html',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class ProjectDiagramsPage implements OnInit {
  private readonly api = inject(ProjectApiService);
  private readonly diagramApi = inject(DiagramApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modal = inject(NgbModal);

  protected readonly project = signal<ProjectSummary | null>(null);
  protected readonly diagrams = signal<DiagramSummary[]>([]);
  protected readonly members = signal<MemberDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly canEdit = computed(() => this.project()?.role !== 'VIEWER');
  protected readonly isOwner = computed(() => this.project()?.role === 'OWNER');

  protected readonly createName = signal('');
  protected readonly createError = signal<string | null>(null);
  protected readonly createBusy = signal(false);

  protected readonly deleting = signal<DiagramSummary | null>(null);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly deleteBusy = signal(false);

  protected readonly inviteEmail = signal('');
  protected readonly inviteRole = signal<Exclude<ProjectRole, 'OWNER'>>('EDITOR');
  protected readonly memberError = signal<string | null>(null);
  protected readonly memberBusy = signal(false);
  protected readonly pendingRemoval = signal<number | null>(null);

  private readonly createTpl = viewChild.required<TemplateRef<unknown>>('createTpl');
  private readonly deleteTpl = viewChild.required<TemplateRef<unknown>>('deleteTpl');

  private projectId = 0;

  ngOnInit(): void {
    const projectId = Number(this.route.snapshot.paramMap.get('projectId'));
    if (!Number.isInteger(projectId) || projectId <= 0) {
      this.error.set('That project link is not valid.');
      this.loading.set(false);
      return;
    }
    this.projectId = projectId;
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      project: this.api.get(this.projectId),
      diagrams: this.api.diagrams(this.projectId),
      members: this.api.members(this.projectId),
    }).subscribe({
      next: ({ project, diagrams, members }) => {
        this.project.set(project);
        this.diagrams.set(diagrams);
        this.members.set(members);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.createName.set('');
    this.createError.set(null);
    this.createBusy.set(false);
    this.modal.open(this.createTpl(), { ...DIALOG_OPTIONS, ariaLabelledBy: 'create-diagram-title' });
  }

  protected onCreateName(event: Event): void {
    this.createName.set((event.target as HTMLInputElement).value);
  }

  protected submitCreate(modal: NgbModalRef): void {
    const name = this.createName().trim();
    if (!name) {
      this.createError.set('Enter a diagram name.');
      return;
    }
    this.createBusy.set(true);
    this.createError.set(null);
    this.api.createDiagram(this.projectId, name).subscribe({
      next: (diagram) => {
        this.createBusy.set(false);
        modal.close();
        void this.router.navigate(['/diagrams', diagram.id]);
      },
      error: (error: unknown) => {
        this.createBusy.set(false);
        this.createError.set(apiErrorMessage(error));
      },
    });
  }

  protected openDelete(diagram: DiagramSummary): void {
    this.deleting.set(diagram);
    this.deleteError.set(null);
    this.deleteBusy.set(false);
    const ref = this.modal.open(this.deleteTpl(), {
      ...DIALOG_OPTIONS,
      ariaLabelledBy: 'delete-diagram-title',
    });
    ref.closed.subscribe(() => this.deleting.set(null));
    ref.dismissed.subscribe(() => this.deleting.set(null));
  }

  protected submitDelete(modal: NgbModalRef): void {
    const diagram = this.deleting();
    if (!diagram) return;
    this.deleteBusy.set(true);
    this.deleteError.set(null);
    this.diagramApi.remove(diagram.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        modal.close();
        this.load();
      },
      error: (error: unknown) => {
        this.deleteBusy.set(false);
        this.deleteError.set(apiErrorMessage(error));
      },
    });
  }

  protected onInviteEmail(event: Event): void {
    this.inviteEmail.set((event.target as HTMLInputElement).value);
  }

  protected onInviteRole(event: Event): void {
    this.inviteRole.set((event.target as HTMLSelectElement).value as 'EDITOR' | 'VIEWER');
  }

  protected addMember(): void {
    const email = this.inviteEmail().trim();
    if (!email) {
      this.memberError.set('Enter the email address of the person you want to invite.');
      return;
    }
    this.memberBusy.set(true);
    this.memberError.set(null);
    this.api.addMember(this.projectId, { email, role: this.inviteRole() }).subscribe({
      next: (members) => {
        this.members.set(members);
        this.inviteEmail.set('');
        this.memberBusy.set(false);
      },
      error: (error: unknown) => {
        this.memberBusy.set(false);
        this.memberError.set(apiErrorMessage(error));
      },
    });
  }

  protected changeRole(member: MemberDto, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as 'EDITOR' | 'VIEWER';
    if (role === member.role) return;
    this.memberBusy.set(true);
    this.memberError.set(null);
    this.api.updateMember(this.projectId, member.userId, role).subscribe({
      next: (members) => {
        this.members.set(members);
        this.memberBusy.set(false);
      },
      error: (error: unknown) => {
        this.memberBusy.set(false);
        this.memberError.set(apiErrorMessage(error));
        this.load();
      },
    });
  }

  protected removeMember(userId: number): void {
    this.memberBusy.set(true);
    this.memberError.set(null);
    this.api.removeMember(this.projectId, userId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.pendingRemoval.set(null);
        this.memberBusy.set(false);
      },
      error: (error: unknown) => {
        this.memberBusy.set(false);
        this.memberError.set(apiErrorMessage(error));
      },
    });
  }

  protected isCurrentUser(member: MemberDto): boolean {
    return this.auth.user()?.id === member.userId;
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
}
