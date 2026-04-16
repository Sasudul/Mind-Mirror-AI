import { Component, signal, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'mm-focus-mode',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="focus-page" [class.focus-page--active]="isRunning()">
      @if (!isRunning() && !isBreak()) {
        <div class="focus-start animate-slide-up">
          <h1 class="text-section">FOCUS MODE</h1>
          <p class="text-body text-muted mt-5 mb-9">Pomodoro-style deep work with AI coaching</p>

          <div class="focus-config">
            <div class="form-group">
              <label class="form-label">WORK DURATION (MIN)</label>
              <input type="number" class="form-input" [(ngModel)]="workMinutes" name="workMin" min="5" max="120" style="width:120px; text-align:center;">
            </div>
            <div class="form-group">
              <label class="form-label">BREAK DURATION (MIN)</label>
              <input type="number" class="form-input" [(ngModel)]="breakMinutes" name="breakMin" min="1" max="30" style="width:120px; text-align:center;">
            </div>
          </div>

          <button class="btn btn-brand btn-lg btn-uppercase mt-9" (click)="start()" id="focus-start-btn">
            <span class="material-symbols-outlined">track_changes</span> START FOCUS SESSION
          </button>
        </div>
      } @else {
        <div class="focus-active animate-fade-in">
          <div class="focus-timer-ring">
            <svg viewBox="0 0 200 200" class="timer-svg">
              <circle cx="100" cy="100" r="90" fill="none" stroke="var(--mm-cream)" stroke-width="6" opacity="0.3"/>
              <circle cx="100" cy="100" r="90" fill="none"
                [attr.stroke]="isBreak() ? 'var(--mm-sunshine-500)' : 'var(--mm-orange)'"
                stroke-width="6"
                [attr.stroke-dasharray]="565"
                [attr.stroke-dashoffset]="565 - (565 * progress())"
                stroke-linecap="square" transform="rotate(-90 100 100)"
                style="transition: stroke-dashoffset 1s linear"/>
            </svg>
            <div class="timer-center">
              <div class="text-display" style="font-size: 3.5rem;">{{ timerDisplay() }}</div>
              <div class="text-caption text-uppercase" style="letter-spacing:2px">
                {{ isBreak() ? 'BREAK TIME' : 'FOCUS' }}
              </div>
            </div>
          </div>

          <div class="focus-coaching mt-8">
            <div class="badge badge--lg" [class]="isBreak() ? 'badge--happy' : 'badge--focused'">
              <span class="material-symbols-outlined" style="margin-right:4px; font-size:16px;">{{ isBreak() ? 'coffee' : 'self_improvement' }}</span>
              {{ isBreak() ? 'Relax' : 'Focused' }}
            </div>
          </div>

          <div class="focus-actions mt-8">
            <button class="btn btn-primary btn-uppercase" (click)="stop()" id="focus-stop-btn">END SESSION</button>
          </div>

          <div class="focus-stats mt-9 grid grid-3 gap-6">
            <div class="stat-card">
              <div class="stat-card__value">{{ completedPomodoros() }}</div>
              <div class="stat-card__label">COMPLETED</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__value">{{ totalFocusMinutes() }}m</div>
              <div class="stat-card__label">FOCUS TIME</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__value">{{ workMinutes }}m</div>
              <div class="stat-card__label">INTERVAL</div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .focus-page {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 70vh; text-align: center;
    }
    .focus-page--active { background: var(--mm-warm-ivory); margin: calc(var(--mm-space-9) * -1); padding: var(--mm-space-9); }
    .focus-config { display: flex; gap: var(--mm-space-9); justify-content: center; }
    .focus-timer-ring { position: relative; width: 200px; height: 200px; }
    .timer-svg { width: 100%; height: 100%; }
    .timer-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .focus-coaching { display: flex; justify-content: center; }
    .focus-actions { display: flex; gap: var(--mm-space-4); justify-content: center; }
    .focus-stats { max-width: 500px; width: 100%; }
    input[type="number"] { -moz-appearance: textfield; }
    input[type="number"]::-webkit-inner-spin-button { opacity: 1; }
  `],
})
export class FocusModeComponent implements OnDestroy {
  private ws = inject(WebSocketService);
  private toast = inject(ToastService);
  private api = inject(ApiService);

  workMinutes = 25;
  breakMinutes = 5;

  isRunning = signal(false);
  isBreak = signal(false);
  timerDisplay = signal('25:00');
  progress = signal(0);
  completedPomodoros = signal(0);
  totalFocusMinutes = signal(0);

  private intervalId: any;
  private remainingSeconds = 0;
  private totalSeconds = 0;

  start() {
    this.isRunning.set(true);
    this.isBreak.set(false);
    this.totalSeconds = this.workMinutes * 60;
    this.remainingSeconds = this.totalSeconds;
    this.api.startSession('Focus Mode').subscribe();
    this.ws.sendSessionControl('start');
    this.tick();
  }

  stop() {
    clearInterval(this.intervalId);
    this.isRunning.set(false);
    this.isBreak.set(false);
    this.api.endSession('Focus Mode completed').subscribe();
    this.ws.sendSessionControl('end');
    this.toast.info('Focus Session Ended', `Completed ${this.completedPomodoros()} pomodoros, ${this.totalFocusMinutes()} minutes focused`, 'track_changes');
  }

  private tick() {
    this.intervalId = setInterval(() => {
      this.remainingSeconds--;
      const m = Math.floor(this.remainingSeconds / 60).toString().padStart(2, '0');
      const s = (this.remainingSeconds % 60).toString().padStart(2, '0');
      this.timerDisplay.set(`${m}:${s}`);
      this.progress.set(1 - this.remainingSeconds / this.totalSeconds);

      if (this.remainingSeconds <= 0) {
        clearInterval(this.intervalId);
        if (this.isBreak()) {
          this.isBreak.set(false);
          this.totalSeconds = this.workMinutes * 60;
          this.remainingSeconds = this.totalSeconds;
          this.toast.info('Break Over', 'Time to focus again!', 'track_changes');
          this.tick();
        } else {
          this.completedPomodoros.update((n) => n + 1);
          this.totalFocusMinutes.update((n) => n + this.workMinutes);
          this.isBreak.set(true);
          this.totalSeconds = this.breakMinutes * 60;
          this.remainingSeconds = this.totalSeconds;
          this.toast.success('Pomodoro Complete!', 'Take a break — you earned it', 'emoji_events');
          this.tick();
        }
      }
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
