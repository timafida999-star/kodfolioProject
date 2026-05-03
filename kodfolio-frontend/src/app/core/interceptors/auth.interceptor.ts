import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from "@angular/common/http";
import { inject } from "@angular/core";
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { AuthService } from "../services/auth.service";

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

/**
 * - Добавляет Authorization: Bearer на запросы к нашему API.
 * - При 401 — пытается refresh access-токена и повторить запрос.
 * - Если refresh fail — выкидывает на /auth/login.
 *
 * Не трогает: /auth/login/, /auth/register/, /auth/refresh/.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Только наши API-запросы
  const isApi = req.url.startsWith(environment.apiUrl);
  const isAuthEndpoint =
    req.url.includes("/auth/login") ||
    req.url.includes("/auth/register") ||
    req.url.includes("/auth/refresh");

  if (!isApi || isAuthEndpoint) {
    return next(req);
  }

  const access = auth.getAccessToken();
  const authReq = access ? addToken(req, access) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && access) {
        return handle401(authReq, next, auth);
      }
      return throwError(() => err);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    // Уже идёт refresh — ждём его завершения и повторяем
    return refreshSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => next(addToken(req, token)))
    );
  }

  isRefreshing = true;
  refreshSubject.next(null);

  return auth.refreshToken().pipe(
    switchMap((tokens): Observable<HttpEvent<unknown>> => {
      isRefreshing = false;
      if (!tokens) {
        auth.logout();
        return throwError(() => new Error("Session expired"));
      }
      refreshSubject.next(tokens.access);
      return next(addToken(req, tokens.access));
    }),
    catchError((err): Observable<HttpEvent<unknown>> => {
      isRefreshing = false;
      auth.logout();
      return throwError(() => err);
    })
  );
}
