import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly currentTheme = signal<ThemeMode>('system');

  constructor() {
    // Load saved theme on initialization
    const saved = localStorage.getItem('mm-theme') as ThemeMode;
    if (saved) {
      this.currentTheme.set(saved);
    }
    
    // Apply theme changes to the document root
    effect(() => {
      const mode = this.currentTheme();
      if (mode === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', mode);
      }
      localStorage.setItem('mm-theme', mode);
    });
  }

  setTheme(mode: ThemeMode) {
    this.currentTheme.set(mode);
  }

  toggleTheme() {
    const next: Record<ThemeMode, ThemeMode> = {
      'system': 'light',
      'light': 'dark',
      'dark': 'system'
    };
    this.currentTheme.set(next[this.currentTheme()]);
  }
}
