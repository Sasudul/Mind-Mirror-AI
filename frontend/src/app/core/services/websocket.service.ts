import { Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WsMessage {
  type: string;
  payload: any;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnect = 10;
  private reconnectTimer: any;

  readonly connected = signal(false);
  private messageSubject = new Subject<WsMessage>();
  readonly messages$: Observable<WsMessage> = this.messageSubject.asObservable();

  // Typed channels
  private recommendationSubject = new Subject<any>();
  readonly recommendations$ = this.recommendationSubject.asObservable();

  private sessionUpdateSubject = new Subject<any>();
  readonly sessionUpdates$ = this.sessionUpdateSubject.asObservable();

  connect(userId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const url = `${environment.wsUrl}/${userId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected.set(true);
        this.reconnectAttempts = 0;
        console.log('[WS] Connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          this.messageSubject.next(msg);

          if (msg.type === 'recommendation') {
            this.recommendationSubject.next(msg.payload);
          } else if (msg.type === 'session_update') {
            this.sessionUpdateSubject.next(msg.payload);
          }
        } catch (e) {
          console.warn('[WS] Failed to parse:', event.data);
        }
      };

      this.ws.onclose = () => {
        this.connected.set(false);
        console.log('[WS] Disconnected');
        this.attemptReconnect(userId);
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };
    } catch (e) {
      console.error('[WS] Connection failed:', e);
      this.attemptReconnect(userId);
    }
  }

  disconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.maxReconnect = 0;
    this.ws?.close();
    this.ws = null;
    this.connected.set(false);
  }

  sendEmotionData(data: any): void {
    this.send({ type: 'emotion_data', payload: data });
  }

  sendKeystrokeData(data: any): void {
    this.send({ type: 'keystroke_data', payload: data });
  }

  sendSessionControl(action: string): void {
    this.send({ type: 'session_control', payload: { action } });
  }

  private send(msg: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private attemptReconnect(userId: string): void {
    if (this.reconnectAttempts >= this.maxReconnect) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this.connect(userId), delay);
  }
}
