import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";
import { SpinnerComponent } from "../../../shared/ui/spinner.component";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2 mb-8">
      <h2 class="text-3xl font-bold text-primary-900">Welcome back</h2>
      <p class="text-primary-600">Sign in to continue your journey.</p>
    </div>

    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
      <div>
        <label class="label" for="email">Email</label>
        <input
          id="email"
          type="email"
          class="input"
          formControlName="email"
          placeholder="you@example.com"
          autocomplete="email"
        />
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <p class="mt-1 text-xs text-danger">Введите корректный email</p>
        }
      </div>

      <div>
        <label class="label" for="password">Password</label>
        <input
          id="password"
          type="password"
          class="input"
          formControlName="password"
          autocomplete="current-password"
          placeholder="••••••••"
        />
        @if (form.controls.password.invalid && form.controls.password.touched) {
          <p class="mt-1 text-xs text-danger">Минимум 8 символов</p>
        }
      </div>

      <button
        type="submit"
        class="btn-primary w-full py-3 text-base"
        [disabled]="form.invalid || loading()"
      >
        @if (loading()) { <app-spinner [size]="18" /> }
        <span>Sign in</span>
      </button>

      <p class="text-center text-sm text-primary-600">
        Don't have an account?
        <a routerLink="/auth/register" class="font-semibold text-accent-600 hover:text-accent-500">
          Sign up →
        </a>
      </p>
    </form>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]]
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.auth.login(email, password).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.toast.success(`Welcome back, ${user.email.split("@")[0]}!`);
        this.router.navigateByUrl(this.auth.defaultRouteForRole(user.role));
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const message = err.error?.error?.message ?? "Не удалось войти. Проверьте данные.";
        this.toast.error(message);
      }
    });
  }
}
