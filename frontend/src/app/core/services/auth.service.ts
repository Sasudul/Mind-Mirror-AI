import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  onboarding_completed: boolean;
  created_at: string;
}

export interface UserPreferences {
  work_start: string;
  work_end: string;
  break_frequency_minutes: number;
  notification_style: string;
  data_retention_days: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'mm_token';
  private readonly USER_KEY = 'mm_user';

  readonly user = signal<UserProfile | null>(this.loadUser());
  readonly isAuthenticated = computed(() => !!this.user());
  readonly userName = computed(() => this.user()?.name ?? '');

  constructor(private http: HttpClient, private router: Router) {}

  register(name: string, email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.API}/register`, { name, email, password }).pipe(
      tap((res) => this.handleAuth(res))
    );
  }

  login(email: string, password: string): Observable<TokenResponse> {
    const body = new URLSearchParams();
    body.set('username', email);
    body.set('password', password);

    return this.http.post<TokenResponse>(`${this.API}/login`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).pipe(
      tap((res) => this.handleAuth(res))
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  refreshProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.API}/me`).pipe(
      tap((profile) => {
        this.user.set(profile);
        localStorage.setItem(this.USER_KEY, JSON.stringify(profile));
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API}/reset-password`, { token, new_password: newPassword });
  }

  private handleAuth(res: TokenResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.access_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.user.set(res.user);
  }

  private loadUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
