import { Platform, NativeModules } from "react-native";

export interface WebRTCCallbacks {
  onRemoteTrack?: (stream: any) => void;
  onIceCandidate?: (candidate: any) => void;
  onConnectionStateChange?: (state: string) => void;
}

const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

/**
 * Cross-platform WebRTC Module Loader
 * Dynamically resolves `react-native-webrtc` for native Android/iOS
 * when native module binaries are available (development build),
 * and falls back safely in Expo Go or standard browser APIs on web.
 */
function getWebRTCModule(): any {
  if (
    Platform.OS !== "web" &&
    NativeModules &&
    (NativeModules.WebRTCModule || (NativeModules as any).WebRTC)
  ) {
    try {
      const webrtc = require("react-native-webrtc");
      return webrtc;
    } catch {
      return null;
    }
  }
  return null;
}

class WebRTCService {
  private peerConnection: any = null;
  private localStream: any = null;
  private remoteStream: any = null;
  private callbacks: WebRTCCallbacks = {};
  private iceServers = DEFAULT_ICE_SERVERS;

  /**
   * Resolves RTCPeerConnection constructor
   */
  private getPeerConnectionConstructor(): any {
    const nativeModule = getWebRTCModule();
    if (nativeModule && nativeModule.RTCPeerConnection) {
      return nativeModule.RTCPeerConnection;
    }
    if (typeof window !== "undefined" && (window as any).RTCPeerConnection) {
      return (window as any).RTCPeerConnection;
    }
    if (typeof global !== "undefined" && (global as any).RTCPeerConnection) {
      return (global as any).RTCPeerConnection;
    }
    return null;
  }

  /**
   * Resolves RTCSessionDescription constructor
   */
  private getSessionDescriptionConstructor(): any {
    const nativeModule = getWebRTCModule();
    if (nativeModule && nativeModule.RTCSessionDescription) {
      return nativeModule.RTCSessionDescription;
    }
    if (typeof window !== "undefined" && (window as any).RTCSessionDescription) {
      return (window as any).RTCSessionDescription;
    }
    if (typeof global !== "undefined" && (global as any).RTCSessionDescription) {
      return (global as any).RTCSessionDescription;
    }
    return null;
  }

  /**
   * Resolves RTCIceCandidate constructor
   */
  private getIceCandidateConstructor(): any {
    const nativeModule = getWebRTCModule();
    if (nativeModule && nativeModule.RTCIceCandidate) {
      return nativeModule.RTCIceCandidate;
    }
    if (typeof window !== "undefined" && (window as any).RTCIceCandidate) {
      return (window as any).RTCIceCandidate;
    }
    if (typeof global !== "undefined" && (global as any).RTCIceCandidate) {
      return (global as any).RTCIceCandidate;
    }
    return null;
  }

