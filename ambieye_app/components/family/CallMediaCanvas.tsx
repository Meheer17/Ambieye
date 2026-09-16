import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Platform, Animated } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { CameraView } from "expo-camera";

interface CallMediaCanvasProps {
  callType: "audio" | "video";
  callStatus: string;
  contactName: string;
  contactAvatar: string;
  contactRelationship: string;
  remoteStream: any;
  localStream: any;
  isVideoDisabled: boolean;
  isFrontCamera: boolean;
  hasCameraPermission: boolean;
  pulseAnim: Animated.Value;
  currentLang: string;
}

let NativeRTCView: any = null;
if (Platform.OS !== "web") {
  try {
    const webrtc = require("react-native-webrtc");
    NativeRTCView = webrtc.RTCView;
  } catch {
    NativeRTCView = null;
  }
}

export const CallMediaCanvas: React.FC<CallMediaCanvasProps> = ({
  callType,
  callStatus,
  contactName,
  contactAvatar,
  contactRelationship,
  remoteStream,
  localStream,
  isVideoDisabled,
  isFrontCamera,
  hasCameraPermission,
  pulseAnim,
  currentLang,
}) => {
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isVideoCall = callType === "video";
  const isConnected = callStatus === "connected";

  // Web media attachment
  useEffect(() => {
    if (Platform.OS === "web") {
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (localVideoRef.current && localStream && !isVideoDisabled) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(() => {});
      }
      if (audioRef.current && remoteStream) {
        audioRef.current.srcObject = remoteStream;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream, localStream, isVideoDisabled]);

  const hasRemoteVideoTrack =
    remoteStream &&
    typeof remoteStream.getVideoTracks === "function" &&
    remoteStream.getVideoTracks().length > 0 &&
    remoteStream.getVideoTracks()[0].enabled;

  return (
    <View style={styles.container}>
      {/* Hidden Web Audio Element for Audio Stream Playback */}
      {Platform.OS === "web" && (
        // @ts-ignore
        <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />
      )}

      {isVideoCall ? (
        <View style={styles.videoLayout}>
          {/* Main Remote View */}
          <View style={styles.remoteCanvas}>
            {Platform.OS === "web" && hasRemoteVideoTrack ? (
              // @ts-ignore
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 24,
                }}
              />
            ) : NativeRTCView && remoteStream && typeof remoteStream.toURL === "function" ? (
              <NativeRTCView
                streamURL={remoteStream.toURL()}
                style={styles.nativeStreamView}
                objectFit="cover"
              />
            ) : (
              // Fallback / Calling / Audio Mode UI
              <View style={styles.placeholderContainer}>
                <View style={styles.remoteAvatarCircle}>
                  <Text style={styles.remoteAvatarEmoji}>{contactAvatar}</Text>
                </View>
                <Text style={styles.remoteName}>{contactName}</Text>
                <Text style={styles.remoteRelation}>{contactRelationship}</Text>

                {callStatus === "initiating" && (
                  <View style={styles.statusTag}>
                    <Text style={styles.statusTagText}>
                      {currentLang === "as"
                        ? "সংযোগ স্থাপন কৰা হৈছে..."
                        : currentLang === "hi"
                        ? "कॉल मिलाया जा रहा है..."
                        : "Connecting WebRTC..."}
                    </Text>
                  </View>
                )}

                {callStatus === "ringing" && (
                  <View style={[styles.statusTag, { backgroundColor: "rgba(16, 185, 129, 0.2)" }]}>
                    <Text style={[styles.statusTagText, { color: "#34D399" }]}>
                      {currentLang === "as"
                        ? "ৰিং হৈ আছে..."
                        : currentLang === "hi"
                        ? "घंटी बज रही है..."
                        : "Ringing..."}
                    </Text>
                  </View>
                )}

                {callStatus === "connected" && (
                  <View style={[styles.statusTag, { backgroundColor: "rgba(16, 185, 129, 0.25)" }]}>
                    <Text style={[styles.statusTagText, { color: "#6EE7B7" }]}>
                      {currentLang === "as"
                        ? "পৰিয়াল লাইন সক্ৰিয়"
                        : currentLang === "hi"
                        ? "लाइव कॉल सक्रिय"
                        : "Family Live Connected"}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Local Camera Floating PiP Preview */}
          {!isVideoDisabled ? (
            <View style={styles.localPip}>
              {Platform.OS === "web" ? (
                // @ts-ignore
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 14,
                    transform: isFrontCamera ? "scaleX(-1)" : "none",
                  }}
                />
              ) : NativeRTCView && localStream && typeof localStream.toURL === "function" ? (
                <NativeRTCView
                  streamURL={localStream.toURL()}
                  style={styles.nativeStreamView}
                  mirror={isFrontCamera}
                  objectFit="cover"
                />
              ) : hasCameraPermission ? (
                <CameraView
                  style={styles.cameraView}
                  facing={isFrontCamera ? "front" : "back"}
                  mode="video"
                  mute
                />
              ) : (
                <View style={styles.pipOff}>
                  <Feather name="video" size={18} color="#94A3B8" />
                  <Text style={styles.pipOffText}>Camera</Text>
                </View>
              )}
              <View style={styles.pipBadge}>
                <Text style={styles.pipBadgeText}>You</Text>
              </View>
            </View>
          ) : (
            <View style={styles.localPipOff}>
              <Feather name="video-off" size={18} color="#94A3B8" />
              <Text style={styles.pipOffText}>Video Off</Text>
            </View>
          )}
        </View>
      ) : (
        /* Audio Call Center Layout */
        <View style={styles.audioLayout}>
          <View style={styles.audioAvatarWrapper}>
            {(callStatus === "initiating" || callStatus === "ringing") && (
              <Animated.View
                style={[
                  styles.audioPulseRing,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
            )}
            <View style={styles.audioAvatarCircle}>
              <Text style={styles.audioAvatarEmoji}>{contactAvatar}</Text>
            </View>
          </View>

          <Text style={styles.audioContactName}>{contactName}</Text>
          <Text style={styles.audioContactRelation}>{contactRelationship}</Text>

          <View style={styles.audioStateBadge}>
            <View
              style={[
                styles.audioStateDot,
                { backgroundColor: isConnected ? "#10B981" : "#F59E0B" },
              ]}
            />
            <Text style={styles.audioStateText}>
              {callStatus === "initiating"
                ? currentLang === "as"
                  ? "সংযোগ স্থাপন হৈ আছে..."
                  : "Connecting..."
                : callStatus === "ringing"
                ? currentLang === "as"
                  ? "ৰিং হৈ আছে..."
                  : "Ringing..."
                : isConnected
                ? currentLang === "as"
                  ? "কথা পাতক · স্পষ্ট স্পষ্ট মাত"
                  : currentLang === "hi"
                  ? "कॉल शुरू · साफ़ आवाज़"
                  : "Secure Audio Line Active"
                : callStatus}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoLayout: {
    flex: 1,
    position: "relative",
  },
  remoteCanvas: {
    flex: 1,
    backgroundColor: "#1E1B4B",
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  nativeStreamView: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  remoteAvatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  remoteAvatarEmoji: {
    fontSize: 52,
  },
  remoteName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  remoteRelation: {
    fontSize: 16,
    color: "#C7D2FE",
    marginBottom: 16,
  },
  statusTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(99, 102, 241, 0.25)",
  },
  statusTagText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A5B4FC",
  },
  localPip: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 105,
    height: 145,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#0F172A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  localPipOff: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 105,
    height: 145,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  cameraView: {
    width: "100%",
    height: "100%",
  },
  pipOff: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  pipOffText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  pipBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pipBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  audioLayout: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D0145",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  audioAvatarWrapper: {
    width: 150,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  audioPulseRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: "rgba(99, 102, 241, 0.5)",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  audioAvatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  audioAvatarEmoji: {
    fontSize: 60,
  },
  audioContactName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    textAlign: "center",
  },
  audioContactRelation: {
    fontSize: 18,
    color: "#C7D2FE",
    marginBottom: 24,
    textAlign: "center",
  },
  audioStateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  audioStateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  audioStateText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E2E8F0",
  },
});
