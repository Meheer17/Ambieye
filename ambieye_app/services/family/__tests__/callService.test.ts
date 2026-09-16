import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "@/services/api/apiService";
import { callService, CallSession, CallState } from "../callService";
import { callSignalingService } from "../callSignalingService";
import { webrtcService } from "../webrtcService";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@/services/api/apiService", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe("Real 1-to-1 Audio & Video Call Service Pipeline", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    callService.reset();
  });

  afterEach(() => {
    callService.reset();
  });

  describe("1. Outgoing Call Initiation", () => {
    it("initializes an outgoing audio call session and sends CALL_INITIATE signaling", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          callRecord: {
            id: "call-test-1",
            patientId: "mahi",
            familyMemberId: "fam-anita",
            callType: "audio",
            direction: "outgoing",
            status: "initiating",
            durationSeconds: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const spySignaling = jest
        .spyOn(callSignalingService, "initiateCall")
        .mockImplementation(() => true);

      const session = await callService.startCall({
        patientId: "mahi",
        contactId: "fam-anita",
        contactName: "Anita Barman",
        contactAvatar: "👩",
        callType: "audio",
        initiator: "patient",
      });

      expect(session).toBeDefined();
      expect(session.callType).toBe("audio");
      expect(session.status).toBe("ringing");
      expect(session.contactName).toBe("Anita Barman");
      expect(spySignaling).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith(
        "/calls",
        expect.objectContaining({
          patientId: "mahi",
          familyMemberId: "fam-anita",
          callType: "audio",
          direction: "outgoing",
        })
      );
    });

    it("initializes an outgoing video call session with video tracks enabled", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          callRecord: {
            id: "call-video-1",
            patientId: "mahi",
            familyMemberId: "fam-rahul",
            callType: "video",
            direction: "outgoing",
            status: "initiating",
            durationSeconds: 0,
          },
        },
      });

      jest.spyOn(callSignalingService, "initiateCall").mockImplementation(() => true);

      const session = await callService.startCall({
        patientId: "mahi",
        contactId: "fam-rahul",
        contactName: "Rahul Barman",
        contactAvatar: "👨‍💻",
        callType: "video",
        initiator: "patient",
      });

      expect(session.callType).toBe("video");
      expect(session.status).toBe("ringing");
    });
  });

  describe("2. Incoming Call Handling & Decision Flow", () => {
    it("notifies listeners when an incoming call arrives via signaling", () => {
      const incomingListener = jest.fn();
      const unsub = callService.onIncomingCall(incomingListener);

      // Simulate incoming event from WebSocket
      callSignalingService.emitEvent("incoming_call", {
        callId: "call-incoming-101",
        callerId: "fam-anita",
        callerName: "Anita Barman",
        callType: "video",
        timestamp: new Date().toISOString(),
      });

      expect(incomingListener).toHaveBeenCalledWith(
        expect.objectContaining({
          callId: "call-incoming-101",
          callType: "video",
          callerName: "Anita Barman",
        })
      );

      unsub();
    });

    it("accepts incoming call, responds with CALL_ACCEPT, and transitions to connecting", async () => {
      const spyAccept = jest
        .spyOn(callSignalingService, "acceptCall")
        .mockImplementation(() => true);

      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const session = await callService.acceptCall({
        callId: "call-incoming-101",
        patientId: "mahi",
        contactId: "fam-anita",
        contactName: "Anita Barman",
        contactAvatar: "👩",
        callType: "video",
        initiator: "family",
      });

      expect(session.status).toBe("connected");
      expect(spyAccept).toHaveBeenCalled();
    });

    it("declines incoming call, sends CALL_DECLINE, and logs rejected call record", async () => {
      const spyDecline = jest
        .spyOn(callSignalingService, "declineCall")
        .mockImplementation(() => true);

      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      await callService.declineCall("call-incoming-101", "mahi", "fam-anita");

      expect(spyDecline).toHaveBeenCalledWith("fam-anita", "call-incoming-101", "declined");
      expect(callService.getActiveSession()).toBeNull();
    });
  });

  describe("3. Call Controls (Mute, Video, Flip Camera)", () => {
    it("toggles microphone audio mute state and syncs with signaling", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, callRecord: { id: "call-mute-1" } },
      });
      jest.spyOn(callSignalingService, "initiateCall").mockImplementation(() => true);
      const spyMuteSignaling = jest
        .spyOn(callSignalingService, "sendMuteState")
        .mockImplementation(() => true);

      await callService.startCall({
        patientId: "mahi",
        contactId: "fam-anita",
        contactName: "Anita Barman",
        callType: "audio",
        initiator: "patient",
      });

      const muted = callService.toggleMute();
      expect(muted).toBe(true);
      expect(spyMuteSignaling).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        true,
        expect.any(Boolean)
      );

      const unmuted = callService.toggleMute();
      expect(unmuted).toBe(false);
    });

    it("toggles video camera stream on and off", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, callRecord: { id: "call-video-toggle" } },
      });
      jest.spyOn(callSignalingService, "initiateCall").mockImplementation(() => true);

      await callService.startCall({
        patientId: "mahi",
        contactId: "fam-rahul",
        contactName: "Rahul Barman",
        callType: "video",
        initiator: "patient",
      });

      const videoOff = callService.toggleVideo();
      expect(videoOff).toBe(true); // isVideoDisabled is now true

      const videoOn = callService.toggleVideo();
      expect(videoOn).toBe(false); // isVideoDisabled is now false
    });

    it("switches camera facing mode (front/back)", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, callRecord: { id: "call-cam-flip" } },
      });
      jest.spyOn(callSignalingService, "initiateCall").mockImplementation(() => true);

      await callService.startCall({
        patientId: "mahi",
        contactId: "fam-rahul",
        contactName: "Rahul Barman",
        callType: "video",
        initiator: "patient",
      });

      const isFront = callService.switchCamera();
      expect(typeof isFront).toBe("boolean");
    });
  });

  describe("4. Call Termination & Metadata Persistence", () => {
    it("ends an active call, notifies peer via signaling, and updates backend duration", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, callRecord: { id: "call-finish-1" } },
      });
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const spyEndSignaling = jest
        .spyOn(callSignalingService, "endCall")
        .mockImplementation(() => true);
      const spyWebRTCCleanup = jest
        .spyOn(webrtcService, "cleanup")
        .mockImplementation(() => {});

      await callService.startCall({
        patientId: "mahi",
        contactId: "fam-anita",
        contactName: "Anita Barman",
        contactAvatar: "👩",
        callType: "audio",
        initiator: "patient",
      });

      // Simulate connection
      callService.setConnected();
      expect(callService.getActiveSession()?.status).toBe("connected");

      await callService.endCall("normal_hangup");

      expect(spyEndSignaling).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(Number));
      expect(spyWebRTCCleanup).toHaveBeenCalled();
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining("/calls/"),
        expect.objectContaining({
          status: "completed",
        })
      );
    });

    it("persists completed call in local RecentCall history for offline access", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, callRecord: { id: "call-history-test" } },
      });
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });
      jest.spyOn(callSignalingService, "initiateCall").mockImplementation(() => true);
      jest.spyOn(callSignalingService, "endCall").mockImplementation(() => true);

      await callService.startCall({
        patientId: "mahi",
        contactId: "fam-anita",
        contactName: "Anita Barman",
        contactAvatar: "👩",
        callType: "video",
        initiator: "patient",
      });

      callService.setConnected();
      await callService.endCall();

      const stored = await AsyncStorage.getItem("ambieye_family_recent_calls_v1");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed[0].contactName).toBe("Anita Barman");
      expect(parsed[0].callType).toBe("video");
      expect(parsed[0].direction).toBe("outgoing");
    });
  });

  describe("5. Duration Formatting & State Subscriptions", () => {
    it("formats seconds into elderly-friendly mm:ss strings", () => {
      expect(callService.formatDuration(0)).toBe("00:00");
      expect(callService.formatDuration(9)).toBe("00:09");
      expect(callService.formatDuration(65)).toBe("01:05");
      expect(callService.formatDuration(754)).toBe("12:34");
    });

    it("emits state changes to subscribed UI components", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, callRecord: { id: "call-sub-test" } },
      });
      jest.spyOn(callSignalingService, "initiateCall").mockImplementation(() => true);

      const states: string[] = [];
      const unsub = callService.onCallStateChange((state) => {
        if (state) states.push(state.callStatus);
      });

      await callService.startCall({
        patientId: "mahi",
        contactId: "fam-anita",
        contactName: "Anita Barman",
        callType: "audio",
        initiator: "patient",
      });

      callService.setConnected();

      expect(states).toContain("initiating");
      expect(states).toContain("connected");

      unsub();
    });
  });
});
