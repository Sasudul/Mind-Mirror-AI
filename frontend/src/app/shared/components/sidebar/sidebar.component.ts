import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'mm-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" id="sidebar-nav">
      <div class="sidebar__header">
        <a routerLink="/dashboard" class="navbar__logo" id="sidebar-logo">
          <div class="block-identity">
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
          </div>
          <span class="navbar__logo-text">MINDMIRROR</span>
        </a>
        <div class="sidebar__status">
          <span class="badge" [class]="ws.connected() ? 'badge--focused' : 'badge--stressed'">
            <span class="badge__pulse" [style.background]="ws.connected() ? 'var(--mm-success)' : 'var(--mm-danger)'"></span>
            {{ ws.connected() ? 'LIVE' : 'OFFLINE' }}
          </span>
        </div>
      </div>

      <div class="sidebar__section-label">WORKSPACE</div>
      <nav class="sidebar__nav" aria-label="Main navigation">
        <a routerLink="/session" routerLinkActive="sidebar__item--active" class="sidebar__item" id="nav-session">
          <span class="sidebar__item-icon material-symbols-outlined">videocam</span> AI SESSION
        </a>
        <a routerLink="/dashboard" routerLinkActive="sidebar__item--active" class="sidebar__item" id="nav-dashboard">
          <span class="sidebar__item-icon material-symbols-outlined">dashboard</span> DASHBOARD
        </a>
        <a routerLink="/analytics" routerLinkActive="sidebar__item--active" class="sidebar__item" id="nav-analytics">
          <span class="sidebar__item-icon material-symbols-outlined">show_chart</span> ANALYTICS
        </a>
        <a routerLink="/focus" routerLinkActive="sidebar__item--active" class="sidebar__item" id="nav-focus">
          <span class="sidebar__item-icon material-symbols-outlined">center_focus_strong</span> FOCUS MODE
        </a>
        <a routerLink="/journal" routerLinkActive="sidebar__item--active" class="sidebar__item" id="nav-journal">
          <span class="sidebar__item-icon material-symbols-outlined">history_edu</span> JOURNAL
        </a>
      </nav>

      <div class="sidebar__section-label">ACCOUNT</div>
      <nav class="sidebar__nav">
        <a routerLink="/settings" routerLinkActive="sidebar__item--active" class="sidebar__item" id="nav-settings">
          <span class="sidebar__item-icon material-symbols-outlined">settings</span> SETTINGS
        </a>
        <button class="sidebar__item" (click)="theme.toggleTheme()" id="nav-theme">
          <span class="sidebar__item-icon material-symbols-outlined">
            {{ theme.currentTheme() === 'dark' ? 'light_mode' : (theme.currentTheme() === 'light' ? 'dark_mode' : 'contrast') }}
          </span> 
          {{ theme.currentTheme() === 'dark' ? 'LIGHT MODE' : (theme.currentTheme() === 'light' ? 'DARK MODE' : 'SYSTEM THEME') }}
        </button>
        <button class="sidebar__item" (click)="logout()" id="nav-logout">
          <span class="sidebar__item-icon material-symbols-outlined">logout</span> LOGOUT
        </button>
      </nav>

      <div class="sidebar__footer">
        <div class="avatar">{{ initials() }}</div>
        <div class="sidebar__user-info">
          <div class="text-caption">{{ auth.userName() }}</div>
          <div class="text-small text-muted">{{ auth.user()?.email }}</div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar__header {
      padding: var(--mm-space-7);
      display: flex;
      flex-direction: column;
      gap: var(--mm-space-5);
    }
    .sidebar__status { display: flex; }
    .sidebar__footer {
      display: flex;
      align-items: center;
      gap: var(--mm-space-4);
    }
    .sidebar__user-info { min-width: 0; }
    .sidebar__user-info > * {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    button.sidebar__item {
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
    }
  `],
})
export class SidebarComponent {
  auth = inject(AuthService);
  ws = inject(WebSocketService);
  theme = inject(ThemeService);

  initials() {
    const name = this.auth.userName();
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  logout() {
    this.ws.disconnect();
    this.auth.logout();
  }
}
