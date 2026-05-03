import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

/**
 * Защищает приватные роуты — пускает только аутентифицированных.
 * Если есть access-токен но user ещё не загружен — даём пройти,
 * AuthService.bootstrap() в AppComponent уже подгружает /me.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() || auth.getAccessToken()) {
    return true;
  }
  router.navigate(["/auth/login"]);
  return false;
};

/**
 * Для guest-only роутов (login, register).
 * Если уже залогинен — кидает на dashboard.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }
  router.navigateByUrl(auth.defaultRouteForRole(auth.role()));
  return false;
};
