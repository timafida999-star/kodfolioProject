import { HttpClient } from "@angular/common/http";
import { Injectable, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, catchError, map, of, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import {
  AuthResponse,
  AuthTokens,
  User,
  UserRole
} from "../models/user.model";

const ACCESS_KEY = "kodfolio_access";
const REFRESH_KEY = "kodfolio_refresh";

interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  role: UserRole;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Signal-based state (Angular 17 way)
  private readonly _user = signal<User | null>(null);
  private readonly _isLoading = signal(false);

  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<UserRole | null>(() => this._user()?.role ?? null);
  readonly isStudent = computed(() => this.role() === "student");
  readonly isCompany = computed(() => this.role() === "company");
  readonly isMentor = computed(() => this.role() === "mentor");

  // ─── Token storage ──────────────────────────────────────
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }
  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_KEY, tokens.access);
    localStorage.setItem(REFRESH_KEY, tokens.refresh);
  }
  private clearTokens(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  // ─── Auth flows ─────────────────────────────────────────
  register(payload: RegisterPayload): Observable<User> {
    this._isLoading.set(true);
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register/`, payload)
      .pipe(
        tap((res) => {
          this.setTokens({ access: res.access, refresh: res.refresh });
          this._user.set(res.user);
        }),
        map((res) => res.user),
        tap({
          next: () => this._isLoading.set(false),
          error: () => this._isLoading.set(false)
        })
      );
  }

  login(email: string, password: string): Observable<User> {
    this._isLoading.set(true);
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login/`, { email, password })
      .pipe(
        tap((res) => {
          this.setTokens({ access: res.access, refresh: res.refresh });
          this._user.set(res.user);
        }),
        map((res) => res.user),
        tap({
          next: () => this._isLoading.set(false),
          error: () => this._isLoading.set(false)
        })
      );
  }

  logout(): void {
    const refresh = this.getRefreshToken();
    // Best-effort blacklist на бэке — не блокируем UI
    if (refresh) {
      this.http
        .post(`${environment.apiUrl}/auth/logout/`, { refresh })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.clearTokens();
    this._user.set(null);
    this.router.navigate(["/auth/login"]);
  }

  refreshToken(): Observable<AuthTokens | null> {
    const refresh = this.getRefreshToken();
    if (!refresh) return of(null);

    return this.http
      .post<AuthTokens>(`${environment.apiUrl}/auth/refresh/`, { refresh })
      .pipe(
        tap((tokens) => this.setTokens(tokens)),
        catchError(() => {
          this.clearTokens();
          this._user.set(null);
          return of(null);
        })
      );
  }

  /** При старте приложения: если есть токен — подгружаем /me/ */
  bootstrap(): Observable<User | null> {
    const access = this.getAccessToken();
    if (!access) return of(null);

    return this.http.get<User>(`${environment.apiUrl}/auth/me/`).pipe(
      tap((user) => this._user.set(user)),
      catchError(() => {
        // Токен невалиден / сервер не отвечает — чистим
        this.clearTokens();
        this._user.set(null);
        return of(null);
      })
    );
  }

  fetchMe(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiUrl}/auth/me/`)
      .pipe(tap((u) => this._user.set(u)));
  }

  /** Целевой dashboard URL по роли пользователя. */
  defaultRouteForRole(role: UserRole | null): string {
    switch (role) {
      case "student":
        return "/dashboard/student";
      case "company":
        return "/dashboard/company";
      case "mentor":
        return "/dashboard/mentor";
      case "admin":
        return "/dashboard/admin";
      default:
        return "/auth/login";
    }
  }
}
