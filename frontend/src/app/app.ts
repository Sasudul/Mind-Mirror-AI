import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ToastContainerComponent } from './shared/components/toast/toast.component';
import { AuthService } from './core/services/auth.service';
import { WebSocketService } from './core/services/websocket.service';
import { ToastService } from './core/services/toast.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'mm-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ToastContainerComponent],
  template: `
    <mm-toast-container />
    @if (showLayout) {
      <div class="app-layout">
        <mm-sidebar />
        <main class="app-main">
          <div class="app-content">
            <router-outlet />
          </div>
        </main>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`:host { display: block; min-height: 100vh; }`],
})
export class App implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private ws = inject(WebSocketService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private theme = inject(ThemeService); // Instantiates theme immediately

  showLayout = false;

  private authRoutes = ['/login', '/register'];

  ngOnInit() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe((event) => {
      this.showLayout = !this.authRoutes.some(r => event.urlAfterRedirects.startsWith(r));
    });

    // Connect WebSocket if authenticated
    const user = this.auth.user();
    if (user) {
      this.ws.connect(user.id);
      this.ws.recommendations$.subscribe((rec) => {
        this.toast.recommendation(rec);
      });
    }
  }

  ngOnDestroy() {
    this.ws.disconnect();
  }
}
