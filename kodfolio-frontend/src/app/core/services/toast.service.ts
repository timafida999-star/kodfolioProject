import { Injectable, signal } from "@angular/core";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: "root" })
export class ToastService {
  private idCounter = 0;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = "info", durationMs = 3500): void {
    const id = ++this.idCounter;
    this._toasts.update((arr) => [...arr, { id, type, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(msg: string): void {
    this.show(msg, "success");
  }
  error(msg: string): void {
    this.show(msg, "error", 5000);
  }
  info(msg: string): void {
    this.show(msg, "info");
  }
  warning(msg: string): void {
    this.show(msg, "warning");
  }

  dismiss(id: number): void {
    this._toasts.update((arr) => arr.filter((t) => t.id !== id));
  }
}
