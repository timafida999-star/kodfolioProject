import { CommonModule, DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Payment, Transaction, TransactionType } from "../../core/models/payment.model";
import { AuthService } from "../../core/services/auth.service";
import { PaymentsService } from "../../core/services/payments.service";
import { EmptyStateComponent } from "../../shared/components/empty-state.component";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-payments-history",
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-primary-900">Payments</h1>
        <p class="text-primary-600 mt-1">{{ subtitle() }}</p>
      </div>

      <!-- Stats -->
      <div class="grid sm:grid-cols-3 gap-4">
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">{{ totalLabel() }}</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">\${{ totalAmount() }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Active escrow</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">\${{ heldAmount() }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Transactions</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ transactions().length }}</p>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16"><app-spinner [size]="32" /></div>
      } @else if (payments().length === 0) {
        <app-empty-state
          icon="💸"
          title="No payments yet"
          [description]="emptyHint()"
        />
      } @else {
        <!-- Payments list -->
        <section>
          <h2 class="text-xl font-semibold text-primary-900 mb-3">Payments by task</h2>
          <div class="space-y-3">
            @for (p of payments(); track p.id) {
              <article class="card p-5">
                <header class="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div class="min-w-0">
                    <a [routerLink]="['/dashboard/tasks', p.task_id]"
                       class="font-medium text-primary-900 hover:text-accent-600 transition">
                      {{ p.task_title }}
                    </a>
                    <p class="text-xs text-primary-500 mt-0.5">
                      {{ p.created_at | date:"medium" }}
                      @if (p.is_mock) {
                        · <span class="text-amber-600">mock mode</span>
                      }
                    </p>
                  </div>
                  <div class="text-right flex items-center gap-2">
                    <span [class]="statusBadge(p.status)">{{ p.status }}</span>
                  </div>
                </header>

                <!-- Splits breakdown -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b border-primary-100">
                  <div>
                    <p class="text-xs text-primary-500">Total</p>
                    <p class="font-bold text-primary-900">\${{ p.amount }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-primary-500">Platform fee</p>
                    <p class="font-medium text-primary-700">\${{ p.platform_fee }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-primary-500">Mentor fee</p>
                    <p class="font-medium text-primary-700">\${{ p.mentor_fee }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-primary-500">Student payout</p>
                    <p class="font-bold text-emerald-700">\${{ p.student_payout }}</p>
                  </div>
                </div>

                <!-- Transactions -->
                @if (p.transactions && p.transactions.length > 0) {
                  <details class="text-sm">
                    <summary class="cursor-pointer text-primary-600 hover:text-primary-900 select-none">
                      Show transactions ({{ p.transactions.length }})
                    </summary>
                    <ul class="mt-3 space-y-2">
                      @for (tx of p.transactions; track tx.id) {
                        <li class="flex items-center justify-between gap-3 text-xs bg-primary-50 rounded-md px-3 py-2">
                          <div class="flex items-center gap-2 min-w-0">
                            <span>{{ txIcon(tx.type) }}</span>
                            <div class="min-w-0">
                              <p class="font-medium text-primary-900">{{ txLabel(tx.type) }}</p>
                              @if (tx.user_email) {
                                <p class="text-primary-500 truncate">{{ tx.user_email }}</p>
                              }
                            </div>
                          </div>
                          <span class="font-mono font-semibold text-primary-900 flex-shrink-0">
                            \${{ tx.amount }}
                          </span>
                        </li>
                      }
                    </ul>
                  </details>
                }
              </article>
            }
          </div>
        </section>
      }
    </div>
  `
})
export class PaymentsHistoryComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(PaymentsService);

  protected readonly payments = signal<Payment[]>([]);
  protected readonly transactions = signal<Transaction[]>([]);
  protected readonly loading = signal(true);

  protected readonly heldAmount = computed(() => {
    const sum = this.payments()
      .filter((p) => p.status === "held")
      .reduce((acc, p) => acc + Number(p.amount), 0);
    return sum.toFixed(2);
  });

  protected readonly totalAmount = computed(() => {
    const role = this.auth.user()?.role;
    let sum = 0;
    if (role === "company") {
      // Total spent on completed tasks
      sum = this.payments()
        .filter((p) => p.status === "released")
        .reduce((acc, p) => acc + Number(p.amount), 0);
    } else if (role === "student") {
      // Total earned by student
      sum = this.transactions()
        .filter((t) => t.type === "student_payout")
        .reduce((acc, t) => acc + Number(t.amount), 0);
    } else if (role === "mentor") {
      // Total earned by mentor
      sum = this.transactions()
        .filter((t) => t.type === "mentor_payout")
        .reduce((acc, t) => acc + Number(t.amount), 0);
    }
    return sum.toFixed(2);
  });

  ngOnInit(): void {
    this.api.myPayments().subscribe({
      next: (res) => {
        this.payments.set(res.results);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.api.myTransactions().subscribe({
      next: (res) => this.transactions.set(res.results),
      error: () => {}
    });
  }

  protected subtitle(): string {
    const role = this.auth.user()?.role;
    if (role === "company") return "Escrow holdings, releases, and refunds.";
    if (role === "mentor") return "Your review-fee earnings.";
    if (role === "student") return "Earnings from completed tasks.";
    return "All payment activity.";
  }

  protected totalLabel(): string {
    const role = this.auth.user()?.role;
    if (role === "company") return "Total spent";
    return "Total earned";
  }

  protected emptyHint(): string {
    const role = this.auth.user()?.role;
    if (role === "company") return "Post a task to start using escrow.";
    if (role === "mentor") return "Review submissions to earn fees.";
    if (role === "student") return "Complete a task to receive your first payout.";
    return "";
  }

  protected statusBadge(status: string): string {
    switch (status) {
      case "released": return "badge bg-emerald-100 text-emerald-800";
      case "held": return "badge bg-amber-100 text-amber-800";
      case "refunded": return "badge bg-rose-100 text-rose-800";
      case "failed": return "badge bg-rose-100 text-rose-800";
      default: return "badge-muted";
    }
  }

  protected txIcon(type: TransactionType): string {
    const icons: Record<TransactionType, string> = {
      escrow_fund: "🔒",
      platform_fee: "🏢",
      mentor_payout: "🛠",
      student_payout: "🎓",
      refund: "↩"
    };
    return icons[type] ?? "💸";
  }

  protected txLabel(type: TransactionType): string {
    const labels: Record<TransactionType, string> = {
      escrow_fund: "Escrow funded",
      platform_fee: "Platform commission",
      mentor_payout: "Mentor payout",
      student_payout: "Student payout",
      refund: "Refund to company"
    };
    return labels[type] ?? type;
  }
}
