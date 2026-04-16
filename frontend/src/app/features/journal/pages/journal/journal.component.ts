import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../../../../core/services/api.service';
import { DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';

@Component({
  selector: 'mm-journal',
  standalone: true,
  imports: [DatePipe, DecimalPipe, UpperCasePipe],
  template: `
    <div class="journal stagger-enter">
      <h1 class="text-section">JOURNAL</h1>
      <p class="text-body text-muted mt-3 mb-9">Your session history and reflections</p>

      @if (sessions().length) {
        <div class="journal-list">
          @for (session of sessions(); track session.id) {
            <div class="journal-entry card card-elevated" [class.journal-entry--expanded]="expandedId() === session.id">
              <div class="journal-entry__header" (click)="toggle(session.id)">
                <div class="journal-entry__date">
                  <div class="text-feature">{{ session.start_time | date:'dd' }}</div>
                  <div class="text-small text-uppercase text-muted">{{ session.start_time | date:'MMM' }}</div>
                </div>
                <div class="journal-entry__info">
                  <div class="text-body">
                    {{ session.start_time | date:'HH:mm' }} — {{ session.end_time ? (session.end_time | date:'HH:mm') : 'In Progress' }}
                  </div>
                  <div class="text-caption text-muted">
                    {{ session.duration_minutes | number:'1.0-0' }} min · {{ session.dominant_emotion }}
                  </div>
                </div>
                <div class="journal-entry__score">
                  <div class="text-subheading" [style.color]="getScoreColor(session.productivity_score)">
                    {{ session.productivity_score | number:'1.0-0' }}%
                  </div>
                  <div class="text-small text-muted">Productivity</div>
                </div>
                <div class="journal-entry__badge">
                  <span class="badge badge--lg" [class]="'badge--' + session.dominant_emotion">
                    {{ session.dominant_emotion | uppercase }}
                  </span>
                </div>
                <span class="journal-entry__chevron text-caption">{{ expandedId() === session.id ? '▲' : '▼' }}</span>
              </div>

              @if (expandedId() === session.id) {
                <div class="journal-entry__detail animate-slide-down">
                  <div class="divider"></div>
                  <div class="grid grid-4 gap-4 mt-5">
                    <div><span class="text-small text-uppercase text-muted">Focus</span><div class="text-body">{{ session.focus_percentage }}%</div></div>
                    <div><span class="text-small text-uppercase text-muted">Stress</span><div class="text-body">{{ session.stress_percentage }}%</div></div>
                    <div><span class="text-small text-uppercase text-muted">Typing</span><div class="text-body">{{ session.typing_avg_wpm }} WPM</div></div>
                    <div><span class="text-small text-uppercase text-muted">Status</span><div class="text-body">{{ session.status | uppercase }}</div></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="card card-cream" style="text-align:center; padding: var(--mm-space-12);">
          <span class="material-symbols-outlined" style="font-size: 3rem;">edit_document</span>
          <p class="text-body mt-5">No sessions recorded yet</p>
          <p class="text-caption text-muted mt-3">Start a work session from the Dashboard to begin tracking</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .journal-list { display: flex; flex-direction: column; gap: var(--mm-space-5); }
    .journal-entry { cursor: pointer; transition: all 250ms ease; }
    .journal-entry:hover { box-shadow: var(--mm-shadow-golden-lg); }
    .journal-entry__header {
      display: flex; align-items: center; gap: var(--mm-space-7);
    }
    .journal-entry__date {
      text-align: center; min-width: 50px;
      padding-right: var(--mm-space-5);
      border-right: 2px solid var(--mm-border-warm);
    }
    .journal-entry__info { flex: 1; min-width: 0; }
    .journal-entry__score { text-align: center; min-width: 80px; }
    .journal-entry__badge { min-width: 100px; }
    .journal-entry__chevron { color: var(--mm-text-muted); }
    .journal-entry__detail { padding-top: var(--mm-space-3); }
    @media (max-width: 768px) {
      .journal-entry__header { flex-wrap: wrap; gap: var(--mm-space-4); }
      .journal-entry__badge { display: none; }
    }
  `],
})
export class JournalComponent implements OnInit {
  private api = inject(ApiService);

  sessions = signal<any[]>([]);
  expandedId = signal<string | null>(null);

  ngOnInit() {
    this.api.getSessions(50).subscribe((data) => this.sessions.set(data));
  }

  toggle(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  getScoreColor(score: number): string {
    if (score >= 70) return 'var(--mm-success)';
    if (score >= 40) return 'var(--mm-sunshine-900)';
    return 'var(--mm-danger)';
  }
}
