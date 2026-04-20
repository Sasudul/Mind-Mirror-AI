import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'mm-reset-password',
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
          <h1 class="text-subheading" style="text-align:center; margin-top: var(--mm-space-5);">NEW PASSWORD</h1>
          <p class="text-caption text-muted" style="text-align:center;">Set your new account password</p>
        </div>

        @if (!success()) {
          <form (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group">
              <label for="new-password" class="form-label">NEW PASSWORD</label>
              <input id="new-password" type="password" class="form-input" placeholder="Min. 6 characters"
                     [(ngModel)]="password" name="password" required autocomplete="new-password">
            </div>

            <div class="form-group">
              <label for="confirm-password" class="form-label">CONFIRM PASSWORD</label>
              <input id="confirm-password" type="password" class="form-input" placeholder="Repeat new password"
                     [(ngModel)]="confirmPassword" name="confirmPassword" required autocomplete="new-password">
            </div>

            @if (error()) {
              <div class="form-error" style="text-align:center;">{{ error() }}</div>
            }

            <button id="reset-submit" type="submit" class="btn btn-primary btn-uppercase w-full" [disabled]="loading() || !token">
              {{ loading() ? 'UPDATING...' : 'RESET PASSWORD' }}
            </button>
          </form>
        } @else {
          <div class="auth-success" style="text-align:center; padding: var(--mm-space-5);">
            <div class="material-symbols-outlined" style="font-size: 3rem; color: var(--mm-success); margin-bottom: var(--mm-space-5);">check_circle</div>
            <p class="text-body">Your password has been successfully updated!</p>
            <p class="text-caption text-muted mt-3">You can now sign in with your new password.</p>
            <a routerLink="/login" class="btn btn-primary btn-uppercase mt-6 w-full">SIGN IN</a>
          </div>
        }

        @if (!success()) {
          <div class="auth-footer">
            <a routerLink="/login" class="btn-text text-caption" id="reset-back-link">BACK TO LOGIN</a>
          </div>
        }
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
export class ResetPasswordComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  password = '';
  confirmPassword = '';
  token = '';
  loading = signal(false);
  success = signal(false);
  error = signal('');

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error.set('Invalid or missing reset token. Please try requesting a new link.');
    }
  }

  onSubmit() {
    if (!this.password || !this.confirmPassword) {
      this.error.set('Please fill in both password fields');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Failed to reset password. The link may have expired.');
      },
    });
  }
}
