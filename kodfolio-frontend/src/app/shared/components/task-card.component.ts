import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Task } from "../../core/models/task.model";

@Component({
  selector: "app-task-card",
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (task) {
      <a
        [routerLink]="['/dashboard/tasks', task.id]"
        class="card p-5 hover:shadow-md hover:border-accent-300 transition block group"
      >
        <!-- Header: company + difficulty -->
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-8 h-8 rounded-md bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700 flex-shrink-0">
              {{ companyInitial() }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-primary-700 truncate">
                {{ task.company.company_name }}
              </p>
              @if (task.company.is_verified) {
                <span class="text-xs text-accent-600">✓ Verified</span>
              }
            </div>
          </div>
          <span [class]="difficultyBadge()">{{ task.difficulty }}</span>
        </div>

        <!-- Title -->
        <h3 class="text-lg font-semibold text-primary-900 mb-2 line-clamp-2 group-hover:text-accent-600 transition">
          {{ task.title }}
        </h3>

        <!-- Skills -->
        @if (task.skills_required.length > 0) {
          <div class="flex flex-wrap gap-1.5 mb-4">
            @for (skill of task.skills_required.slice(0, 4); track skill.id) {
              <span class="badge-muted text-xs">
                {{ skill.icon }} {{ skill.name }}
              </span>
            }
            @if (task.skills_required.length > 4) {
              <span class="text-xs text-primary-500 self-center">
                +{{ task.skills_required.length - 4 }}
              </span>
            }
          </div>
        }

        <!-- Footer: budget + meta -->
        <div class="flex items-center justify-between pt-3 border-t border-primary-100">
          <div class="text-2xl font-bold text-primary-900">
            \${{ task.budget }}
          </div>
          <div class="text-xs text-primary-500 text-right space-y-0.5">
            <div>~{{ task.estimated_hours }}h</div>
            @if (task.applications_count !== undefined) {
              <div>{{ task.applications_count }} applicant{{ task.applications_count === 1 ? '' : 's' }}</div>
            }
          </div>
        </div>
      </a>
    }
  `
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;

  protected companyInitial(): string {
    return (this.task?.company?.company_name?.[0] ?? "?").toUpperCase();
  }

  protected difficultyBadge(): string {
    switch (this.task?.difficulty) {
      case "easy": return "badge-easy";
      case "medium": return "badge-medium";
      case "hard": return "badge-hard";
      default: return "badge-muted";
    }
  }
}
