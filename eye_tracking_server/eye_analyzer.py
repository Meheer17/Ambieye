"""
eye_analyzer.py  —  AmbiEye Eye Movement Analyser
--------------------------------------------------
Analyses a video of a child's face during an eye exercise.

Key design decisions (v2):
  - Track the eye REGION centre in face-relative coordinates, not the pupil
    centroid in eye-relative coordinates. The eye region centre is far more
    stable across frames because it doesn't depend on the exact bounding box.
  - Use Otsu adaptive thresholding instead of a fixed threshold for pupil
    detection — works across different lighting conditions.
  - Looser Haar cascade parameters (minNeighbors=3, smaller minSize) to cope
    with compressed mobile video.
  - Smooth the centroid path with a rolling median to remove single-frame
    jitter before counting movements.
  - Count movements as sustained directional shifts (not just reversals) so
    that slow, smooth eye tracking is also detected.
  - Add a detailed debug log so you can see exactly what's happening.
"""

import cv2
import numpy as np
import math
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ── Cascade paths ─────────────────────────────────────────────────────────────
_CV2_DATA = Path(cv2.data.haarcascades)
FACE_CASCADE_PATH = str(_CV2_DATA / "haarcascade_frontalface_default.xml")
EYE_CASCADE_PATH  = str(_CV2_DATA / "haarcascade_eye.xml")
EYE_TREE_PATH     = str(_CV2_DATA / "haarcascade_eye_tree_eyeglasses.xml")

# ── Tuning constants ──────────────────────────────────────────────────────────
# Minimum pixel shift (in face-relative coords) to count as movement.
# Face is typically 150-300px wide in a front-camera video.
# 8px ≈ 3-5% of face width — enough to detect real eye movement.
MOVEMENT_THRESHOLD_PX = 8

# Smooth the centroid path over this many frames before counting movements
SMOOTHING_WINDOW = 3

# Compare centroids this many frames apart instead of consecutive frames.
# Slow circular motion (5s period) produces only ~2px per frame at 15fps.
# With stride=5, we compare points 5 frames apart → ~10px displacement, above threshold.
COMPARISON_STRIDE = 5

# Analysis FPS target — process this many frames per second of video
ANALYSIS_FPS = 15


@dataclass
class EyeAnalysisResult:
    success: bool
    summary: str
    total_frames: int
    frames_with_eyes: int
    movement_count: int
    avg_movement: float
    verdict: str
    error: Optional[str] = None


