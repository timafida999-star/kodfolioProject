import { CommonModule, DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Submission } from "../../core/models/submission.model";
import { AuthService } from "../../core/services/auth.service";
import { SubmissionsService } from "../../core/services/submissions.service";
import { ToastService } from "../../core/services/toast.service";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-submission-detail",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="flex justify-center py-20"><app-spinner [size]="32" /></div>
    }

    @if (submission(); as s) {
      <div class="max-w-5xl space-y-6">
        <a [routerLink]="['/dashboard/tasks', s.task.id]" class="text-sm text-primary-500 hover:text-primary-700">
          ← {{ s.task.title }}
        </a>

        <!-- Header -->
        <div class="card p-6 sm:p-8">
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div class="flex items-center gap-2 flex-wrap mb-2">
                <span [class]="statusBadge(s.status)">{{ statusLabel(s.status) }}</span>
                <span class="badge-muted">Revision #{{ s.revision_number }}</span>
              </div>
              <h1 class="text-2xl font-bold text-primary-900">Submission</h1>
              <p class="text-sm text-primary-600 mt-1">
                Submitted by <strong>{{ studentName(s) }}</strong> on
                {{ s.submitted_at | date:"medium" }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs text-primary-500 uppercase tracking-wide">Task budget</p>
              <p class="text-2xl font-bold text-primary-900">\${{ s.task.budget }}</p>
            </div>
          </div>
        </div>

        <!-- Submission content -->
        <div class="grid lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <!-- Description -->
            <div class="card p-6 sm:p-8">
              <h2 class="text-lg font-semibold text-primary-900 mb-4">Description</h2>
              @if (s.description) {
                <div class="prose text-primary-700 whitespace-pre-wrap leading-relaxed">{{ s.description }}</div>
              } @else {
                <p class="text-sm text-primary-500">No description provided.</p>
              }

              <!-- Links -->
              <div class="mt-6 pt-6 border-t border-primary-100 space-y-2">
                @if (s.github_pr_url) {
                  <a [href]="s.github_pr_url" target="_blank" rel="noopener"
                     class="flex items-center gap-2 text-sm text-accent-600 hover:underline">
                    <span>🔗</span>
                    <span>{{ s.github_pr_url }}</span>
                  </a>
                }
                @if (s.demo_url) {
                  <a [href]="s.demo_url" target="_blank" rel="noopener"
                     class="flex items-center gap-2 text-sm text-accent-600 hover:underline">
                    <span>🎥</span>
                    <span>{{ s.demo_url }}</span>
                  </a>
                }
              </div>
            </div>

            <!-- Reviews list -->
            <div class="card p-6 sm:p-8">
              <h2 class="text-lg font-semibold text-primary-900 mb-4">
                Mentor reviews
                @if (s.reviews && s.reviews.length > 0) {
                  <span class="text-sm text-primary-500 font-normal">({{ s.reviews.length }})</span>
                }
              </h2>

              @if (!s.reviews || s.reviews.length === 0) {
                <p class="text-sm text-primary-500">No reviews yet. Mentors will review soon.</p>
              } @else {
                <div class="space-y-4">
                  @for (r of s.reviews; track r.id) {
                    <div class="border border-primary-200 rounded-lg p-5">
                      <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
                        <div class="flex items-center gap-2">
                          <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                            {{ initialOf(r.mentor_name || r.mentor_email) }}
                          </div>
                          <div>
                            <p class="text-sm font-medium text-primary-900">
                              {{ r.mentor_name || r.mentor_email }}
                            </p>
                            <p class="text-xs text-primary-500">{{ r.created_at | date:"shortDate" }}</p>
                          </div>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="text-amber-500">★</span>
                          <span class="font-bold text-primary-900">{{ r.overall_score }}</span>
                          <span class="text-primary-400">/5</span>
                        </div>
                      </div>

                      <!-- Per-criterion scores -->
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b border-primary-100">
                        <div>
                          <p class="text-xs text-primary-500">Code quality</p>
                          <p class="font-semibold text-primary-900">{{ r.code_quality }}/5</p>
                        </div>
                        <div>
                          <p class="text-xs text-primary-500">Architecture</p>
                          <p class="font-semibold text-primary-900">{{ r.architecture }}/5</p>
                        </div>
                        <div>
                          <p class="text-xs text-primary-500">Correctness</p>
                          <p class="font-semibold text-primary-900">{{ r.correctness }}/5</p>
                        </div>
                        <div>
                          <p class="text-xs text-primary-500">Documentation</p>
                          <p class="font-semibold text-primary-900">{{ r.documentation }}/5</p>
                        </div>
                      </div>

                      <p class="text-sm text-primary-700 whitespace-pre-wrap">{{ r.feedback }}</p>

                      @if (r.requested_revision) {
                        <div class="mt-3 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded">
                          ⚠ Mentor requested revision
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Right column: actions -->
          <div class="space-y-4">
            <!-- Mentor actions -->
            @if (auth.isMentor() && s.status === 'in_review' && !alreadyReviewedByMe(s)) {
              <div class="card p-6 sticky top-20">
                <h3 class="font-semibold text-primary-900 mb-3">Leave a review</h3>
                <form [formGroup]="reviewForm" (ngSubmit)="submitReview()" class="space-y-3">
                  @for (criterion of criteria; track criterion.field) {
                    <div>
                      <label class="label text-xs">{{ criterion.label }}</label>
                      <select [formControlName]="criterion.field" class="input">
                        @for (n of [1,2,3,4,5]; track n) {
                          <option [value]="n">{{ n }} — {{ scoreLabel(n) }}</option>
                        }
                      </select>
                    </div>
                  }
                  <div>
                    <label class="label text-xs">Feedback *</label>
                    <textarea
                      class="input text-sm"
                      formControlName="feedback"
                      rows="5"
                      placeholder="What's strong? What could be improved?"
                    ></textarea>
                  </div>
                  <label class="flex items-start gap-2 text-xs text-primary-700">
                    <input type="checkbox" formControlName="requested_revision" class="mt-0.5" />
                    <span>Request revision (student must re-submit)</span>
                  </label>
                  <button type="submit" class="btn-accent w-full" [disabled]="reviewForm.invalid || actioning()">
                    @if (actioning()) { <app-spinner [size]="16" /> }
                    <span>Submit review</span>
                  </button>
                </form>
              </div>
            }

            <!-- Already reviewed notice -->
            @if (auth.isMentor() && alreadyReviewedByMe(s)) {
              <div class="card p-6 bg-emerald-50 border-emerald-200">
                <div class="text-3xl mb-2">✓</div>
                <h3 class="font-semibold text-emerald-900">You've reviewed this</h3>
                <p class="text-sm text-emerald-800 mt-1">
                  Waiting for the company to make a final decision.
                </p>
              </div>
            }

            <!-- Company actions -->
            @if (auth.isCompany() && isOwner(s) && s.status === 'in_review') {
              <div class="card p-6 sticky top-20 space-y-3">
                <h3 class="font-semibold text-primary-900">Final decision</h3>
                <p class="text-sm text-primary-600">
                  After review, approve to release escrow or reject for revision.
                </p>
                <button class="btn-accent w-full" (click)="approve()" [disabled]="actioning()">
                  ✓ Approve & pay
                </button>
                <button class="btn-secondary w-full" (click)="reject()" [disabled]="actioning()">
                  ✗ Reject (request changes)
                </button>
              </div>
            }

            <!-- Final state cards -->
            @if (s.status === 'approved') {
              <div class="card p-6 bg-emerald-50 border-emerald-200">
                <div class="text-3xl mb-2">🎉</div>
                <h3 class="font-semibold text-emerald-900">Approved</h3>
                <p class="text-sm text-emerald-800 mt-1">
                  Escrow released. Portfolio entry created.
                </p>
              </div>
            }

            @if (s.status === 'rejected') {
              <div class="card p-6 bg-rose-50 border-rose-200">
                <div class="text-3xl mb-2">↩</div>
                <h3 class="font-semibold text-rose-900">Rejected</h3>
                <p class="text-sm text-rose-800 mt-1">
                  Task is back to in-progress. Student can re-submit.
                </p>
              </div>
            }

            @if (s.status === 'revision_requested') {
              <div class="card p-6 bg-amber-50 border-amber-200">
                <div class="text-3xl mb-2">📝</div>
                <h3 class="font-semibold text-amber-900">Revision requested</h3>
                <p class="text-sm text-amber-800 mt-1">
                  A mentor asked for changes. Re-submit when ready.
                </p>
              </div>
            }
          </div>
        </div>
      </div>
    }

    @if (!loading() && !submission()) {
      <div class="card p-12 text-center">
        <div class="text-5xl mb-3">😕</div>
        <h2 class="text-xl font-semibold text-primary-900">Submission not found</h2>
      </div>
    }
  `
})
export class SubmissionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SubmissionsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly submission = signal<Submission | null>(null);
  protected readonly loading = signal(true);
  protected readonly actioning = signal(false);

  protected readonly criteria = [
    { field: "code_quality", label: "Code quality" },
    { field: "architecture", label: "Architecture" },
    { field: "correctness", label: "Correctness" },
    { field: "documentation", label: "Documentation" }
  ] as const;

  protected readonly reviewForm = this.fb.nonNullable.group({
    code_quality: [4, [Validators.required, Validators.min(1), Validators.max(5)]],
    architecture: [4, [Validators.required, Validators.min(1), Validators.max(5)]],
    correctness: [4, [Validators.required, Validators.min(1), Validators.max(5)]],
    documentation: [4, [Validators.required, Validators.min(1), Validators.max(5)]],
    feedback: ["", [Validators.required, Validators.minLength(20)]],
    requested_revision: [false]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.fetchSubmission(id);
  }

  private fetchSubmission(id: string): void {
    this.loading.set(true);
    this.api.detail(id).subscribe({
      next: (s) => {
        this.submission.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.submission.set(null);
        this.loading.set(false);
      }
    });
  }

  protected submitReview(): void {
    const s = this.submission();
    if (!s || this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }
    this.actioning.set(true);
    this.api.review(s.id, this.reviewForm.getRawValue()).subscribe({
      next: () => {
        this.actioning.set(false);
        this.toast.success("Review submitted. Thanks for helping!");
        this.fetchSubmission(s.id);
      },
      error: (err: HttpErrorResponse) => {
        this.actioning.set(false);
        this.toast.error(err.error?.error?.message ?? "Failed to submit review");
      }
    });
  }

  protected approve(): void {
    const s = this.submission();
    if (!s) return;
    if (!confirm("Approve and release escrow? This pays the student.")) return;
    this.actioning.set(true);
    this.api.approve(s.id).subscribe({
      next: () => {
        this.actioning.set(false);
        this.toast.success("Approved! Escrow released. 🎉");
        this.fetchSubmission(s.id);
      },
      error: (err: HttpErrorResponse) => {
        this.actioning.set(false);
        this.toast.error(err.error?.error?.message ?? "Failed to approve");
      }
    });
  }

  protected reject(): void {
    const s = this.submission();
    if (!s) return;
    const reason = prompt("Reason for rejection (optional):") ?? "";
    this.actioning.set(true);
    this.api.reject(s.id, reason).subscribe({
      next: () => {
        this.actioning.set(false);
        this.toast.success("Rejected. Student can re-submit.");
        this.fetchSubmission(s.id);
      },
      error: (err: HttpErrorResponse) => {
        this.actioning.set(false);
        this.toast.error(err.error?.error?.message ?? "Failed to reject");
      }
    });
  }

  protected isOwner(s: Submission): boolean {
    // Submission detail не содержит company_id task'а — но мы можем грубо проверить через current user
    // Backend всё равно валидирует на сервере. Здесь — мягкая UI-проверка.
    return this.auth.isCompany();
  }

  protected alreadyReviewedByMe(s: Submission): boolean {
    const myEmail = this.auth.user()?.email;
    return !!myEmail && (s.reviews ?? []).some((r) => r.mentor_email === myEmail);
  }

  protected studentName(s: Submission): string {
    return s.student.full_name || s.student.email;
  }

  protected statusLabel(status: string): string {
    return status.replace("_", " ");
  }

  protected statusBadge(status: string): string {
    switch (status) {
      case "approved": return "badge bg-emerald-100 text-emerald-800";
      case "rejected": return "badge bg-rose-100 text-rose-800";
      case "revision_requested": return "badge bg-amber-100 text-amber-800";
      default: return "badge-info";
    }
  }

  protected scoreLabel(n: number): string {
    return ({ 1: "Poor", 2: "Below average", 3: "OK", 4: "Good", 5: "Excellent" } as Record<number, string>)[n] ?? "";
  }

  protected initialOf(s: string): string {
    return (s?.[0] ?? "?").toUpperCase();
  }
}
