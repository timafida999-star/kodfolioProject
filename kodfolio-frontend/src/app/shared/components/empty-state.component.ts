import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

@Component({
  selector: "app-empty-state",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card p-12 text-center">
      <div class="text-5xl mb-3">{{ icon }}</div>
      <h3 class="text-lg font-semibold text-primary-900">{{ title }}</h3>
      @if (description) {
        <p class="mt-2 text-sm text-primary-600 max-w-md mx-auto">{{ description }}</p>
      }
      <ng-content />
    </div>
  `
})
export class EmptyStateComponent {
  @Input() icon = "📭";
  @Input() title = "Nothing here yet";
  @Input() description = "";
}
