import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'mm-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card animate-slide-up">
        <div class="auth-brand">
          <div class="block-identity" style="justify-content: center;">
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
          </div>
          <h1 class="text-subheading" style="text-align:center; margin-top: var(--mm-space-5);">MINDMIRROR AI</h1>
          <p class="text-caption text-muted" style="text-align:center;">Emotion-Aware Productivity</p>
        </div>

        <form (ngSubmit)="onLogin()" class="auth-form">
          <div class="form-group">
            <label for="login-email" class="form-label">EMAIL</label>
            <input id="login-email" type="email" class="form-input" placeholder="you&#64;example.com"
                   [(ngModel)]="email" name="email" required autocomplete="email">
          </div>

          <div class="form-group">
            <label for="login-password" class="form-label">PASSWORD</label>
            <input id="login-password" type="password" class="form-input" placeholder="Enter your password"
                   [(ngModel)]="password" name="password" required autocomplete="current-password">
          </div>

          @if (error()) {
            <div class="form-error" style="text-align:center;">{{ error() }}</div>
          }

          <button id="login-submit" type="submit" class="btn btn-primary btn-uppercase w-full" [disabled]="loading()">
            {{ loading() ? 'SIGNING IN...' : 'SIGN IN' }}
          </button>
        </form>

        <div class="auth-footer">
          <span class="text-caption text-muted">Don't have an account?</span>
          <a routerLink="/register" class="btn-text text-caption" id="login-register-link">CREATE ACCOUNT</a>
        </div>
      </div>

      <div class="auth-ambient animate-breathe animate-gradient"></div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--mm-gradient-hero);
      position: relative;
      overflow: hidden;
    }
    .auth-ambient {
      position: absolute;
      inset: 0;
      background: var(--mm-gradient-block);
      opacity: 0.06;
      pointer-events: none;
      z-index: 0;
    }
    .auth-card {
      background: var(--mm-white);
      padding: var(--mm-space-11);
      width: 100%;
      max-width: 420px;
      box-shadow: var(--mm-shadow-golden-lg);
      position: relative;
      z-index: 1;
    }
    .auth-brand { margin-bottom: var(--mm-space-10); }
    .block-identity { justify-content: center; }
    .auth-form { display: flex; flex-direction: column; gap: var(--mm-space-7); }
    .auth-footer {
      margin-top: var(--mm-space-8);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--mm-space-2);
    }
    .w-full { width: 100%; }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  onLogin() {
    if (!this.email || !this.password) {
      this.error.set('Please enter email and password');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Login failed. Please try again.');
      },
    });
  }
}
