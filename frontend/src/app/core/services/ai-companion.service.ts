import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EmotionReading } from './emotion-detection.service';
import { WebSocketService } from './websocket.service';

export interface AiMessage {
  id: number;
  role: 'user' | 'ai';
  text: string;
  emotion?: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class AiCompanionService {
  private ws = inject(WebSocketService);
  private http = inject(HttpClient);

  readonly messages = signal<AiMessage[]>([]);
  readonly isThinking = signal(false);
  readonly aiMood = signal<'neutral' | 'concerned' | 'encouraging' | 'celebrating'>('neutral');

  private nextId = 0;
  private emotionHistory: EmotionReading[] = [];
  private lastResponseTime = 0;
  private readonly PROACTIVE_COOLDOWN = 60000; // Minimum 60 seconds of silence before unprompted advice
  private lastProactiveMessage = '';

  /**
   * Process user speech and generate AI response
   */
  processUserSpeech(text: string, currentEmotion?: EmotionReading): void {
    // Add user message
    this.addMessage('user', text, currentEmotion?.emotion);

    // Generate AI response
    this.isThinking.set(true);
    
    // Call backend Chat LLM Endpoint
    const apiUrl = '/api/v1'; // relies on proxy.conf.json or same-origin in prod
    
    const requestBody = {
      message: text,
      emotion: currentEmotion?.emotion || 'neutral',
      history: this.messages().slice(-10).map(m => ({ role: m.role, text: m.text })) // Send last 10 messages
    };

    this.http.post<{response: string}>(`${apiUrl}/chat`, requestBody).subscribe({
      next: (res) => {
        this.addMessage('ai', res.response);
        this.isThinking.set(false);
      },
      error: (err) => {
        console.error('[AiCompanion] Error calling AI API', err);
        this.addMessage('ai', "Hmm, I encountered a connection issue thinking about that. Give me a second and try again!");
        this.isThinking.set(false);
      }
    });
  }

  /**
   * Process emotion data and potentially trigger proactive responses
   */
  processEmotion(reading: EmotionReading): void {
    this.emotionHistory.push(reading);
    // Keep last 120 readings (~60 seconds at 500ms intervals)
    if (this.emotionHistory.length > 120) {
      this.emotionHistory = this.emotionHistory.slice(-120);
    }

    // Update AI mood based on user's emotions
    this.updateAiMood(reading);

    // Check for proactive triggers (only if we've had a long silence)
    const now = Date.now();
    if (now - this.lastResponseTime > this.PROACTIVE_COOLDOWN) {
      const proactive = this.checkProactiveTriggers();
      if (proactive && proactive !== this.lastProactiveMessage) {
        this.addMessage('ai', proactive);
        this.lastProactiveMessage = proactive;
        this.lastResponseTime = now;
      }
    }

    // Send to backend
    this.ws.sendEmotionData({
      emotion: reading.emotion,
      confidence: reading.confidence,
      all_emotions: reading.allEmotions,
    });
  }

  /**
   * Handle text-based input (typing instead of speaking)
   */
  sendTextMessage(text: string, currentEmotion?: EmotionReading): void {
    this.processUserSpeech(text, currentEmotion);
  }

  /**
   * Add a direct AI message (for greetings, proactive messages)
   */
  addAiGreeting(text: string): void {
    this.addMessage('ai', text);
    this.aiMood.set('encouraging');
  }

  private addMessage(role: 'user' | 'ai', text: string, emotion?: string): void {
    const msg: AiMessage = {
      id: this.nextId++,
      role,
      text,
      emotion,
      timestamp: Date.now(),
    };
    this.messages.update(list => [...list, msg]);
    this.lastResponseTime = Date.now();
  }



  private updateAiMood(reading: EmotionReading): void {
    if (['angry', 'fearful', 'disgusted', 'sad'].includes(reading.emotion) && reading.confidence > 0.5) {
      this.aiMood.set('concerned');
    } else if (reading.emotion === 'happy' && reading.confidence > 0.5) {
      this.aiMood.set('celebrating');
    } else {
      this.aiMood.set('neutral');
    }
  }

  private checkProactiveTriggers(): string | null {
    if (this.emotionHistory.length < 20) return null;

    const recent = this.emotionHistory.slice(-20);

    // Sustained stress (>70% negative emotions in last 10 seconds)
    const negativeCount = recent.filter(r =>
      ['angry', 'fearful', 'disgusted', 'sad'].includes(r.emotion)
    ).length;

    if (negativeCount / recent.length > 0.7) {
      return "You've been looking really stressed for a while. Seriously, it's totally okay to put everything down and walk away for 5 minutes. You deserve a break! 🫂";
    }

    // Long neutral streak (possible disengagement/boredom)
    const neutralCount = recent.filter(r => r.emotion === 'neutral').length;
    if (neutralCount / recent.length > 0.9) {
      return "You've been super quiet and intensely focused! Just checking in — how are things going over there?";
    }

    return null;
  }
}
