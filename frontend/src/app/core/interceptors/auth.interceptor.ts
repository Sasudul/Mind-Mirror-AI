import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((error) => {
      // Only force logout on 401 if it's NOT an auth endpoint (login/register)
      // This prevents a logout cascade when the user is on the login page
      const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
      if (error.status === 401 && !isAuthEndpoint && auth.isAuthenticated()) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
