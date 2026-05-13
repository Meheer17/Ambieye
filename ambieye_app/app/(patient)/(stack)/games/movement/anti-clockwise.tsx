import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet, View, Text, TouchableOpacity,
  Animated, Dimensions, ScrollView, Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";
import { useEyeRecording } from "@/hooks/useEyeRecording";
import EyeTrackingResult from "@/components/EyeTrackingResult";

const { width } = Dimensions.get("window");
const BALL_SIZE = 30;
const TRACK_RADIUS = width * 0.35;
const CIRCLE_DURATION = 5000;

type Screen = "start" | "game" | "results";

export default function AntiClockwiseGame() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [screen, setScreen] = useState<Screen>("start");
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameDuration, setGameDuration] = useState(0);
  const gameStartTimeRef = useRef(0);
  const ballPosition = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isEndingRef = useRef(false);

  const { cameraRef, status: eyeStatus, result: eyeResult,
          uploadProgress, videoSize,
          startRecording, stopAndUpload, reset: resetEye } = useEyeRecording({
    gameId: 7, gameName: "Anti-Clockwise",
  });

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  const stopEverything = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animationRef.current) { animationRef.current.stop(); animationRef.current = null; }
    await stopAndUpload();
  }, [stopAndUpload]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) animationRef.current.stop();
      stopAndUpload();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = useCallback(async () => {
    await stopEverything();
    router.back();
  }, [stopEverything, router]);

  const endGame = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    await stopEverything();
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;
    setGameDuration(duration);
    setScreen("results");
    try {
      await saveGameResult({
        gameId: 7, score: 100, duration,
        date: new Date().toISOString(), details: { completedTime: duration },
      });
    } catch { /* ignore */ }
  }, [stopEverything]);

  const startGame = useCallback(async () => {
    isEndingRef.current = false;
    resetEye();
    setScreen("game");
    setTimeLeft(60);
    gameStartTimeRef.current = Date.now();
    ballPosition.setValue(0);
    await startRecording();
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => { if (prev <= 1) { endGame(); return 0; } return prev - 1; });
    }, 1000);
    animationRef.current = Animated.loop(
      Animated.timing(ballPosition, { toValue: 1, duration: CIRCLE_DURATION, easing: Easing.linear, useNativeDriver: true })
    );
    animationRef.current.start();
  }, [ballPosition, endGame, startRecording, resetEye]);

  const translateX = ballPosition.interpolate({
    inputRange: [0,.05,.1,.15,.2,.25,.3,.35,.4,.45,.5,.55,.6,.65,.7,.75,.8,.85,.9,.95,1],
    outputRange: [-TRACK_RADIUS,-TRACK_RADIUS*Math.cos(Math.PI*.05*2),-TRACK_RADIUS*Math.cos(Math.PI*.1*2),-TRACK_RADIUS*Math.cos(Math.PI*.15*2),-TRACK_RADIUS*Math.cos(Math.PI*.2*2),-TRACK_RADIUS*Math.cos(Math.PI*.25*2),-TRACK_RADIUS*Math.cos(Math.PI*.3*2),-TRACK_RADIUS*Math.cos(Math.PI*.35*2),-TRACK_RADIUS*Math.cos(Math.PI*.4*2),-TRACK_RADIUS*Math.cos(Math.PI*.45*2),-TRACK_RADIUS*Math.cos(Math.PI*.5*2),-TRACK_RADIUS*Math.cos(Math.PI*.55*2),-TRACK_RADIUS*Math.cos(Math.PI*.6*2),-TRACK_RADIUS*Math.cos(Math.PI*.65*2),-TRACK_RADIUS*Math.cos(Math.PI*.7*2),-TRACK_RADIUS*Math.cos(Math.PI*.75*2),-TRACK_RADIUS*Math.cos(Math.PI*.8*2),-TRACK_RADIUS*Math.cos(Math.PI*.85*2),-TRACK_RADIUS*Math.cos(Math.PI*.9*2),-TRACK_RADIUS*Math.cos(Math.PI*.95*2),-TRACK_RADIUS],
  });
  const translateY = ballPosition.interpolate({
    inputRange: [0,.05,.1,.15,.2,.25,.3,.35,.4,.45,.5,.55,.6,.65,.7,.75,.8,.85,.9,.95,1],
    outputRange: [0,TRACK_RADIUS*Math.sin(Math.PI*.05*2),TRACK_RADIUS*Math.sin(Math.PI*.1*2),TRACK_RADIUS*Math.sin(Math.PI*.15*2),TRACK_RADIUS*Math.sin(Math.PI*.2*2),TRACK_RADIUS*Math.sin(Math.PI*.25*2),TRACK_RADIUS*Math.sin(Math.PI*.3*2),TRACK_RADIUS*Math.sin(Math.PI*.35*2),TRACK_RADIUS*Math.sin(Math.PI*.4*2),TRACK_RADIUS*Math.sin(Math.PI*.45*2),TRACK_RADIUS*Math.sin(Math.PI*.5*2),TRACK_RADIUS*Math.sin(Math.PI*.55*2),TRACK_RADIUS*Math.sin(Math.PI*.6*2),TRACK_RADIUS*Math.sin(Math.PI*.65*2),TRACK_RADIUS*Math.sin(Math.PI*.7*2),TRACK_RADIUS*Math.sin(Math.PI*.75*2),TRACK_RADIUS*Math.sin(Math.PI*.8*2),TRACK_RADIUS*Math.sin(Math.PI*.85*2),TRACK_RADIUS*Math.sin(Math.PI*.9*2),TRACK_RADIUS*Math.sin(Math.PI*.95*2),0],
  });

  return (
    <View style={styles.container}>
      {permission?.granted && (
        <CameraView ref={cameraRef} style={styles.hiddenCamera} facing="front" mode="video" mute animateShutter={false} />
      )}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <FontAwesome name="arrow-left" size={24} color="#0EA5E9" />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Follow the Ball (Anti-clockwise)</Text>
      </View>

      {screen === "start" && (
        <View style={styles.centreContainer}>
          <Text style={styles.instructionText}>
            Follow the ball with your eyes as it moves anti-clockwise for 1 minute.
            The front camera will record your eye movement for analysis.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={startGame}>
            <Text style={styles.primaryBtnText}>Start Exercise</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === "game" && (
        <View style={styles.gameContainer}>
          <View style={styles.scoreRow}>
            <Text style={styles.timerText}>Time Left: {timeLeft}s</Text>
            {eyeStatus === "recording" && (
              <View style={styles.recBadge}><View style={styles.recDot} /><Text style={styles.recText}>REC</Text></View>
            )}
          </View>
          <Text style={styles.instructions}>Follow the red ball with your eyes</Text>
          <View style={styles.trackContainer}>
            <View style={styles.track} />
            <Animated.View style={[styles.ball, { transform: [{ translateX }, { translateY }] }]} />
          </View>
        </View>
      )}

      {screen === "results" && (
        <ScrollView contentContainerStyle={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.completionCard}>
            <Text style={styles.completionEmoji}>🎉</Text>
            <Text style={styles.completionTitle}>Exercise Complete!</Text>
            <Text style={styles.completionSub}>You followed the ball for 1 minute</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(gameDuration)}s</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>100</Text>
                <Text style={styles.statLabel}>Score</Text>
              </View>
            </View>
          </View>
          <Text style={styles.sectionLabel}>EYE TRACKING ANALYSIS</Text>
          <EyeTrackingResult
            status={eyeStatus}
            result={eyeResult}
            uploadProgress={uploadProgress}
            videoSize={videoSize}
          />
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 32 }]} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 20, paddingTop: 56 },
  hiddenCamera: { width: 1, height: 1, position: "absolute", opacity: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  gameTitle: { fontSize: 20, fontWeight: "bold", color: "#0EA5E9", textAlign: "center" },
  centreContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  instructionText: { fontSize: 16, textAlign: "center", marginBottom: 32, color: "#333", lineHeight: 24, paddingHorizontal: 20 },
  primaryBtn: { backgroundColor: "#0EA5E9", paddingHorizontal: 48, paddingVertical: 16, borderRadius: 30 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  gameContainer: { flex: 1, alignItems: "center" },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 16, marginTop: 8 },
  timerText: { fontSize: 18, fontWeight: "bold", color: "#0EA5E9" },
  recBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  recText: { fontSize: 11, fontWeight: "700", color: "#EF4444" },
  instructions: { fontSize: 15, textAlign: "center", marginBottom: 24, color: "#555" },
  trackContainer: { width: TRACK_RADIUS*2, height: TRACK_RADIUS*2, justifyContent: "center", alignItems: "center", marginTop: 20 },
  track: { width: TRACK_RADIUS*2, height: TRACK_RADIUS*2, borderRadius: TRACK_RADIUS, borderWidth: 2, borderColor: "#ddd", position: "absolute" },
  ball: { width: BALL_SIZE, height: BALL_SIZE, borderRadius: BALL_SIZE/2, backgroundColor: "red", position: "absolute" },
  resultsContainer: { paddingBottom: 40, paddingTop: 8 },
  completionCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  completionEmoji: { fontSize: 48, marginBottom: 12 },
  completionTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  completionSub: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  statsRow: { flexDirection: "row", width: "100%", backgroundColor: "#F8FAFC", borderRadius: 14, padding: 16 },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 26, fontWeight: "800", color: "#0EA5E9", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  statDivider: { width: 1, backgroundColor: "#e2e8f0", marginHorizontal: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8", letterSpacing: 1, marginBottom: 4 },
});
