import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";
import { SpinnerComponent } from "../../../shared/ui/spinner.component";
import { UserRole } from "../../../core/models/user.model";

interface RoleOption {
  value: Exclude<UserRole, "admin">;
  title: string;
  body: string;
  icon: string;
}

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2 mb-6">
      <h2 class="text-3xl font-bold text-primary-900">Create your account</h2>
      <p class="text-primary-600">Choose how you want to use KODfolio.</p>
    </div>

    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
      <!-- Role picker -->
      <div>
        <label class="label">I am a...</label>
        <div class="grid sm:grid-cols-3 gap-2">
          @for (opt of roles; track opt.value) {
            <button
              type="button"
              (click)="form.controls.role.setValue(opt.value)"
              class="text-left p-3 rounded-lg border-2 transition focus:outline-none"
              [class.border-accent-400]="form.controls.role.value === opt.value"
              [class.bg-accent-50]="form.controls.role.value === opt.value"
              [class.border-primary-200]="form.controls.role.value !== opt.value"
              [class.bg-white]="form.controls.role.value !== opt.value"
              [class.hover:border-primary-300]="form.controls.role.value !== opt.value"
            >
              <div class="text-2xl mb-1">{{ opt.icon }}</div>
              <div class="text-sm font-semibold text-primary-900">{{ opt.title }}</div>
              <div class="text-xs text-primary-500 mt-0.5">{{ opt.body }}</div>
            </button>
          }
        </div>
      </div>

      <div>
        <label class="label" for="email">Email</label>
        <input
          id="email"
          type="email"
          class="input"
          formControlName="email"
          autocomplete="email"
          placeholder="you@example.com"
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
          autocomplete="new-password"
          placeholder="Минимум 8 символов"
        />
        @if (form.controls.password.invalid && form.controls.password.touched) {
          <p class="mt-1 text-xs text-danger">Минимум 8 символов</p>
        }
      </div>

      <div>
        <label class="label" for="password_confirm">Confirm password</label>
        <input
          id="password_confirm"
          type="password"
          class="input"
          formControlName="password_confirm"
          autocomplete="new-password"
          placeholder="Повторите пароль"
        />
        @if (form.errors?.["passwordMismatch"] && form.controls.password_confirm.touched) {
          <p class="mt-1 text-xs text-danger">Пароли не совпадают</p>
        }
      </div>

      <button
        type="submit"
        class="btn-accent w-full py-3 text-base"
        [disabled]="form.invalid || loading()"
      >
        @if (loading()) { <app-spinner [size]="18" /> }
        <span>Create account</span>
      </button>

      <p class="text-center text-sm text-primary-600">
        Already have an account?
        <a routerLink="/auth/login" class="font-semibold text-accent-600 hover:text-accent-500">
          Sign in →
        </a>
      </p>
    </form>
  `
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);

  protected readonly roles: RoleOption[] = [
    { value: "student", icon: "🎓", title: "Student", body: "Build my portfolio" },
    { value: "company", icon: "🏢", title: "Company", body: "Hire & post tasks" },
    { value: "mentor",  icon: "🛠", title: "Mentor",  body: "Review submissions" }
  ];

  protected readonly form = this.fb.nonNullable.group(
    {
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(8)]],
      password_confirm: ["", [Validators.required]],
      role: ["student" as Exclude<UserRole, "admin">, [Validators.required]]
    },
    { validators: [matchPasswords] }
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.getRawValue();
    this.loading.set(true);
    this.auth.register(payload).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.toast.success("Welcome to KODfolio! 🎉");
        this.router.navigateByUrl(this.auth.defaultRouteForRole(user.role));
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const message =
          err.error?.error?.message ??
          (err.status === 400 ? "Этот email уже занят или данные некорректны." : "Ошибка регистрации.");
        this.toast.error(message);
      }
    });
  }
}

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const a = group.get("password")?.value;
  const b = group.get("password_confirm")?.value;
  return a && b && a !== b ? { passwordMismatch: true } : null;
}
