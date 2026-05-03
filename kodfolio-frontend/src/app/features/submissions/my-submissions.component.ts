import { CommonModule, DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Submission } from "../../core/models/submission.model";
import { AuthService } from "../../core/services/auth.service";
import { SubmissionsService } from "../../core/services/submissions.service";
import { EmptyStateComponent } from "../../shared/components/empty-state.component";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-my-submissions",
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-primary-900">{{ pageTitle() }}</h1>
        <p class="text-primary-600 mt-1">{{ pageSubtitle() }}</p>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16"><app-spinner [size]="32" /></div>
      } @else if (submissions().length === 0) {
        <app-empty-state
          [icon]="emptyIcon()"
          [title]="emptyTitle()"
          [description]="emptyDescription()"
        >
          @if (auth.isStudent()) {
            <a routerLink="/dashboard/tasks" class="btn-accent mt-4">Browse marketplace</a>
          }
        </app-empty-state>
      } @else {
        <div class="card divide-y divide-primary-100 overflow-hidden">
          @for (s of submissions(); track s.id) {
            <a [routerLink]="['/dashboard/submissions', s.id]"
               class="flex items-center justify-between gap-4 p-4 hover:bg-primary-50 transition">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-medium text-primary-900 truncate">{{ s.task.title }}</p>
                  <span class="badge-muted text-xs">rev #{{ s.revision_number }}</span>
                  @if (auth.isMentor()) {
                    <span class="badge-info text-xs">{{ s.student.email }}</span>
                  }
                </div>
                <p class="text-xs text-primary-500 mt-1">
                  @if (auth.isMentor()) {
                    Submitted {{ s.submitted_at | date:"medium" }}
                  } @else {
                    Submitted {{ s.submitted_at | date:"medium" }}
                  }
                </p>
              </div>
              <div class="flex items-center gap-3 flex-shrink-0">
                @if (s.avg_score !== null && s.avg_score !== undefined) {
                  <span class="text-sm">
                    <span class="text-amber-500">★</span>
                    <span class="font-semibold">{{ s.avg_score }}</span>
                  </span>
                }
                <span [class]="statusBadge(s.status)">{{ statusLabel(s.status) }}</span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `
})
export class MySubmissionsComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(SubmissionsService);

  protected readonly submissions = signal<Submission[]>([]);
  protected readonly loading = signal(true);

  protected readonly mode = computed<"student" | "mentor">(() =>
    this.auth.isMentor() ? "mentor" : "student"
  );

  ngOnInit(): void {
    if (this.auth.isMentor()) {
      this.api.pendingReview().subscribe({
        next: (res) => {
          this.submissions.set(res.results);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    } else {
      this.api.mine().subscribe({
        next: (res) => {
          this.submissions.set(res.results);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  protected pageTitle(): string {
    return this.mode() === "mentor" ? "Review queue" : "My submissions";
  }

  protected pageSubtitle(): string {
    return this.mode() === "mentor"
      ? "Pending submissions waiting for your review."
      : "Your submitted work and review history.";
  }

  protected emptyIcon(): string {
    return this.mode() === "mentor" ? "✨" : "📤";
  }

  protected emptyTitle(): string {
    return this.mode() === "mentor"
      ? "No submissions in queue"
      : "You haven't submitted anything yet";
  }

  protected emptyDescription(): string {
    return this.mode() === "mentor"
      ? "Check back soon — students submit work daily."
      : "Apply to a task and submit your work to see it here.";
  }

  protected statusBadge(status: string): string {
    switch (status) {
      case "approved": return "badge bg-emerald-100 text-emerald-800";
      case "rejected": return "badge bg-rose-100 text-rose-800";
      case "revision_requested": return "badge bg-amber-100 text-amber-800";
      default: return "badge-info";
    }
  }

  protected statusLabel(status: string): string {
    return status.replace("_", " ");
  }
}
