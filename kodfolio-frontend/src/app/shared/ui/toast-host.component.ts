import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ToastService } from "../../core/services/toast.service";

@Component({
  selector: "app-toast-host",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      @for (t of toast.toasts(); track t.id) {
        <div
          class="px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-up flex items-start gap-2"
          [class.bg-emerald-600]="t.type === 'success'"
          [class.bg-red-600]="t.type === 'error'"
          [class.bg-amber-500]="t.type === 'warning'"
          [class.bg-primary-800]="t.type === 'info'"
        >
          <span class="text-white flex-1">{{ t.message }}</span>
          <button
            class="text-white/80 hover:text-white"
            (click)="toast.dismiss(t.id)"
            aria-label="Закрыть"
          >×</button>
        </div>
      }
    </div>
  `
})
export class ToastHostComponent {
  protected readonly toast = inject(ToastService);
}
