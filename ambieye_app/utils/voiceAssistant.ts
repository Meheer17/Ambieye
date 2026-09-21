/**
 * utils/voiceAssistant.ts
 * Pure Mobile-First & Cross-Platform Voice Assistant for Elderly Dementia Patients
 * 
 * Features:
 * - Pure Native Mobile Speech using `expo-speech` on Android & iOS with Google TTS / Siri
 * - Automatic regional voice & language tagging (as-IN, hi-IN, bn-IN, en-IN)
 * - Browser Web Speech API fallback for desktop preview
 * - Anti-stuttering, gentle rate (0.88x) and reassuring tone tuned for cognitive care
 */
import { Platform } from "react-native";
import type * as SpeechType from "expo-speech";
import * as Haptics from "expo-haptics";
import { SupportedLanguage } from "@/constants/i18n";

// Safely obtain Speech without crashing when ExpoSpeech native module is absent
let Speech: typeof SpeechType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Speech = require("expo-speech");
} catch (e) {
  console.warn("[VoiceAssistant] ExpoSpeech native module not available in this environment.");
}

// Web Speech API fallback reference
let activeUtterance: any = null;
let cachedVoices: any[] = [];

if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
  const loadVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices() || [];
    } catch (e) {
      // ignore
    }
  };
  loadVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export class VoiceAssistant {
  private static isSpeaking = false;

  /**
   * Provide gentle haptic feedback on mobile devices
   */
  public static triggerHaptic(): void {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Resolve appropriate IETF BCP 47 language code for native Android/iOS speech
   */
  private static getNativeLanguageCode(lang: SupportedLanguage): string {
    switch (lang) {
      case "as":
        // Android Google TTS maps Assamese to 'as-IN' or 'bn-IN' fallback
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
   * Find the best matching voice for Web preview fallback
   */
  private static getBestWebVoice(lang: SupportedLanguage): any {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    if (lang === "as" || lang === "bn") {
      const bnVoice = voices.find((v) => v.lang.startsWith("bn") || v.lang.startsWith("as"));
      if (bnVoice) return bnVoice;
    }

    if (lang === "hi") {
      const hiVoice = voices.find(
        (v) =>
          v.lang.startsWith("hi") ||
          v.name.toLowerCase().includes("hindi") ||
          v.name.toLowerCase().includes("ravi") ||
          v.name.toLowerCase().includes("heera")
      );
      if (hiVoice) return hiVoice;
    }

    const indianVoice = voices.find(
      (v) =>
        v.lang === "en-IN" ||
        v.name.toLowerCase().includes("india") ||
        v.name.toLowerCase().includes("neerja") ||
        v.name.toLowerCase().includes("prabhat")
    );
    if (indianVoice) return indianVoice;

    if (lang === "as" || lang === "bn") {
      const hiFallback = voices.find((v) => v.lang.startsWith("hi") || v.name.toLowerCase().includes("hindi"));
      if (hiFallback) return hiFallback;
    }

    const enVoice = voices.find((v) => v.lang.startsWith("en"));
    if (enVoice) return enVoice;

    return voices.find((v) => v.default) || voices[0];
  }

  /**
   * Speak the given text in the requested regional language natively on Mobile
   */
  public static speak(
    text: string,
    lang: SupportedLanguage = "en",
    onDone?: () => void
  ): boolean {
    if (!text || text.trim().length === 0) return false;

    // Trigger gentle native mobile haptic feedback on touch
    VoiceAssistant.triggerHaptic();

    // ── 1. NATIVE MOBILE APP (Android & iOS) via expo-speech ────────────────
    if (Platform.OS !== "web" && Speech) {
      try {
        Speech.stop();
        VoiceAssistant.isSpeaking = true;

        const langCode = VoiceAssistant.getNativeLanguageCode(lang);

        Speech.speak(text, {
          language: langCode,
          pitch: 1.05,
          rate: 0.88, // Gentle elder pace
          onStart: () => {
            VoiceAssistant.isSpeaking = true;
          },
          onDone: () => {
            VoiceAssistant.isSpeaking = false;
            if (onDone) onDone();
          },
          onStopped: () => {
            VoiceAssistant.isSpeaking = false;
          },
          onError: (err) => {
            console.warn("[VoiceAssistant Native] Speech error, trying fallback:", err);
            // Fallback to Hindi or English if regional TTS voice is not present on Android device
            if (langCode === "as-IN") {
              Speech.speak(text, {
                language: "hi-IN",
                pitch: 1.05,
                rate: 0.88,
                onDone,
              });
            } else {
              VoiceAssistant.isSpeaking = false;
            }
          },
        });

        return true;
      } catch (nativeErr) {
        console.warn("[VoiceAssistant Native] Execution error:", nativeErr);
        VoiceAssistant.isSpeaking = false;
      }
    }

    // ── 2. WEB BROWSER FALLBACK ─────────────────────────────────────────────
    if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();

        setTimeout(() => {
          try {
            const utterance = new SpeechSynthesisUtterance(text);
            activeUtterance = utterance;

            const bestVoice = VoiceAssistant.getBestWebVoice(lang);
            if (bestVoice) {
              utterance.voice = bestVoice;
              utterance.lang = bestVoice.lang;
            } else {
              if (lang === "hi") utterance.lang = "hi-IN";
              else if (lang === "as" || lang === "bn") utterance.lang = "hi-IN";
              else utterance.lang = "en-IN";
            }

            utterance.rate = 0.88;
            utterance.pitch = 1.05;
            utterance.volume = 1.0;

            utterance.onstart = () => {
              VoiceAssistant.isSpeaking = true;
            };
            utterance.onend = () => {
              VoiceAssistant.isSpeaking = false;
              activeUtterance = null;
              if (onDone) onDone();
            };
            utterance.onerror = (err) => {
              console.warn("[VoiceAssistant Web] Error:", err);
              VoiceAssistant.isSpeaking = false;
              activeUtterance = null;
            };

            window.speechSynthesis.speak(utterance);
          } catch (innerErr) {
            console.warn("[VoiceAssistant Web] Inner error:", innerErr);
          }
        }, 30);

        return true;
      } catch (e) {
        console.warn("[VoiceAssistant Web] Speech synthesis error:", e);
      }
    }

    console.log(`[VoiceAssistant] Spoke: "${text}" (${lang})`);
    return true;
  }

  /**
   * Stop speaking immediately
   */
  public static stop(): void {
    if (Platform.OS !== "web") {
      try {
        if (Speech?.stop) {
          Speech.stop();
        }
      } catch (e) {
        // ignore
      }
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
    VoiceAssistant.isSpeaking = false;
    activeUtterance = null;
  }

  public static getIsSpeaking(): boolean {
    return VoiceAssistant.isSpeaking;
  }
}
