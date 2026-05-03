import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Skill } from "../../core/models/user.model";
import { SkillsService } from "../../core/services/skills.service";
import { TasksService } from "../../core/services/tasks.service";
import { ToastService } from "../../core/services/toast.service";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-task-create",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl space-y-6">
      <div>
        <a routerLink="/dashboard/tasks" class="text-sm text-primary-500 hover:text-primary-700">
          ← Back to marketplace
        </a>
        <h1 class="text-3xl font-bold text-primary-900 mt-2">Post a new task</h1>
        <p class="text-primary-600 mt-1">
          Describe what needs to be built. Budget will be held in escrow until you approve the work.
        </p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="card p-6 sm:p-8 space-y-5">
        <div>
          <label class="label" for="title">Title *</label>
          <input
            id="title"
            class="input"
            formControlName="title"
            placeholder="e.g. Build a REST API for user notifications"
            maxlength="200"
          />
        </div>

        <div>
          <label class="label" for="description">Description (Markdown supported) *</label>
          <textarea
            id="description"
            rows="8"
            class="input font-mono text-sm"
            formControlName="description"
            placeholder="What's the deliverable? Acceptance criteria? Tech constraints? Edge cases to handle?"
          ></textarea>
        </div>

        <div class="grid sm:grid-cols-3 gap-4">
          <div>
            <label class="label" for="difficulty">Difficulty *</label>
            <select id="difficulty" class="input" formControlName="difficulty">
              <option value="easy">Easy (junior)</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard (mid+)</option>
            </select>
          </div>
          <div>
            <label class="label" for="budget">Budget (USD) *</label>
            <input
              id="budget"
              type="number"
              class="input"
              formControlName="budget"
              min="1"
              max="10000"
              placeholder="150"
            />
          </div>
          <div>
            <label class="label" for="estimated_hours">Estimate (hours) *</label>
            <input
              id="estimated_hours"
              type="number"
              class="input"
              formControlName="estimated_hours"
              min="1"
              max="500"
              placeholder="8"
            />
          </div>
        </div>

        <!-- Skills picker -->
        <div>
          <label class="label">Required skills</label>
          <p class="text-xs text-primary-500 mb-2">
            Selected: {{ selectedSkillIds().length }} / 8
          </p>
          @if (skillsLoading()) {
            <app-spinner [size]="20" />
          } @else {
            <div class="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-2 border border-primary-200 rounded-lg">
              @for (skill of skills(); track skill.id) {
                <button
                  type="button"
                  (click)="toggleSkill(skill.id)"
                  class="text-xs px-2.5 py-1 rounded-full transition border"
                  [class.bg-accent-500]="isSelected(skill.id)"
                  [class.text-white]="isSelected(skill.id)"
                  [class.border-accent-500]="isSelected(skill.id)"
                  [class.bg-white]="!isSelected(skill.id)"
                  [class.text-primary-700]="!isSelected(skill.id)"
                  [class.border-primary-200]="!isSelected(skill.id)"
                  [class.hover:border-accent-400]="!isSelected(skill.id)"
                >
                  {{ skill.icon }} {{ skill.name }}
                </button>
              }
            </div>
          }
        </div>

        <!-- Escrow notice -->
        <div class="bg-accent-50 border border-accent-200 rounded-lg p-4 text-sm">
          <p class="font-semibold text-accent-900 mb-1">💰 Escrow protection</p>
          <p class="text-accent-800">
            On posting, <strong>\${{ form.controls.budget.value || 0 }}</strong> will be held in escrow.
            On approval: 85% goes to the student, 5% to mentors who reviewed, 10% platform fee.
            If you cancel — full refund.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-4 border-t border-primary-100">
          <button type="submit" class="btn-accent" [disabled]="form.invalid || submitting()">
            @if (submitting()) { <app-spinner [size]="16" /> }
            <span>Post task</span>
          </button>
          <a routerLink="/dashboard/tasks" class="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `
})
export class TaskCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tasksApi = inject(TasksService);
  private readonly skillsApi = inject(SkillsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly skills = signal<Skill[]>([]);
  protected readonly skillsLoading = signal(true);
  protected readonly selectedSkillIds = signal<string[]>([]);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    title: ["", [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
    description: ["", [Validators.required, Validators.minLength(20)]],
    difficulty: ["medium" as "easy" | "medium" | "hard", Validators.required],
    budget: [100, [Validators.required, Validators.min(1), Validators.max(10000)]],
    estimated_hours: [4, [Validators.required, Validators.min(1), Validators.max(500)]]
  });

  ngOnInit(): void {
    this.skillsApi.list().subscribe({
      next: (s) => {
        this.skills.set(s);
        this.skillsLoading.set(false);
      },
      error: () => this.skillsLoading.set(false)
    });
  }

  protected isSelected(id: string): boolean {
    return this.selectedSkillIds().includes(id);
  }

  protected toggleSkill(id: string): void {
    this.selectedSkillIds.update((arr) => {
      if (arr.includes(id)) return arr.filter((x) => x !== id);
      if (arr.length >= 8) {
        this.toast.warning("Maximum 8 skills");
        return arr;
      }
      return [...arr, id];
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.tasksApi
      .create({
        title: v.title,
        description: v.description,
        difficulty: v.difficulty,
        budget: v.budget,
        estimated_hours: v.estimated_hours,
        skill_ids: this.selectedSkillIds()
      })
      .subscribe({
        next: (task) => {
          this.submitting.set(false);
          this.toast.success("Task posted! 🚀");
          this.router.navigate(["/dashboard/tasks", task.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.toast.error(err.error?.error?.message ?? "Failed to create task");
        }
      });
  }
}
