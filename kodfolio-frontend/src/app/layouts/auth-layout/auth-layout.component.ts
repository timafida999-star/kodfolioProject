import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";

@Component({
  selector: "app-auth-layout",
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen grid lg:grid-cols-2">
      <!-- Left: hero panel -->
      <aside
        class="hidden lg:flex flex-col justify-between p-12 text-white
               bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 relative overflow-hidden"
      >
        <a routerLink="/" class="flex items-center gap-2 z-10">
          <span class="text-3xl">⌘</span>
          <span class="font-bold text-xl tracking-tight">
            KOD<span class="text-accent-400">folio</span>
          </span>
        </a>

        <div class="z-10 max-w-md">
          <h1 class="text-4xl font-bold leading-tight mb-4">
            Learning turns into <span class="text-accent-400">experience</span>,
            experience turns into a <span class="text-accent-400">job</span>.
          </h1>
          <p class="text-primary-200 leading-relaxed">
            Solve real problems from real companies, get verified by mentors,
            and build a portfolio that speaks louder than any resume.
          </p>
        </div>

        <div class="z-10 grid grid-cols-3 gap-4 text-xs text-primary-300">
          <div><div class="text-2xl font-bold text-accent-400">67%</div>fewer entry-level jobs since 2023</div>
          <div><div class="text-2xl font-bold text-accent-400">42d</div>avg time-to-hire</div>
          <div><div class="text-2xl font-bold text-accent-400">$214B</div>EdTech market 2026</div>
        </div>

        <!-- Decorative glow -->
        <div class="absolute -right-32 -top-32 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl"></div>
        <div class="absolute -left-20 -bottom-20 w-80 h-80 bg-accent-400/10 rounded-full blur-3xl"></div>
      </aside>

      <!-- Right: form area -->
      <main class="flex items-center justify-center p-6 sm:p-12 bg-primary-50">
        <div class="w-full max-w-md">
          <router-outlet />
        </div>
      </main>
    </div>
  `
})
export class AuthLayoutComponent {}
