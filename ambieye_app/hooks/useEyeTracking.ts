import { useRef, useState, useCallback } from "react";
import type { FrameProcessor } from "react-native-vision-camera";
import { createRunOnJS, isWorkletsAvailable } from "@/utils/worklets";
import { getVisionCameraModule } from "@/utils/visionCamera";

// ─── Tuning constants ────────────────────────────────────────────────────────

/**
 * We sample a sparse grid of pixels from each frame.
 * Larger grid = more accurate but more CPU. 12×12 = 144 samples is plenty.
 */
const GRID = 12;

/**
 * Per-pixel brightness difference (0-255) that counts as "changed".
 * Eyes moving causes small, localised brightness shifts — we want to catch
 * those without being triggered by JPEG compression noise.
 */
const PIXEL_THRESHOLD = 18;

/**
 * Fraction of sampled pixels that must exceed PIXEL_THRESHOLD for us to
 * call the frame "different" from the previous one.
 */
const CHANGED_RATIO = 0.06;

/**
 * How many consecutive "different" frames (out of the last WINDOW frames)
 * we need before reporting isMoving = true.
 */
const WINDOW = 6;
const MOVING_COUNT = 3;

const visionCamera = getVisionCameraModule();
const workletsAvailable = isWorkletsAvailable();

type FrameProcessorCallback = (frame: any) => void;
type UseFrameProcessor = (
  callback: FrameProcessorCallback,
  deps: ReadonlyArray<unknown>
) => FrameProcessor | undefined;

const useFrameProcessorSafe: UseFrameProcessor = workletsAvailable
  ? visionCamera?.useFrameProcessor ?? (() => undefined)
  : () => undefined;

// ─── Types ───────────────────────────────────────────────────────────────────

export type EyeTrackingStatus = "idle" | "moving" | "still";

export interface EyeTrackingResult {
  status: EyeTrackingStatus;
  isMoving: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useEyeTracking
 *
 * Returns a frame processor and a result state.
 * The frame processor runs silently on the camera thread — no shutter,
 * no sound, no file saving. It samples a sparse pixel grid from each frame,
 * compares it to the previous frame, and reports whether the scene is moving.
 *
 * Usage:
 *   const { frameProcessor, result } = useEyeTracking(gameActive);
 *   <Camera frameProcessor={frameProcessor} ... />
 */
export function useEyeTracking(active: boolean) {
  const [result, setResult] = useState<EyeTrackingResult>({
    status: "idle",
    isMoving: false,
  });

  // Rolling window of booleans: was this frame "different" from the last?
  const windowRef = useRef<boolean[]>([]);
  // Previous frame's pixel samples (brightness values)
  const prevSamplesRef = useRef<number[] | null>(null);

  // JS-side callback called from the worklet — updates React state
  const onMotionResult = createRunOnJS((isMoving: boolean) => {
    setResult({
      status: isMoving ? "moving" : "still",
      isMoving,
    });
  });

  const frameProcessor = useFrameProcessorSafe(
    (frame) => {
      "worklet";

      if (!active) return;

      // ── Sample a sparse grid of pixel brightness values ──────────────────
      // frame.width / frame.height give us the frame dimensions.
      // We read pixel data using the frame's ArrayBuffer (YUV/RGBA depending
      // on platform). We access the luminance (Y) channel which is the first
      // plane in YUV, or we compute brightness from RGBA.
      //
      // react-native-vision-camera v4 exposes frame as an ArrayBuffer-like
      // object. We use frame.toArrayBuffer() to get raw bytes.

      const width = frame.width;
      const height = frame.height;

      // Step size between sampled pixels
      const stepX = Math.floor(width / GRID);
      const stepY = Math.floor(height / GRID);

      const samples: number[] = [];

      try {
        const buffer = frame.toArrayBuffer();
        const bytes = new Uint8Array(buffer);
        const bytesPerPixel = Math.floor(bytes.length / (width * height));
        // bytesPerPixel is typically 4 (RGBA) or 1.5 (YUV420 — Y plane only)

        for (let row = 0; row < GRID; row++) {
          for (let col = 0; col < GRID; col++) {
            const px = col * stepX + Math.floor(stepX / 2);
            const py = row * stepY + Math.floor(stepY / 2);
            const pixelIndex = py * width + px;

            let brightness: number;

            if (bytesPerPixel >= 4) {
              // RGBA — compute luminance from R, G, B
              const byteOffset = pixelIndex * bytesPerPixel;
              const r = bytes[byteOffset] ?? 0;
              const g = bytes[byteOffset + 1] ?? 0;
              const b = bytes[byteOffset + 2] ?? 0;
              // Standard luminance formula
              brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            } else {
              // YUV420 — Y plane is the first (width × height) bytes
              brightness = bytes[pixelIndex] ?? 0;
            }

            samples.push(brightness);
          }
        }
      } catch {
        // Frame not readable yet — skip this frame
        return;
      }

      // ── Compare to previous frame ─────────────────────────────────────────
      const prev = prevSamplesRef.value;
      prevSamplesRef.value = samples;

      if (prev === null || prev.length !== samples.length) return;

      let changedCount = 0;
      for (let i = 0; i < samples.length; i++) {
        if (Math.abs(samples[i] - prev[i]) > PIXEL_THRESHOLD) {
          changedCount++;
        }
      }

      const isDifferent = changedCount / samples.length > CHANGED_RATIO;

      // ── Update rolling window ─────────────────────────────────────────────
      const win = windowRef.value;
      win.push(isDifferent);
      if (win.length > WINDOW) win.shift();
      windowRef.value = win;

      const movingFrames = win.filter(Boolean).length;
      const isMoving = movingFrames >= MOVING_COUNT;

      onMotionResult(isMoving);
    },
    [active, onMotionResult]
  );

  // Reset state when game stops
  const reset = useCallback(() => {
    prevSamplesRef.current = null;
    windowRef.current = [];
    setResult({ status: "idle", isMoving: false });
  }, []);

  return { frameProcessor, result, reset };
}
