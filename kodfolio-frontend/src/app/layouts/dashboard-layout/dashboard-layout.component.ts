import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

interface NavItem {
  label: string;
  icon: string;
  link: string;
  roles: string[];
}

@Component({
  selector: "app-dashboard-layout",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex bg-primary-50">
      <!-- Sidebar -->
      <aside
        class="w-64 bg-white border-r border-primary-200 flex flex-col
               fixed inset-y-0 left-0 z-30 transition-transform"
        [class.-translate-x-full]="!sidebarOpen()"
        [class.lg:translate-x-0]="true"
      >
        <div class="h-16 flex items-center px-6 border-b border-primary-200">
          <a routerLink="/" class="flex items-center gap-2">
            <span class="text-2xl">⌘</span>
            <span class="font-bold text-lg tracking-tight">
              KOD<span class="text-accent-500">folio</span>
            </span>
          </a>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          @for (item of visibleNav(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="bg-primary-100 text-primary-900"
              [routerLinkActiveOptions]="{ exact: false }"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                     text-primary-600 hover:bg-primary-100 hover:text-primary-900 transition"
            >
              <span class="text-lg">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="p-3 border-t border-primary-200">
          <div class="px-3 py-2 mb-2">
            <p class="text-xs text-primary-500">Signed in as</p>
            <p class="text-sm font-medium text-primary-900 truncate">
              {{ auth.user()?.email }}
            </p>
            <span class="badge-info mt-1">{{ auth.role() }}</span>
          </div>
          <button class="btn-ghost w-full justify-start" (click)="logout()">
            <span>↩</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <!-- Mobile backdrop -->
      @if (sidebarOpen()) {
        <div
          class="fixed inset-0 bg-black/30 z-20 lg:hidden"
          (click)="closeSidebar()"
        ></div>
      }

      <!-- Main content -->
      <div class="flex-1 lg:ml-64">
        <header class="h-16 bg-white border-b border-primary-200 flex items-center px-4 sm:px-6 sticky top-0 z-20">
          <button
            class="lg:hidden btn-ghost"
            (click)="toggleSidebar()"
            aria-label="Toggle menu"
          >☰</button>
          <div class="ml-auto flex items-center gap-3">
            <span class="text-sm text-primary-500">
              {{ auth.user()?.email }}
            </span>
          </div>
        </header>

        <main class="p-4 sm:p-6 lg:p-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `
})
export class DashboardLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly sidebarOpen = signal(false);

  private readonly nav: NavItem[] = [
    { label: "Overview", icon: "🏠", link: "/dashboard/student", roles: ["student"] },
    { label: "Overview", icon: "🏠", link: "/dashboard/company", roles: ["company"] },
    { label: "Overview", icon: "🏠", link: "/dashboard/mentor", roles: ["mentor"] },
    { label: "Overview", icon: "🏠", link: "/dashboard/admin", roles: ["admin"] },
    { label: "Marketplace", icon: "🛒", link: "/dashboard/tasks", roles: ["student", "company", "mentor", "admin"] },
    { label: "My Submissions", icon: "📤", link: "/dashboard/submissions", roles: ["student"] },
    { label: "Review queue", icon: "📝", link: "/dashboard/submissions", roles: ["mentor"] },
    { label: "Portfolio", icon: "🎨", link: "/dashboard/portfolio", roles: ["student", "mentor"] },
    { label: "Payments", icon: "💰", link: "/dashboard/payments", roles: ["student", "company", "mentor"] },
    { label: "My Profile", icon: "👤", link: "/dashboard/profile", roles: ["student", "company", "mentor", "admin"] }
  ];

  protected readonly visibleNav = computed(() => {
    const role = this.auth.role();
    return role ? this.nav.filter((n) => n.roles.includes(role)) : [];
  });

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected logout(): void {
    this.auth.logout();
  }
}
