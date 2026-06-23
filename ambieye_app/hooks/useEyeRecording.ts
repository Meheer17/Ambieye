/**
 * useEyeRecording — chunk-based streaming eye tracking
 * -----------------------------------------------------
 * Records video in 3-second chunks during the game.
 * Each chunk is sent to the server immediately after it's recorded,
 * while the next chunk is already being recorded in parallel.
 *
 * Flow:
 *   startRecording()
 *     → records CHUNK_DURATION seconds
 *     → sends chunk to /analyse-chunk  (non-blocking, runs in background)
 *     → immediately starts recording next chunk
 *     → repeat until stopAndFinalise() is called
 *
 *   stopAndFinalise()
 *     → stops current recording, sends final chunk
 *     → waits for all in-flight chunk requests to settle
 *     → calls /finalise-session with all chunk results
 *     → returns final verdict
 */

import { useRef, useState, useCallback } from "react";
import { CameraView } from "expo-camera";
import { Platform } from "react-native";
import { getServerConfig, buildServerUrl } from "@/utils/eyeTrackingStorage";
import { saveEyeTrackingResult } from "@/utils/gameUtils";

// ── Constants ─────────────────────────────────────────────────────────────────
/** Each chunk is this many seconds long */
const CHUNK_DURATION_MS = 3000;

// ── Types ─────────────────────────────────────────────────────────────────────

export type RecordingStatus =
  | "idle"
  | "recording"   // actively recording + sending chunks
  | "finalising"  // game ended, waiting for last chunks + final verdict
  | "done"
  | "error"
  | "no_server";

export interface ChunkResult {
  chunk_index: number;
  total_frames: number;
  frames_with_eyes: number;
  movement_count: number;
  avg_movement: number;
  success: boolean;
  verdict?: string;
  summary?: string;
}

export interface EyeAnalysisResult {
  success: boolean;
  summary: string;
  total_frames: number;
  frames_with_eyes: number;
  movement_count: number;
  avg_movement: number;
  verdict: "good" | "partial" | "none" | "no_face" | "error";
  chunks_analysed?: number;
  movements_per_chunk?: number;
  game_id?: number;
  game_name?: string;
  error?: string;
}

