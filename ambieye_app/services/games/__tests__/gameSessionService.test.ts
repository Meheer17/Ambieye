import { GameSessionService } from "../index";
import apiClient from "../../api/apiService";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../../api/apiService");

describe("GameSessionService Architecture", () => {
  let service: GameSessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GameSessionService();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("mahi");
  });

  it("starts a new game session and calls backend API", async () => {
    const mockSession = {
      sessionId: "sess_123",
      patientId: "mahi",
      gameId: "antakshari",
      startedAt: "2026-09-15T12:00:00Z",
      status: "in_progress",
      score: null,
      duration: 0,
      metadata: { initialSyllable: "M" },
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true, session: mockSession },
    }); // For session creation
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true, event: { eventId: "evt_1" } },
    }); // For initial game_started event

    const session = await service.startSession({
      gameId: "antakshari",
      sessionId: "sess_123",
      metadata: { initialSyllable: "M" },
    });

    expect(session.sessionId).toBe("sess_123");
    expect(session.patientId).toBe("mahi");
    expect(session.gameId).toBe("antakshari");
    expect(session.status).toBe("in_progress");
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it("records discrete gameplay events with arbitrary metadata", async () => {
    const mockEvent = {
      eventId: "evt_999",
      sessionId: "sess_123",
      patientId: "mahi",
      gameId: "antakshari",
      eventType: "answer_correct",
      timestamp: "2026-09-15T12:01:00Z",
      metadata: {
        transcript: "Mera Joota Hai Japani",
        confidence: 0.98,
        songId: "bw-classic-001",
      },
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true, event: mockEvent },
    });

    const event = await service.recordEvent({
      sessionId: "sess_123",
      gameId: "antakshari",
      eventType: "answer_correct",
      metadata: {
        transcript: "Mera Joota Hai Japani",
        confidence: 0.98,
        songId: "bw-classic-001",
      },
    });

    expect(event.eventType).toBe("answer_correct");
    expect(event.metadata?.confidence).toBe(0.98);
    expect(apiClient.post).toHaveBeenCalledWith(
      expect.stringContaining("/games/events"),
      expect.objectContaining({
        eventType: "answer_correct",
        sessionId: "sess_123",
      })
    );
  });

  it("completes a game session and records score and game_completed event", async () => {
    const mockUpdatedSession = {
      sessionId: "sess_123",
      patientId: "mahi",
      gameId: "antakshari",
      startedAt: "2026-09-15T12:00:00Z",
      completedAt: "2026-09-15T12:05:00Z",
      duration: 300,
      status: "completed",
      score: 92.5,
      metadata: { roundsCompleted: 4 },
    };

    (apiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { success: true, session: mockUpdatedSession },
    });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true, event: { eventId: "evt_completed" } },
    });

    const session = await service.completeSession("sess_123", 92.5, {
      roundsCompleted: 4,
    });

    expect(session?.status).toBe("completed");
    expect(session?.score).toBe(92.5);
    expect(apiClient.put).toHaveBeenCalledWith(
      expect.stringContaining("/games/sessions/sess_123"),
      expect.objectContaining({ status: "completed", score: 92.5 })
    );
  });

  it("pauses and resumes a session gracefully", async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { success: true, session: { status: "paused" } },
    });
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { success: true },
    });

    await service.pauseSession("sess_123");
    expect(apiClient.put).toHaveBeenCalledWith(
      expect.stringContaining("/games/sessions/sess_123"),
      expect.objectContaining({ status: "paused" })
    );

    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { success: true, session: { status: "in_progress" } },
    });
    await service.resumeSession("sess_123");
    expect(apiClient.put).toHaveBeenCalledWith(
      expect.stringContaining("/games/sessions/sess_123"),
      expect.objectContaining({ status: "in_progress" })
    );
  });

  it("fetches aggregated game statistics for personalization & companion context", async () => {
    const mockStats = {
      patientId: "mahi",
      gameId: "antakshari",
      totalSessions: 12,
      completedSessions: 10,
      abandonedSessions: 2,
      totalDurationSeconds: 1800,
      averageDurationSeconds: 150,
      averageScore: 88.4,
      highestScore: 100,
      lastPlayedAt: "2026-09-15T12:00:00Z",
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { success: true, stats: mockStats },
    });

    const stats = await service.getPatientStats("mahi", "antakshari");
    expect(stats.totalSessions).toBe(12);
    expect(stats.averageScore).toBe(88.4);
    expect(stats.completedSessions).toBe(10);
  });
});
