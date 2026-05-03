import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-main-layout",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col">
      <!-- Top header -->
      <header class="bg-white/70 backdrop-blur border-b border-primary-200 sticky top-0 z-30">
        <div class="container-app flex items-center justify-between h-16">
          <a routerLink="/" class="flex items-center gap-2 group">
            <span class="text-2xl">⌘</span>
            <span class="font-bold text-lg tracking-tight">KOD<span class="text-accent-500">folio</span></span>
          </a>
          <nav class="flex items-center gap-4">
            @if (auth.isAuthenticated()) {
              <a [routerLink]="auth.defaultRouteForRole(auth.role())"
                 class="btn-secondary">
                My Dashboard
              </a>
            } @else {
              <a routerLink="/auth/login" class="btn-ghost">Sign in</a>
              <a routerLink="/auth/register" class="btn-accent">Get started</a>
            }
          </nav>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1">
        <router-outlet />
      </main>

      <!-- Footer -->
      <footer class="border-t border-primary-200 bg-white">
        <div class="container-app py-8 text-sm text-primary-500 flex flex-col sm:flex-row justify-between gap-4">
          <p>© 2026 KODfolio. Learning turns into experience, experience turns into a job.</p>
          <p class="font-mono text-xs">v1.0 · MVP</p>
        </div>
      </footer>
    </div>
  `
})
export class MainLayoutComponent {
  protected readonly auth = inject(AuthService);
}
