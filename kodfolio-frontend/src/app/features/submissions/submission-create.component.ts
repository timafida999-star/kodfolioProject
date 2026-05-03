import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Task } from "../../core/models/task.model";
import { SubmissionsService } from "../../core/services/submissions.service";
import { TasksService } from "../../core/services/tasks.service";
import { ToastService } from "../../core/services/toast.service";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-submission-create",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl space-y-6">
      <a [routerLink]="['/dashboard/tasks', taskId]" class="text-sm text-primary-500 hover:text-primary-700">
        ← Back to task
      </a>

      <div>
        <h1 class="text-3xl font-bold text-primary-900">Submit your work</h1>
        @if (task(); as t) {
          <p class="text-primary-600 mt-1">For: <strong>{{ t.title }}</strong></p>
        }
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="card p-6 sm:p-8 space-y-5">
        <div>
          <label class="label" for="pr">GitHub PR URL *</label>
          <input
            id="pr"
            type="url"
            class="input"
            formControlName="github_pr_url"
            placeholder="https://github.com/your-username/repo/pull/123"
          />
          <p class="mt-1 text-xs text-primary-500">
            Link to your Pull Request, branch, or commit.
          </p>
        </div>

        <div>
          <label class="label" for="demo">Demo URL (optional)</label>
          <input
            id="demo"
            type="url"
            class="input"
            formControlName="demo_url"
            placeholder="https://loom.com/share/... or live deployment URL"
          />
          <p class="mt-1 text-xs text-primary-500">
            Loom recording, deployed app, screenshots — anything that shows the work in action.
          </p>
        </div>

        <div>
          <label class="label" for="desc">Description *</label>
          <textarea
            id="desc"
            rows="8"
            class="input font-mono text-sm"
            formControlName="description"
            placeholder="What's done? How to test it? Any tradeoffs / decisions worth noting?"
          ></textarea>
          <p class="mt-1 text-xs text-primary-500">Markdown supported.</p>
        </div>

        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
          <p class="font-semibold text-amber-900">📋 What happens next</p>
          <ul class="text-amber-800 mt-2 space-y-1 list-disc list-inside">
            <li>Your submission goes to mentor review (24–48h SLA)</li>
            <li>Mentors evaluate: code quality, architecture, correctness, documentation</li>
            <li>Company then approves or requests changes</li>
            <li>On approval — you get paid + a verified portfolio entry</li>
          </ul>
        </div>

        <div class="flex gap-3 pt-4 border-t border-primary-100">
          <button type="submit" class="btn-accent" [disabled]="form.invalid || submitting()">
            @if (submitting()) { <app-spinner [size]="16" /> }
            <span>Submit for review</span>
          </button>
          <a [routerLink]="['/dashboard/tasks', taskId]" class="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `
})
export class SubmissionCreateComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasksApi = inject(TasksService);
  private readonly submissionsApi = inject(SubmissionsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly task = signal<Task | null>(null);
  protected readonly submitting = signal(false);
  protected taskId = "";

  protected readonly form = this.fb.nonNullable.group({
    github_pr_url: ["", [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    demo_url: [""],
    description: ["", [Validators.required, Validators.minLength(20)]]
  });

  ngOnInit(): void {
    this.taskId = this.route.snapshot.paramMap.get("taskId") ?? "";
    if (!this.taskId) {
      this.router.navigate(["/dashboard/tasks"]);
      return;
    }
    this.tasksApi.detail(this.taskId).subscribe({
      next: (t) => this.task.set(t),
      error: () => {
        this.toast.error("Task not found");
        this.router.navigate(["/dashboard/tasks"]);
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const v = this.form.getRawValue();
    this.submissionsApi
      .create(this.taskId, {
        github_pr_url: v.github_pr_url,
        demo_url: v.demo_url || undefined,
        description: v.description
      })
      .subscribe({
        next: (sub) => {
          this.submitting.set(false);
          this.toast.success("Submission sent for review! 🚀");
          this.router.navigate(["/dashboard/submissions", sub.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.toast.error(err.error?.error?.message ?? "Failed to submit");
        }
      });
  }
}
