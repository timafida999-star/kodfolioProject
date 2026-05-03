import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Task } from "../../core/models/task.model";
import { AuthService } from "../../core/services/auth.service";
import { TasksService } from "../../core/services/tasks.service";
import { EmptyStateComponent } from "../../shared/components/empty-state.component";
import { TaskCardComponent } from "../../shared/components/task-card.component";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-company-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink, TaskCardComponent, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-3xl font-bold text-primary-900">{{ companyName() }}</h1>
            @if (isVerified()) {
              <span class="badge-info">✓ Verified</span>
            } @else {
              <span class="badge-muted">Unverified</span>
            }
          </div>
          <p class="text-primary-600 mt-1">{{ industry() || "Set your industry in profile" }}</p>
        </div>
        <a routerLink="/dashboard/tasks/new" class="btn-accent">+ Post a task</a>
      </div>

      <!-- Stats -->
      <div class="grid sm:grid-cols-4 gap-4">
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Open</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ openCount() }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">In progress</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ activeCount() }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Completed</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ completedCount() }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Total spent</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">\${{ totalSpent() }}</p>
        </div>
      </div>

      <!-- Tasks list -->
      <section>
        <h2 class="text-xl font-semibold text-primary-900 mb-3">My tasks</h2>
        @if (loading()) {
          <div class="flex justify-center py-8"><app-spinner [size]="28" /></div>
        } @else if (myTasks().length > 0) {
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (t of myTasks(); track t.id) {
              <app-task-card [task]="t" />
            }
          </div>
        } @else {
          <app-empty-state
            icon="📋"
            title="No tasks posted yet"
            description="Post your first task to start receiving applications from talented students.">
            <a routerLink="/dashboard/tasks/new" class="btn-accent mt-4">Post a task</a>
          </app-empty-state>
        }
      </section>
    </div>
  `
})
export class CompanyDashboardComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly tasksApi = inject(TasksService);

  protected readonly myTasks = signal<Task[]>([]);
  protected readonly loading = signal(true);

  protected readonly openCount = computed(() =>
    this.myTasks().filter((t) => t.status === "open").length
  );
  protected readonly activeCount = computed(() =>
    this.myTasks().filter((t) => ["in_progress", "review"].includes(t.status)).length
  );
  protected readonly completedCount = computed(() =>
    this.myTasks().filter((t) => t.status === "completed").length
  );
  protected readonly totalSpent = computed(() => {
    const sum = this.myTasks()
      .filter((t) => t.status === "completed")
      .reduce((acc, t) => acc + Number(t.budget), 0);
    return sum.toFixed(2);
  });

  ngOnInit(): void {
    this.tasksApi.myTasks().subscribe({
      next: (res) => {
        this.myTasks.set(res.results);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  protected companyName(): string {
    return (
      this.auth.user()?.company_profile?.company_name ||
      this.auth.user()?.email?.split("@")[0] ||
      "Your company"
    );
  }
  protected industry(): string {
    return this.auth.user()?.company_profile?.industry ?? "";
  }
  protected isVerified(): boolean {
    return this.auth.user()?.company_profile?.is_verified ?? false;
  }
}
