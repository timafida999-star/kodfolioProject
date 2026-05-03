import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { PortfolioEntry } from "../../core/models/portfolio.model";
import { AuthService } from "../../core/services/auth.service";
import { PortfolioService } from "../../core/services/portfolio.service";
import { ToastService } from "../../core/services/toast.service";
import { EmptyStateComponent } from "../../shared/components/empty-state.component";
import { PortfolioCardComponent } from "../../shared/components/portfolio-card.component";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-my-portfolio",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PortfolioCardComponent,
    EmptyStateComponent,
    SpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl font-bold text-primary-900">My Portfolio</h1>
          <p class="text-primary-600 mt-1">
            Verified completed tasks. Each one is proof of skill — not just claims.
          </p>
        </div>
        @if (entries().length > 0) {
          <a [routerLink]="['/portfolio', auth.user()?.id]"
             target="_blank"
             class="btn-secondary">
            👁 View public profile
          </a>
        }
      </div>

      <!-- Stats -->
      <div class="grid sm:grid-cols-3 gap-4">
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Verified projects</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ entries().length }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Public</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ publicCount() }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs text-primary-500 uppercase tracking-wide">Total views</p>
          <p class="text-2xl font-bold text-primary-900 mt-1">{{ totalViews() }}</p>
        </div>
      </div>

      <!-- Content -->
      @if (loading()) {
        <div class="flex justify-center py-16"><app-spinner [size]="32" /></div>
      } @else if (entries().length === 0) {
        <app-empty-state
          icon="🎨"
          title="No verified projects yet"
          description="Complete a task and get it approved to start building your portfolio.">
          <a routerLink="/dashboard/tasks" class="btn-accent mt-4">Browse marketplace</a>
        </app-empty-state>
      } @else {
        <div class="grid sm:grid-cols-2 gap-5">
          @for (entry of entries(); track entry.id) {
            <app-portfolio-card
              [entry]="entry"
              [showControls]="true"
              (onToggle)="toggleVisibility($event)"
            />
          }
        </div>
      }
    </div>
  `
})
export class MyPortfolioComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(PortfolioService);
  private readonly toast = inject(ToastService);

  protected readonly entries = signal<PortfolioEntry[]>([]);
  protected readonly loading = signal(true);

  protected readonly publicCount = computed(() =>
    this.entries().filter((e) => e.is_public).length
  );
  protected readonly totalViews = computed(() =>
    this.entries().reduce((sum, e) => sum + e.views_count, 0)
  );

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.api.myPortfolio().subscribe({
      next: (res) => {
        this.entries.set(res.results);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error("Failed to load portfolio");
        this.loading.set(false);
      }
    });
  }

  protected toggleVisibility(entry: PortfolioEntry): void {
    const newValue = !entry.is_public;
    this.api.toggleVisibility(entry.id, newValue).subscribe({
      next: () => {
        this.toast.success(
          newValue ? "Now visible on your public profile" : "Hidden from public profile"
        );
        // Optimistic update
        this.entries.update((arr) =>
          arr.map((e) => (e.id === entry.id ? { ...e, is_public: newValue } : e))
        );
      },
      error: () => this.toast.error("Failed to update")
    });
  }
}
