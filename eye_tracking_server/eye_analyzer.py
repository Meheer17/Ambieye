"""
eye_analyzer.py
---------------
Analyses a video file of a child's face during an eye exercise.

Uses OpenCV Haar cascades (no training required — they ship with OpenCV) to:
  1. Detect the face in each frame
  2. Detect eyes within the face region
  3. Track the pupil/iris centroid inside each eye region
  4. Count distinct eye movements (direction changes in the centroid path)
  5. Classify movement quality: good / partial / none

Returns a structured dict that FastAPI sends back to the app.
"""

import cv2
import numpy as np
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ── Cascade paths (bundled with opencv-python) ────────────────────────────────
_CV2_DATA = Path(cv2.data.haarcascades)
FACE_CASCADE_PATH  = str(_CV2_DATA / "haarcascade_frontalface_default.xml")
EYE_CASCADE_PATH   = str(_CV2_DATA / "haarcascade_eye.xml")
# Eye with glasses — fallback
EYE_TREE_PATH      = str(_CV2_DATA / "haarcascade_eye_tree_eyeglasses.xml")


@dataclass
class EyeAnalysisResult:
    # Was the analysis successful?
    success: bool
    # Human-readable summary
    summary: str
    # Total frames processed
    total_frames: int
    # Frames where at least one eye was detected
    frames_with_eyes: int
    # Number of distinct eye movements detected
    movement_count: int
    # Average movement magnitude per detected frame (pixels, normalised 0-1)
    avg_movement: float
    # Verdict: "good" | "partial" | "none" | "no_face"
    verdict: str
    # Optional error message
    error: Optional[str] = None


def _find_pupil_centroid(eye_roi_gray: np.ndarray) -> Optional[tuple[int, int]]:
    """
    Estimate the pupil/iris centroid inside a grayscale eye ROI.

    Strategy:
      - Blur to reduce noise
      - Threshold to isolate the dark pupil region
      - Find the largest contour → its centroid is the pupil
    """
    if eye_roi_gray.size == 0:
        return None

    blurred = cv2.GaussianBlur(eye_roi_gray, (7, 7), 0)
    # Pupils are dark — use a low threshold
    _, thresh = cv2.threshold(blurred, 50, 255, cv2.THRESH_BINARY_INV)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < 10:
        return None

    M = cv2.moments(largest)
    if M["m00"] == 0:
        return None

    cx = int(M["m10"] / M["m00"])
    cy = int(M["m01"] / M["m00"])
    return (cx, cy)


def _count_movements(centroids: list[tuple[int, int]], threshold_px: int = 4) -> tuple[int, float]:
    """
    Count distinct directional movements in a centroid path.

    A movement is counted when the centroid shifts by more than `threshold_px`
    in any direction AND the direction changes from the previous movement.

    Returns (movement_count, avg_magnitude).
    """
    if len(centroids) < 2:
        return 0, 0.0

    movements = []
    for i in range(1, len(centroids)):
        dx = centroids[i][0] - centroids[i - 1][0]
        dy = centroids[i][1] - centroids[i - 1][1]
        mag = np.sqrt(dx ** 2 + dy ** 2)
        if mag >= threshold_px:
            movements.append((dx, dy, mag))

    if not movements:
        return 0, 0.0

    avg_mag = float(np.mean([m[2] for m in movements]))

    # Count direction reversals (each reversal = one completed movement)
    count = 1
    for i in range(1, len(movements)):
        prev_dx, prev_dy, _ = movements[i - 1]
        curr_dx, curr_dy, _ = movements[i]
        # Dot product < 0 means direction reversed
        dot = prev_dx * curr_dx + prev_dy * curr_dy
        if dot < 0:
            count += 1

    return count, avg_mag


