import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { debounceTime, distinctUntilChanged } from "rxjs";
import { Task, TaskDifficulty } from "../../core/models/task.model";
import { Skill } from "../../core/models/user.model";
import { AuthService } from "../../core/services/auth.service";
import { SkillsService } from "../../core/services/skills.service";
import { TaskFilters, TasksService } from "../../core/services/tasks.service";
import { ToastService } from "../../core/services/toast.service";
import { EmptyStateComponent } from "../../shared/components/empty-state.component";
import { TaskCardComponent } from "../../shared/components/task-card.component";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-tasks-list",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TaskCardComponent,
    EmptyStateComponent,
    SpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl font-bold text-primary-900">Marketplace</h1>
          <p class="text-primary-600 mt-1">
            Real tasks from real companies. Build your portfolio one task at a time.
          </p>
        </div>
        @if (auth.isCompany()) {
          <a routerLink="/dashboard/tasks/new" class="btn-accent">
            + Post a task
          </a>
        }
      </div>

      <!-- Filters -->
      <div class="card p-4 sm:p-5">
        <form [formGroup]="filterForm" class="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <!-- Search -->
          <div class="lg:col-span-2">
            <label class="label" for="q">Search</label>
            <input
              id="q"
              type="text"
              class="input"
              formControlName="q"
              placeholder="🔍 Search by title or description..."
            />
          </div>

          <!-- Difficulty -->
          <div>
            <label class="label" for="difficulty">Difficulty</label>
            <select id="difficulty" class="input" formControlName="difficulty">
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <!-- Skill -->
          <div>
            <label class="label" for="skill">Skill</label>
            <select id="skill" class="input" formControlName="skill">
              <option value="">Any skill</option>
              @for (skill of skills(); track skill.id) {
                <option [value]="skill.id">{{ skill.icon }} {{ skill.name }}</option>
              }
            </select>
          </div>

          <!-- Min budget -->
          <div>
            <label class="label" for="min_budget">Min $</label>
            <input
              id="min_budget"
              type="number"
              class="input"
              formControlName="min_budget"
              placeholder="0"
              min="0"
            />
          </div>
        </form>

        @if (hasActiveFilters()) {
          <div class="mt-3 flex items-center gap-2 text-xs">
            <span class="text-primary-500">Filters active.</span>
            <button (click)="resetFilters()" class="text-accent-600 hover:underline">
              Clear all
            </button>
          </div>
        }
      </div>

      <!-- Results count -->
      <div class="flex items-center justify-between">
        <p class="text-sm text-primary-600">
          @if (loading()) {
            Loading...
          } @else {
            <span class="font-medium text-primary-900">{{ count() }}</span>
            {{ count() === 1 ? "task" : "tasks" }} found
          }
        </p>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-16">
          <app-spinner [size]="32" />
        </div>
      }

      <!-- Tasks grid -->
      @if (!loading() && tasks().length > 0) {
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (task of tasks(); track task.id) {
            <app-task-card [task]="task" />
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && tasks().length === 0) {
        <app-empty-state
          icon="🔎"
          title="No tasks match your filters"
          description="Try clearing some filters or check back later — new tasks appear daily."
        >
          @if (hasActiveFilters()) {
            <button class="btn-secondary mt-4" (click)="resetFilters()">
              Clear filters
            </button>
          }
        </app-empty-state>
      }
    </div>
  `
})
export class TasksListComponent implements OnInit {
  private readonly tasksApi = inject(TasksService);
  private readonly skillsApi = inject(SkillsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly count = signal(0);
  protected readonly loading = signal(false);
  protected readonly skills = signal<Skill[]>([]);

  protected readonly filterForm = this.fb.nonNullable.group({
    q: "",
    difficulty: "" as "" | TaskDifficulty,
    skill: "",
    min_budget: ""
  });

  ngOnInit(): void {
    // Загружаем skill-список один раз
    this.skillsApi.list().subscribe({
      next: (s) => this.skills.set(s),
      error: () => {}
    });

    // Реактивный поиск с debounce
    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)))
      .subscribe(() => this.fetch());

    this.fetch();
  }

  protected hasActiveFilters(): boolean {
    const v = this.filterForm.getRawValue();
    return !!(v.q || v.difficulty || v.skill || v.min_budget);
  }

  protected resetFilters(): void {
    this.filterForm.reset({ q: "", difficulty: "", skill: "", min_budget: "" });
  }

  private fetch(): void {
    const v = this.filterForm.getRawValue();
    const filters: TaskFilters = {};
    if (v.q) filters.q = v.q;
    if (v.difficulty) filters.difficulty = v.difficulty;
    if (v.skill) filters.skill = v.skill;
    if (v.min_budget) filters.min_budget = Number(v.min_budget);

    this.loading.set(true);
    this.tasksApi.list(filters).subscribe({
      next: (res) => {
        this.tasks.set(res.results);
        this.count.set(res.count);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load tasks");
        this.loading.set(false);
      }
    });
  }
}
