/**
 * SpeechRecognitionService
 * Modular abstraction for Speech-to-Text (STT) services.
 * Allows seamless switching between Mock/Local/Backend/Cloud STT providers.
 */

export type STTErrorCode =
  | "NO_SPEECH_DETECTED"
  | "EMPTY_TRANSCRIPT"
  | "STT_ERROR"
  | "NETWORK_FAILURE";

export interface STTResult {
  success: boolean;
  transcript?: string;
  confidence?: number;
  error?: STTErrorCode;
  errorMessage?: string;
  isMock?: boolean;
}

export interface ISpeechRecognitionService {
  transcribeAudio(audioUri: string, durationMs?: number): Promise<STTResult>;
}

/**
 * MockSpeechRecognitionProvider
 * Used when no external/cloud STT service is configured.
 * Clearly notes that it is a mock/simulated provider.
 */
class MockSpeechRecognitionProvider implements ISpeechRecognitionService {
  // Configurable test scenario for manual QA / testing
  private simulatedMode: "auto" | "no_speech" | "empty" | "network_error" | "stt_error" = "auto";

  setSimulatedMode(mode: "auto" | "no_speech" | "empty" | "network_error" | "stt_error") {
    this.simulatedMode = mode;
  }

  getSimulatedMode() {
    return this.simulatedMode;
  }

  async transcribeAudio(audioUri: string, durationMs?: number): Promise<STTResult> {
    // 1. Validate audio input
    if (!audioUri) {
      return {
        success: false,
        error: "NO_SPEECH_DETECTED",
        errorMessage: "No audio recording found. Please sing into the microphone.",
        isMock: true,
      };
    }

    // 2. Simulate processing latency (1.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 3. Handle simulated test scenarios
    if (this.simulatedMode === "no_speech") {
      return {
        success: false,
        error: "NO_SPEECH_DETECTED",
        errorMessage: "No speech detected in the audio. Please sing closer to the microphone.",
        isMock: true,
      };
    }

    if (this.simulatedMode === "empty") {
      return {
        success: false,
        error: "EMPTY_TRANSCRIPT",
        errorMessage: "Audio was recorded, but no identifiable lyrics were transcribed.",
        isMock: true,
      };
    }

    if (this.simulatedMode === "network_error") {
      return {
        success: false,
        error: "NETWORK_FAILURE",
        errorMessage: "Speech recognition service unavailable. Check your network connection.",
        isMock: true,
      };
    }

    if (this.simulatedMode === "stt_error") {
      return {
        success: false,
        error: "STT_ERROR",
        errorMessage: "Speech-to-text service encountered an internal processing error.",
        isMock: true,
      };
    }

    // 4. Auto mode: If audio duration is extremely short (< 800ms), treat as no speech
    if (durationMs !== undefined && durationMs < 800) {
      return {
        success: false,
        error: "NO_SPEECH_DETECTED",
        errorMessage: "Recording was too short to detect singing. Please hold the button longer.",
        isMock: true,
      };
    }

    // Sample representative cultural songs for testing
    const sampleLyrics = [
      "Moi eti jajabor, dhorar dhulite mur ghor",
      "Pyaar deewana hota hai, mastana hota hai",
      "Dil cheez kya hai aap meri jaan lijiye",
      "Bistirno parore ashonkhyo jonore",
      "Mere sapno ki rani kab aayegi tu",
    ];

    const randomIndex = Math.floor(Math.random() * sampleLyrics.length);
    const selectedTranscript = sampleLyrics[randomIndex];

    return {
      success: true,
      transcript: selectedTranscript,
      confidence: 0.92,
      isMock: true,
    };
  }
}

/**
 * SpeechRecognitionService Singleton
 * Delegates to the active provider (currently Mock, swappable for Whisper/Bhashini later)
 */
class SpeechRecognitionService implements ISpeechRecognitionService {
  private activeProvider: ISpeechRecognitionService;

  constructor() {
    // Default to MockSpeechRecognitionProvider as no external STT credentials are configured yet
    this.activeProvider = new MockSpeechRecognitionProvider();
  }

  setProvider(provider: ISpeechRecognitionService) {
    this.activeProvider = provider;
  }

  async transcribeAudio(audioUri: string, durationMs?: number): Promise<STTResult> {
    try {
      return await this.activeProvider.transcribeAudio(audioUri, durationMs);
    } catch (err: any) {
      console.error("[SpeechRecognitionService] Transcription error:", err);
      return {
        success: false,
        error: "NETWORK_FAILURE",
        errorMessage: err?.message || "Failed to reach speech recognition service.",
        isMock: true,
      };
    }
  }

  /**
   * Helper to set test mode on mock provider for QA testing
   */
  setTestMode(mode: "auto" | "no_speech" | "empty" | "network_error" | "stt_error") {
    if (this.activeProvider instanceof MockSpeechRecognitionProvider) {
      this.activeProvider.setSimulatedMode(mode);
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
