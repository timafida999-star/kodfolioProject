import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

@Component({
  selector: "app-spinner",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-flex items-center justify-center" role="status" aria-label="Loading">
      <svg
        [attr.width]="size"
        [attr.height]="size"
        class="animate-spin"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.2" stroke-width="3" />
        <path
          d="M22 12c0-5.523-4.477-10-10-10"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        />
      </svg>
    </div>
  `
})
export class SpinnerComponent {
  @Input() size = 20;
}
