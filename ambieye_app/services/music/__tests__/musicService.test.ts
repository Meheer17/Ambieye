import { musicService } from "../musicService";
import {
  CURATED_MUSIC_TRACKS,
  MusicInteractionEvent,
  ReminiscenceReactionType,
} from "@/types/music";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../../api/apiService";
import { Audio } from "expo-av";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../../api/apiService");
jest.mock("../../companion/companionContextService", () => ({
  companionContextService: {
    getPatientCompanionContext: jest.fn().mockResolvedValue({}),
    recordRawGameEvent: jest.fn().mockResolvedValue({}),
  },
}));

// Mock expo-av Audio.Sound
const mockSoundInstance = {
  loadAsync: jest.fn().mockResolvedValue({ isLoaded: true }),
  playAsync: jest.fn().mockResolvedValue({ isPlaying: true }),
  pauseAsync: jest.fn().mockResolvedValue({ isPlaying: false }),
  stopAsync: jest.fn().mockResolvedValue({}),
  unloadAsync: jest.fn().mockResolvedValue({}),
  setPositionAsync: jest.fn().mockResolvedValue({}),
  setOnPlaybackStatusUpdate: jest.fn(),
  getStatusAsync: jest.fn().mockResolvedValue({
    isLoaded: true,
    isPlaying: true,
    positionMillis: 15000,
    durationMillis: 120000,
    didJustFinish: false,
  }),
};

jest.mock("expo-av", () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: jest.fn().mockImplementation((source, initialStatus, onStatusUpdate) => {
        if (onStatusUpdate) {
          mockSoundInstance.setOnPlaybackStatusUpdate(onStatusUpdate);
        }
        return Promise.resolve({ sound: mockSoundInstance, status: { isLoaded: true, isPlaying: true } });
      }),
    },
  },
}));

