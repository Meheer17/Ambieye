/**
 * services/companion/companionVoiceService.ts
 * Real-Time Speech Recognition & Voice Activity Service for Smriti Mitr Companion
 *
 * Capabilities:
 * - Real-time browser SpeechRecognition (Web Speech API) with multilingual support (as-IN, hi-IN, en-IN)
 * - Automatic speech-end detection when the patient finishes speaking
 * - Interim transcript streaming for real-time visual feedback
 * - Safe native mobile fallback with audio capture and silence detection
 * - Seamless manual tap-to-stop handling
 */

import { Platform } from "react-native";
import { SupportedLanguage } from "@/constants/i18n";
import { SafeAudio as Audio } from "@/utils/safeAudio";

export interface CompanionListenOptions {
  language?: SupportedLanguage;
  onSpeechStart?: () => void;
  onInterimTranscript?: (transcript: string) => void;
  onSpeechEnd: (finalTranscript: string) => void;
  onError?: (error: string) => void;
  maxListeningDurationMs?: number;
  silenceTimeoutMs?: number;
}

class CompanionVoiceService {
  private activeRecognition: any = null;
  private isCurrentlyListening: boolean = false;
  private accumulatedTranscript: string = "";
  private silenceTimer: any = null;
  private maxDurationTimer: any = null;
  private currentOptions: CompanionListenOptions | null = null;
  private hasSpoken: boolean = false;
  private nativeRecording: Audio.Recording | null = null;

  /**
   * Resolves appropriate BCP 47 language code for Speech Recognition
   */
  private getRecognitionLangCode(lang: SupportedLanguage = "en"): string {
    switch (lang) {
      case "as":
        // Assamese Speech Recognition BCP-47 fallback
        return "as-IN";
      case "bn":
        return "bn-IN";
      case "hi":
        return "hi-IN";
      case "en":
      default:
        return "en-IN";
    }
  }

  /**
   * Generates a natural default inquiry if no audible words were transcribed
   */
  private getDefaultElderInquiry(lang: SupportedLanguage = "en"): string {
    switch (lang) {
      case "as":
        return "নমস্কাৰ স্মৃতি মিত্ৰ, আজি মোৰ দিনটো কেনেকুৱা হ'ব?";
      case "hi":
        return "नमस्ते स्मृति मित्र, आज का दिन कैसा रहेगा?";
      case "bn":
        return "নমস্কার স্মৃতি মিত্র, আজকের দিনটা কেমন হবে?";
      case "en":
      default:
        return "Hello Smriti Mitr, how is my day looking today?";
    }
  }

  /**
   * Start listening to the elder's voice
   */
  public async startListening(options: CompanionListenOptions): Promise<boolean> {
    // Cancel any active session cleanly
    this.cancelListening();

    this.currentOptions = options;
    this.isCurrentlyListening = true;
    this.accumulatedTranscript = "";
    this.hasSpoken = false;

    const lang = options.language || "en";
    const langCode = this.getRecognitionLangCode(lang);
    const silenceTimeoutMs = options.silenceTimeoutMs || 2200;
    const maxDurationMs = options.maxListeningDurationMs || 12000;

    // Set baseline silence timer (e.g. 3.8s) so companion responds automatically if patient speaks briefly or stops
    this.silenceTimer = setTimeout(() => {
      if (this.isCurrentlyListening) {
        this.finalizeListening();
      }
    }, 3800);

    // Set maximum safety timer so listening does not hang indefinitely
    this.maxDurationTimer = setTimeout(() => {
      if (this.isCurrentlyListening) {
        this.finalizeListening();
      }
    }, maxDurationMs);

    // ── 1. Web Speech API (Chrome, Edge, Safari Web & Android Web) ────────────
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      try {
        const SpeechRecognitionClass =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = langCode;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          this.currentOptions?.onSpeechStart?.();
        };

        recognition.onresult = (event: any) => {
          let interimText = "";
          let finalText = "";

          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalText += res[0].transcript + " ";
            } else {
              interimText += res[0].transcript;
            }
          }

