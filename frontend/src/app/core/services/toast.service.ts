import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  emoji?: string;
  duration?: number;
  actions?: { label: string; callback: () => void }[];
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  show(toast: Omit<Toast, 'id'>): number {
    const id = this.nextId++;
    const duration = toast.duration ?? 6000;

    this.toasts.update((list) => [...list, { ...toast, id }]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  info(title: string, message: string, emoji?: string): void {
    this.show({ title, message, type: 'info', emoji });
  }

  success(title: string, message: string, emoji?: string): void {
    this.show({ title, message, type: 'success', emoji });
  }

  warning(title: string, message: string, emoji?: string): void {
    this.show({ title, message, type: 'warning', emoji, duration: 10000 });
  }

  danger(title: string, message: string, emoji?: string): void {
    this.show({ title, message, type: 'danger', emoji, duration: 0 });
  }

  recommendation(rec: any): void {
    this.show({
      title: rec.title,
      message: rec.message,
      type: rec.urgency === 'critical' ? 'danger' : rec.urgency === 'high' ? 'warning' : 'info',
      emoji: rec.emoji,
      duration: rec.urgency === 'critical' ? 0 : 10000,
    });
  }
}
