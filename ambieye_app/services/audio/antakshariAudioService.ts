import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import type { AudioRecorder } from "expo-audio";

export interface AudioRecordingResult {
  success: boolean;
  uri: string | null;
  durationMs?: number;
  error?: string;
}

class AntakshariAudioService {
  private recorder: AudioRecorder | null = null;
  private lastRecordedUri: string | null = null;
  private isRecording: boolean = false;
  private startTime: number = 0;

  /**
   * Request microphone permission from the system
   */
  async requestPermission(): Promise<boolean> {
    try {
      const response = await requestRecordingPermissionsAsync();
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
    try {
      const response = await getRecordingPermissionsAsync();
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
      if (this.recorder) {
        try {
          await this.recorder.stop();
        } catch (_) {}
        this.recorder = null;
      }

      // 3. Configure audio mode for recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // 4. Create and start recording
      this.recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await this.recorder.prepareToRecordAsync();
      this.recorder.record();
      this.startTime = Date.now();
      this.isRecording = true;

      return { success: true };
    } catch (err: any) {
      console.error("[AntakshariAudioService] Error starting recording:", err);
      this.isRecording = false;
      this.recorder = null;
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
    if (!this.recorder) {
      return {
        success: false,
        uri: this.lastRecordedUri,
        error: "No active recording to stop.",
      };
    }

    try {
      const durationMs =
        this.recorder.currentTime > 0
          ? Math.round(this.recorder.currentTime * 1000)
          : Date.now() - this.startTime;

      await this.recorder.stop();
      const uri = this.recorder.uri;

      this.lastRecordedUri = uri;
      this.recorder = null;
      this.isRecording = false;

      // Reset audio mode
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
      } catch (_) {}

      return {
        success: true,
        uri,
        durationMs,
      };
    } catch (err: any) {
      console.error("[AntakshariAudioService] Error stopping recording:", err);
      this.recorder = null;
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
