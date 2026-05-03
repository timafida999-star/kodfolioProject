import { CommonModule, DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Application } from "../../core/models/task.model";
import { Submission } from "../../core/models/submission.model";
import { Task } from "../../core/models/task.model";
import { AuthService } from "../../core/services/auth.service";
import { SubmissionsService } from "../../core/services/submissions.service";
import { TasksService } from "../../core/services/tasks.service";
import { ToastService } from "../../core/services/toast.service";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-task-detail",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="flex justify-center py-20">
        <app-spinner [size]="32" />
      </div>
    }

    @if (!loading() && !task()) {
      <div class="card p-12 text-center">
        <div class="text-5xl mb-3">😕</div>
        <h2 class="text-xl font-semibold text-primary-900">Task not found</h2>
        <a routerLink="/dashboard/tasks" class="btn-secondary mt-4 inline-flex">
          Back to marketplace
        </a>
      </div>
    }

    @if (task(); as t) {
      <div class="max-w-5xl space-y-6">
        <!-- Back link -->
        <a routerLink="/dashboard/tasks" class="text-sm text-primary-500 hover:text-primary-700">
          ← Back to marketplace
        </a>

        <!-- Header card -->
        <div class="card p-6 sm:p-8">
          <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center text-lg font-bold text-primary-700">
                {{ companyInitial(t) }}
              </div>
              <div>
                <p class="font-semibold text-primary-900">{{ t.company.company_name }}</p>
                @if (t.company.is_verified) {
                  <span class="text-xs text-accent-600">✓ Verified company</span>
                }
              </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span [class]="difficultyBadge(t)">{{ t.difficulty }}</span>
              <span [class]="statusBadge(t)">{{ statusLabel(t) }}</span>
            </div>
          </div>

          <h1 class="text-3xl font-bold text-primary-900">{{ t.title }}</h1>

          <!-- Meta -->
          <div class="grid sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-primary-100">
            <div>
              <p class="text-xs text-primary-500 uppercase tracking-wide">Budget</p>
              <p class="text-2xl font-bold text-primary-900 mt-1">\${{ t.budget }}</p>
            </div>
            <div>
              <p class="text-xs text-primary-500 uppercase tracking-wide">Estimate</p>
              <p class="text-2xl font-bold text-primary-900 mt-1">~{{ t.estimated_hours }}h</p>
            </div>
            <div>
              <p class="text-xs text-primary-500 uppercase tracking-wide">Applicants</p>
              <p class="text-2xl font-bold text-primary-900 mt-1">{{ t.applications_count ?? 0 }}</p>
            </div>
            <div>
              <p class="text-xs text-primary-500 uppercase tracking-wide">Posted</p>
              <p class="text-sm text-primary-900 mt-2">{{ t.created_at | date:"mediumDate" }}</p>
            </div>
          </div>
        </div>

        <!-- Description + Apply -->
        <div class="grid lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <div class="card p-6 sm:p-8">
              <h2 class="text-lg font-semibold text-primary-900 mb-4">Description</h2>
              <div class="prose text-primary-700 whitespace-pre-wrap leading-relaxed">{{ t.description }}</div>
            </div>

            @if (t.skills_required.length > 0) {
              <div class="card p-6 sm:p-8">
                <h2 class="text-lg font-semibold text-primary-900 mb-4">Skills required</h2>
                <div class="flex flex-wrap gap-2">
                  @for (skill of t.skills_required; track skill.id) {
                    <span class="badge-info">{{ skill.icon }} {{ skill.name }}</span>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Right column: Apply / Manage -->
          <div class="space-y-4">
            @if (auth.isStudent() && t.status === 'open' && t.has_applied) {
              <div class="card p-6 bg-emerald-50 border-emerald-200">
                <div class="text-3xl mb-2">✓</div>
                <h3 class="font-semibold text-emerald-900">Application sent</h3>
                <p class="text-sm text-emerald-800 mt-1">
                  You'll be notified when the company reviews your application.
                </p>
              </div>
            }

            @if (auth.isStudent() && t.status === 'open' && !t.has_applied) {
              <div class="card p-6 sticky top-20">
                <h3 class="font-semibold text-primary-900 mb-3">Apply for this task</h3>
                <form [formGroup]="applyForm" (ngSubmit)="apply()" class="space-y-3">
                  <div>
                    <label class="label" for="cover">Cover letter</label>
                    <textarea
                      id="cover"
                      rows="6"
                      class="input"
                      formControlName="cover_letter"
                      placeholder="Why are you a great fit? Mention relevant experience and how you'd approach this task."
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    class="btn-accent w-full"
                    [disabled]="applyForm.invalid || applying()"
                  >
                    @if (applying()) { <app-spinner [size]="16" /> }
                    <span>Send application</span>
                  </button>
                </form>
              </div>
            }

            @if (auth.isStudent() && t.status !== 'open' && isAssignee(t)) {
              <div class="card p-6 space-y-3">
                <h3 class="font-semibold text-primary-900">You're working on this</h3>
                <p class="text-sm text-primary-600">Status: <strong>{{ t.status }}</strong></p>

                @if (t.status === 'in_progress') {
                  <a [routerLink]="['/dashboard/tasks', t.id, 'submit']" class="btn-accent w-full">
                    📤 Submit work
                  </a>
                }

                @if (taskSubmissions().length > 0) {
                  <div class="pt-3 border-t border-primary-100">
                    <p class="text-xs text-primary-500 mb-2">Your submissions:</p>
                    <div class="space-y-1">
                      @for (sub of taskSubmissions(); track sub.id) {
                        <a [routerLink]="['/dashboard/submissions', sub.id]"
                           class="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-primary-50">
                          <span>Revision #{{ sub.revision_number }}</span>
                          <span [class]="submissionStatusBadge(sub.status)">{{ sub.status }}</span>
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            @if (auth.isStudent() && t.status !== 'open' && !isAssignee(t)) {
              <div class="card p-6 bg-primary-50">
                <p class="text-sm text-primary-700">
                  This task is no longer accepting applications (status: {{ t.status }}).
                </p>
              </div>
            }

            @if (auth.isCompany() && isOwner(t)) {
              <div class="card p-6 space-y-3">
                <h3 class="font-semibold text-primary-900">Your task</h3>
                <p class="text-sm text-primary-600">
                  You posted this task. Manage applications below.
                </p>
                @if (t.status === 'open') {
                  <button class="btn-danger w-full" (click)="cancelTaskById(t.id)">
                    Cancel task (refund escrow)
                  </button>
                }

                @if (taskSubmissions().length > 0) {
                  <div class="pt-3 border-t border-primary-100">
                    <p class="text-xs text-primary-500 mb-2">Submissions:</p>
                    <div class="space-y-1">
                      @for (sub of taskSubmissions(); track sub.id) {
                        <a [routerLink]="['/dashboard/submissions', sub.id]"
                           class="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-primary-50">
                          <span>Rev #{{ sub.revision_number }}</span>
                          <span [class]="submissionStatusBadge(sub.status)">{{ sub.status }}</span>
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            @if (!auth.isAuthenticated()) {
              <div class="card p-6 bg-primary-50 text-center">
                <p class="text-sm text-primary-700 mb-3">
                  Sign in to apply for this task.
                </p>
                <a routerLink="/auth/login" class="btn-accent w-full">Sign in</a>
              </div>
            }
          </div>
        </div>

        <!-- Applications list (for company-owner) -->
        @if (auth.isCompany() && isOwner(t) && applications().length > 0) {
          <div class="card p-6 sm:p-8">
            <h2 class="text-lg font-semibold text-primary-900 mb-4">
              Applications ({{ applications().length }})
            </h2>
            <div class="space-y-3">
              @for (app of applications(); track app.id) {
                <div class="border border-primary-200 rounded-lg p-4 flex items-start justify-between gap-4 flex-wrap">
                  <div class="flex items-start gap-3 flex-1 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700 flex-shrink-0">
                      {{ initialOf(app.student.full_name || app.student.email) }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-medium text-primary-900">
                          {{ app.student.full_name || app.student.email }}
                        </p>
                        @if (app.student.rating > 0) {
                          <span class="text-xs text-amber-600">★ {{ app.student.rating }}</span>
                        }
                        <span [class]="appStatusBadge(app)">{{ app.status }}</span>
                      </div>
                      @if (app.student.github_username) {
                        <p class="text-xs text-primary-500">{{ githubHandle(app.student.github_username) }}</p>
                      }
                      @if (app.cover_letter) {
                        <p class="text-sm text-primary-700 mt-2 whitespace-pre-wrap">{{ app.cover_letter }}</p>
                      }
                    </div>
                  </div>
                  @if (app.status === 'pending' && t.status === 'open') {
                    <div class="flex gap-2 flex-shrink-0">
                      <button class="btn-accent text-xs px-3 py-1.5"
                              (click)="acceptApplicant(t.id, app.id)">
                        Accept
                      </button>
                      <button class="btn-secondary text-xs px-3 py-1.5"
                              (click)="rejectApplicant(t.id, app.id)">
                        Reject
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `
})
export class TaskDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasksApi = inject(TasksService);
  private readonly submissionsApi = inject(SubmissionsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly task = signal<Task | null>(null);
  protected readonly applications = signal<Application[]>([]);
  protected readonly taskSubmissions = signal<Submission[]>([]);
  protected readonly loading = signal(true);
  protected readonly applying = signal(false);

  protected readonly applyForm = this.fb.nonNullable.group({
    cover_letter: ["", [Validators.required, Validators.minLength(10)]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.fetchTask(id);
  }

  private fetchTask(id: string): void {
    this.loading.set(true);
    this.tasksApi.detail(id).subscribe({
      next: (t) => {
        this.task.set(t);
        this.loading.set(false);
        if (this.auth.isCompany() && this.isOwner(t)) {
          this.fetchApplications(id);
        }
        // Подгружаем submissions для assignee-студента или company-owner
        if (this.isAssignee(t) || (this.auth.isCompany() && this.isOwner(t))) {
          this.fetchSubmissions(id);
        }
      },
      error: () => {
        this.task.set(null);
        this.loading.set(false);
      }
    });
  }

  private fetchApplications(taskId: string): void {
    this.tasksApi.applications(taskId).subscribe({
      next: (res) => this.applications.set(res.results),
      error: () => {}
    });
  }

  private fetchSubmissions(taskId: string): void {
    this.submissionsApi.listForTask(taskId).subscribe({
      next: (subs) => this.taskSubmissions.set(subs),
      error: () => {}
    });
  }

  protected isOwner(t: Task): boolean {
    return this.auth.user()?.company_profile?.id === t.company.id;
  }

  protected isAssignee(t: Task): boolean {
    return this.auth.user()?.id === t.assignee;
  }

  protected submissionStatusBadge(status: string): string {
    switch (status) {
      case "approved": return "badge bg-emerald-100 text-emerald-800 text-xs";
      case "rejected": return "badge bg-rose-100 text-rose-800 text-xs";
      case "revision_requested": return "badge bg-amber-100 text-amber-800 text-xs";
      default: return "badge-info text-xs";
    }
  }

  protected isOwnerOfCurrent(): boolean {
    const t = this.task();
    return !!t && this.isOwner(t);
  }

  protected currentStatus(): string {
    return this.task()?.status ?? "";
  }

  protected statusLabel(t: Task): string {
    return t.status.replace("_", " ");
  }

  protected initialOf(s: string): string {
    return (s?.[0] ?? "?").toUpperCase();
  }

  protected acceptApplicantById(appId: string): void {
    const t = this.task();
    if (t) this.acceptApplicant(t.id, appId);
  }

  protected rejectApplicantById(appId: string): void {
    const t = this.task();
    if (t) this.rejectApplicant(t.id, appId);
  }

  protected cancelCurrent(): void {
    const t = this.task();
    if (t) this.cancelTask(t.id);
  }

  protected cancelTaskById(id: string): void {
    this.cancelTask(id);
  }

  protected apply(): void {
    const t = this.task();
    if (!t || this.applyForm.invalid) {
      this.applyForm.markAllAsTouched();
      return;
    }
    this.applying.set(true);
    this.tasksApi.apply(t.id, this.applyForm.controls.cover_letter.value).subscribe({
      next: () => {
        this.applying.set(false);
        this.toast.success("Application sent! 🎉");
        this.fetchTask(t.id);
      },
      error: (err: HttpErrorResponse) => {
        this.applying.set(false);
        this.toast.error(err.error?.error?.message ?? "Failed to apply");
      }
    });
  }

  protected acceptApplicant(taskId: string, appId: string): void {
    this.tasksApi.acceptApplication(taskId, appId).subscribe({
      next: () => {
        this.toast.success("Applicant accepted. Task is now in progress.");
        this.fetchTask(taskId);
      },
      error: () => this.toast.error("Failed to accept application")
    });
  }

  protected rejectApplicant(taskId: string, appId: string): void {
    this.tasksApi.rejectApplication(taskId, appId).subscribe({
      next: () => {
        this.toast.success("Application rejected.");
        this.fetchApplications(taskId);
      },
      error: () => this.toast.error("Failed to reject application")
    });
  }

  protected cancelTask(taskId: string): void {
    if (!confirm("Cancel this task? Escrow will be refunded.")) return;
    this.tasksApi.cancel(taskId).subscribe({
      next: () => {
        this.toast.success("Task cancelled. Refund issued.");
        this.fetchTask(taskId);
      },
      error: () => this.toast.error("Failed to cancel task")
    });
  }

  protected companyInitial(t: Task): string {
    return (t.company.company_name?.[0] ?? "?").toUpperCase();
  }
  protected difficultyBadge(t: Task): string {
    return ({ easy: "badge-easy", medium: "badge-medium", hard: "badge-hard" } as Record<string, string>)[
      t.difficulty
    ] ?? "badge-muted";
  }
  protected statusBadge(t: Task): string {
    return t.status === "open" ? "badge-info" : "badge-muted";
  }
  protected appStatusBadge(app: Application): string {
    switch (app.status) {
      case "accepted": return "badge bg-emerald-100 text-emerald-800";
      case "rejected": return "badge bg-rose-100 text-rose-800";
      case "withdrawn": return "badge-muted";
      default: return "badge-info";
    }
  }

  protected githubHandle(username: string): string {
    return `@${username}`;
  }
}
