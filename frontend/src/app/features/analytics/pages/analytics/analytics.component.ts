import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'mm-analytics',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="analytics stagger-enter">
      <h1 class="text-section">ANALYTICS</h1>
      <p class="text-body text-muted mt-3 mb-9">Deep dive into your productivity patterns</p>

      <!-- Tabs -->
      <div class="tabs mb-8">
        <button class="tab" [class.tab--active]="activeTab() === 'daily'" (click)="activeTab.set('daily')">DAILY</button>
        <button class="tab" [class.tab--active]="activeTab() === 'weekly'" (click)="activeTab.set('weekly'); loadWeekly()">WEEKLY</button>
        <button class="tab" [class.tab--active]="activeTab() === 'monthly'" (click)="activeTab.set('monthly'); loadMonthly()">MONTHLY</button>
      </div>

      @if (activeTab() === 'daily') {
        <div class="grid grid-2 gap-6 stagger-enter">
          <!-- Productivity Score -->
          <div class="chart-card">
            <div class="chart-card__header">
              <span class="chart-card__title">PRODUCTIVITY SCORE</span>
            </div>
            <div class="score-display">
              <div class="score-ring">
                <svg viewBox="0 0 120 120" class="score-svg">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--mm-cream)" stroke-width="10"/>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--mm-orange)" stroke-width="10"
                    [attr.stroke-dasharray]="314"
                    [attr.stroke-dashoffset]="314 - (314 * dailyData().productivity_score / 100)"
                    stroke-linecap="square" transform="rotate(-90 60 60)"
                    style="transition: stroke-dashoffset 1s ease"/>
                </svg>
                <span class="score-value text-subheading">{{ dailyData().productivity_score | number:'1.0-0' }}%</span>
              </div>
            </div>
          </div>

          <!-- Emotion Distribution -->
          <div class="chart-card">
            <div class="chart-card__header">
              <span class="chart-card__title">EMOTION DISTRIBUTION</span>
            </div>
            <div class="emotion-bars">
              @for (entry of getDistributionEntries(); track entry.emotion) {
                <div class="emotion-bar-row">
                  <span class="text-caption" style="width:80px; text-transform:uppercase">{{ entry.emotion }}</span>
                  <div class="emotion-bar-track">
                    <div class="emotion-bar-fill" [style.width.%]="entry.value" [style.background]="getEmotionColor(entry.emotion)"></div>
                  </div>
                  <span class="text-small text-muted" style="width:40px; text-align:right">{{ entry.value | number:'1.0-0' }}%</span>
                </div>
              }
            </div>
          </div>

          <!-- Work Stats -->
          <div class="chart-card">
            <div class="chart-card__header">
              <span class="chart-card__title">TODAY'S STATS</span>
            </div>
            <div class="stats-list">
              <div class="stats-row"><span class="text-caption text-muted">Total Work Hours</span><span class="text-body">{{ dailyData().total_work_hours }}h</span></div>
              <div class="stats-row"><span class="text-caption text-muted">Focus Hours</span><span class="text-body">{{ dailyData().total_focus_hours }}h</span></div>
              <div class="stats-row"><span class="text-caption text-muted">Stress Hours</span><span class="text-body">{{ dailyData().total_stress_hours }}h</span></div>
              <div class="stats-row"><span class="text-caption text-muted">Peak Hour</span><span class="text-body">{{ dailyData().peak_hour }}:00</span></div>
              <div class="stats-row"><span class="text-caption text-muted">Sessions</span><span class="text-body">{{ dailyData().sessions_count }}</span></div>
              <div class="stats-row"><span class="text-caption text-muted">Avg Typing</span><span class="text-body">{{ dailyData().typing_stats?.avg_wpm || 0 }} WPM</span></div>
            </div>
          </div>

          <!-- Peak Hours -->
          <div class="chart-card">
            <div class="chart-card__header">
              <span class="chart-card__title">PEAK PRODUCTIVITY HOURS</span>
            </div>
            <div class="peak-hours">
              @for (h of peakHours(); track h.hour) {
                <div class="peak-hour-bar">
                  <div class="peak-hour-fill" [style.height.%]="h.avg_focus" style="background: var(--mm-gradient-block);"></div>
                  <span class="text-small">{{ h.hour }}</span>
                </div>
              }
              @if (!peakHours().length) {
                <div class="chart-empty"><span class="text-caption text-muted">Not enough data yet</span></div>
              }
            </div>
          </div>
        </div>
      }

      @if (activeTab() === 'weekly') {
        <div class="grid grid-2 gap-6 stagger-enter">
          <div class="chart-card" style="grid-column: 1 / -1;">
            <div class="chart-card__header">
              <span class="chart-card__title">WEEKLY PRODUCTIVITY TREND</span>
              <span class="text-small text-muted">{{ weeklyData().week_start }} — {{ weeklyData().week_end }}</span>
            </div>
            <div class="weekly-bars">
              @for (score of weeklyData().daily_scores || []; track $index) {
                <div class="weekly-bar-col">
                  <div class="weekly-bar" [style.height.%]="score" style="background: var(--mm-gradient-block); transition: height 0.5s ease"></div>
                  <span class="text-small">{{ dayNames[$index] }}</span>
                  <span class="text-small text-muted">{{ score }}%</span>
                </div>
              }
            </div>
          </div>
          <div class="stat-card"><div class="stat-card__value">{{ weeklyData().avg_productivity }}%</div><div class="stat-card__label">AVG PRODUCTIVITY</div></div>
          <div class="stat-card"><div class="stat-card__value">{{ weeklyData().best_day }}</div><div class="stat-card__label">BEST DAY</div></div>
          <div class="stat-card"><div class="stat-card__value">{{ weeklyData().total_focus_hours }}h</div><div class="stat-card__label">FOCUS HOURS</div></div>
          <div class="stat-card"><div class="stat-card__value">{{ weeklyData().total_work_hours }}h</div><div class="stat-card__label">WORK HOURS</div></div>
        </div>
      }

      @if (activeTab() === 'monthly') {
        <div class="stagger-enter">
          <div class="chart-card mb-8">
            <div class="chart-card__header">
              <span class="chart-card__title">MONTHLY CALENDAR</span>
              <span class="text-small text-muted">{{ monthlyData().month }}/{{ monthlyData().year }}</span>
            </div>
            <div class="calendar-grid">
              @for (score of monthlyData().daily_scores || []; track $index) {
                <div class="calendar-cell"
                     [style.background]="getCalendarColor(score)"
                     [title]="'Day ' + ($index + 1) + ': ' + (score ?? 'No data')">
                  <span class="text-small">{{ $index + 1 }}</span>
                </div>
              }
            </div>
          </div>
          <div class="grid grid-3 gap-6">
            <div class="stat-card"><div class="stat-card__value">{{ monthlyData().avg_productivity }}%</div><div class="stat-card__label">AVG PRODUCTIVITY</div></div>
            <div class="stat-card"><div class="stat-card__value">{{ monthlyData().days_active }}</div><div class="stat-card__label">DAYS ACTIVE</div></div>
            <div class="stat-card"><div class="stat-card__value">{{ monthlyData().total_work_hours }}h</div><div class="stat-card__label">TOTAL HOURS</div></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .analytics { }
    .score-display { display: flex; justify-content: center; padding: var(--mm-space-8); }
    .score-ring { position: relative; width: 120px; height: 120px; }
    .score-svg { width: 100%; height: 100%; }
    .score-value { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .emotion-bars { display: flex; flex-direction: column; gap: var(--mm-space-4); padding: var(--mm-space-3) 0; }
    .emotion-bar-row { display: flex; align-items: center; gap: var(--mm-space-3); }
    .emotion-bar-track { flex: 1; height: 12px; background: var(--mm-cream); }
    .emotion-bar-fill { height: 100%; transition: width 0.6s ease; }
    .stats-list { display: flex; flex-direction: column; gap: var(--mm-space-4); }
    .stats-row { display: flex; justify-content: space-between; padding: var(--mm-space-2) 0; border-bottom: 1px solid rgba(127,99,21,0.06); }
    .peak-hours { display: flex; align-items: flex-end; gap: 3px; height: 200px; }
    .peak-hour-bar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 2px; }
    .peak-hour-fill { width: 100%; min-height: 2px; }
    .weekly-bars { display: flex; align-items: flex-end; gap: var(--mm-space-5); height: 250px; padding-top: var(--mm-space-6); }
    .weekly-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 4px; }
    .weekly-bar { width: 100%; min-height: 4px; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .calendar-cell {
      aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
      transition: transform 200ms; cursor: default;
    }
    .calendar-cell:hover { transform: scale(1.1); }
    .chart-empty { height: 200px; display: flex; align-items: center; justify-content: center; width: 100%; }
    @media (max-width: 768px) {
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
    }
  `],
})
export class AnalyticsComponent implements OnInit {
  private api = inject(ApiService);

  activeTab = signal<'daily' | 'weekly' | 'monthly'>('daily');
  dailyData = signal<any>({ productivity_score: 0, total_work_hours: 0, total_focus_hours: 0, total_stress_hours: 0, peak_hour: 0, emotion_distribution: {}, typing_stats: {}, sessions_count: 0 });
  weeklyData = signal<any>({ daily_scores: [], avg_productivity: 0, best_day: 'N/A', total_focus_hours: 0, total_work_hours: 0 });
  monthlyData = signal<any>({ daily_scores: [], avg_productivity: 0, days_active: 0, total_work_hours: 0 });
  peakHours = signal<any[]>([]);

  dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  ngOnInit() {
    this.api.getDailyInsight().subscribe((d) => this.dailyData.set(d));
    this.api.getPeakHours(30).subscribe((d) => this.peakHours.set(d));
  }

  loadWeekly() { this.api.getWeeklyInsight().subscribe((d) => this.weeklyData.set(d)); }
  loadMonthly() { this.api.getMonthlyInsight().subscribe((d) => this.monthlyData.set(d)); }

  getDistributionEntries(): { emotion: string; value: number }[] {
    const dist = this.dailyData().emotion_distribution || {};
    return Object.entries(dist).map(([emotion, value]) => ({ emotion, value: value as number })).sort((a, b) => b.value - a.value);
  }

  getEmotionColor(emotion: string): string {
    const c: Record<string, string> = { happy: '#ffa110', sad: '#a07840', angry: '#d94040', surprised: '#ffb83e', neutral: '#c4a060', fearful: '#b87830', disgusted: '#8a6830' };
    return c[emotion] || '#c4a060';
  }

  getCalendarColor(score: number | null): string {
    if (score === null || score === undefined) return 'var(--mm-warm-ivory)';
    if (score < 30) return 'var(--mm-sunshine-300)';
    if (score < 50) return 'var(--mm-sunshine-500)';
    if (score < 70) return 'var(--mm-sunshine-700)';
    return 'var(--mm-orange)';
  }
}