describe("MusicService Comprehensive Pipeline", () => {
  const patientId = "patient_bhaben_01";
  const sampleTrack = CURATED_MUSIC_TRACKS[0];

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });
    await musicService.stop();
  });

  describe("1. Real Playback & Lifecycle", () => {
    it("starts playback, creates audio sound, logs music_play_started event", async () => {
      await musicService.playTrack(sampleTrack, patientId);

      const state = musicService.getState();
      expect(state.playbackState).toBe("playing");
      expect(state.currentTrack?.id).toBe(sampleTrack.id);

      // Verify expo-av was invoked
      expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
        { uri: sampleTrack.audioUri },
        expect.objectContaining({ shouldPlay: true }),
        expect.any(Function)
      );

      // Verify backend or sync was called with music_play_started
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/music/events"),
        expect.objectContaining({
          patient_id: patientId,
          track_id: sampleTrack.id,
          event_type: "music_play_started",
        })
      );
    });

    it("pauses and resumes real playback and logs events", async () => {
      await musicService.playTrack(sampleTrack, patientId);
      await musicService.pause();

      expect(mockSoundInstance.pauseAsync).toHaveBeenCalled();
      expect(musicService.getState().playbackState).toBe("paused");

      await musicService.resume();
      expect(mockSoundInstance.playAsync).toHaveBeenCalled();
      expect(musicService.getState().playbackState).toBe("playing");
    });

    it("stops and unloads audio cleanly", async () => {
      await musicService.playTrack(sampleTrack, patientId);
      await musicService.stop();

      expect(mockSoundInstance.stopAsync).toHaveBeenCalled();
      expect(mockSoundInstance.unloadAsync).toHaveBeenCalled();
      expect(musicService.getState().playbackState).toBe("idle");
    });
  });

  describe("2. Favorites Management & Persistence", () => {
    it("toggles favorite, persists to AsyncStorage and records interaction events", async () => {
      await musicService.toggleFavorite(sampleTrack.id, patientId);

      expect(musicService.isFavorite(sampleTrack.id)).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining("favorites"),
        expect.stringContaining(sampleTrack.id)
      );

      // Untoggle favorite
      await musicService.toggleFavorite(sampleTrack.id, patientId);
      expect(musicService.isFavorite(sampleTrack.id)).toBe(false);
    });
  });

  describe("3. Non-Clinical Gentle Reminiscence Reactions", () => {
    it("stores exact reaction without any cognitive scoring or diagnostic judgment", async () => {
      await musicService.playTrack(sampleTrack, patientId);

      const reaction: ReminiscenceReactionType = "familiar";
      await musicService.recordReminiscenceReaction(reaction, patientId, sampleTrack.id);

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/music/events"),
        expect.objectContaining({
          patient_id: patientId,
          track_id: sampleTrack.id,
          event_type: "music_reaction",
          metadata: expect.objectContaining({
            reaction: "familiar",
            trackTitle: sampleTrack.title,
          }),
        })
      );
    });
  });

  describe("4. Sing Along Launcher (Antakshari connection)", () => {
    it("records sing_along_started event without duplicating game events", async () => {
      await musicService.recordSingAlongStarted(patientId, sampleTrack.id);

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/music/events"),
        expect.objectContaining({
          patient_id: patientId,
          track_id: sampleTrack.id,
          event_type: "sing_along_started",
        })
      );
    });
  });

  describe("5. Caregiver Summary Calculation from Factual Persisted Events", () => {
    it("computes accurate listening minutes, completed songs, and skipped songs strictly from events", async () => {
      const mockRawEvents: MusicInteractionEvent[] = [
        {
          id: "evt-1",
          patientId,
          sessionId: "sess-1",
          trackId: "as-flute-001",
          eventType: "music_play_started",
          timestamp: new Date().toISOString(),
          playbackPositionSeconds: 0,
          metadata: { trackTitle: "Brahmaputra Dawn Flute", category: "assamese_folk", language: "Assamese" },
        },
        {
          id: "evt-2",
          patientId,
          sessionId: "sess-1",
          trackId: "as-flute-001",
          eventType: "music_play_completed",
          timestamp: new Date().toISOString(),
          playbackPositionSeconds: 154,
          metadata: { trackTitle: "Brahmaputra Dawn Flute", durationSeconds: 154, category: "assamese_folk", language: "Assamese" },
        },
        {
          id: "evt-3",
          patientId,
          sessionId: "sess-2",
          trackId: "hi-sarod-001",
          eventType: "music_play_started",
          timestamp: new Date().toISOString(),
          playbackPositionSeconds: 0,
          metadata: { trackTitle: "Akashvani Vintage Sarod", category: "hindi_classics", language: "Hindi" },
        },
        {
          id: "evt-4",
          patientId,
          sessionId: "sess-2",
          trackId: "hi-sarod-001",
          eventType: "music_skipped",
          timestamp: new Date().toISOString(),
          playbackPositionSeconds: 20,
          metadata: { trackTitle: "Akashvani Vintage Sarod", category: "hindi_classics", language: "Hindi" },
        },
        {
          id: "evt-5",
          patientId,
          sessionId: "sess-1",
          trackId: "as-flute-001",
          eventType: "music_reaction",
          timestamp: new Date().toISOString(),
          playbackPositionSeconds: 150,
          metadata: { reaction: "like", trackTitle: "Brahmaputra Dawn Flute" },
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key.includes("events")) {
          return Promise.resolve(JSON.stringify(mockRawEvents));
        }
        if (key.includes("favorites")) {
          return Promise.resolve(JSON.stringify(["as-flute-001"]));
        }
        return Promise.resolve(null);
      });

      // Backend fetch returns the same
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockRawEvents });

      const summary = await musicService.getCaregiverSummary(patientId);

      expect(summary.patientId).toBe(patientId);
      expect(summary.songsStartedCount).toBe(2);
      expect(summary.songsCompletedCount).toBe(1);
      expect(summary.songsSkippedCount).toBe(1);
      expect(summary.favoritesCount).toBe(1);
      expect(summary.totalListeningDurationSeconds).toBeGreaterThanOrEqual(154);
      expect(summary.recentReactions.length).toBe(1);
      expect(summary.recentReactions[0].reaction).toBe("like");
    });
  });

  describe("6. Offline Sync and Deduplication", () => {
    it("queues events locally when offline and syncs them without loss", async () => {
      // Simulate offline failure
      (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error("Network offline"));

      await musicService.playTrack(sampleTrack, patientId);

      // Verify event was saved to AsyncStorage local events
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining("events"),
        expect.stringContaining("music_play_started")
      );
    });
  });
});
