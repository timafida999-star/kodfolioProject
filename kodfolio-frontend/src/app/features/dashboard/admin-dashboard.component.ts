import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold text-primary-900">Admin Console</h1>
      <p class="text-primary-600">
        Для модерации платформы используйте Django Admin:
        <a class="text-accent-600 hover:underline" href="http://localhost:8000/admin/" target="_blank">
          /admin/
        </a>
      </p>
    </div>
  `
})
export class AdminDashboardComponent {}
