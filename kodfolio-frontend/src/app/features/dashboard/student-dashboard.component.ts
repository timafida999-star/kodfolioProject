import { CommonModule, DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Application, Task } from "../../core/models/task.model";
import { AuthService } from "../../core/services/auth.service";
import { TasksService } from "../../core/services/tasks.service";
import { EmptyStateComponent } from "../../shared/components/empty-state.component";
import { TaskCardComponent } from "../../shared/components/task-card.component";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-student-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, TaskCardComponent, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-primary-900">
          Hi, {{ displayName() }} 👋
        </h1>
        <p class="text-primary-600 mt-1">Here's what's happening in your workspace.</p>
      </div>

      <!-- Stats grid -->
      <div class="grid sm:grid-cols-4 gap-4">
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Rating</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">
            {{ rating() }} <span class="text-amber-500 text-lg">⭐</span>
          </p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Active tasks</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ activeTasksCount() }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Applications</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ pendingAppsCount() }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Badges</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ badges() }} 🏅</p>
        </div>
      </div>

      <!-- Active tasks -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xl font-semibold text-primary-900">My active tasks</h2>
          <a routerLink="/dashboard/tasks" class="text-sm text-accent-600 hover:underline">
            Browse marketplace →
          </a>
        </div>
        @if (loadingTasks()) {
          <div class="flex justify-center py-8"><app-spinner [size]="28" /></div>
        } @else if (myTasks().length > 0) {
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (t of myTasks(); track t.id) {
              <app-task-card [task]="t" />
            }
          </div>
        } @else {
          <app-empty-state
            icon="🎯"
            title="No active tasks yet"
            description="Browse the marketplace and apply to your first task.">
            <a routerLink="/dashboard/tasks" class="btn-accent mt-4">Browse marketplace →</a>
          </app-empty-state>
        }
      </section>

      <!-- Recent applications -->
      <section>
        <h2 class="text-xl font-semibold text-primary-900 mb-3">My applications</h2>
        @if (loadingApps()) {
          <div class="flex justify-center py-8"><app-spinner [size]="28" /></div>
        } @else if (applications().length > 0) {
          <div class="card divide-y divide-primary-100 overflow-hidden">
            @for (app of applications(); track app.id) {
              <a [routerLink]="['/dashboard/tasks', app.task_id]"
                 class="flex items-center justify-between p-4 hover:bg-primary-50 transition">
                <div class="min-w-0">
                  <p class="font-medium text-primary-900 truncate">{{ app.task_title }}</p>
                  <p class="text-xs text-primary-500 mt-0.5">
                    Applied {{ app.applied_at | date:"mediumDate" }}
                  </p>
                </div>
                <span [class]="appStatusBadge(app.status)">{{ app.status }}</span>
              </a>
            }
          </div>
        } @else {
          <p class="text-sm text-primary-500">You haven't applied to any tasks yet.</p>
        }
      </section>
    </div>
  `
})
export class StudentDashboardComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly tasksApi = inject(TasksService);

  protected readonly myTasks = signal<Task[]>([]);
  protected readonly applications = signal<Application[]>([]);
  protected readonly loadingTasks = signal(true);
  protected readonly loadingApps = signal(true);

  ngOnInit(): void {
    this.tasksApi.myTasks().subscribe({
      next: (res) => {
        this.myTasks.set(res.results);
        this.loadingTasks.set(false);
      },
      error: () => this.loadingTasks.set(false)
    });
    this.tasksApi.myApplications().subscribe({
      next: (res) => {
        this.applications.set(res.results);
        this.loadingApps.set(false);
      },
      error: () => this.loadingApps.set(false)
    });
  }

  protected displayName(): string {
    const u = this.auth.user();
    return u?.profile?.full_name || u?.email?.split("@")[0] || "there";
  }
  protected rating(): string {
    return this.auth.user()?.profile?.rating ?? "0.00";
  }
  protected badges(): number {
    return this.auth.user()?.profile?.badges_count ?? 0;
  }
  protected activeTasksCount(): number {
    return this.myTasks().filter((t) => ["in_progress", "review"].includes(t.status)).length;
  }
  protected pendingAppsCount(): number {
    return this.applications().filter((a) => a.status === "pending").length;
  }
  protected appStatusBadge(s: string): string {
    switch (s) {
      case "accepted": return "badge bg-emerald-100 text-emerald-800";
      case "rejected": return "badge bg-rose-100 text-rose-800";
      case "withdrawn": return "badge-muted";
      default: return "badge-info";
    }
  }
}
