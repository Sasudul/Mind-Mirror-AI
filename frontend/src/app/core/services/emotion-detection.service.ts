import { Injectable, signal } from '@angular/core';

declare const faceapi: any;

export interface EmotionReading {
  emotion: string;
  confidence: number;
  allEmotions: Record<string, number>;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class EmotionDetectionService {
  readonly isLoaded = signal(false);
  readonly isDetecting = signal(false);
  readonly currentEmotion = signal<EmotionReading | null>(null);
  readonly faceDetected = signal(false);

  private detectionInterval: any;
  private faceApiLoaded = false;

  async loadModels(): Promise<void> {
    if (this.faceApiLoaded) return;

    // Dynamically import face-api.js
    const faceapiModule = await import('face-api.js');
    (window as any).faceapi = faceapiModule;

    const MODEL_URL = '/assets/models';
    await Promise.all([
      faceapiModule.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapiModule.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapiModule.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    ]);

    this.faceApiLoaded = true;
    this.isLoaded.set(true);
    console.log('[EmotionDetection] Models loaded');
  }

  startDetection(videoElement: HTMLVideoElement, intervalMs: number = 500): void {
    if (!this.faceApiLoaded || this.isDetecting()) return;
    this.isDetecting.set(true);

    const faceapiRef = (window as any).faceapi;

    this.detectionInterval = setInterval(async () => {
      try {
        const detection = await faceapiRef
          .detectSingleFace(videoElement, new faceapiRef.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.4,
          }))
          .withFaceLandmarks(true)
          .withFaceExpressions();

        if (detection) {
          this.faceDetected.set(true);
          const expressions = detection.expressions;
          const sorted = Object.entries(expressions)
            .sort((a: any, b: any) => b[1] - a[1]);

          const [topEmotion, topConfidence] = sorted[0] as [string, number];

          const allEmotions: Record<string, number> = {};
          sorted.forEach(([key, val]: any) => {
            allEmotions[key] = Math.round(val * 100) / 100;
          });

          this.currentEmotion.set({
            emotion: topEmotion,
            confidence: topConfidence,
            allEmotions,
            timestamp: Date.now(),
          });
        } else {
          this.faceDetected.set(false);
        }
      } catch (err) {
        console.warn('[EmotionDetection] Detection error:', err);
      }
    }, intervalMs);
  }

  stopDetection(): void {
    clearInterval(this.detectionInterval);
    this.isDetecting.set(false);
    this.faceDetected.set(false);
    this.currentEmotion.set(null);
  }

  getEmotionEmoji(emotion: string): string {
    const map: Record<string, string> = {
      happy: 'sentiment_satisfied', sad: 'sentiment_dissatisfied', angry: 'sentiment_extremely_dissatisfied', surprised: 'sentiment_surprised',
      neutral: 'sentiment_neutral', fearful: 'mood_bad', disgusted: 'sick',
    };
    return map[emotion] || 'sentiment_neutral';
  }

  getEmotionColor(emotion: string): string {
    const map: Record<string, string> = {
      happy: '#ffa110', sad: '#7a8fa0', angry: '#d94040',
      surprised: '#ffb83e', neutral: '#c4a060', fearful: '#b87830',
      disgusted: '#8a6830',
    };
    return map[emotion] || '#c4a060';
  }
}
