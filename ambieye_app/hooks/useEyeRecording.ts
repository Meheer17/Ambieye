/**
 * useEyeRecording
 * ---------------
 * Manages front-camera video recording during a movement game and uploads
 * the recorded video to the OpenCV FastAPI server for analysis.
 *
 * Uses XMLHttpRequest (not fetch) so we can track upload progress.
 */

import { useRef, useState, useCallback } from "react";
import { CameraView } from "expo-camera";
import * as FileSystem from "expo-file-system";
import { getServerConfig, buildServerUrl } from "@/utils/eyeTrackingStorage";
import { saveEyeTrackingResult } from "@/utils/gameUtils";

export type RecordingStatus =
  | "idle"
  | "recording"
  | "uploading"
  | "analysing"   // file sent, waiting for OpenCV result
  | "done"
  | "error"
  | "no_server";

export interface EyeAnalysisResult {
  success: boolean;
  summary: string;
  total_frames: number;
  frames_with_eyes: number;
  movement_count: number;
  avg_movement: number;
  verdict: "good" | "partial" | "none" | "no_face" | "error";
  game_id?: number;
  game_name?: string;
  error?: string;
}

interface UseEyeRecordingOptions {
  gameId: number;
  gameName: string;
}

export function useEyeRecording({ gameId, gameName }: UseEyeRecordingOptions) {
  const cameraRef = useRef<CameraView>(null);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [result, setResult] = useState<EyeAnalysisResult | null>(null);
  // 0–100 upload progress percentage
  const [uploadProgress, setUploadProgress] = useState(0);
  // Human-readable file size string e.g. "4.2 MB"
  const [videoSize, setVideoSize] = useState<string | null>(null);
  const isRecordingRef = useRef(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || !cameraRef.current) return;

    try {
      isRecordingRef.current = true;
      setStatus("recording");
      setResult(null);
      setUploadProgress(0);
      setVideoSize(null);

      cameraRef.current.recordAsync({}).then((videoData) => {
        if (videoData?.uri) {
          uploadVideo(videoData.uri);
        } else {
          setStatus("error");
        }
      }).catch(() => {
        isRecordingRef.current = false;
        setStatus("idle");
      });
    } catch {
      isRecordingRef.current = false;
      setStatus("error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAndUpload = useCallback(async () => {
    if (!isRecordingRef.current || !cameraRef.current) return;
    isRecordingRef.current = false;
    cameraRef.current.stopRecording();
  }, []);

  const uploadVideo = useCallback(async (videoUri: string) => {
    setStatus("uploading");
    setUploadProgress(0);

    try {
      const { ip, port } = await getServerConfig();
      const serverUrl = buildServerUrl(ip, port);

      if (!serverUrl) {
        setStatus("no_server");
        return;
      }

      // Get file size for display
      try {
        const info = await FileSystem.getInfoAsync(videoUri, { size: true });
        if (info.exists && "size" in info && info.size) {
          const mb = info.size / (1024 * 1024);
          setVideoSize(mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(info.size / 1024)} KB`);
        }
      } catch { /* non-critical */ }

      // Build FormData
      const formData = new FormData();
      formData.append("video", {
        uri: videoUri,
        name: "eye_recording.mp4",
        type: "video/mp4",
      } as unknown as Blob);
      formData.append("game_id", String(gameId));
      formData.append("game_name", gameName);

      // Use XHR so we get upload progress events
      const responseText = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
          }
        });

        xhr.upload.addEventListener("load", () => {
          // Upload finished, server is now processing
          setUploadProgress(100);
          setStatus("analysing");
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`Server returned ${xhr.status}: ${xhr.responseText}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("timeout", () => reject(new Error("Request timed out")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("POST", `${serverUrl}/analyse-eye-movement`);
        xhr.timeout = 120_000; // 2 min timeout for large videos
        xhr.send(formData);
      });

      xhrRef.current = null;

      const data: EyeAnalysisResult = JSON.parse(responseText);
      setResult(data);
      setStatus("done");

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
      console.error("Eye tracking upload failed:", err);
      setStatus("error");
      setResult(null);
    }
  }, [gameId, gameName]);

  const reset = useCallback(() => {
    // Cancel any in-flight XHR
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    isRecordingRef.current = false;
    setStatus("idle");
    setResult(null);
    setUploadProgress(0);
    setVideoSize(null);
  }, []);

  return {
    cameraRef,
    status,
    result,
    uploadProgress,
    videoSize,
    startRecording,
    stopAndUpload,
    reset,
  };
}
