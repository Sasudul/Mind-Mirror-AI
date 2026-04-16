import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'mm-dashboard',
  standalone: true,
  template: `
    <div class="dashboard stagger-enter">
      <!-- Page Header -->
      <div class="dashboard__header animate-slide-up">
        <div>
          <h1 class="text-section">{{ greeting() }}</h1>
          <p class="text-body text-muted mt-3">Here's how you're doing today</p>
        </div>
        <div class="dashboard__session-controls">
          @if (sessionActive()) {
            <div class="badge badge--lg badge--focused">
              <span class="badge__pulse"></span>
              SESSION ACTIVE — {{ sessionTimer() }}
            </div>
            <button class="btn btn-primary btn-sm btn-uppercase" (click)="endSession()" id="end-session-btn">END SESSION</button>
          } @else {
            <button class="btn btn-brand btn-uppercase" (click)="startSession()" id="start-session-btn">START SESSION</button>
          }
        </div>
      </div>

      <!-- Live Status Bar -->
      <div class="dashboard__status-bar">
        <div class="stat-card hover-lift">
          <div class="stat-card__icon material-symbols-outlined">{{ currentEmoji() }}</div>
          <div class="stat-card__value">{{ currentEmotion() }}</div>
          <div class="stat-card__label">CURRENT MOOD</div>
          <div class="stat-card__trend" [class.stat-card__trend--up]="emotionConfidence() > 0.7">
            {{ (emotionConfidence() * 100).toFixed(0) }}% confidence
          </div>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card__icon material-symbols-outlined">track_changes</div>
          <div class="stat-card__value">{{ focusScore() }}%</div>
          <div class="stat-card__label">FOCUS SCORE</div>
          <div class="stat-card__trend stat-card__trend--up">Today</div>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card__icon material-symbols-outlined">sentiment_sweat</div>
          <div class="stat-card__value">{{ stressLevel() }}%</div>
          <div class="stat-card__label">STRESS LEVEL</div>
          <div class="stat-card__trend" [class.stat-card__trend--down]="stressLevel() > 50">
            {{ stressLevel() > 50 ? '↑ High' : '↓ Normal' }}
          </div>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card__icon material-symbols-outlined">keyboard</div>
          <div class="stat-card__value">{{ typingSpeed() }}</div>
          <div class="stat-card__label">TYPING WPM</div>
          <div class="stat-card__trend stat-card__trend--up">Average</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="dashboard__charts">
        <div class="chart-card hover-lift">
          <div class="chart-card__header">
            <span class="chart-card__title">EMOTION TIMELINE</span>
            <span class="text-small text-muted">Last 2 hours</span>
          </div>
          <div class="chart-area" id="emotion-timeline-chart">
            @if (timelineData().length) {
              <div class="mini-chart">
                @for (point of timelineData().slice(-30); track $index) {
                  <div class="mini-chart__bar"
                       [style.height.%]="point.confidence * 100"
                       [style.background]="getEmotionColor(point.emotion)"
                       [title]="point.emotion + ': ' + (point.confidence * 100).toFixed(0) + '%'">
                  </div>
                }
              </div>
            } @else {
              <div class="chart-empty">
                <span class="text-caption text-muted">Start a session to see emotion data</span>
              </div>
            }
          </div>
        </div>

        <div class="chart-card hover-lift">
          <div class="chart-card__header">
            <span class="chart-card__title">PRODUCTIVITY HEATMAP</span>
            <span class="text-small text-muted">Today</span>
          </div>
          <div class="heatmap" id="productivity-heatmap">
            @for (hour of heatmapHours; track hour) {
              <div class="heatmap__cell"
                   [style.background]="getHeatmapColor(heatmapData()[hour] || 0)"
                   [title]="hour + ':00 — ' + (heatmapData()[hour] || 0).toFixed(0) + '% focus'">
                <span class="heatmap__label">{{ hour }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="dashboard__recommendations">
        <h2 class="text-body text-uppercase mb-5" style="letter-spacing:1px;">AI RECOMMENDATIONS</h2>
        @if (recommendations().length) {
          <div class="rec-grid stagger-enter">
            @for (rec of recommendations(); track rec.id) {
              <div class="rec-card hover-lift" [class.rec-card--high]="rec.urgency === 'high' || rec.urgency === 'critical'">
                <span class="rec-card__emoji material-symbols-outlined">{{ rec.emoji }}</span>
                <div class="rec-card__content">
                  <div class="rec-card__title">{{ rec.title }}</div>
                  <div class="rec-card__message text-caption text-muted">{{ rec.message }}</div>
                </div>
                <div class="rec-card__actions">
                  <button class="btn btn-sm btn-secondary" (click)="feedbackRec(rec.id, 'helpful')">Helpful</button>
                  <button class="btn btn-sm btn-ghost" (click)="dismissRec(rec.id)">Dismiss</button>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="card card-cream" style="text-align:center; padding: var(--mm-space-9);">
            <span class="material-symbols-outlined" style="font-size: 2rem;">flare</span>
            <p class="text-body mt-3">No recommendations yet</p>
            <p class="text-caption text-muted">Start a session and we'll provide personalized insights</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard { display: flex; flex-direction: column; gap: var(--mm-space-9); }
    .dashboard__header {
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: var(--mm-space-6);
    }
    .dashboard__session-controls { display: flex; align-items: center; gap: var(--mm-space-4); }
    .dashboard__status-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--mm-space-6); }
    .dashboard__charts { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--mm-space-6); }
    .dashboard__recommendations { }
    .rec-grid { display: flex; flex-direction: column; gap: var(--mm-space-4); }
    .rec-card {
      display: flex; align-items: center; gap: var(--mm-space-5);
      background: var(--mm-white); padding: var(--mm-space-6);
      box-shadow: var(--mm-shadow-golden-sm); transition: all 250ms ease;
    }
    .rec-card:hover { box-shadow: var(--mm-shadow-golden); transform: translateY(-1px); }
    .rec-card--high { border-left: 4px solid var(--mm-orange); }
    .rec-card__emoji { font-size: 1.5rem; flex-shrink: 0; }
    .rec-card__content { flex: 1; min-width: 0; }
    .rec-card__title { font-size: var(--mm-text-body); }
    .rec-card__message { margin-top: 2px; }
    .rec-card__actions { display: flex; gap: var(--mm-space-2); flex-shrink: 0; }
    .chart-area { height: 200px; display: flex; align-items: flex-end; }
    .chart-empty {
      height: 200px; display: flex; align-items: center; justify-content: center; width: 100%;
      background: var(--mm-warm-ivory);
    }
    .mini-chart {
      display: flex; align-items: flex-end; gap: 2px; width: 100%; height: 100%;
      padding: var(--mm-space-3) 0;
    }
    .mini-chart__bar {
      flex: 1; min-height: 4px; transition: height 300ms ease;
    }
    .heatmap {
      display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px;
    }
    .heatmap__cell {
      aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
      position: relative; transition: all 200ms ease; cursor: default;
    }
    .heatmap__cell:hover { transform: scale(1.15); z-index: 1; }
    .heatmap__label {
      font-size: 10px; color: var(--mm-text-primary); opacity: 0.7;
    }
    @media (max-width: 1024px) {
      .dashboard__status-bar { grid-template-columns: repeat(2, 1fr); }
      .dashboard__charts { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .dashboard__status-bar { grid-template-columns: 1fr; }
    }
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ws = inject(WebSocketService);
  private toast = inject(ToastService);

  private subs: Subscription[] = [];
  private sessionStart: Date | null = null;

  // State signals
  currentEmotion = signal('Neutral');
  currentEmoji = signal('sentiment_neutral');
  emotionConfidence = signal(0);
  focusScore = signal(0);
  stressLevel = signal(0);
  typingSpeed = signal(0);
  sessionActive = signal(false);
  sessionTimer = signal('00:00');
  timelineData = signal<any[]>([]);
  heatmapData = signal<Record<string, number>>({});
  recommendations = signal<any[]>([]);

  heatmapHours = Array.from({ length: 24 }, (_, i) => i.toString());

  private emotionEmojis: Record<string, string> = {
    happy: 'sentiment_satisfied', sad: 'sentiment_dissatisfied', angry: 'sentiment_extremely_dissatisfied', surprised: 'sentiment_surprised',
    neutral: 'sentiment_neutral', fearful: 'mood_bad', disgusted: 'sick', focused: 'self_improvement',
  };

  ngOnInit() {
    this.loadDashboardData();
    // Refresh data every 30 seconds
    this.subs.push(
      interval(30000).subscribe(() => this.loadDashboardData())
    );

    // Listen for real-time recommendations
    this.subs.push(
      this.ws.recommendations$.subscribe((rec) => {
        this.recommendations.update((list) => [rec, ...list]);
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }

  greeting(): string {
    const hour = new Date().getHours();
    const name = this.auth.userName().split(' ')[0];
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }

  loadDashboardData() {
    this.api.getCurrentEmotion().subscribe({
      next: (data) => {
        if (data.emotion) {
          this.currentEmotion.set(data.emotion.charAt(0).toUpperCase() + data.emotion.slice(1));
          this.currentEmoji.set(this.emotionEmojis[data.emotion] || 'sentiment_neutral');
          this.emotionConfidence.set(data.confidence || 0);
        }
      },
      error: () => {},
    });

    this.api.getEmotionSummary(24).subscribe({
      next: (data) => {
        this.focusScore.set(Math.round(data.focus_percentage || 0));
        this.stressLevel.set(Math.round(data.stress_percentage || 0));
      },
      error: () => {},
    });

    this.api.getKeystrokeSummary(24).subscribe({
      next: (data) => this.typingSpeed.set(Math.round(data.avg_wpm || 0)),
      error: () => {},
    });

    this.api.getEmotionTimeline(2).subscribe({
      next: (data) => this.timelineData.set(data || []),
      error: () => {},
    });

    this.api.getHeatmap().subscribe({
      next: (data) => this.heatmapData.set(data.hours || {}),
      error: () => {},
    });

    this.api.getRecommendations('pending').subscribe({
      next: (data) => this.recommendations.set(data || []),
      error: () => {},
    });

    this.api.getCurrentSession().subscribe({
      next: (session) => {
        this.sessionActive.set(true);
        this.sessionStart = new Date(session.start_time);
        this.updateTimer();
      },
      error: () => this.sessionActive.set(false),
    });
  }

  startSession() {
    this.api.startSession().subscribe((session) => {
      this.sessionActive.set(true);
      this.sessionStart = new Date();
      this.updateTimer();
      this.toast.success('Session Started', 'Your productivity is being tracked', 'rocket_launch');
      this.ws.sendSessionControl('start');
    });
  }

  endSession() {
    this.api.endSession().subscribe((session) => {
      this.sessionActive.set(false);
      this.sessionStart = null;
      this.toast.info('Session Ended',
        `Productivity: ${session.productivity_score}% | Focus: ${session.focus_percentage}%`, 'bar_chart');
      this.ws.sendSessionControl('end');
      this.loadDashboardData();
    });
  }

  dismissRec(id: string) {
    this.api.dismissRecommendation(id).subscribe(() => {
      this.recommendations.update((list) => list.filter((r) => r.id !== id));
    });
  }

  feedbackRec(id: string, feedback: string) {
    this.api.feedbackRecommendation(id, feedback).subscribe(() => {
      this.recommendations.update((list) => list.filter((r) => r.id !== id));
      this.toast.success('Thanks!', 'Your feedback helps improve recommendations', 'thumb_up');
    });
  }

  getEmotionColor(emotion: string): string {
    const colors: Record<string, string> = {
      happy: '#ffa110', sad: '#a07840', angry: '#d94040', surprised: '#ffb83e',
      neutral: '#c4a060', fearful: '#b87830', disgusted: '#8a6830',
    };
    return colors[emotion] || '#c4a060';
  }

  getHeatmapColor(value: number): string {
    if (value === 0) return 'var(--mm-cream)';
    if (value < 30) return 'var(--mm-sunshine-300)';
    if (value < 50) return 'var(--mm-sunshine-500)';
    if (value < 70) return 'var(--mm-sunshine-700)';
    if (value < 85) return 'var(--mm-block-orange)';
    return 'var(--mm-orange)';
  }

  private updateTimer() {
    if (!this.sessionStart) return;
    const update = () => {
      if (!this.sessionActive() || !this.sessionStart) return;
      const diff = Math.floor((Date.now() - this.sessionStart.getTime()) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      this.sessionTimer.set(`${m}:${s}`);
      requestAnimationFrame(update);
    };
    update();
  }
}