interface UseEyeRecordingOptions {
  gameId: number;
  gameName: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEyeRecording({ gameId, gameName }: UseEyeRecordingOptions) {
  const cameraRef = useRef<CameraView>(null);

  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [result, setResult] = useState<EyeAnalysisResult | null>(null);
  /** How many chunks have been successfully analysed so far */
  const [chunksAnalysed, setChunksAnalysed] = useState(0);
  /** Latest per-chunk verdict for live feedback during the game */
  const [liveVerdict, setLiveVerdict] = useState<string | null>(null);

  // Internal refs — not exposed in state to avoid re-renders
  const isActiveRef    = useRef(false);   // true while game is running
  const chunkIndexRef  = useRef(0);
  const chunkTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverUrlRef   = useRef<string>("");
  /** Promises for all in-flight chunk uploads */
  const pendingChunks  = useRef<Promise<ChunkResult | null>[]>([]);
  /** Accumulated chunk results for finalisation */
  const chunkResults   = useRef<ChunkResult[]>([]);

  // ── Upload a single chunk ──────────────────────────────────────────────────
  const uploadChunk = useCallback(
    (uri: string, index: number): Promise<ChunkResult | null> => {
      return new Promise((resolve) => {
        const formData = new FormData();
        formData.append("video", {
          uri,
          name: `chunk_${index}.mp4`,
          type: "video/mp4",
        } as unknown as Blob);
        formData.append("chunk_index", String(index));
        formData.append("game_id", String(gameId));
        formData.append("game_name", gameName);

        const xhr = new XMLHttpRequest();

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data: ChunkResult = JSON.parse(xhr.responseText);
              chunkResults.current.push(data);
              setChunksAnalysed((n) => n + 1);
              // Show live verdict from the latest chunk
              if (data.verdict) setLiveVerdict(data.verdict);
              resolve(data);
            } catch {
              resolve(null);
            }
          } else {
            console.warn(`Chunk ${index} failed: ${xhr.status}`);
            resolve(null);
          }
        });

        xhr.addEventListener("error",   () => { console.warn(`Chunk ${index} network error`); resolve(null); });
        xhr.addEventListener("timeout", () => { console.warn(`Chunk ${index} timed out`);     resolve(null); });
        xhr.addEventListener("abort",   () => resolve(null));

        xhr.open("POST", `${serverUrlRef.current}/analyse-chunk`);
        xhr.timeout = 30_000; // 30s per chunk — generous for a 3s video
        xhr.send(formData);
      });
    },
    [gameId, gameName]
  );

  // ── Record one chunk then immediately start the next ──────────────────────
  const recordChunk = useCallback(() => {
    if (!isActiveRef.current || !cameraRef.current) return;

    const index = chunkIndexRef.current++;

    // Start recording this chunk
    cameraRef.current.recordAsync({
      maxDuration: CHUNK_DURATION_MS / 1000,
    }).then((videoData) => {
      if (!videoData?.uri) return;

      // Fire-and-forget upload — don't await, let it run in background
      const uploadPromise = uploadChunk(videoData.uri, index);
      pendingChunks.current.push(uploadPromise);

      // Immediately start the next chunk if still active
      if (isActiveRef.current) {
        recordChunk();
      }
    }).catch((err) => {
      // Recording stopped (game ended) — this is expected, not an error
      if (isActiveRef.current) {
        console.warn("Chunk recording error:", err);
      }
    });
  }, [uploadChunk]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (isActiveRef.current) return;
    if (Platform.OS !== "web" && !cameraRef.current) return;

    // Resolve server URL once at start
    let url = "";
    if (Platform.OS !== "web") {
      const { ip, port } = await getServerConfig();
      url = buildServerUrl(ip, port);
      if (!url) {
        setStatus("no_server");
        return;
      }
      serverUrlRef.current = url;
    }

    // Reset state
    isActiveRef.current   = true;
    chunkIndexRef.current = 0;
    pendingChunks.current = [];
    chunkResults.current  = [];
    setStatus("recording");
    setResult(null);
    setChunksAnalysed(0);
    setLiveVerdict(null);

    // Kick off the first chunk
    if (Platform.OS !== "web") {
      recordChunk();
    } else {
      // On web, mock chunk analyses periodically for visual feedback!
      let simulatedChunks = 0;
      const interval = setInterval(() => {
        if (isActiveRef.current) {
          simulatedChunks++;
          setChunksAnalysed(simulatedChunks);
          setLiveVerdict(simulatedChunks % 2 === 0 ? "good" : "partial");
        } else {
          clearInterval(interval);
        }
      }, 3000);
    }
  }, [recordChunk]);

  const stopAndFinalise = useCallback(async () => {
    if (!isActiveRef.current) return;

    // Signal all loops to stop
    isActiveRef.current = false;
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    // Stop the camera — this resolves the current recordAsync promise
    // which triggers the last chunk upload
    if (Platform.OS !== "web" && cameraRef.current) {
      cameraRef.current.stopRecording();
    }

    setStatus("finalising");

    try {
      if (Platform.OS === "web") {
        // Simulate finalisation delay for premium feel
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const data: EyeAnalysisResult = {
          success: true,
          summary: "Eye tracking simulated on Web. For real-time OpenCV camera tracking, please run the app on an Android or iOS device.",
          total_frames: 1200,
          frames_with_eyes: 1100,
          movement_count: 24,
          avg_movement: 8.5,
          verdict: "good",
          chunks_analysed: chunksAnalysed || 4,
          movements_per_chunk: 6,
          game_id: gameId,
          game_name: gameName,
        };
        setResult(data);
        setStatus("done");

        // Persist to AsyncStorage
        await saveEyeTrackingResult(gameId, {
          verdict: data.verdict,
          movement_count: data.movement_count,
          frames_with_eyes: data.frames_with_eyes,
          avg_movement: data.avg_movement,
          summary: data.summary,
        });
        return;
      }

      // Wait for all in-flight chunk uploads to complete
      await Promise.allSettled(pendingChunks.current);

      const url = serverUrlRef.current;
      if (!url) {
        setStatus("no_server");
        return;
      }

      // Call /finalise-session with all accumulated chunk results
      const body = JSON.stringify({
        game_id: gameId,
        game_name: gameName,
        chunks: chunkResults.current,
      });

      const response = await fetch(`${url}/finalise-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!response.ok) {
        throw new Error(`Finalise returned ${response.status}`);
      }

      const data: EyeAnalysisResult = await response.json();
      setResult(data);
      setStatus("done");

      // Persist to AsyncStorage
      if (data.success && data.verdict !== "error") {
        await saveEyeTrackingResult(gameId, {
          verdict: data.verdict,
          movement_count: data.movement_count,
          frames_with_eyes: data.frames_with_eyes,
          avg_movement: data.avg_movement,
          summary: data.summary,
        });
      }
    } catch (err) {
      console.error("Finalise failed:", err);
      setStatus("error");
    }
  }, [gameId, gameName, chunksAnalysed]);

  const reset = useCallback(() => {
    isActiveRef.current = false;
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    chunkIndexRef.current = 0;
    pendingChunks.current = [];
    chunkResults.current  = [];
    setStatus("idle");
    setResult(null);
    setChunksAnalysed(0);
    setLiveVerdict(null);
  }, []);

  return {
    cameraRef,
    status,
    result,
    chunksAnalysed,
    liveVerdict,
    startRecording,
    /** Call this when the game ends — stops recording and finalises */
    stopAndFinalise,
    reset,
  };
}
