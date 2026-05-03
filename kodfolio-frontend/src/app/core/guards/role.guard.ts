import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { UserRole } from "../models/user.model";

/**
 * Использование:
 *   { path: 'company-only', canActivate: [roleGuard], data: { roles: ['company'] } }
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowed = (route.data?.["roles"] ?? []) as UserRole[];
  const role = auth.role();

  if (!role) {
    router.navigate(["/auth/login"]);
    return false;
  }

  if (allowed.length === 0 || allowed.includes(role)) {
    return true;
  }

  router.navigateByUrl(auth.defaultRouteForRole(role));
  return false;
};
