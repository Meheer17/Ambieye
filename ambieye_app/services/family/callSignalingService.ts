import { API_CONFIG } from "../api/config";

export type SignalingEventType =
  | "incoming_call"
  | "call_initiated"
  | "call_ringing"
  | "call_accepted"
  | "call_declined"
  | "ice_candidate"
  | "call_ended"
  | "call_mute_state"
  | "connection_state";

export interface IncomingCallPayload {
  callId: string;
  callerId: string;
  callerName: string;
  callType: "audio" | "video";
  sdpOffer?: any;
  timestamp: string;
}

export type SignalingListener = (payload: any) => void;

class CallSignalingService {
  private ws: WebSocket | null = null;
  private currentUserId = "mahi";
  private isConnected = false;
  private listeners: Map<SignalingEventType, Set<SignalingListener>> = new Map();
  private reconnectTimer: any = null;

  /**
   * Connect to the FastAPI WebRTC signaling WebSocket server
   */
  public connect(userId: string = "mahi"): void {
    this.currentUserId = userId;
    if (typeof WebSocket === "undefined") {
      return;
    }

    if (this.ws && (this.ws.readyState === 1 || this.ws.readyState === 0)) {
      return;
    }

    try {
      const url = `${API_CONFIG.WS_CALLS_URL}?userId=${encodeURIComponent(userId)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit("connection_state", { status: "connected", userId });
        console.log(`[CallSignaling] Connected to ${url}`);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e) {
          console.warn("[CallSignaling] Failed to parse message:", e);
        }
      };

      this.ws.onerror = () => {
        // Silent offline handler - reconnection is handled in onclose
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit("connection_state", { status: "disconnected" });
        // Auto-reconnect after 3 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect(this.currentUserId);
          }, 3000);
        }
      };
    } catch (err) {
      console.warn("[CallSignaling] Connection error:", err);
    }
  }

  /**
   * Disconnect the signaling socket
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Safe close
      }
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Process incoming signaling events from backend
   */
  private handleIncomingMessage(msg: any): void {
    const type = msg.type;
    switch (type) {
      case "INCOMING_CALL":
        this.emit("incoming_call", {
          callId: msg.callId,
          callerId: msg.callerId,
          callerName: msg.callerName || "Family Contact",
          callType: msg.callType || "video",
          sdpOffer: msg.sdpOffer,
          timestamp: msg.timestamp,
        });
        break;
      case "CALL_INITIATED":
        this.emit("call_initiated", msg);
        break;
      case "CALL_RINGING":
        this.emit("call_ringing", msg);
        break;
      case "CALL_ACCEPTED":
        this.emit("call_accepted", msg);
        break;
      case "CALL_DECLINED":
        this.emit("call_declined", msg);
        break;
      case "ICE_CANDIDATE":
        this.emit("ice_candidate", msg);
        break;
      case "CALL_ENDED":
        this.emit("call_ended", msg);
        break;
      case "CALL_MUTE_STATE":
        this.emit("call_mute_state", msg);
        break;
      default:
        break;
    }
  }

  /**
   * Send JSON payload over WebSocket
   */
  private send(payload: any): boolean {
    if (this.ws && this.ws.readyState === 1) {
      try {
        this.ws.send(JSON.stringify(payload));
        return true;
      } catch (err) {
        console.warn("[CallSignaling] Send error:", err);
      }
    }
    return false;
  }

  /**
   * Caller initiates call
   */
  public sendCallInitiate(
    calleeId: string,
    callType: "audio" | "video",
    callId: string,
    sdpOffer?: any,
    callerName?: string
  ): boolean {
    return this.send({
      type: "CALL_INITIATE",
      targetUserId: calleeId,
      callType,
      callId,
      sdpOffer,
      callerName: callerName || "Bhaben Barman",
    });
  }

  public initiateCall(
    calleeId: string,
    callType: "audio" | "video",
    callId: string,
    sdpOffer?: any,
    callerName?: string
  ): boolean {
    return this.sendCallInitiate(calleeId, callType, callId, sdpOffer, callerName);
  }

  /**
   * Callee acknowledges ringing
   */
  public sendCallRinging(callerId: string, callId: string): boolean {
    return this.send({
      type: "CALL_RINGING",
      callerId,
      callId,
    });
  }

  /**
   * Callee accepts call with SDP answer
   */
  public sendCallAccept(callerId: string, callId: string, sdpAnswer?: any): boolean {
    return this.send({
      type: "CALL_ACCEPT",
      callerId,
      callId,
      sdpAnswer,
    });
  }

  public acceptCall(callerId: string, callId: string, sdpAnswer?: any): boolean {
    return this.sendCallAccept(callerId, callId, sdpAnswer);
  }

  /**
   * Callee declines call
   */
  public sendCallDecline(callerId: string, callId: string, reason = "declined"): boolean {
    return this.send({
      type: "CALL_DECLINE",
      callerId,
      callId,
      reason,
    });
  }

  public declineCall(callerId: string, callId: string, reason = "declined"): boolean {
    return this.sendCallDecline(callerId, callId, reason);
  }

  /**
   * Send local ICE candidate to peer
   */
  public sendIceCandidate(targetUserId: string, callId: string, candidate: any): boolean {
    return this.send({
      type: "ICE_CANDIDATE",
      targetUserId,
      callId,
      candidate,
    });
  }

  /**
   * Either participant ends call
   */
  public sendCallEnd(targetUserId: string, callId: string, durationSeconds = 0): boolean {
    return this.send({
      type: "CALL_END",
      targetUserId,
      callId,
      durationSeconds,
    });
  }

  public endCall(targetUserId: string, callId: string, durationSeconds = 0): boolean {
    return this.sendCallEnd(targetUserId, callId, durationSeconds);
  }

  /**
   * Broadcast mute or video disable state change
   */
  public sendMuteState(
    targetUserId: string,
    callId: string,
    isAudioMuted: boolean,
    isVideoDisabled: boolean
  ): boolean {
    return this.send({
      type: "CALL_MUTE_STATE",
      targetUserId,
      callId,
      isAudioMuted,
      isVideoDisabled,
    });
  }

  /**
   * Event listener subscription
   */
  public on(event: SignalingEventType, listener: SignalingListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  /**
   * Emit event to subscribers
   */
  public emit(event: SignalingEventType, payload: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(payload);
        } catch (e) {
          console.error("[CallSignaling] Listener error:", e);
        }
      });
    }
  }

  public emitEvent(event: SignalingEventType, payload: any): void {
    this.emit(event, payload);
  }
}

export const callSignalingService = new CallSignalingService();
