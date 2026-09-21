import { Platform } from "react-native";
import type { Audio as AudioType } from "expo-av";

// Safely obtain Audio from expo-av without crashing when ExponentAV native module is absent (e.g. Expo Go, Web, or unlinked builds)
let Audio: typeof AudioType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExpoAv = require("expo-av");
  if (ExpoAv && ExpoAv.Audio) {
    Audio = ExpoAv.Audio;
  }
} catch (e) {
  console.warn("[AntakshariAudioService] ExponentAV native module not available in this environment.");
}

export interface AudioRecordingResult {
  success: boolean;
  uri: string | null;
  durationMs?: number;
  error?: string;
}

class AntakshariAudioService {
  private recording: AudioType.Recording | null = null;
  private lastRecordedUri: string | null = null;
  private isRecording: boolean = false;

  /**
   * Request microphone permission from the system
   */
  async requestPermission(): Promise<boolean> {
    if (!Audio) {
      return false;
    }
    try {
      const response = await Audio.requestPermissionsAsync();
      return response.granted || response.status === "granted";
    } catch (err) {
      console.warn("[AntakshariAudioService] Permission request failed:", err);
      return false;
    }
  }

  /**
   * Check if microphone permission is already granted
   */
  async checkPermission(): Promise<boolean> {
    if (!Audio) {
      return false;
    }
    try {
      const response = await Audio.getPermissionsAsync();
      return response.granted || response.status === "granted";
    } catch (err) {
      console.warn("[AntakshariAudioService] Permission check failed:", err);
      return false;
    }
  }

  /**
   * Start recording the patient's singing voice
   */
  async startRecording(): Promise<{ success: boolean; error?: string }> {
    if (!Audio) {
      return {
        success: false,
        error: "Audio recording is not supported in this client environment (requires a Development Build).",
      };
    }
    try {
      // 1. Check or request permission
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return {
          success: false,
          error: "Microphone permission is required to sing. Please allow access.",
        };
      }

      // 2. Stop any existing recording cleanly
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (_) {}
        this.recording = null;
      }

      // 3. Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 4. Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;

      return { success: true };
    } catch (err: any) {
      console.error("[AntakshariAudioService] Error starting recording:", err);
      this.isRecording = false;
      this.recording = null;
      return {
        success: false,
        error: err?.message || "Failed to start microphone recording.",
      };
    }
  }

  /**
   * Stop recording and keep audio file URI in memory/storage
   */
  async stopRecording(): Promise<AudioRecordingResult> {
    if (!this.recording) {
      return {
        success: false,
        uri: this.lastRecordedUri,
        error: "No active recording to stop.",
      };
    }

    try {
      const status = await this.recording.getStatusAsync();
      const durationMs = status.durationMillis;

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      this.lastRecordedUri = uri;
      this.recording = null;
      this.isRecording = false;

      // Reset audio mode
      try {
        if (Audio) {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
          });
        }
      } catch (_) {}

      return {
        success: true,
        uri,
        durationMs,
      };
    } catch (err: any) {
      console.error("[AntakshariAudioService] Error stopping recording:", err);
      this.recording = null;
      this.isRecording = false;
      return {
        success: false,
        uri: this.lastRecordedUri,
        error: err?.message || "Failed to finalize audio recording.",
      };
    }
  }

  /**
   * Retrieve the URI of the last recorded song audio
   */
  getLastRecordedUri(): string | null {
    return this.lastRecordedUri;
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

export const antakshariAudioService = new AntakshariAudioService();
