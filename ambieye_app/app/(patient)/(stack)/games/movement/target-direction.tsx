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
const TARGET_SIZE = 40;
const TOTAL_ROUNDS = 10;

type Screen = "start" | "game" | "results";

export default function TargetDirectionGame() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [screen, setScreen] = useState<Screen>("start");
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [direction, setDirection] = useState("");
  const [gameEnded, setGameEnded] = useState(false);
  const [waitingForSelection, setWaitingForSelection] = useState(false);
  const [gameDuration, setGameDuration] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const targetPosition = useRef(new Animated.ValueXY()).current;
  const targetOpacity = useRef(new Animated.Value(0)).current;
  const gameStartTimeRef = useRef(0);
  const roundRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const targetAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const roundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEndingRef = useRef(false);

  const { cameraRef, status: eyeStatus, result: eyeResult,
          uploadProgress, videoSize,
          startRecording, stopAndUpload, reset: resetEye } = useEyeRecording({
    gameId: 9, gameName: "Target Direction",
  });

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  const directions = ["left", "right", "up", "down"] as const;
  const directionConfigs = {
    left:  { start: { x: width*.75, y: height*.3 }, end: { x: -TARGET_SIZE, y: height*.3 } },
    right: { start: { x: -TARGET_SIZE, y: height*.3 }, end: { x: width*.75, y: height*.3 } },
    up:    { start: { x: width*.4, y: height*.6 }, end: { x: width*.4, y: -TARGET_SIZE } },
    down:  { start: { x: width*.4, y: -TARGET_SIZE }, end: { x: width*.4, y: height*.6 } },
  };

  const stopEverything = useCallback(async () => {
    if (targetAnimRef.current) { targetAnimRef.current.stop(); targetAnimRef.current = null; }
    if (roundTimeoutRef.current) { clearTimeout(roundTimeoutRef.current); roundTimeoutRef.current = null; }
    await stopAndUpload();
  }, [stopAndUpload]);

  useEffect(() => {
    return () => {
      if (targetAnimRef.current) targetAnimRef.current.stop();
      if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
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
    setGameEnded(true);
    const duration = (Date.now() - gameStartTimeRef.current) / 1000;
    const total = correctRef.current + wrongRef.current;
    const fs = total > 0 ? Math.round((correctRef.current / total) * 100) : 0;
    setGameDuration(duration);
    setFinalScore(fs);
    setScreen("results");
    try {
      await saveGameResult({
        gameId: 9, score: fs, duration,
        date: new Date().toISOString(),
        details: { rounds: roundRef.current, correctSelections: correctRef.current, wrongSelections: wrongRef.current },
      });
    } catch { /* ignore */ }
  }, [stopEverything]);

  const setupRound = useCallback(() => {
    const nextRound = roundRef.current + 1;
    if (nextRound > TOTAL_ROUNDS) { endGame(); return; }
    roundRef.current = nextRound;
    setRound(nextRound);
    setWaitingForSelection(true);
    const newDir = directions[Math.floor(Math.random() * directions.length)];
    setDirection(newDir);
    const config = directionConfigs[newDir];
    targetPosition.setValue(config.start);
    targetOpacity.setValue(1);
    if (targetAnimRef.current) targetAnimRef.current.stop();
    targetAnimRef.current = Animated.parallel([
      Animated.timing(targetPosition, { toValue: config.end, duration: 3000, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(targetOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.delay(2800),
        Animated.timing(targetOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
    ]);
    targetAnimRef.current.start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endGame, targetOpacity, targetPosition]);

  const handleDirectionSelect = useCallback((selectedDir: string) => {
    if (gameEnded || !waitingForSelection) return;
    setWaitingForSelection(false);
    if (selectedDir === direction) { correctRef.current += 1; setScore((p) => p + 10); }
    else { wrongRef.current += 1; }
    roundTimeoutRef.current = setTimeout(() => {
      if (roundRef.current >= TOTAL_ROUNDS) endGame(); else setupRound();
    }, 1000);
  }, [gameEnded, waitingForSelection, direction, endGame, setupRound]);

  const startGame = useCallback(async () => {
    isEndingRef.current = false;
    roundRef.current = 0; correctRef.current = 0; wrongRef.current = 0;
    resetEye();
    setGameEnded(false); setScore(0); setRound(0);
    setWaitingForSelection(false);
    gameStartTimeRef.current = Date.now();
    await startRecording();
    setScreen("game");
  }, [startRecording, resetEye]);

  useEffect(() => {
    if (screen === "game" && round === 0 && !gameEnded) setupRound();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  return (
    <View style={styles.container}>
      {permission?.granted && (
        <CameraView ref={cameraRef} style={styles.hiddenCamera} facing="front" mode="video" mute animateShutter={false} />
      )}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <FontAwesome name="arrow-left" size={24} color="#0EA5E9" />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Direction of Target</Text>
      </View>

      {screen === "start" && (
        <View style={styles.centreContainer}>
          <Text style={styles.instructionText}>
            Watch the moving target and identify which direction it's moving.
            The front camera will record your eye movement for analysis.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={startGame}>
            <Text style={styles.primaryBtnText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === "game" && (
        <View style={styles.gameContainer}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>Score: {score}</Text>
            <Text style={styles.roundText}>Round: {round}/{TOTAL_ROUNDS}</Text>
            {eyeStatus === "recording" && (
              <View style={styles.recBadge}><View style={styles.recDot} /><Text style={styles.recText}>REC</Text></View>
            )}
          </View>
          <View style={styles.gameArea}>
            <Animated.View style={[styles.target, { opacity: targetOpacity, transform: [{ translateX: targetPosition.x }, { translateY: targetPosition.y }] }]}>
              <FontAwesome name="bullseye" size={TARGET_SIZE - 10} color="#0EA5E9" />
            </Animated.View>
          </View>
          <View style={styles.directionButtons}>
            <TouchableOpacity style={[styles.dirBtn, gameEnded && styles.disabled]} onPress={() => handleDirectionSelect("up")} disabled={gameEnded}>
              <FontAwesome name="arrow-up" size={30} color="#0EA5E9" />
            </TouchableOpacity>
            <View style={styles.hRow}>
              <TouchableOpacity style={[styles.dirBtn, gameEnded && styles.disabled]} onPress={() => handleDirectionSelect("left")} disabled={gameEnded}>
                <FontAwesome name="arrow-left" size={30} color="#0EA5E9" />
              </TouchableOpacity>
              <View style={styles.dirBtnPlaceholder} />
              <TouchableOpacity style={[styles.dirBtn, gameEnded && styles.disabled]} onPress={() => handleDirectionSelect("right")} disabled={gameEnded}>
                <FontAwesome name="arrow-right" size={30} color="#0EA5E9" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.dirBtn, gameEnded && styles.disabled]} onPress={() => handleDirectionSelect("down")} disabled={gameEnded}>
              <FontAwesome name="arrow-down" size={30} color="#0EA5E9" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {screen === "results" && (
        <ScrollView contentContainerStyle={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.completionCard}>
            <Text style={styles.completionEmoji}>🎯</Text>
            <Text style={styles.completionTitle}>Game Complete!</Text>
            <Text style={styles.completionSub}>{correctRef.current} correct out of {TOTAL_ROUNDS} rounds</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{finalScore}%</Text>
                <Text style={styles.statLabel}>Score</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(gameDuration)}s</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{correctRef.current}/{TOTAL_ROUNDS}</Text>
                <Text style={styles.statLabel}>Correct</Text>
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
  gameContainer: { flex: 1 },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 },
  scoreText: { fontSize: 18, fontWeight: "bold", color: "#0EA5E9" },
  roundText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  recBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  recText: { fontSize: 11, fontWeight: "700", color: "#EF4444" },
  gameArea: { width: "100%", height: height*.35, backgroundColor: "#fff", borderRadius: 10, marginBottom: 20, overflow: "hidden", borderWidth: 2, borderColor: "#ddd" },
  target: { width: TARGET_SIZE, height: TARGET_SIZE, justifyContent: "center", alignItems: "center", position: "absolute" },
  directionButtons: { alignItems: "center" },
  hRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: 220, marginVertical: 10 },
  dirBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 2 },
  disabled: { opacity: 0.5 },
  dirBtnPlaceholder: { width: 60, height: 60 },
  resultsContainer: { paddingBottom: 40, paddingTop: 8 },
  completionCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  completionEmoji: { fontSize: 48, marginBottom: 12 },
  completionTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  completionSub: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  statsRow: { flexDirection: "row", width: "100%", backgroundColor: "#F8FAFC", borderRadius: 14, padding: 16 },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800", color: "#0EA5E9", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  statDivider: { width: 1, backgroundColor: "#e2e8f0", marginHorizontal: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8", letterSpacing: 1, marginBottom: 4 },
});
