import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'session', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'session',
    canActivate: [authGuard],
    loadComponent: () => import('./features/video-call/pages/video-call/video-call.component').then(m => m.VideoCallComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'analytics',
    canActivate: [authGuard],
    loadComponent: () => import('./features/analytics/pages/analytics/analytics.component').then(m => m.AnalyticsComponent),
  },
  {
    path: 'focus',
    canActivate: [authGuard],
    loadComponent: () => import('./features/focus-mode/pages/focus-mode/focus-mode.component').then(m => m.FocusModeComponent),
  },
  {
    path: 'journal',
    canActivate: [authGuard],
    loadComponent: () => import('./features/journal/pages/journal/journal.component').then(m => m.JournalComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/settings/pages/settings/settings.component').then(m => m.SettingsComponent),
  },
  { path: '**', redirectTo: 'session' },
];
