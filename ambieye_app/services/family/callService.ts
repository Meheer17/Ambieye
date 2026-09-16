import apiClient from "../api/apiService";
import { API_CONFIG } from "../api/config";
import { webrtcService } from "./webrtcService";
import { callSignalingService, IncomingCallPayload } from "./callSignalingService";
import { FamilyMember, RecentCall } from "./familyService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CallStatus =
  | "idle"
  | "initiating"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "completed"
  | "ended"
  | "declined"
  | "rejected"
  | "failed";

export interface CallSession {
  id: string;
  patientId: string;
  familyMemberId: string;
  contactName: string;
  contactAvatar: string;
  contactRelationship: string;
  phone: string;
  callType: "audio" | "video";
  direction: "incoming" | "outgoing";
  status: CallStatus;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
}

export interface CallState {
  activeSession: CallSession | null;
  callStatus: CallStatus;
  callDuration: number;
  isAudioMuted: boolean;
  isVideoDisabled: boolean;
  isSpeakerOn: boolean;
  isFrontCamera: boolean;
  localStream: any;
  remoteStream: any;
  incomingCall: IncomingCallPayload | null;
  errorMessage?: string | null;
}

type CallStateListener = (state: CallState) => void;

class CallService {
  private activeSession: CallSession | null = null;
  private callStatus: CallStatus = "idle";
  private callDuration = 0;
  private timerInterval: any = null;
  private isAudioMuted = false;
  private isVideoDisabled = false;
  private isSpeakerOn = true;
  private isFrontCamera = true;
  private localStream: any = null;
  private remoteStream: any = null;
  private incomingCall: IncomingCallPayload | null = null;
  private errorMessage: string | null = null;
  private listeners: Set<CallStateListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  /**
   * Reset service state (useful for tests and cleanup)
   */
  public reset(): void {
    this.resetCallState();
  }

