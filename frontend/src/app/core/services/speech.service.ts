import { Injectable, signal, NgZone, inject } from '@angular/core';
import { Subject } from 'rxjs';

export interface SpeechResult {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class SpeechService {
  private zone = inject(NgZone);

  readonly isListening = signal(false);
  readonly isSpeaking = signal(false);
  readonly interimText = signal('');
  readonly lastError = signal('');
  readonly supported = signal(
    typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  );

  private recognition: any;
  private shouldListen = false;
  private speechSubject = new Subject<SpeechResult>();
  readonly speech$ = this.speechSubject.asObservable();

  private synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  // ─── Microphone Permission ───

  async requestMicPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately — we just needed permission
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (err) {
      console.warn('[Speech] Mic permission denied:', err);
      return false;
    }
  }

  // ─── Speech-to-Text ───

  private initRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.zone.run(() => {
        this.isListening.set(true);
        this.lastError.set('');
        console.log('[Speech] Recognition started — speak now');
      });
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            console.log('[Speech] Final transcript:', text);
            this.zone.run(() => {
              this.speechSubject.next({ text, isFinal: true, timestamp: Date.now() });
              this.interimText.set('');
            });
          }
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) {
        this.zone.run(() => this.interimText.set(interim));
      }
    };

    this.recognition.onerror = (event: any) => {
      // Don't show 'no-speech' in the UI, it's totally normal when the user is just quiet.
      if (event.error !== 'no-speech') {
        console.warn('[Speech] Error:', event.error);
        this.zone.run(() => this.lastError.set('Speech Error: ' + event.error));
      }

      // Auto-restart on recoverable errors
      if (this.shouldListen && (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network')) {
        setTimeout(() => this.restartRecognition(), 1000);
      }

      // Fatal errors
      if (event.error === 'not-allowed') {
        this.zone.run(() => {
          this.isListening.set(false);
          this.shouldListen = false;
          this.lastError.set('Microphone access blocked entirely.');
        });
      }
    };

    this.recognition.onend = () => {
      console.log('[Speech] Recognition ended, shouldListen:', this.shouldListen);
      if (this.shouldListen) {
        setTimeout(() => this.restartRecognition(), 300);
      } else {
        this.zone.run(() => this.isListening.set(false));
      }
    };
  }

  async startListening(): Promise<void> {
    if (!this.supported()) {
      this.lastError.set('Speech recognition not supported in this browser');
      return;
    }
    if (this.isListening()) return;

    this.shouldListen = true;
    this.initRecognition();

    try {
      this.recognition.start();
      console.log('[Speech] Recognition starting...');
    } catch (e) {
      console.error('[Speech] Start failed:', e);
      this.zone.run(() => this.lastError.set('Failed to start speech recognition'));
    }
  }

  private restartRecognition(): void {
    if (!this.shouldListen) return;
    try {
      this.recognition?.stop();
    } catch {}
    
    setTimeout(() => {
      if (!this.shouldListen) return;
      this.initRecognition();
      try {
        this.recognition.start();
      } catch (e) {
        console.error('[Speech] Restart failed:', e);
      }
    }, 100);
  }

  stopListening(): void {
    this.shouldListen = false;
    this.isListening.set(false);
    this.interimText.set('');
    try {
      this.recognition?.stop();
    } catch {}
  }

  // ─── Text-to-Speech ───

  speak(text: string, onEnd?: () => void): void {
    if (!this.synth) return;

    // Cancel any current speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    // Pick a friendly, natural voice
    const voices = this.synth.getVoices();
    const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Google UK English Female'))
      || voices.find(v => v.name.includes('Aria') || v.name.includes('Zira') || v.name.includes('Jenny'))
      || voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
      || voices.find(v => v.lang.startsWith('en'));

    if (preferred) utterance.voice = preferred;

    // Tweak to sound slightly more conversational/casual
    utterance.rate = 1.05;
    utterance.pitch = 1.05;

    utterance.onstart = () => {
      this.zone.run(() => this.isSpeaking.set(true));
    };

    utterance.onend = () => {
      this.zone.run(() => {
        this.isSpeaking.set(false);
        onEnd?.();
      });
    };

    utterance.onerror = () => {
      this.zone.run(() => this.isSpeaking.set(false));
    };

    this.synth.speak(utterance);
  }

  stopSpeaking(): void {
    this.synth?.cancel();
    this.isSpeaking.set(false);
  }
}