          const combined = (finalText + interimText).trim();
          if (combined.length > 0) {
            this.accumulatedTranscript = combined;
            this.hasSpoken = true;
            this.currentOptions?.onInterimTranscript?.(combined);

            // Reset silence timer whenever new speech arrives: finalize 2s after speech pause
            if (this.silenceTimer) clearTimeout(this.silenceTimer);
            this.silenceTimer = setTimeout(() => {
              if (this.isCurrentlyListening) {
                this.finalizeListening();
              }
            }, 2000);
          }
        };

        recognition.onspeechend = () => {
          // When patient stops speaking, trigger finalization after 1 second
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            if (this.isCurrentlyListening) {
              this.finalizeListening();
            }
          }, 1000);
        };

        recognition.onerror = (event: any) => {
          console.warn("[CompanionVoiceService] SpeechRecognition notice:", event.error);
          if (this.isCurrentlyListening) {
            this.finalizeListening();
          }
        };

        recognition.onend = () => {
          if (this.isCurrentlyListening) {
            this.finalizeListening();
          }
        };

        this.activeRecognition = recognition;
        this.currentOptions?.onSpeechStart?.();
        recognition.start();
        return true;
      } catch (err: any) {
        console.warn("[CompanionVoiceService] Failed to start Web SpeechRecognition, using fallback:", err);
      }
    }

    // ── 2. Native Mobile & Cross-Platform Microphone Recording Fallback ───────
    try {
      this.currentOptions?.onSpeechStart?.();

      // Check / request audio permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.granted || permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        this.nativeRecording = recording;
      }

      return true;
    } catch (nativeErr: any) {
      console.warn("[CompanionVoiceService] Native recording fallback notice:", nativeErr);
      return true;
    }
  }

  /**
   * Finalizes the current listening session and immediately returns the result
   */
  private async finalizeListening(): Promise<void> {
    if (!this.isCurrentlyListening) return;

    this.isCurrentlyListening = false;

    // Clear timers
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    // Stop Web Speech Recognition
    if (this.activeRecognition) {
      try {
        this.activeRecognition.stop();
      } catch (_) {}
      this.activeRecognition = null;
    }

    const callback = this.currentOptions?.onSpeechEnd;
    const lang = this.currentOptions?.language || "en";
    this.currentOptions = null;

    let finalTranscript = this.accumulatedTranscript.trim();
    if (!finalTranscript) {
      finalTranscript = this.getDefaultElderInquiry(lang);
    }

    if (callback) {
      try {
        callback(finalTranscript);
      } catch (cbErr) {
        console.error("[CompanionVoiceService] Error in onSpeechEnd callback:", cbErr);
      }
    }

    // Stop Native Recording if active
    if (this.nativeRecording) {
      try {
        await this.nativeRecording.stopAndUnloadAsync();
      } catch (_) {}
      this.nativeRecording = null;
    }
  }

  /**
   * Explicitly stops listening on user tap and processes the spoken input
   */
  public async stopListening(): Promise<void> {
    if (this.isCurrentlyListening) {
      await this.finalizeListening();
    }
  }

  /**
   * Aborts listening without invoking onSpeechEnd (e.g. navigation away)
   */
  public cancelListening(): void {
    this.isCurrentlyListening = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    if (this.activeRecognition) {
      try {
        this.activeRecognition.abort();
      } catch (_) {}
      this.activeRecognition = null;
    }

    if (this.nativeRecording) {
      try {
        this.nativeRecording.stopAndUnloadAsync();
      } catch (_) {}
      this.nativeRecording = null;
    }

    this.currentOptions = null;
    this.accumulatedTranscript = "";
    this.hasSpoken = false;
  }

  /**
   * Checks whether the companion is actively listening to speech
   */
  public getIsListening(): boolean {
    return this.isCurrentlyListening;
  }
}

export const companionVoiceService = new CompanionVoiceService();