def analyse_video(video_path: str) -> EyeAnalysisResult:
    """
    Main entry point. Analyses the video at `video_path` and returns
    an EyeAnalysisResult.
    """
    face_cascade = cv2.CascadeClassifier(FACE_CASCADE_PATH)
    eye_cascade  = cv2.CascadeClassifier(EYE_CASCADE_PATH)
    eye_tree     = cv2.CascadeClassifier(EYE_TREE_PATH)

    if face_cascade.empty():
        return EyeAnalysisResult(
            success=False, summary="Face cascade failed to load",
            total_frames=0, frames_with_eyes=0,
            movement_count=0, avg_movement=0.0,
            verdict="error", error="haarcascade_frontalface_default.xml not found"
        )

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return EyeAnalysisResult(
            success=False, summary="Could not open video file",
            total_frames=0, frames_with_eyes=0,
            movement_count=0, avg_movement=0.0,
            verdict="error", error=f"cv2.VideoCapture failed for {video_path}"
        )

    fps          = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Process every Nth frame to keep it fast (target ~10 fps analysis)
    step = max(1, int(fps / 10))

    all_centroids: list[tuple[int, int]] = []
    frames_with_eyes = 0
    frames_processed = 0
    face_detected_count = 0

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % step != 0:
            continue

        frames_processed += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        # ── Face detection ────────────────────────────────────────────────
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5,
            minSize=(60, 60), flags=cv2.CASCADE_SCALE_IMAGE
        )

        if len(faces) == 0:
            continue

        face_detected_count += 1

        # Use the largest face
        fx, fy, fw, fh = max(faces, key=lambda r: r[2] * r[3])
        face_gray = gray[fy: fy + fh, fx: fx + fw]

        # Only look in the top half of the face for eyes
        eye_region = face_gray[: fh // 2, :]

        # ── Eye detection ─────────────────────────────────────────────────
        eyes = eye_cascade.detectMultiScale(
            eye_region, scaleFactor=1.1, minNeighbors=5, minSize=(20, 20)
        )
        if len(eyes) == 0:
            # Try the glasses cascade as fallback
            eyes = eye_tree.detectMultiScale(
                eye_region, scaleFactor=1.1, minNeighbors=3, minSize=(15, 15)
            )

        if len(eyes) == 0:
            continue

        frames_with_eyes += 1

        # Use the first detected eye for centroid tracking
        ex, ey, ew, eh = eyes[0]
        eye_roi = eye_region[ey: ey + eh, ex: ex + ew]

        centroid = _find_pupil_centroid(eye_roi)
        if centroid is not None:
            # Normalise centroid to [0,1] relative to eye ROI size
            norm_cx = centroid[0] / max(ew, 1)
            norm_cy = centroid[1] / max(eh, 1)
            # Store as integer pixels scaled to 100 for integer arithmetic
            all_centroids.append((int(norm_cx * 100), int(norm_cy * 100)))

    cap.release()

    if frames_processed == 0:
        return EyeAnalysisResult(
            success=False, summary="No frames could be read from video",
            total_frames=total_frames, frames_with_eyes=0,
            movement_count=0, avg_movement=0.0,
            verdict="error", error="Empty video"
        )

    if face_detected_count == 0:
        return EyeAnalysisResult(
            success=True,
            summary="No face detected in the video. Make sure the camera is facing the child.",
            total_frames=total_frames, frames_with_eyes=0,
            movement_count=0, avg_movement=0.0,
            verdict="no_face"
        )

    # ── Movement analysis ─────────────────────────────────────────────────────
    movement_count, avg_movement = _count_movements(all_centroids, threshold_px=3)

    # Normalise avg_movement (centroids are 0-100 scale)
    avg_movement_norm = round(avg_movement / 100.0, 3)

    # ── Verdict ───────────────────────────────────────────────────────────────
    eye_detection_ratio = frames_with_eyes / max(frames_processed, 1)

    if movement_count >= 6 and eye_detection_ratio >= 0.4:
        verdict = "good"
        summary = (
            f"Eyes are moving well! Detected {movement_count} distinct eye movements "
            f"across {frames_with_eyes} frames."
        )
    elif movement_count >= 2 or eye_detection_ratio >= 0.2:
        verdict = "partial"
        summary = (
            f"Some eye movement detected ({movement_count} movements). "
            f"Eyes were visible in {frames_with_eyes} frames. "
            f"Encourage the child to follow the ball more closely."
        )
    else:
        verdict = "none"
        summary = (
            f"Very little eye movement detected ({movement_count} movements). "
            f"The child may not be following the ball. "
            f"Check lighting and camera position."
        )

    logger.info(
        "Analysis complete: verdict=%s movements=%d eye_frames=%d/%d",
        verdict, movement_count, frames_with_eyes, frames_processed
    )

    return EyeAnalysisResult(
        success=True,
        summary=summary,
        total_frames=total_frames,
        frames_with_eyes=frames_with_eyes,
        movement_count=movement_count,
        avg_movement=avg_movement_norm,
        verdict=verdict,
    )


def analyse_video_dict(video_path: str) -> dict:
    """Convenience wrapper that returns a plain dict."""
    return asdict(analyse_video(video_path))
