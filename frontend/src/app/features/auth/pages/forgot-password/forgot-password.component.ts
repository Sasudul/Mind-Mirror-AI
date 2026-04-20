import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'mm-forgot-password',
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
          <h1 class="text-subheading" style="text-align:center; margin-top: var(--mm-space-5);">RECOVER PASSWORD</h1>
          <p class="text-caption text-muted" style="text-align:center;">Enter your email to receive a reset link</p>
        </div>

        @if (!success()) {
          <form (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group">
              <label for="forgot-email" class="form-label">EMAIL</label>
              <input id="forgot-email" type="email" class="form-input" placeholder="you&#64;example.com"
                     [(ngModel)]="email" name="email" required autocomplete="email">
            </div>

            @if (error()) {
              <div class="form-error" style="text-align:center;">{{ error() }}</div>
            }

            <button id="forgot-submit" type="submit" class="btn btn-primary btn-uppercase w-full" [disabled]="loading()">
              {{ loading() ? 'SENDING...' : 'SEND RESET LINK' }}
            </button>
          </form>
        } @else {
          <div class="auth-success" style="text-align:center; padding: var(--mm-space-5);">
            <div class="material-symbols-outlined" style="font-size: 3rem; color: var(--mm-success); margin-bottom: var(--mm-space-5);">check_circle</div>
            <p class="text-body">If an account exists for <strong>{{ email }}</strong>, you will receive an email with instructions to reset your password shortly.</p>
          </div>
        }

        <div class="auth-footer">
          <a routerLink="/login" class="btn-text text-caption" id="forgot-back-link">BACK TO LOGIN</a>
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
export class ForgotPasswordComponent {
  private auth = inject(AuthService);

  email = '';
  loading = signal(false);
  success = signal(false);
  error = signal('');

  onSubmit() {
    if (!this.email) {
      this.error.set('Please enter your email');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Something went wrong. Please try again.');
      },
    });
  }
}
