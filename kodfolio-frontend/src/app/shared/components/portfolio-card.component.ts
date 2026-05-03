import { CommonModule, DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { PortfolioEntry } from "../../core/models/portfolio.model";

@Component({
  selector: "app-portfolio-card",
  standalone: true,
  imports: [CommonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entry) {
      <article class="card overflow-hidden hover:shadow-lg transition">
        <!-- Header strip with verified badge -->
        <div class="bg-gradient-to-r from-emerald-500 to-accent-500 px-5 py-2 flex items-center justify-between text-white text-xs">
          <span class="font-semibold">✓ Verified completion</span>
          <span>{{ entry.completed_at | date:"mediumDate" }}</span>
        </div>

        <div class="p-5 sm:p-6 space-y-4">
          <!-- Title + difficulty -->
          <div class="flex items-start justify-between gap-3">
            <h3 class="text-lg font-bold text-primary-900 leading-tight">
              {{ entry.task_title }}
            </h3>
            <span [class]="difficultyBadge()">{{ entry.task_difficulty }}</span>
          </div>

          <!-- Company -->
          <div class="flex items-center gap-2 text-sm text-primary-600">
            <span>📦 Built for</span>
            <strong class="text-primary-900">{{ entry.company.company_name }}</strong>
            @if (entry.company.is_verified) {
              <span class="text-accent-600 text-xs">✓</span>
            }
          </div>

          <!-- Description (collapsible) -->
          @if (entry.description) {
            <p class="text-sm text-primary-700 line-clamp-3 whitespace-pre-wrap">
              {{ entry.description }}
            </p>
          }

          <!-- Skills -->
          @if (entry.skills_used.length > 0) {
            <div class="flex flex-wrap gap-1.5">
              @for (skill of entry.skills_used; track skill.id) {
                <span class="badge-info text-xs">
                  {{ skill.icon }} {{ skill.name }}
                </span>
              }
            </div>
          }

          <!-- Mentor review summary -->
          @if (entry.review) {
            <div class="bg-primary-50 rounded-lg p-3 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-primary-700">Mentor verdict</span>
                <span class="text-sm font-bold text-primary-900">
                  ★ {{ entry.review.overall_score }}/5
                </span>
              </div>
              <div class="grid grid-cols-4 gap-1 text-xs text-center">
                <div title="Code quality">
                  <p class="text-primary-500">Code</p>
                  <p class="font-semibold">{{ entry.review.code_quality }}</p>
                </div>
                <div title="Architecture">
                  <p class="text-primary-500">Arch</p>
                  <p class="font-semibold">{{ entry.review.architecture }}</p>
                </div>
                <div title="Correctness">
                  <p class="text-primary-500">Correct</p>
                  <p class="font-semibold">{{ entry.review.correctness }}</p>
                </div>
                <div title="Documentation">
                  <p class="text-primary-500">Docs</p>
                  <p class="font-semibold">{{ entry.review.documentation }}</p>
                </div>
              </div>
              @if (entry.review.feedback) {
                <p class="text-xs text-primary-700 italic line-clamp-2 pt-2 border-t border-primary-200">
                  "{{ entry.review.feedback }}"
                </p>
              }
            </div>
          }

          <!-- Links -->
          <div class="flex flex-wrap gap-2 pt-3 border-t border-primary-100">
            @if (entry.github_pr_url) {
              <a [href]="entry.github_pr_url" target="_blank" rel="noopener"
                 class="text-xs text-accent-600 hover:underline flex items-center gap-1">
                🔗 Code
              </a>
            }
            @if (entry.demo_url) {
              <a [href]="entry.demo_url" target="_blank" rel="noopener"
                 class="text-xs text-accent-600 hover:underline flex items-center gap-1">
                🎥 Demo
              </a>
            }
            <span class="text-xs text-primary-400 ml-auto">👁 {{ entry.views_count }} views</span>
          </div>

          <!-- Owner-only controls -->
          @if (showControls) {
            <div class="flex items-center gap-2 pt-3 border-t border-primary-100">
              @if (entry.is_public) {
                <button class="btn-secondary text-xs px-3 py-1.5" (click)="onToggle.emit(entry)">
                  🔒 Make private
                </button>
                <span class="badge bg-emerald-100 text-emerald-800 text-xs">Public</span>
              } @else {
                <button class="btn-accent text-xs px-3 py-1.5" (click)="onToggle.emit(entry)">
                  🌐 Make public
                </button>
                <span class="badge-muted text-xs">Hidden</span>
              }
            </div>
          }
        </div>
      </article>
    }
  `
})
export class PortfolioCardComponent {
  @Input({ required: true }) entry!: PortfolioEntry;
  @Input() showControls = false;
  @Output() onToggle = new EventEmitter<PortfolioEntry>();

  protected difficultyBadge(): string {
    switch (this.entry?.task_difficulty) {
      case "easy": return "badge-easy";
      case "medium": return "badge-medium";
      case "hard": return "badge-hard";
      default: return "badge-muted";
    }
  }
}
