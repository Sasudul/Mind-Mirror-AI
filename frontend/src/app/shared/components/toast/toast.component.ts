import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'mm-toast-container',
  standalone: true,
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast animate-slide-in"
             [class.toast--warning]="toast.type === 'warning'"
             [class.toast--danger]="toast.type === 'danger'"
             [class.toast--success]="toast.type === 'success'"
             [attr.id]="'toast-' + toast.id">
          @if (toast.emoji) {
            <span class="toast__icon material-symbols-outlined">{{ toast.emoji }}</span>
          }
          <div class="toast__content">
            <div class="toast__title">{{ toast.title }}</div>
            <div class="toast__message">{{ toast.message }}</div>
            @if (toast.actions?.length) {
              <div class="toast__actions">
                @for (action of toast.actions; track action.label) {
                  <button class="btn btn-sm btn-secondary" (click)="action.callback(); toastService.dismiss(toast.id)">
                    {{ action.label }}
                  </button>
                }
              </div>
            }
          </div>
          <button class="toast__dismiss material-symbols-outlined" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss">close</button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