def _otsu_pupil_centroid(eye_roi_gray: np.ndarray) -> Optional[tuple[int, int]]:
    """
    Find the pupil centroid using Otsu's adaptive threshold.
    More robust than a fixed threshold across different lighting conditions.
    """
    if eye_roi_gray.size == 0 or eye_roi_gray.shape[0] < 5 or eye_roi_gray.shape[1] < 5:
        return None

    blurred = cv2.GaussianBlur(eye_roi_gray, (5, 5), 0)

    # Otsu automatically finds the best threshold
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    # Filter out tiny noise contours
    valid = [c for c in contours if cv2.contourArea(c) >= 15]
    if not valid:
        return None

    largest = max(valid, key=cv2.contourArea)
    M = cv2.moments(largest)
    if M["m00"] == 0:
        return None

    return (int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"]))


def _smooth_path(path: list[tuple[int, int]], window: int) -> list[tuple[int, int]]:
    """Apply a rolling median filter to a list of (x, y) points."""
    if len(path) < window:
        return path

    smoothed = []
    half = window // 2
    for i in range(len(path)):
        lo = max(0, i - half)
        hi = min(len(path), i + half + 1)
        xs = [p[0] for p in path[lo:hi]]
        ys = [p[1] for p in path[lo:hi]]
        smoothed.append((int(np.median(xs)), int(np.median(ys))))
    return smoothed


def _count_movements(path: list[tuple[int, int]]) -> tuple[int, float]:
    """
    Count distinct eye movement events in a smoothed centroid path.

    Compares points COMPARISON_STRIDE frames apart so that slow circular
    motion is detected. Counts movements by tracking cumulative angular
    change — every 90° of accumulated turn = one movement event.
    This correctly handles both back-and-forth AND circular motion.

    Returns (movement_count, avg_magnitude_px).
    """
    if len(path) < COMPARISON_STRIDE + 1:
        return 0, 0.0

    # Build displacement vectors between points STRIDE apart
    vectors = []
    for i in range(COMPARISON_STRIDE, len(path)):
        dx = path[i][0] - path[i - COMPARISON_STRIDE][0]
        dy = path[i][1] - path[i - COMPARISON_STRIDE][1]
        mag = float(np.sqrt(dx * dx + dy * dy))
        vectors.append((dx, dy, mag))

    # Keep only significant movements
    significant = [(dx, dy, mag) for dx, dy, mag in vectors if mag >= MOVEMENT_THRESHOLD_PX]

    if not significant:
        return 0, 0.0

    avg_mag = float(np.mean([m for _, _, m in significant]))

    # Count movements by accumulated angular change.
    # Every 90° of cumulative turn = one movement event.
    # This handles both reversals (180° = 2 events) and circular motion.
    DEGREES_PER_EVENT = 90.0
    events = 0
    accumulated_angle = 0.0

    for i in range(1, len(significant)):
        prev_dx, prev_dy, _ = significant[i - 1]
        curr_dx, curr_dy, _ = significant[i]

        prev_mag = np.sqrt(prev_dx**2 + prev_dy**2)
        curr_mag = np.sqrt(curr_dx**2 + curr_dy**2)

        if prev_mag > 0 and curr_mag > 0:
            cos_angle = (prev_dx * curr_dx + prev_dy * curr_dy) / (prev_mag * curr_mag)
            cos_angle = max(-1.0, min(1.0, cos_angle))
            angle_deg = math.degrees(math.acos(cos_angle))
        else:
            angle_deg = 0.0

        accumulated_angle += angle_deg

        # Each full 90° of accumulated turn = one movement event
        while accumulated_angle >= DEGREES_PER_EVENT:
            events += 1
            accumulated_angle -= DEGREES_PER_EVENT

    # Also count the initial movement if there were any significant vectors
    if len(significant) > 0:
        events += 1

    return events, avg_mag


def analyse_video(video_path: str) -> EyeAnalysisResult:
    """Main entry point."""

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

    # Process every Nth frame to hit ~ANALYSIS_FPS
    step = max(1, int(round(fps / ANALYSIS_FPS)))

    logger.info("Video: fps=%.1f total_frames=%d step=%d", fps, total_frames, step)

    # ── Per-frame tracking ────────────────────────────────────────────────────
    # We track TWO things per frame:
    #   1. Eye centre in face-relative coordinates (primary signal)
    #   2. Pupil centroid in face-relative coordinates (secondary signal)
    # We use whichever gives more data.

    eye_centres: list[tuple[int, int]] = []   # eye bbox centre, face-relative
    pupil_centres: list[tuple[int, int]] = [] # pupil centroid, face-relative

    frames_processed = 0
    frames_with_face = 0
    frames_with_eyes = 0

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % step != 0:
            continue

        frames_processed += 1

        # Resize to a standard width for consistent detection
        h, w = frame.shape[:2]
        scale = min(1.0, 640 / w)
        if scale < 1.0:
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)))

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        fh_img, fw_img = gray.shape

        # ── Face detection ────────────────────────────────────────────────
        # Try progressively looser parameters if nothing found
        faces = []
        for min_neighbors, min_size in [(5, 80), (4, 60), (3, 50), (2, 40)]:
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=min_neighbors,
                minSize=(min_size, min_size),
                flags=cv2.CASCADE_SCALE_IMAGE,
            )
            if len(faces) > 0:
                break

        if len(faces) == 0:
            logger.debug("Frame %d: no face detected", frame_idx)
            continue

        frames_with_face += 1

        # Use the largest face
        fx, fy, fw, fh = max(faces, key=lambda r: r[2] * r[3])

        # Eye search region: top 55% of face (eyes are in the upper portion)
        eye_search_h = int(fh * 0.55)
        eye_region = gray[fy: fy + eye_search_h, fx: fx + fw]

        # ── Eye detection ─────────────────────────────────────────────────
        eyes = []
        for min_neighbors, min_size in [(4, 20), (3, 15), (2, 12)]:
            eyes = eye_cascade.detectMultiScale(
                eye_region,
                scaleFactor=1.05,
                minNeighbors=min_neighbors,
                minSize=(min_size, min_size),
            )
            if len(eyes) > 0:
                break

        if len(eyes) == 0:
            # Fallback: glasses cascade
            for min_neighbors, min_size in [(3, 15), (2, 12)]:
                eyes = eye_tree.detectMultiScale(
                    eye_region,
                    scaleFactor=1.05,
                    minNeighbors=min_neighbors,
                    minSize=(min_size, min_size),
                )
                if len(eyes) > 0:
                    break

        if len(eyes) == 0:
            logger.debug("Frame %d: face found but no eyes", frame_idx)
            continue

        frames_with_eyes += 1

        # Pick the most reliable eye (largest area, not too close to face edge)
        best_eye = None
        best_score = -1
        for ex, ey, ew, eh in eyes:
            # Prefer eyes that are well inside the face region
            margin_ok = ex > fw * 0.05 and (ex + ew) < fw * 0.95
            score = ew * eh * (1.2 if margin_ok else 1.0)
            if score > best_score:
                best_score = score
                best_eye = (ex, ey, ew, eh)

        ex, ey, ew, eh = best_eye

        # ── Eye centre in face-relative coordinates ───────────────────────
        # This is the primary tracking signal.
        # The centre of the eye bounding box moves when the eyeball moves.
        eye_cx_face = ex + ew // 2   # x relative to face left edge
        eye_cy_face = ey + eh // 2   # y relative to face top edge
        eye_centres.append((eye_cx_face, eye_cy_face))

        # ── Pupil centroid in face-relative coordinates ───────────────────
        eye_roi = eye_region[ey: ey + eh, ex: ex + ew]
        pupil = _otsu_pupil_centroid(eye_roi)
        if pupil is not None:
            # Convert to face-relative coords
            pupil_x_face = ex + pupil[0]
            pupil_y_face = ey + pupil[1]
            pupil_centres.append((pupil_x_face, pupil_y_face))

        logger.debug(
            "Frame %d: face=(%d,%d,%d,%d) eye_centre=(%d,%d) pupil=%s",
            frame_idx, fx, fy, fw, fh, eye_cx_face, eye_cy_face,
            f"({pupil_x_face},{pupil_y_face})" if pupil else "none"
        )

    cap.release()

    logger.info(
        "Processed %d frames: face=%d eyes=%d eye_centres=%d pupil_centres=%d",
        frames_processed, frames_with_face, frames_with_eyes,
        len(eye_centres), len(pupil_centres)
    )

    # ── Guard: not enough data ────────────────────────────────────────────────
    if frames_processed == 0:
        return EyeAnalysisResult(
            success=False, summary="No frames could be read from video",
            total_frames=total_frames, frames_with_eyes=0,
            movement_count=0, avg_movement=0.0,
            verdict="error", error="Empty video"
        )

    if frames_with_face == 0:
        return EyeAnalysisResult(
            success=True,
            summary=(
                "No face detected in the video. "
                "Make sure the front camera is facing the child's face and the room is well lit."
            ),
            total_frames=total_frames, frames_with_eyes=0,
            movement_count=0, avg_movement=0.0,
            verdict="no_face"
        )

    # ── Movement analysis ─────────────────────────────────────────────────────
    # Use eye centres as primary signal; fall back to pupil centres if more data
    primary = eye_centres if len(eye_centres) >= len(pupil_centres) else pupil_centres
    signal_name = "eye_centre" if primary is eye_centres else "pupil"

    logger.info("Using %s signal with %d points", signal_name, len(primary))

    if len(primary) < 3:
        return EyeAnalysisResult(
            success=True,
            summary=(
                f"Face was detected but eyes were only visible in {frames_with_eyes} frames. "
                "Try better lighting and make sure the child's eyes are clearly visible."
            ),
            total_frames=total_frames,
            frames_with_eyes=frames_with_eyes,
            movement_count=0,
            avg_movement=0.0,
            verdict="none"
        )

    # Smooth to remove single-frame jitter
    smoothed = _smooth_path(primary, SMOOTHING_WINDOW)

    movement_count, avg_movement = _count_movements(smoothed)

    logger.info(
        "Movement analysis: count=%d avg_mag=%.1fpx threshold=%dpx",
        movement_count, avg_movement, MOVEMENT_THRESHOLD_PX
    )

    # ── Verdict ───────────────────────────────────────────────────────────────
    eye_ratio = frames_with_eyes / max(frames_processed, 1)

    if movement_count >= 5 and eye_ratio >= 0.3:
        verdict = "good"
        summary = (
            f"Eyes are moving well! Detected {movement_count} distinct eye movements "
            f"(avg {avg_movement:.0f}px shift) across {frames_with_eyes} frames."
        )
    elif movement_count >= 2 or (eye_ratio >= 0.2 and avg_movement >= MOVEMENT_THRESHOLD_PX):
        verdict = "partial"
        summary = (
            f"Some eye movement detected — {movement_count} movements, "
            f"eyes visible in {frames_with_eyes} frames. "
            f"Encourage the child to follow the ball more closely."
        )
    else:
        verdict = "none"
        summary = (
            f"Very little eye movement detected ({movement_count} movements, "
            f"avg {avg_movement:.0f}px). "
            f"The child may not be following the ball, or the camera angle needs adjusting."
        )

    logger.info("Verdict: %s", verdict)

    return EyeAnalysisResult(
        success=True,
        summary=summary,
        total_frames=total_frames,
        frames_with_eyes=frames_with_eyes,
        movement_count=movement_count,
        avg_movement=round(avg_movement, 1),
        verdict=verdict,
    )


def analyse_video_dict(video_path: str) -> dict:
    """Convenience wrapper that returns a plain dict."""
    return asdict(analyse_video(video_path))
