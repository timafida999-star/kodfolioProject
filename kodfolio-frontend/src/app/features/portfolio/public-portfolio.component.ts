import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import { PortfolioEntry } from "../../core/models/portfolio.model";
import { Profile } from "../../core/models/user.model";
import { PortfolioService } from "../../core/services/portfolio.service";
import { ProfileService } from "../../core/services/profile.service";
import { PortfolioCardComponent } from "../../shared/components/portfolio-card.component";
import { SpinnerComponent } from "../../shared/ui/spinner.component";

@Component({
  selector: "app-public-portfolio",
  standalone: true,
  imports: [CommonModule, RouterLink, PortfolioCardComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bg-primary-900 text-white">
      <div class="container-app py-4 flex items-center justify-between">
        <a routerLink="/" class="font-bold text-xl tracking-tight flex items-center gap-2">
          <span class="text-accent-400">{{ '{' }} {{ '}' }}</span>
          <span>KODfolio</span>
        </a>
        <a routerLink="/auth/register" class="btn-accent text-xs">
          Build your own
        </a>
      </div>
    </header>

    <main class="bg-gradient-to-b from-primary-50 to-white min-h-screen">
      @if (loading()) {
        <div class="flex justify-center py-32"><app-spinner [size]="40" /></div>
      }

      @if (!loading() && !profile()) {
        <div class="container-app py-32 text-center">
          <div class="text-5xl mb-3">🔍</div>
          <h2 class="text-2xl font-bold text-primary-900">User not found</h2>
          <p class="text-primary-600 mt-2">
            This profile doesn't exist or has been removed.
          </p>
          <a routerLink="/" class="btn-secondary mt-6 inline-flex">Back home</a>
        </div>
      }

      @if (!loading() && profile()) {
        <!-- Hero / profile card -->
        <section class="container-app pt-12 pb-8">
          <div class="card p-8 sm:p-10">
            <div class="flex items-start gap-6 flex-wrap">
              <!-- Avatar -->
              <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-3xl sm:text-4xl font-bold text-white shadow-md">
                {{ heroInitial() }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 flex-wrap mb-2">
                  <h1 class="text-3xl font-bold text-primary-900">
                    {{ heroName() }}
                  </h1>
                  @if (isMentor()) {
                    <span class="badge-info">Mentor</span>
                  }
                </div>

                <p class="text-primary-600">
                  @if (experienceYears() > 0) {
                    {{ experienceYears() }}+ years experience ·
                  }
                  <span class="font-mono text-sm">{{ profileEmail() }}</span>
                </p>

                @if (profileBio()) {
                  <p class="mt-4 text-primary-700 whitespace-pre-wrap leading-relaxed">{{ profileBio() }}</p>
                }

                <!-- Quick stats -->
                <div class="flex items-center gap-6 mt-5 pt-5 border-t border-primary-100 flex-wrap text-sm">
                  <div>
                    <span class="text-amber-500">★</span>
                    <strong class="text-primary-900">{{ profileRating() }}</strong>
                    <span class="text-primary-500">rating</span>
                  </div>
                  <div>
                    <strong class="text-primary-900">{{ entries().length }}</strong>
                    <span class="text-primary-500">verified projects</span>
                  </div>
                  @if (profileBadges() > 0) {
                    <div>
                      <strong class="text-primary-900">{{ profileBadges() }}</strong>
                      <span class="text-primary-500">badges 🏅</span>
                    </div>
                  }
                  @if (profileGithub()) {
                    <a [href]="profileGithubUrl()" target="_blank" rel="noopener"
                       class="text-accent-600 hover:underline">
                      🐙 GitHub
                    </a>
                  }
                </div>

                <!-- Skills -->
                @if (profileSkills().length > 0) {
                  <div class="mt-5">
                    <p class="text-xs text-primary-500 uppercase tracking-wide mb-2">Skills</p>
                    <div class="flex flex-wrap gap-1.5">
                      @for (skill of profileSkills(); track skill.skill_id) {
                        <span class="badge-info text-xs">
                          {{ skill.icon }} {{ skill.name }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Trust banner -->
            <div class="mt-8 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
              <span class="text-2xl">✓</span>
              <div class="text-sm">
                <p class="font-semibold text-emerald-900">Verified KODfolio profile</p>
                <p class="text-emerald-800">Every project below was completed for a real company and reviewed by a mentor.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Portfolio grid -->
        <section class="container-app pb-16">
          <h2 class="text-2xl font-bold text-primary-900 mb-6">
            Verified projects
            <span class="text-base text-primary-500 font-normal">({{ entries().length }})</span>
          </h2>

          @if (entries().length === 0) {
            <div class="card p-12 text-center">
              <div class="text-5xl mb-3">🎨</div>
              <p class="text-primary-600">No public projects yet.</p>
            </div>
          }

          @if (entries().length > 0) {
            <div class="grid sm:grid-cols-2 gap-5">
              @for (entry of entries(); track entry.id) {
                <app-portfolio-card [entry]="entry" />
              }
            </div>
          }
        </section>

        <!-- CTA footer -->
        <footer class="bg-primary-900 text-white py-12 mt-12">
          <div class="container-app text-center">
            <h3 class="text-2xl font-bold mb-3">Want a portfolio like this?</h3>
            <p class="text-primary-300 mb-6 max-w-xl mx-auto">
              Complete real tasks from real companies. Each one becomes a verified entry — no claims, just proof.
            </p>
            <a routerLink="/auth/register" class="btn-accent">Get started — it's free</a>
          </div>
        </footer>
      }
    </main>
  `
})
export class PublicPortfolioComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly profileApi = inject(ProfileService);
  private readonly portfolioApi = inject(PortfolioService);

  protected readonly profile = signal<Profile | null>(null);
  protected readonly entries = signal<PortfolioEntry[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get("userId");
    if (!userId) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      profile: this.profileApi.getPublicProfile(userId),
      portfolio: this.portfolioApi.publicPortfolio(userId)
    }).subscribe({
      next: ({ profile, portfolio }) => {
        this.profile.set(profile);
        this.entries.set(portfolio.results);
        this.loading.set(false);
      },
      error: () => {
        this.profile.set(null);
        this.loading.set(false);
      }
    });
  }

  // ─── Helpers (template-friendly) ───────────────────────────────
  protected heroInitial(): string {
    const p = this.profile();
    const source = p?.full_name || p?.email || "?";
    return (source[0] ?? "?").toUpperCase();
  }
  protected heroName(): string {
    const p = this.profile();
    return p?.full_name || p?.email?.split("@")[0] || "User";
  }
  protected isMentor(): boolean {
    return this.profile()?.role === "mentor";
  }
  protected experienceYears(): number {
    return this.profile()?.experience_years ?? 0;
  }
  protected profileEmail(): string {
    return this.profile()?.email ?? "";
  }
  protected profileBio(): string {
    return this.profile()?.bio ?? "";
  }
  protected profileRating(): string {
    return this.profile()?.rating ?? "0.00";
  }
  protected profileBadges(): number {
    return this.profile()?.badges_count ?? 0;
  }
  protected profileGithub(): string {
    return this.profile()?.github_username ?? "";
  }
  protected profileGithubUrl(): string {
    return `https://github.com/${this.profileGithub()}`;
  }
  protected profileSkills() {
    return this.profile()?.skills ?? [];
  }
}
