import { CommonModule, DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Review, Submission } from "../../core/models/submission.model";
import { AuthService } from "../../core/services/auth.service";
import { PaymentsService } from "../../core/services/payments.service";
import { SubmissionsService } from "../../core/services/submissions.service";
import { EmptyStateComponent } from "../../shared/components/empty-state.component";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-mentor-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-primary-900">Mentor: {{ name() }} 🛠</h1>
        <p class="text-primary-600 mt-1">Review queue & earnings.</p>
      </div>

      <!-- Stats -->
      <div class="grid sm:grid-cols-3 gap-4">
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Pending in queue</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ pendingCount() }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Reviews completed</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ myReviews().length }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Earned</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">\${{ earnings() }}</p>
        </div>
      </div>

      <!-- Review queue -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xl font-semibold text-primary-900">Review queue</h2>
          <a routerLink="/dashboard/submissions" class="text-sm text-accent-600 hover:underline">
            See all →
          </a>
        </div>
        @if (loadingPending()) {
          <div class="flex justify-center py-8"><app-spinner [size]="28" /></div>
        } @else if (pending().length > 0) {
          <div class="card divide-y divide-primary-100 overflow-hidden">
            @for (s of pending().slice(0, 5); track s.id) {
              <a [routerLink]="['/dashboard/submissions', s.id]"
                 class="flex items-center justify-between p-4 hover:bg-primary-50 transition">
                <div class="min-w-0">
                  <p class="font-medium text-primary-900 truncate">{{ s.task.title }}</p>
                  <p class="text-xs text-primary-500">
                    {{ s.student.email }} · rev #{{ s.revision_number }}
                  </p>
                </div>
                <span class="text-xs text-primary-500">{{ s.submitted_at | date:"shortDate" }}</span>
              </a>
            }
          </div>
        } @else {
          <app-empty-state
            icon="✨"
            title="Queue is empty"
            description="No submissions waiting for review right now."
          />
        }
      </section>

      <!-- Recent reviews -->
      @if (myReviews().length > 0) {
        <section>
          <h2 class="text-xl font-semibold text-primary-900 mb-3">My recent reviews</h2>
          <div class="card divide-y divide-primary-100 overflow-hidden">
            @for (r of myReviews().slice(0, 5); track r.id) {
              <div class="flex items-center justify-between p-4">
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-primary-700">
                    Score: <span class="font-bold text-primary-900">{{ r.overall_score }}/5</span>
                    @if (r.requested_revision) {
                      <span class="badge bg-amber-100 text-amber-800 ml-2">revision</span>
                    }
                  </p>
                  <p class="text-xs text-primary-500 mt-1 line-clamp-1">{{ r.feedback }}</p>
                </div>
                <span class="text-xs text-primary-500 flex-shrink-0">{{ r.created_at | date:"shortDate" }}</span>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `
})
export class MentorDashboardComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly subsApi = inject(SubmissionsService);
  private readonly paymentsApi = inject(PaymentsService);

  protected readonly pending = signal<Submission[]>([]);
  protected readonly myReviews = signal<Review[]>([]);
  protected readonly loadingPending = signal(true);
  protected readonly earnings = signal("0.00");

  protected readonly pendingCount = computed(() => this.pending().length);

  ngOnInit(): void {
    this.subsApi.pendingReview().subscribe({
      next: (res) => {
        this.pending.set(res.results);
        this.loadingPending.set(false);
      },
      error: () => this.loadingPending.set(false)
    });

    this.subsApi.myReviews().subscribe({
      next: (res) => this.myReviews.set(res.results),
      error: () => {}
    });

    // Earnings = сумма mentor_payout транзакций
    this.paymentsApi.myTransactions().subscribe({
      next: (res) => {
        const sum = res.results
          .filter((t) => t.type === "mentor_payout")
          .reduce((acc, t) => acc + Number(t.amount), 0);
        this.earnings.set(sum.toFixed(2));
      },
      error: () => {}
    });
  }

  protected name(): string {
    const u = this.auth.user();
    return u?.profile?.full_name || u?.email?.split("@")[0] || "mentor";
  }
}
