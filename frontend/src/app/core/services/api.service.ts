import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE = '/api/v1';

  constructor(private http: HttpClient) {}

  // ─── Emotions ───
  getEmotionSummary(hours: number = 24): Observable<any> {
    return this.http.get(`${this.BASE}/emotions/summary`, { params: { hours } });
  }

  getEmotionDistribution(hours: number = 24): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/emotions/distribution`, { params: { hours } });
  }

  getEmotionTimeline(hours: number = 2): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/emotions/timeline`, { params: { hours } });
  }

  getCurrentEmotion(): Observable<any> {
    return this.http.get(`${this.BASE}/emotions/current`);
  }

  // ─── Keystrokes ───
  getKeystrokeSummary(hours: number = 24): Observable<any> {
    return this.http.get(`${this.BASE}/keystrokes/summary`, { params: { hours } });
  }

  getKeystrokeTrends(days: number = 7): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/keystrokes/trends`, { params: { days } });
  }

  // ─── Sessions ───
  getSessions(limit: number = 20): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/sessions`, { params: { limit } });
  }

  getCurrentSession(): Observable<any> {
    return this.http.get(`${this.BASE}/sessions/current`);
  }

  startSession(notes?: string): Observable<any> {
    return this.http.post(`${this.BASE}/sessions/start`, { notes });
  }

  endSession(notes?: string): Observable<any> {
    return this.http.post(`${this.BASE}/sessions/end`, { notes });
  }

  getSession(id: string): Observable<any> {
    return this.http.get(`${this.BASE}/sessions/${id}`);
  }

  // ─── Insights ───
  getDailyInsight(date?: string): Observable<any> {
    const params: any = {};
    if (date) params.target_date = date;
    return this.http.get(`${this.BASE}/insights/daily`, { params });
  }

  getWeeklyInsight(): Observable<any> {
    return this.http.get(`${this.BASE}/insights/weekly`);
  }

  getMonthlyInsight(month?: number, year?: number): Observable<any> {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    return this.http.get(`${this.BASE}/insights/monthly`, { params });
  }

  getPeakHours(days: number = 30): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/insights/peak-hours`, { params: { days } });
  }

  getHeatmap(date?: string): Observable<any> {
    const params: any = {};
    if (date) params.target_date = date;
    return this.http.get(`${this.BASE}/insights/heatmap`, { params });
  }

  // ─── Recommendations ───
  getRecommendations(status: string = 'pending'): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/recommendations/`, { params: { status_filter: status } });
  }

  dismissRecommendation(id: string): Observable<any> {
    return this.http.post(`${this.BASE}/recommendations/${id}/dismiss`, {});
  }

  feedbackRecommendation(id: string, feedback: string): Observable<any> {
    return this.http.post(`${this.BASE}/recommendations/${id}/feedback`, { feedback });
  }

  // ─── Users ───
  getProfile(): Observable<any> {
    return this.http.get(`${this.BASE}/users/profile`);
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.BASE}/users/profile`, data);
  }

  getPreferences(): Observable<any> {
    return this.http.get(`${this.BASE}/users/preferences`);
  }

  updatePreferences(data: any): Observable<any> {
    return this.http.put(`${this.BASE}/users/preferences`, data);
  }

  completeOnboarding(): Observable<any> {
    return this.http.post(`${this.BASE}/users/onboarding-complete`, {});
  }

  exportData(): Observable<any> {
    return this.http.get(`${this.BASE}/users/export`);
  }
}
