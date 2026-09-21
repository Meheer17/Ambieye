jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@/services/api/apiService", () => ({
  __esModule: true,
  default: {
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    get: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
  apiClient: {
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    get: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

jest.mock("expo-speech", () => ({
  speak: jest.fn((text, opts) => {
    if (opts?.onStart) opts.onStart();
    if (opts?.onDone) opts.onDone();
  }),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

import { companionService } from "../companionService";
import { companionVoiceService } from "../companionVoiceService";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import * as Speech from "expo-speech";

describe("Companion Voice Interaction & Response Pipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    companionVoiceService.cancelListening();
  });

  afterEach(() => {
    companionVoiceService.cancelListening();
  });

  describe("1. Companion Voice Service Lifecycle", () => {
    it("starts and stops voice listening cleanly", async () => {
      let finalTranscript = "";
      const isListeningStarted = await companionVoiceService.startListening({
        language: "en",
        onSpeechEnd: (transcript) => {
          finalTranscript = transcript;
        },
      });

      expect(isListeningStarted).toBe(true);
      expect(companionVoiceService.getIsListening()).toBe(true);

      // Stop listening manually (elder finished speaking)
      await companionVoiceService.stopListening();

      expect(companionVoiceService.getIsListening()).toBe(false);
      expect(finalTranscript).toBeTruthy();
      expect(finalTranscript.length).toBeGreaterThan(0);
    });

    it("cancels active listening without calling onSpeechEnd callback", async () => {
      const onSpeechEnd = jest.fn();
      await companionVoiceService.startListening({
        language: "as",
        onSpeechEnd,
      });

      expect(companionVoiceService.getIsListening()).toBe(true);
      companionVoiceService.cancelListening();

      expect(companionVoiceService.getIsListening()).toBe(false);
      expect(onSpeechEnd).not.toHaveBeenCalled();
    });
  });

  describe("2. Conversational Validation Therapy & Query Understanding", () => {
    it("responds with empathetic validation therapy when elder expresses anxiety or disorientation", async () => {
      const distressInput = "Where am I? I feel lost and alone";
      const result = await companionService.processElderInput(distressInput, "en");

      expect(result.isDistressed).toBe(true);
      expect(result.topicCategory).toBe("calm");
      expect(result.responseText.toLowerCase()).toContain("safe");
    });

    it("provides Assamese validation therapy when language is Assamese", async () => {
      const distressInput = "মোৰ ভয় লাগিছে";
      const result = await companionService.processElderInput(distressInput, "as");

      expect(result.isDistressed).toBe(true);
      expect(result.topicCategory).toBe("calm");
      expect(result.responseText).toContain("সুৰক্ষিত");
    });

    it("answers questions regarding Antakshari games and scores", async () => {
      const query = "How did I do in Antakshari game today?";
      const result = await companionService.processElderInput(query, "en");

      expect(result.topicCategory).toBe("games");
      expect(result.responseText).toContain("%");
    });

    it("responds warmly to greetings in Hindi", async () => {
      const query = "नमस्ते, आप कैसे हैं?";
      const result = await companionService.processElderInput(query, "hi");

      expect(result.topicCategory).toBe("general");
      expect(result.responseText).toContain("नमस्ते");
    });

    it("explains companion identity when asked who are you", async () => {
      const query = "Who are you?";
      const result = await companionService.processElderInput(query, "en");

      expect(result.responseText).toContain("Smriti Mitr");
    });
  });

  describe("3. Speech Synthesis Execution & Callback Completion", () => {
    it("speaks the response and triggers onDone callback", () => {
      const onDoneMock = jest.fn();
      companionService.speakResponse("Hello Bhaben!", "en", onDoneMock);

      expect(Speech.speak).toHaveBeenCalled();
      expect(onDoneMock).toHaveBeenCalled();
    });

    it("stops speech immediately when companion stopSpeech is called", () => {
      companionService.stopSpeech();
      expect(Speech.stop).toHaveBeenCalled();
    });
  });
});
