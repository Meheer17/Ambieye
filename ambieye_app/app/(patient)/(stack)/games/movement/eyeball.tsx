import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet, View, Text, TouchableOpacity,
  Animated, Dimensions, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";
import { useEyeRecording } from "@/hooks/useEyeRecording";
import EyeTrackingResult from "@/components/EyeTrackingResult";

const { width, height } = Dimensions.get("window");
const BALL_SIZE = 30;
const EXERCISE_DURATION = 120;

type Screen = "start" | "game" | "results";

export default function EyeballMovementGame() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [screen, setScreen] = useState<Screen>("start");
  const [timeRemaining, setTimeRemaining] = useState(EXERCISE_DURATION);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [currentPatternName, setCurrentPatternName] = useState("");
  const [gameDuration, setGameDuration] = useState(0);
  const ballPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const patternsRef = useRef<{ name: string; positions: { x: number; y: number }[] }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnimatingRef = useRef(false);
  const gameStartTimeRef = useRef(0);
  const isEndingRef = useRef(false);
  const timeRemainingRef = useRef(EXERCISE_DURATION);

  const { cameraRef, status: eyeStatus, result: eyeResult,
          uploadProgress, videoSize,
          startRecording, stopAndUpload, reset: resetEye } = useEyeRecording({
    gameId: 8, gameName: "Eyeball Movement",
  });

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    patternsRef.current = [
      { name: "Horizontal", positions: [{ x: -width*.4, y: 0 }, { x: width*.4, y: 0 }, { x: -width*.4, y: 0 }] },
      { name: "Vertical", positions: [{ x: 0, y: -height*.25 }, { x: 0, y: height*.25 }, { x: 0, y: -height*.25 }] },
      { name: "Diagonal ↘", positions: [{ x: -width*.35, y: -height*.2 }, { x: width*.35, y: height*.2 }, { x: -width*.35, y: -height*.2 }] },
      { name: "Diagonal ↙", positions: [{ x: width*.35, y: -height*.2 }, { x: -width*.35, y: height*.2 }, { x: width*.35, y: -height*.2 }] },
      { name: "Box", positions: [{ x: -width*.4, y: -height*.25 }, { x: width*.4, y: -height*.25 }, { x: width*.4, y: height*.25 }, { x: -width*.4, y: height*.25 }, { x: 0, y: 0 }, { x: -width*.4, y: -height*.25 }] },
      { name: "Zigzag", positions: [{ x: -width*.4, y: -height*.25 }, { x: width*.4, y: -height*.25 }, { x: -width*.4, y: -height*.08 }, { x: width*.4, y: -height*.08 }, { x: -width*.4, y: height*.08 }, { x: width*.4, y: height*.08 }, { x: -width*.4, y: height*.25 }, { x: width*.4, y: height*.25 }, { x: -width*.4, y: -height*.25 }] },
    ];
  }, []);

  const stopEverything = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animationRef.current) { animationRef.current.stop(); animationRef.current = null; }
    isAnimatingRef.current = false;
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
        gameId: 8, score: 100, duration,
        date: new Date().toISOString(),
        details: { completedExerciseTime: EXERCISE_DURATION - timeRemainingRef.current },
      });
    } catch { /* ignore */ }
  }, [stopEverything]);

  const animateBall = useCallback((patternIndex: number) => {
    const pattern = patternsRef.current[patternIndex];
    if (!pattern) return;
    isAnimatingRef.current = true;
    setCurrentPatternName(pattern.name);
    setCurrentPatternIndex(patternIndex);
    if (animationRef.current) animationRef.current.stop();
    animationRef.current = Animated.sequence(
      pattern.positions.map((pos) => Animated.timing(ballPosition, { toValue: { x: pos.x, y: pos.y }, duration: 1200, useNativeDriver: true }))
    );
    animationRef.current.start(() => {
      isAnimatingRef.current = false;
      if (timerRef.current !== null) {
        const next = (patternIndex + 1) % patternsRef.current.length;
        setTimeout(() => { if (timerRef.current !== null) animateBall(next); }, 100);
      }
    });
  }, [ballPosition]);

  useEffect(() => {
    if (screen !== "game") return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        timeRemainingRef.current = next;
        if (next <= 0) { endGame(); return 0; }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [screen, endGame]);

  useEffect(() => {
    if (screen === "game" && !isAnimatingRef.current) animateBall(currentPatternIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const startGame = useCallback(async () => {
    isEndingRef.current = false;
    resetEye();
    setTimeRemaining(EXERCISE_DURATION);
    timeRemainingRef.current = EXERCISE_DURATION;
    setCurrentPatternIndex(0);
    setCurrentPatternName("");
    gameStartTimeRef.current = Date.now();
    isAnimatingRef.current = false;
    ballPosition.setValue({ x: 0, y: 0 });
    await startRecording();
    setScreen("game");
  }, [ballPosition, startRecording, resetEye]);

  return (
    <View style={styles.container}>
      {permission?.granted && (
        <CameraView ref={cameraRef} style={styles.hiddenCamera} facing="front" mode="video" mute animateShutter={false} />
      )}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <FontAwesome name="arrow-left" size={24} color="#0EA5E9" />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Eyeball Movement</Text>
      </View>

      {screen === "start" && (
        <View style={styles.centreContainer}>
          <Text style={styles.instructionText}>
            Follow the ball with your eyes as it moves in different patterns.
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
            <Text style={styles.scoreText}>Time: {timeRemaining}s</Text>
            <Text style={styles.patternText}>{currentPatternName}</Text>
            {eyeStatus === "recording" && (
              <View style={styles.recBadge}><View style={styles.recDot} /><Text style={styles.recText}>REC</Text></View>
            )}
          </View>
          <Text style={styles.instructions}>Keep head still, follow with eyes only</Text>
          <View style={styles.gameArea}>
            <Animated.View style={[styles.ball, { transform: [{ translateX: ballPosition.x }, { translateY: ballPosition.y }] }]} />
          </View>
        </View>
      )}

      {screen === "results" && (
        <ScrollView contentContainerStyle={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.completionCard}>
            <Text style={styles.completionEmoji}>🎉</Text>
            <Text style={styles.completionTitle}>Exercise Complete!</Text>
            <Text style={styles.completionSub}>Great job following the patterns</Text>
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
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 12, marginTop: 8 },
  scoreText: { fontSize: 18, fontWeight: "bold", color: "#0EA5E9" },
  patternText: { fontSize: 14, fontWeight: "600", color: "#555" },
  recBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  recText: { fontSize: 11, fontWeight: "700", color: "#EF4444" },
  instructions: { fontSize: 13, textAlign: "center", marginBottom: 14, color: "#666" },
  gameArea: { width: width*.9, height: height*.45, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#ddd", borderStyle: "dashed", borderRadius: 10 },
  ball: { width: BALL_SIZE, height: BALL_SIZE, borderRadius: BALL_SIZE/2, backgroundColor: "#0EA5E9", position: "absolute" },
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
