import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'mm-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="settings stagger-enter">
      <h1 class="text-section">SETTINGS</h1>
      <p class="text-body text-muted mt-3 mb-9">Manage your account and preferences</p>

      <!-- Profile -->
      <div class="card card-elevated mb-8">
        <h2 class="text-body text-uppercase mb-6" style="letter-spacing:1px;">PROFILE</h2>
        <div class="settings-form">
          <div class="form-group">
            <label class="form-label">NAME</label>
            <input type="text" class="form-input" [(ngModel)]="profileName" id="settings-name">
          </div>
          <div class="form-group">
            <label class="form-label">EMAIL</label>
            <input type="email" class="form-input" [(ngModel)]="profileEmail" id="settings-email">
          </div>
          <button class="btn btn-primary btn-uppercase btn-sm" (click)="saveProfile()" id="save-profile-btn">SAVE CHANGES</button>
        </div>
      </div>

      <!-- Preferences -->
      <div class="card card-elevated mb-8">
        <h2 class="text-body text-uppercase mb-6" style="letter-spacing:1px;">WORK PREFERENCES</h2>
        <div class="settings-form">
          <div class="grid grid-2 gap-6">
            <div class="form-group">
              <label class="form-label">WORK START TIME</label>
              <input type="time" class="form-input" [(ngModel)]="workStart" id="settings-work-start">
            </div>
            <div class="form-group">
              <label class="form-label">WORK END TIME</label>
              <input type="time" class="form-input" [(ngModel)]="workEnd" id="settings-work-end">
            </div>
            <div class="form-group">
              <label class="form-label">BREAK FREQUENCY (MINUTES)</label>
              <input type="number" class="form-input" [(ngModel)]="breakFreq" min="15" max="180" id="settings-break-freq">
            </div>
            <div class="form-group">
              <label class="form-label">NOTIFICATION STYLE</label>
              <select class="form-input" [(ngModel)]="notifStyle" id="settings-notif-style">
                <option value="gentle">Gentle</option>
                <option value="direct">Direct</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary btn-uppercase btn-sm mt-6" (click)="savePreferences()" id="save-prefs-btn">SAVE PREFERENCES</button>
        </div>
      </div>

      <!-- Privacy & Data -->
      <div class="card card-elevated mb-8">
        <h2 class="text-body text-uppercase mb-6" style="letter-spacing:1px;">PRIVACY & DATA</h2>
        <p class="text-caption text-muted mb-5">
          All emotion detection runs locally in your browser. Only emotion labels and confidence scores are sent to the server — never video frames.
        </p>
        <div class="flex gap-4">
          <button class="btn btn-secondary btn-sm btn-uppercase" style="display:flex; align-items:center;" (click)="exportData()" id="export-data-btn">
            <span class="material-symbols-outlined" style="font-size: 16px; margin-right: 6px;">inventory_2</span> EXPORT MY DATA
          </button>
        </div>
      </div>

      <!-- About -->
      <div class="card card-cream">
        <h2 class="text-body text-uppercase mb-5" style="letter-spacing:1px;">ABOUT</h2>
        <div class="text-caption text-muted">
          <p>MindMirror AI v1.0.0</p>
          <p class="mt-3">Emotion-Aware Productivity Assistant</p>
          <p class="mt-3">Built with Angular, FastAPI, MongoDB, and face-api.js</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-form { display: flex; flex-direction: column; gap: var(--mm-space-6); }
    select.form-input {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f1f1f' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 36px;
    }
  `],
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  profileName = '';
  profileEmail = '';
  workStart = '09:00';
  workEnd = '17:00';
  breakFreq = 60;
  notifStyle = 'gentle';

  ngOnInit() {
    const user = this.auth.user();
    if (user) {
      this.profileName = user.name;
      this.profileEmail = user.email;
    }
    this.api.getPreferences().subscribe((prefs) => {
      this.workStart = prefs.work_start || '09:00';
      this.workEnd = prefs.work_end || '17:00';
      this.breakFreq = prefs.break_frequency_minutes || 60;
      this.notifStyle = prefs.notification_style || 'gentle';
    });
  }

  saveProfile() {
    this.api.updateProfile({ name: this.profileName, email: this.profileEmail }).subscribe({
      next: () => {
        this.auth.refreshProfile().subscribe();
        this.toast.success('Profile Updated', 'Your changes have been saved', 'check_circle');
      },
      error: (err) => this.toast.danger('Error', err.error?.detail || 'Failed to update profile'),
    });
  }

  savePreferences() {
    this.api.updatePreferences({
      work_start: this.workStart,
      work_end: this.workEnd,
      break_frequency_minutes: this.breakFreq,
      notification_style: this.notifStyle,
    }).subscribe({
      next: () => this.toast.success('Preferences Saved', 'Your work preferences have been updated', 'settings'),
      error: (err) => this.toast.danger('Error', err.error?.detail || 'Failed to save preferences'),
    });
  }

  exportData() {
    this.api.exportData().subscribe((data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindmirror-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast.success('Data Exported', 'Your data has been downloaded', 'inventory_2');
    });
  }
}