  /**
   * Initializes RTCPeerConnection with STUN servers and event handlers
   */
  public createPeerConnection(callbacks: WebRTCCallbacks): any {
    this.callbacks = callbacks;
    const PeerConn = this.getPeerConnectionConstructor();

    if (!PeerConn) {
      console.warn("[WebRTC] RTCPeerConnection constructor not available in current environment.");
      return null;
    }

    try {
      this.peerConnection = new PeerConn({
        iceServers: this.iceServers,
      });

      // Handle ICE candidates generated locally
      this.peerConnection.onicecandidate = (event: any) => {
        if (event.candidate && this.callbacks.onIceCandidate) {
          this.callbacks.onIceCandidate(event.candidate);
        }
      };

      // Handle remote audio/video tracks arriving from peer
      this.peerConnection.ontrack = (event: any) => {
        const stream = event.streams && event.streams[0] ? event.streams[0] : null;
        if (stream) {
          this.remoteStream = stream;
          if (this.callbacks.onRemoteTrack) {
            this.callbacks.onRemoteTrack(stream);
          }
        }
      };

      // Handle peer connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        if (this.callbacks.onConnectionStateChange) {
          this.callbacks.onConnectionStateChange(state);
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        const iceState = this.peerConnection.iceConnectionState;
        if (iceState === "connected" || iceState === "completed") {
          if (this.callbacks.onConnectionStateChange) {
            this.callbacks.onConnectionStateChange("connected");
          }
        } else if (iceState === "disconnected" || iceState === "failed") {
          if (this.callbacks.onConnectionStateChange) {
            this.callbacks.onConnectionStateChange(iceState);
          }
        }
      };

      return this.peerConnection;
    } catch (err) {
      console.warn("[WebRTC] Error initializing peer connection:", err);
      return null;
    }
  }

  /**
   * Captures local user media stream (Camera & Microphone)
   */
  public async getLocalMediaStream(audio = true, video = true): Promise<any> {
    const constraints = {
      audio: audio,
      video: video ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } : false,
    };

    // 1. Check native react-native-webrtc mediaDevices
    const nativeModule = getWebRTCModule();
    if (nativeModule && nativeModule.mediaDevices && nativeModule.mediaDevices.getUserMedia) {
      try {
        const stream = await nativeModule.mediaDevices.getUserMedia(constraints);
        this.localStream = stream;
        this.attachLocalTracksToPeer();
        return stream;
      } catch (err) {
        console.warn("[WebRTC] Native getUserMedia failed:", err);
      }
    }

    // 2. Check browser navigator.mediaDevices
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.localStream = stream;
        this.attachLocalTracksToPeer();
        return stream;
      } catch (err) {
        console.warn("[WebRTC] Browser getUserMedia failed:", err);
      }
    }

    return null;
  }

  private attachLocalTracksToPeer(): void {
    if (this.peerConnection && this.localStream) {
      try {
        if (typeof this.localStream.getTracks === "function") {
          this.localStream.getTracks().forEach((track: any) => {
            try {
              this.peerConnection.addTrack(track, this.localStream);
            } catch (e) {
              console.warn("[WebRTC] Track add warning:", e);
            }
          });
        }
      } catch (e) {
        console.warn("[WebRTC] Track attach warning:", e);
      }
    }
  }

  /**
   * Creates an SDP Offer (Caller)
   */
  public async createOffer(): Promise<any> {
    if (!this.peerConnection) return null;
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (err) {
      console.warn("[WebRTC] createOffer error:", err);
      return null;
    }
  }

  /**
   * Handles an incoming SDP Offer and generates an SDP Answer (Callee)
   */
  public async handleOffer(offerSdp: any): Promise<any> {
    if (!this.peerConnection) return null;
    try {
      const SessionDesc = this.getSessionDescriptionConstructor();
      const desc = SessionDesc ? new SessionDesc(offerSdp) : offerSdp;
      await this.peerConnection.setRemoteDescription(desc);

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (err) {
      console.warn("[WebRTC] handleOffer error:", err);
      return null;
    }
  }

  /**
   * Applies the incoming SDP Answer from the callee (Caller)
   */
  public async handleAnswer(answerSdp: any): Promise<boolean> {
    if (!this.peerConnection) return false;
    try {
      const SessionDesc = this.getSessionDescriptionConstructor();
      const desc = SessionDesc ? new SessionDesc(answerSdp) : answerSdp;
      await this.peerConnection.setRemoteDescription(desc);
      return true;
    } catch (err) {
      console.warn("[WebRTC] handleAnswer error:", err);
      return false;
    }
  }

  /**
   * Adds an ICE candidate received from signaling peer
   */
  public async addIceCandidate(candidate: any): Promise<boolean> {
    if (!this.peerConnection || !candidate) return false;
    try {
      const CandidateClass = this.getIceCandidateConstructor();
      const iceCandidate = CandidateClass ? new CandidateClass(candidate) : candidate;
      await this.peerConnection.addIceCandidate(iceCandidate);
      return true;
    } catch (err) {
      console.warn("[WebRTC] addIceCandidate error:", err);
      return false;
    }
  }

  /**
   * Mute or Unmute local microphone audio
   */
  public toggleAudio(enabled: boolean): boolean {
    if (this.localStream && typeof this.localStream.getAudioTracks === "function") {
      this.localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = enabled;
      });
      return enabled;
    }
    return enabled;
  }

  /**
   * Enable or Disable local camera video feed
   */
  public toggleVideo(enabled: boolean): boolean {
    if (this.localStream && typeof this.localStream.getVideoTracks === "function") {
      this.localStream.getVideoTracks().forEach((track: any) => {
        track.enabled = enabled;
      });
      return enabled;
    }
    return enabled;
  }

  /**
   * Closes connection and cleans up all media tracks
   */
  public close(): void {
    if (this.localStream) {
      try {
        if (typeof this.localStream.getTracks === "function") {
          this.localStream.getTracks().forEach((track: any) => {
            if (typeof track.stop === "function") {
              track.stop();
            }
          });
        }
      } catch (e) {
        // Safe cleanup
      }
      this.localStream = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {
        // Safe cleanup
      }
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.callbacks = {};
  }

  public cleanup(): void {
    this.close();
  }

  public switchCamera(): string {
    return "back";
  }
}

export const webrtcService = new WebRTCService();
