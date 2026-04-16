import {
  Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe, DecimalPipe } from '@angular/common';
import { EmotionDetectionService } from '../../../../core/services/emotion-detection.service';
import { SpeechService } from '../../../../core/services/speech.service';
import { AiCompanionService, AiMessage } from '../../../../core/services/ai-companion.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'mm-video-call',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, DecimalPipe],
  template: `
    <div class="vc" [class.vc--active]="sessionActive()">

      <!-- Top Bar -->
      <div class="vc__topbar">
        <div class="vc__brand">
          <div class="block-identity">
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
            <span class="block-identity__block"></span>
          </div>
          <span class="text-caption text-uppercase" style="letter-spacing:2px;">MINDMIRROR AI</span>
        </div>
        <div class="vc__topbar-center">
          @if (sessionActive()) {
            <div class="badge badge--lg badge--focused">
              <span class="badge__pulse"></span>
              SESSION — {{ sessionTimer() }}
            </div>
          }
        </div>
        <div class="vc__topbar-right">
          @if (sessionActive()) {
            <button class="btn btn-sm btn-ghost btn-uppercase" (click)="toggleStats()">
              {{ showStats() ? 'HIDE' : 'STATS' }}
            </button>
          }
        </div>
      </div>

      <!-- Main Area -->
      <div class="vc__main">
        <!-- User Feed -->
        <div class="vc__user-panel">
          <div class="vc__video-wrapper">
            <video #videoEl autoplay muted playsinline class="vc__video"
                   [style.display]="cameraAvailable() ? 'block' : 'none'"></video>


            @if (!sessionActive()) {
              <div class="vc__video-overlay">
                <div class="vc__start-prompt animate-slide-up">
                  <div class="vc__ai-face vc__ai-face--large animate-breathe material-symbols-outlined" style="font-size: 64px;">psychology</div>
                  <h1 class="text-subheading mt-6">MindMirror AI Session</h1>
                  <p class="text-body text-muted mt-3">I'll listen to you and respond in real-time.</p>

                  <!-- Permission status -->
                  <div class="vc__permissions mt-6">
                    <div class="vc__perm" [class.vc__perm--granted]="permMic() === 'granted'"
                         [class.vc__perm--denied]="permMic() === 'denied'">
                      <span class="material-symbols-outlined">mic</span>
                      <span>Mic: {{ permMic() === 'unknown' ? 'Not checked' : permMic() }}</span>
                    </div>
                    <div class="vc__perm" [class.vc__perm--granted]="permCam() === 'granted'"
                         [class.vc__perm--denied]="permCam() === 'denied'">
                      <span class="material-symbols-outlined">photo_camera</span>
                      <span>Camera: {{ permCam() === 'unknown' ? 'Not checked' : permCam() }}</span>
                    </div>
                  </div>

                  <button class="btn btn-secondary btn-sm btn-uppercase mt-5" (click)="checkPermissions()" id="check-perms-btn">
                    <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">lock</span> CHECK PERMISSIONS
                  </button>

                  <button class="btn btn-brand btn-lg btn-uppercase mt-5" (click)="startSession()" id="start-call-btn">
                    <span class="material-symbols-outlined" style="font-size: 24px; margin-right: 6px;">videocam</span> START AI SESSION
                  </button>

                  <p class="text-caption text-muted mt-4" style="max-width:360px; line-height:1.5;">
                    If permissions are blocked, click the 🔒 lock icon in the address bar → Site Settings → Allow Microphone & Camera
                  </p>
                </div>
              </div>
            }

            <!-- No Camera fallback -->
            @if (sessionActive() && !cameraAvailable()) {
              <div class="vc__no-camera">
                <div class="vc__user-avatar-large">
                  <span>{{ auth.userName().charAt(0) }}</span>
                </div>
                <div class="text-caption text-muted mt-4" style="color: rgba(255,255,255,0.6);">No camera detected</div>
                <div class="text-caption mt-2" style="color: rgba(255,255,255,0.4);">Speak or type to interact</div>
              </div>
            }

            <!-- Emotion Overlay (only when camera is available) -->
            @if (sessionActive() && cameraAvailable() && emotionService.currentEmotion()) {
              <div class="vc__emotion-overlay animate-fade-in">
                <div class="vc__emotion-badge" [style.borderColor]="emotionService.getEmotionColor(emotionService.currentEmotion()!.emotion)">
                  <span class="vc__emotion-emoji material-symbols-outlined">{{ emotionService.getEmotionEmoji(emotionService.currentEmotion()!.emotion) }}</span>
                  <span class="vc__emotion-label">{{ emotionService.currentEmotion()!.emotion | uppercase }}</span>
                  <span class="vc__emotion-conf">{{ (emotionService.currentEmotion()!.confidence * 100).toFixed(0) }}%</span>
                </div>
              </div>
            }

            @if (sessionActive() && cameraAvailable() && !emotionService.faceDetected()) {
              <div class="vc__no-face">
                <span class="text-caption">No face detected — look at the camera</span>
              </div>
            }

            <!-- User label -->
            <div class="vc__label">
              <span>{{ auth.userName() }}</span>
              @if (speechService.isListening()) {
                <span class="vc__mic-indicator material-symbols-outlined">mic</span>
              }
              @if (!cameraAvailable() && sessionActive()) {
                <span style="opacity:0.5; margin-left: 4px;">TEXT MODE</span>
              }
            </div>
          </div>

          <!-- Emotion Bars (only when camera active) -->
          @if (sessionActive() && cameraAvailable() && emotionService.currentEmotion()) {
            <div class="vc__emotion-bars">
              @for (entry of getEmotionEntries(); track entry.name) {
                <div class="vc__ebar">
                  <span class="vc__ebar-name">{{ entry.name }}</span>
                  <div class="vc__ebar-track">
                    <div class="vc__ebar-fill"
                         [style.width.%]="entry.value * 100"
                         [style.background]="emotionService.getEmotionColor(entry.name)">
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- AI Panel -->
        <div class="vc__ai-panel">
          <div class="vc__ai-container">
            <!-- AI Avatar -->
            <div class="vc__ai-avatar" [class.vc__ai-avatar--speaking]="speechService.isSpeaking()">
              <div class="vc__ai-rings">
                <div class="vc__ai-ring vc__ai-ring--1"></div>
                <div class="vc__ai-ring vc__ai-ring--2"></div>
                <div class="vc__ai-ring vc__ai-ring--3"></div>
              </div>
              <div class="vc__ai-face"
                   [class.vc__ai-face--concerned]="aiCompanion.aiMood() === 'concerned'"
                   [class.vc__ai-face--celebrating]="aiCompanion.aiMood() === 'celebrating'">
                <span class="material-symbols-outlined" style="font-size: 48px;">
                  @switch (aiCompanion.aiMood()) {
                    @case ('concerned') { sentiment_dissatisfied }
                    @case ('celebrating') { celebration }
                    @case ('encouraging') { fitness_center }
                    @default { psychology }
                  }
                </span>
              </div>
            </div>

            <!-- AI Status -->
            <div class="vc__ai-status mt-5">
              @if (aiCompanion.isThinking()) {
                <span class="text-caption animate-pulse">Thinking...</span>
              } @else if (speechService.isSpeaking()) {
                <span class="text-caption" style="color: var(--mm-orange);">Speaking...</span>
              } @else {
                <span class="text-caption text-muted">MindMirror AI</span>
              }
            </div>

            <!-- Latest AI message preview -->
            @if (getLastAiMessage()) {
              <div class="vc__ai-bubble mt-5 animate-fade-in">
                <p class="text-body">{{ getLastAiMessage()!.text }}</p>
              </div>
            }
          </div>

          <!-- AI Label -->
          <div class="vc__label">
            <span>MindMirror AI</span>
            @if (speechService.isSpeaking()) {
              <span class="vc__mic-indicator material-symbols-outlined">volume_up</span>
            }
          </div>
        </div>
      </div>

      <!-- Stats Overlay -->
      @if (showStats() && sessionActive()) {
        <div class="vc__stats animate-slide-in">
          <div class="vc__stat"><span class="vc__stat-val">{{ emotionService.currentEmotion()?.emotion || 'N/A' }}</span><span class="vc__stat-lbl">EMOTION</span></div>
          <div class="vc__stat"><span class="vc__stat-val">{{ (emotionService.currentEmotion()?.confidence ?? 0) * 100 | number:'1.0-0' }}%</span><span class="vc__stat-lbl">CONFIDENCE</span></div>
          <div class="vc__stat"><span class="vc__stat-val">{{ messageCount() }}</span><span class="vc__stat-lbl">MESSAGES</span></div>
          <div class="vc__stat"><span class="vc__stat-val">{{ sessionTimer() }}</span><span class="vc__stat-lbl">DURATION</span></div>
        </div>
      }

      <!-- Conversation Panel -->
      <div class="vc__conversation" [class.vc__conversation--active]="sessionActive()">
        <div class="vc__messages" #messagesEl>
          @for (msg of aiCompanion.messages(); track msg.id) {
            <div class="vc__msg" [class.vc__msg--ai]="msg.role === 'ai'" [class.vc__msg--user]="msg.role === 'user'">
              @if (msg.role === 'ai') {
                <span class="vc__msg-avatar material-symbols-outlined">psychology</span>
              }
              <div class="vc__msg-bubble">
                <p>{{ msg.text }}</p>
                <span class="vc__msg-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              @if (msg.role === 'user' && msg.emotion) {
                <span class="vc__msg-emotion material-symbols-outlined">{{ emotionService.getEmotionEmoji(msg.emotion) }}</span>
              }
            </div>
          }

          @if (aiCompanion.isThinking()) {
            <div class="vc__msg vc__msg--ai">
              <span class="vc__msg-avatar material-symbols-outlined">psychology</span>
              <div class="vc__msg-bubble vc__msg-bubble--thinking">
                <span class="vc__dot"></span><span class="vc__dot"></span><span class="vc__dot"></span>
              </div>
            </div>
          }

          @if (speechService.interimText()) {
            <div class="vc__msg vc__msg--user vc__msg--interim">
              <div class="vc__msg-bubble">
                <p style="opacity:0.5;">{{ speechService.interimText() }}...</p>
              </div>
            </div>
          }
        </div>

        <!-- Input -->
        <div class="vc__input-bar">
          @if (speechService.isListening()) {
            <div class="vc__listening-indicator">
              <div class="vc__wave"></div>
              <div class="vc__wave"></div>
              <div class="vc__wave"></div>
              <div class="vc__wave"></div>
              <span class="text-caption">Listening...</span>
            </div>
          }
          @if (speechService.lastError()) {
            <div class="text-caption" style="color: var(--mm-danger); padding: 0 8px; display:flex; align-items:center; gap:4px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">warning</span> {{ speechService.lastError() }}
            </div>
          }
          <input type="text" class="form-input" placeholder="Type a message or speak..."
                 [(ngModel)]="textInput" name="chatInput"
                 (keydown.enter)="sendText()" [disabled]="!sessionActive()">
          <button class="btn btn-brand btn-sm" (click)="sendText()" [disabled]="!sessionActive() || !textInput">
            SEND
          </button>
        </div>
      </div>

      <!-- Bottom Controls -->
      @if (sessionActive()) {
        <div class="vc__controls">
          <button class="vc__control-btn" [class.vc__control-btn--active]="speechService.isListening()"
                  (click)="toggleMic()" id="mic-toggle">
            <span class="material-symbols-outlined">{{ speechService.isListening() ? 'mic' : 'mic_off' }}</span>
            <span>{{ speechService.isListening() ? 'Mute' : 'Unmute' }}</span>
          </button>
          <button class="vc__control-btn vc__control-btn--end" (click)="endSession()" id="end-call-btn">
            <span class="material-symbols-outlined">call_end</span>
            <span>End</span>
          </button>
          <button class="vc__control-btn" [class.vc__control-btn--active]="!speechService.isSpeaking()"
                  (click)="toggleAiVoice()" id="voice-toggle">
            <span class="material-symbols-outlined">{{ aiVoiceEnabled() ? 'volume_up' : 'volume_mute' }}</span>
            <span>{{ aiVoiceEnabled() ? 'Voice On' : 'Voice Off' }}</span>
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './video-call.component.css',
})
export class VideoCallComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('messagesEl') messagesRef!: ElementRef<HTMLDivElement>;

  emotionService = inject(EmotionDetectionService);
  speechService = inject(SpeechService);
  aiCompanion = inject(AiCompanionService);
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  sessionActive = signal(false);
  sessionTimer = signal('00:00');
  showStats = signal(false);
  aiVoiceEnabled = signal(true);
  cameraAvailable = signal(true);
  permMic = signal<'unknown' | 'granted' | 'denied' | 'no device'>('unknown');
  permCam = signal<'unknown' | 'granted' | 'denied' | 'no device'>('unknown');
  textInput = '';

  private mediaStream: MediaStream | null = null;
  private sessionStart: Date | null = null;
  private timerInterval: any;
  private speechSub: any;
  private emotionSub: any;
  private msgCheckInterval: any;

  messageCount = signal(0);

  ngOnInit() {}

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.cleanup();
  }

  async checkPermissions() {
    // Check camera
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      camStream.getTracks().forEach(t => t.stop());
      this.permCam.set('granted');
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.permCam.set('no device');
      } else {
        this.permCam.set('denied');
      }
    }

    // Check microphone
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach(t => t.stop());
      this.permMic.set('granted');
    } catch (err: any) {
      console.error('Microphone error:', err);
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.permMic.set('no device');
      } else {
        this.permMic.set('denied');
        this.toast.danger('Mic Blocked', `${err.name}: ${err.message}`, 'mic');
      }
    }

    this.toast.info('Permissions Checked',
      `Mic: ${this.permMic()} | Camera: ${this.permCam()}`, 'lock');
  }

  async startSession() {
    let hasCamera = false;

    // Try to get webcam — fallback gracefully if not available
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      this.videoRef.nativeElement.srcObject = this.mediaStream;
      hasCamera = true;
    } catch (err: any) {
      console.warn('No camera available:', err.message);
      this.cameraAvailable.set(false);
    }

    // Load face-api models only if camera is available
    if (hasCamera) {
      try {
        this.toast.info('Loading AI Models', 'Preparing emotion detection...', 'psychology');
        await this.emotionService.loadModels();
        this.emotionService.startDetection(this.videoRef.nativeElement, 500);
        this.cameraAvailable.set(true);
      } catch (err) {
        console.warn('Face detection models failed to load:', err);
        this.cameraAvailable.set(false);
      }
    }

    // Start speech recognition (works without camera)
    this.speechService.startListening();

    // Listen for speech results
    this.speechSub = this.speechService.speech$.subscribe(result => {
      if (result.isFinal && result.text.trim()) {
        this.aiCompanion.processUserSpeech(result.text, this.emotionService.currentEmotion() || undefined);
        this.scrollToBottom();
      }
    });

    // Track emotions and send to AI (only if camera active)
    this.emotionSub = setInterval(() => {
      const emotion = this.emotionService.currentEmotion();
      if (emotion) {
        this.aiCompanion.processEmotion(emotion);
      }
      this.messageCount.set(this.aiCompanion.messages().length);
    }, 2000);

    // Listen for AI responses and speak them
    let lastMsgCount = 0;
    this.msgCheckInterval = setInterval(() => {
      const msgs = this.aiCompanion.messages();
      if (msgs.length > lastMsgCount) {
        const newMsgs = msgs.slice(lastMsgCount);
        newMsgs.forEach(m => {
          if (m.role === 'ai' && this.aiVoiceEnabled()) {
            this.speechService.speak(m.text);
          }
        });
        lastMsgCount = msgs.length;
        this.scrollToBottom();
      }
    }, 500);

    // Start timer
    this.sessionActive.set(true);
    this.sessionStart = new Date();
    this.timerInterval = setInterval(() => {
      if (!this.sessionStart) return;
      const diff = Math.floor((Date.now() - this.sessionStart.getTime()) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      this.sessionTimer.set(`${m}:${s}`);
    }, 1000);

    // Start backend session
    this.api.startSession('AI Video Call').subscribe({ error: () => {} });

    const modeLabel = hasCamera ? 'Camera + Mic' : 'Text + Mic (no camera)';
    this.toast.success('Session Started', `Mode: ${modeLabel}`, 'videocam');

    // Send intro message
    setTimeout(() => {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const intro = hasCamera
        ? `${greeting}! I'm MindMirror AI. I can see your face and hear your voice. I'll be observing your expressions in real-time and providing feedback. How are you feeling?`
        : `${greeting}! I'm MindMirror AI. I couldn't detect a camera, but I can still hear you and chat with you. Speak or type to me — how are you feeling right now?`;
      this.aiCompanion.addAiGreeting(intro);
      this.scrollToBottom();
    }, 1500);
  }

  endSession() {
    this.cleanup();
    this.sessionActive.set(false);
    this.api.endSession('AI Video Call ended').subscribe({ error: () => {} });
    this.toast.info('Session Ended', 'Your conversation and emotions have been recorded', 'bar_chart');
  }

  toggleMic() {
    if (this.speechService.isListening()) {
      this.speechService.stopListening();
    } else {
      this.speechService.startListening();
    }
  }

  toggleAiVoice() {
    this.aiVoiceEnabled.update(v => !v);
    if (!this.aiVoiceEnabled()) {
      this.speechService.stopSpeaking();
    }
  }

  toggleStats() {
    this.showStats.update(v => !v);
  }

  sendText() {
    if (!this.textInput.trim() || !this.sessionActive()) return;
    this.aiCompanion.processUserSpeech(this.textInput, this.emotionService.currentEmotion() || undefined);
    this.textInput = '';
    this.scrollToBottom();
  }

  getEmotionEntries(): { name: string; value: number }[] {
    const emotions = this.emotionService.currentEmotion()?.allEmotions || {};
    return Object.entries(emotions)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }

  getLastAiMessage(): AiMessage | null {
    const msgs = this.aiCompanion.messages();
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'ai') return msgs[i];
    }
    return null;
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesRef?.nativeElement) {
        this.messagesRef.nativeElement.scrollTop = this.messagesRef.nativeElement.scrollHeight;
      }
    }, 100);
  }

  private cleanup() {
    this.emotionService.stopDetection();
    this.speechService.stopListening();
    this.speechService.stopSpeaking();
    clearInterval(this.timerInterval);
    clearInterval(this.emotionSub);
    clearInterval(this.msgCheckInterval);
    this.speechSub?.unsubscribe();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }
}