  /**
   * Formats seconds into mm:ss
   */
  public formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const mm = mins < 10 ? `0${mins}` : `${mins}`;
    const ss = secs < 10 ? `0${secs}` : `${secs}`;
    return `${mm}:${ss}`;
  }

  /**
   * Returns current active session
   */
  public getActiveSession(): CallSession | null {
    return this.activeSession;
  }

  /**
   * Listen for incoming call events
   */
  public onIncomingCall(callback: (call: IncomingCallPayload) => void): () => void {
    return callSignalingService.on("incoming_call", callback);
  }

  /**
   * Subscribe to call state changes
   */
  public onCallStateChange(listener: CallStateListener): () => void {
    return this.subscribe(listener);
  }

  /**
   * Initializes real-time signaling listener bindings
   */
  public init(userId = "mahi"): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Connect signaling WebSocket
    callSignalingService.connect(userId);

    // 1. Handle incoming calls
    callSignalingService.on("incoming_call", (payload: IncomingCallPayload) => {
      this.incomingCall = payload;
      this.notify();
    });

    // 2. Caller receives ringing notification
    callSignalingService.on("call_ringing", (data: any) => {
      if (this.activeSession && this.activeSession.id === data.callId) {
        this.callStatus = "ringing";
        this.notify();
      }
    });

    // 3. Caller receives call accepted with SDP Answer
    callSignalingService.on("call_accepted", async (data: any) => {
      if (this.activeSession && this.activeSession.id === data.callId) {
        if (data.sdpAnswer) {
          await webrtcService.handleAnswer(data.sdpAnswer);
        }
        this.setConnected();
      }
    });

    // 4. Callee declined
    callSignalingService.on("call_declined", (data: any) => {
      if (this.activeSession && this.activeSession.id === data.callId) {
        this.callStatus = "declined";
        this.stopDurationTimer();
        this.webrtcCleanup();
        this.notify();
      }
    });

    // 5. ICE Candidate exchange
    callSignalingService.on("ice_candidate", async (data: any) => {
      if (this.activeSession && this.activeSession.id === data.callId && data.candidate) {
        await webrtcService.addIceCandidate(data.candidate);
      }
    });

    // 6. Peer ended call
    callSignalingService.on("call_ended", (data: any) => {
      if (this.activeSession && this.activeSession.id === data.callId) {
        this.handleCallTerminated("completed", data.durationSeconds || 0);
      }
    });

    // 7. Peer mute state
    callSignalingService.on("call_mute_state", (_data: any) => {
      this.notify();
    });
  }

  /**
   * Start call using options object
   */
  public async startCall(options: {
    patientId?: string;
    contactId: string;
    contactName: string;
    contactAvatar?: string;
    contactRelationship?: string;
    phone?: string;
    callType: "audio" | "video";
    initiator?: string;
  }): Promise<CallSession> {
    const member: FamilyMember = {
      id: options.contactId,
      patientId: options.patientId || "mahi",
      name: options.contactName,
      relationship: options.contactRelationship || "Family Contact",
      phone: options.phone || "+91 98765 43210",
      avatarEmoji: options.contactAvatar || "👤",
      avatarBg: "#EFF6FF",
      borderColor: "#93C5FD",
      themeColor: options.callType === "video" ? "#059669" : "#2563EB",
      isFavorite: false,
      isOnline: true,
    };
    return this.initiateCall(member, options.callType, options.patientId || "mahi");
  }

  /**
   * Initiate outgoing Call (Audio or Video) to a Family Member
   */
  public async initiateCall(
    contact: FamilyMember,
    callType: "audio" | "video",
    patientId = "mahi"
  ): Promise<CallSession> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Reset state
    this.callStatus = "initiating";
    this.callDuration = 0;
    this.errorMessage = null;
    this.incomingCall = null;
    this.isAudioMuted = false;
    this.isVideoDisabled = false;

    this.activeSession = {
      id: callId,
      patientId,
      familyMemberId: contact.id,
      contactName: contact.name,
      contactAvatar: contact.avatarEmoji || "👤",
      contactRelationship: contact.relationship,
      phone: contact.phone,
      callType,
      direction: "outgoing",
      status: "initiating",
      startedAt: nowIso,
      durationSeconds: 0,
    };
    this.notify();

    // 1. Create call session record on backend SQLite database
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.CALLS.BASE, {
        id: callId,
        patientId,
        familyMemberId: contact.id,
        callType,
        direction: "outgoing",
        status: "ringing",
        startedAt: nowIso,
      });
    } catch (e) {
      console.warn("[CallService] Backend session create error (continuing with signaling):", e);
    }

    // 2. Setup local WebRTC media & PeerConnection
    try {
      webrtcService.createPeerConnection({
        onRemoteTrack: (stream) => {
          this.remoteStream = stream;
          this.setConnected();
          this.notify();
        },
        onIceCandidate: (candidate) => {
          callSignalingService.sendIceCandidate(contact.id, callId, candidate);
        },
        onConnectionStateChange: (state) => {
          if (state === "connected") {
            this.setConnected();
          } else if (state === "failed" || state === "disconnected") {
            this.errorMessage = "Connection interrupted";
            this.notify();
          }
        },
      });

      // Capture local camera & microphone tracks
      this.localStream = await webrtcService.getLocalMediaStream(true, callType === "video");

      // Generate SDP Offer
      const sdpOffer = await webrtcService.createOffer();

      // Send Call Initiate signal over WebSocket
      callSignalingService.initiateCall(contact.id, callType, callId, sdpOffer, "Bhaben Barman");

      // Transition to ringing after signaling transmission
      this.callStatus = "ringing";
      if (this.activeSession) {
        this.activeSession.status = "ringing";
      }
      this.notify();
    } catch (err: any) {
      console.warn("[CallService] Media setup warning:", err);
      this.callStatus = "ringing"; // Fallback to signaling state
      if (this.activeSession) {
        this.activeSession.status = "ringing";
      }
      this.notify();
    }

    return this.activeSession;
  }

  /**
   * Accept an incoming call with options
   */
  public async acceptCall(options: {
    callId: string;
    patientId?: string;
    contactId: string;
    contactName: string;
    contactAvatar?: string;
    callType: "audio" | "video";
    initiator?: string;
  }): Promise<CallSession> {
    const payload: IncomingCallPayload = {
      callId: options.callId,
      callerId: options.contactId,
      callerName: options.contactName,
      callType: options.callType,
      timestamp: new Date().toISOString(),
    };
    await this.acceptIncomingCall(payload);
    return this.activeSession!;
  }

  /**
   * Accept an incoming call
   */
  public async acceptIncomingCall(incoming: IncomingCallPayload): Promise<void> {
    this.incomingCall = null;
    const nowIso = new Date().toISOString();

    this.activeSession = {
      id: incoming.callId,
      patientId: "mahi",
      familyMemberId: incoming.callerId,
      contactName: incoming.callerName,
      contactAvatar: "👤",
      contactRelationship: "Family Contact",
      phone: "+91 98000 00000",
      callType: incoming.callType,
      direction: "incoming",
      status: "connected",
      startedAt: incoming.timestamp || nowIso,
      answeredAt: nowIso,
      durationSeconds: 0,
    };

    this.callStatus = "connected";
    this.callDuration = 0;
    this.notify();

    // 1. Update status on backend
    try {
      await apiClient.put(API_CONFIG.ENDPOINTS.CALLS.DETAIL(incoming.callId), {
        status: "accepted",
        answeredAt: nowIso,
      });
    } catch (e) {
      // Non-blocking
    }

    // 2. Setup WebRTC PeerConnection & Answer
    try {
      webrtcService.createPeerConnection({
        onRemoteTrack: (stream) => {
          this.remoteStream = stream;
          this.notify();
        },
        onIceCandidate: (candidate) => {
          callSignalingService.sendIceCandidate(incoming.callerId, incoming.callId, candidate);
        },
        onConnectionStateChange: (state) => {
          if (state === "connected") {
            this.setConnected();
          }
        },
      });

      this.localStream = await webrtcService.getLocalMediaStream(true, incoming.callType === "video");

      let sdpAnswer: any = null;
      if (incoming.sdpOffer) {
        sdpAnswer = await webrtcService.handleOffer(incoming.sdpOffer);
      }

      // Send Accept signal back to caller
      callSignalingService.acceptCall(incoming.callerId, incoming.callId, sdpAnswer);
      this.startDurationTimer();
    } catch (err) {
      console.warn("[CallService] Accept WebRTC error:", err);
      callSignalingService.acceptCall(incoming.callerId, incoming.callId);
      this.startDurationTimer();
    }
  }

  /**
   * Decline an incoming call
   */
  public async declineCall(callId: string, _patientId = "mahi", callerId = "family-member", reason = "declined"): Promise<void> {
    return this.declineIncomingCall(callId, callerId, reason);
  }

  /**
   * Decline an incoming call
   */
  public async declineIncomingCall(callId: string, callerId: string, reason = "declined"): Promise<void> {
    this.incomingCall = null;
    callSignalingService.declineCall(callerId, callId, reason);

    try {
      await apiClient.put(API_CONFIG.ENDPOINTS.CALLS.DETAIL(callId), {
        status: "rejected",
        endedAt: new Date().toISOString(),
      });
    } catch (e) {
      // Non-blocking
    }

    this.notify();
  }

  /**
   * End call alias
   */
  public async endCall(_reason = "normal_hangup"): Promise<CallSession | null> {
    const session = this.activeSession;
    await this.endActiveCall();
    return session;
  }

  /**
   * Transition call to Connected and start duration timer
   */
  public setConnected(): void {
    if (this.callStatus !== "connected") {
      this.callStatus = "connected";
      if (this.activeSession) {
        this.activeSession.status = "connected";
        this.activeSession.answeredAt = new Date().toISOString();
      }
      this.startDurationTimer();
      this.notify();
    }
  }

  /**
   * Start live call duration timer
   */
  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.callDuration = 0;
    this.timerInterval = setInterval(() => {
      this.callDuration += 1;
      if (this.activeSession) {
        this.activeSession.durationSeconds = this.callDuration;
      }
      this.notify();
    }, 1000);
  }

  /**
   * Stop duration timer
   */
  private stopDurationTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * End the active call session
   */
  public async endActiveCall(): Promise<void> {
    if (!this.activeSession) {
      this.resetCallState();
      return;
    }

    const session = this.activeSession;
    const finalDuration = this.callDuration;
    const nowIso = new Date().toISOString();

    // 1. Send signal to peer
    callSignalingService.endCall(session.familyMemberId, session.id, finalDuration);

    // 2. Update backend SQLite database
    try {
      await apiClient.put(API_CONFIG.ENDPOINTS.CALLS.DETAIL(session.id), {
        status: "completed",
        endedAt: nowIso,
        durationSeconds: finalDuration,
      });
    } catch (e) {
      // Non-blocking
    }

    // 3. Persist into local Recent Calls log
    await this.recordRecentCall(session, finalDuration);

    // 4. Cleanup
    this.handleCallTerminated("ended", finalDuration);
  }

  /**
   * Handles termination cleanup from either side
   */
  private handleCallTerminated(status: CallStatus, duration: number): void {
    this.stopDurationTimer();
    this.webrtcCleanup();
    this.callStatus = status;

    if (this.activeSession) {
      this.activeSession.status = status;
      this.activeSession.durationSeconds = duration;
      this.recordRecentCall(this.activeSession, duration);
    }

    this.notify();

    // Reset to idle after 1.5s
    setTimeout(() => {
      this.resetCallState();
    }, 1500);
  }

  /**
   * Cleans up WebRTC peer connection & media streams
   */
  private webrtcCleanup(): void {
    webrtcService.cleanup();
    this.localStream = null;
    this.remoteStream = null;
  }

  /**
   * Resets internal state to idle
   */
  private resetCallState(): void {
    this.stopDurationTimer();
    this.webrtcCleanup();
    this.activeSession = null;
    this.callStatus = "idle";
    this.callDuration = 0;
    this.errorMessage = null;
    this.incomingCall = null;
    this.isAudioMuted = false;
    this.isVideoDisabled = false;
    this.notify();
  }

  /**
   * Persists call into local RecentCall history
   */
  private async recordRecentCall(session: CallSession, durationSeconds: number): Promise<void> {
    try {
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      const durationStr =
        durationSeconds > 0
          ? `${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`
          : "Missed";

      const raw = await AsyncStorage.getItem("ambieye_family_recent_calls_v1");
      const currentCalls: RecentCall[] = raw ? JSON.parse(raw) : [];

      const newRecord: RecentCall = {
        id: session.id,
        contactId: session.familyMemberId,
        contactName: session.contactName,
        contactAvatar: session.contactAvatar,
        contactRelationship: session.contactRelationship,
        contactRelationshipAs: session.contactRelationship,
        contactRelationshipHi: session.contactRelationship,
        callType: session.callType,
        direction: session.direction,
        timestamp: "Just now",
        duration: durationStr,
        phone: session.phone,
        themeColor: session.callType === "video" ? "#059669" : "#2563EB",
      };

      const updated = [newRecord, ...currentCalls.slice(0, 19)];
      await AsyncStorage.setItem(
        "ambieye_family_recent_calls_v1",
        JSON.stringify(updated)
      );
    } catch {
      // Non-blocking
    }
  }

  /**
   * Toggle local microphone mute
   */
  public toggleMute(): boolean {
    this.isAudioMuted = !this.isAudioMuted;
    webrtcService.toggleAudio(!this.isAudioMuted);

    if (this.activeSession) {
      callSignalingService.sendMuteState(
        this.activeSession.familyMemberId,
        this.activeSession.id,
        this.isAudioMuted,
        this.isVideoDisabled
      );
    }

    this.notify();
    return this.isAudioMuted;
  }

  /**
   * Toggle local camera video feed
   */
  public toggleVideo(): boolean {
    this.isVideoDisabled = !this.isVideoDisabled;
    webrtcService.toggleVideo(!this.isVideoDisabled);

    if (this.activeSession) {
      callSignalingService.sendMuteState(
        this.activeSession.familyMemberId,
        this.activeSession.id,
        this.isAudioMuted,
        this.isVideoDisabled
      );
    }

    this.notify();
    return this.isVideoDisabled;
  }

  /**
   * Toggle speaker
   */
  public toggleSpeaker(): boolean {
    this.isSpeakerOn = !this.isSpeakerOn;
    this.notify();
    return this.isSpeakerOn;
  }

  /**
   * Switch front/back camera
   */
  public switchCamera(): boolean {
    this.isFrontCamera = !this.isFrontCamera;
    this.notify();
    return this.isFrontCamera;
  }

  /**
   * Get current state snapshot
   */
  public getState(): CallState {
    return {
      activeSession: this.activeSession,
      callStatus: this.callStatus,
      callDuration: this.callDuration,
      isAudioMuted: this.isAudioMuted,
      isVideoDisabled: this.isVideoDisabled,
      isSpeakerOn: this.isSpeakerOn,
      isFrontCamera: this.isFrontCamera,
      localStream: this.localStream,
      remoteStream: this.remoteStream,
      incomingCall: this.incomingCall,
      errorMessage: this.errorMessage,
    };
  }

  /**
   * Subscribe to call state changes
   */
  public subscribe(listener: CallStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.error("[CallService] Listener error:", e);
      }
    });
  }
}

export const callService = new CallService();
