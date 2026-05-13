"""
train_model.py — Eye Detector Model Setup & Verification
---------------------------------------------------------
OpenCV's Haar cascades are pre-trained and ship with the opencv-python package,
so you don't need to train from scratch for basic eye detection.

This script does three things:
  1. Verifies the bundled cascades are present and working
  2. Optionally downloads a more accurate dlib 68-point landmark model
  3. Runs a quick self-test on a synthetic image to confirm everything works

Run with:
    python train_model.py
    python train_model.py --test-image path/to/face.jpg
    python train_model.py --download-dlib   (downloads the dlib shape predictor)

If you want to train a CUSTOM cascade on your own dataset, see the section at
the bottom of this file — it explains the process and provides the commands.
"""

import argparse
import sys
import urllib.request
import bz2
import shutil
from pathlib import Path

import cv2
import numpy as np


# ── Paths ─────────────────────────────────────────────────────────────────────
CV2_DATA = Path(cv2.data.haarcascades)
MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

DLIB_MODEL_URL = (
    "http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2"
)
DLIB_MODEL_PATH = MODELS_DIR / "shape_predictor_68_face_landmarks.dat"


# ── Cascade verification ──────────────────────────────────────────────────────
def verify_cascades() -> bool:
    cascades = {
        "Face (frontal)":    CV2_DATA / "haarcascade_frontalface_default.xml",
        "Eye":               CV2_DATA / "haarcascade_eye.xml",
        "Eye (w/ glasses)":  CV2_DATA / "haarcascade_eye_tree_eyeglasses.xml",
    }

    all_ok = True
    print("\n── Cascade Verification ──────────────────────────────────────")
    for name, path in cascades.items():
        if path.exists():
            clf = cv2.CascadeClassifier(str(path))
            status = "✓ OK" if not clf.empty() else "✗ FAILED TO LOAD"
        else:
            status = "✗ NOT FOUND"
            all_ok = False
        print(f"  {name:<25} {status}")
        print(f"    {path}")

    return all_ok


# ── Quick self-test ───────────────────────────────────────────────────────────
def self_test(image_path: str | None = None) -> None:
    """
    Run face + eye detection on a test image.
    If no image is provided, creates a synthetic grey rectangle as a smoke test.
    """
    print("\n── Self-Test ─────────────────────────────────────────────────")

    face_cascade = cv2.CascadeClassifier(str(CV2_DATA / "haarcascade_frontalface_default.xml"))
    eye_cascade  = cv2.CascadeClassifier(str(CV2_DATA / "haarcascade_eye.xml"))

    if image_path:
        img = cv2.imread(image_path)
        if img is None:
            print(f"  ✗ Could not read image: {image_path}")
            return
        print(f"  Image: {image_path}  shape={img.shape}")
    else:
        # Synthetic 300×300 grey image — won't detect a real face but confirms
        # the cascade loads and runs without crashing
        img = np.full((300, 300, 3), 128, dtype=np.uint8)
        print("  Using synthetic image (no real face — just a smoke test)")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
    print(f"  Faces detected: {len(faces)}")

    for (fx, fy, fw, fh) in faces:
        roi = gray[fy: fy + fh // 2, fx: fx + fw]
        eyes = eye_cascade.detectMultiScale(roi, 1.1, 5, minSize=(15, 15))
        print(f"    Face at ({fx},{fy}) {fw}×{fh} → {len(eyes)} eye(s) detected")

    if image_path and len(faces) == 0:
        print("  ⚠  No faces found. Try a clearer frontal face photo.")
    elif not image_path:
        print("  ✓ Cascade ran without errors (synthetic image, no face expected)")


# ── Optional: download dlib shape predictor ───────────────────────────────────
def download_dlib_model() -> None:
    """
    Downloads the dlib 68-point facial landmark predictor (~100 MB).
    This gives much more accurate eye landmark positions than Haar cascades.
    """
    print("\n── Downloading dlib Shape Predictor ──────────────────────────")

    if DLIB_MODEL_PATH.exists():
        print(f"  ✓ Already downloaded: {DLIB_MODEL_PATH}")
        return

    bz2_path = MODELS_DIR / "shape_predictor_68_face_landmarks.dat.bz2"
    print(f"  Downloading from {DLIB_MODEL_URL} ...")
    print("  This is ~100 MB — may take a minute on a slow connection.")

    try:
        urllib.request.urlretrieve(DLIB_MODEL_URL, bz2_path)
        print("  Decompressing ...")
        with bz2.open(bz2_path, "rb") as f_in, open(DLIB_MODEL_PATH, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
        bz2_path.unlink()
        print(f"  ✓ Saved to {DLIB_MODEL_PATH}")
        print()
        print("  To use dlib in eye_analyzer.py, install dlib:")
        print("    pip install dlib")
        print("  Then import and use shape_predictor with the .dat file above.")
    except Exception as e:
        print(f"  ✗ Download failed: {e}")


# ── Custom cascade training guide ─────────────────────────────────────────────
TRAINING_GUIDE = """
── How to Train a Custom Eye Cascade ────────────────────────────────────────

If the bundled Haar cascades don't work well for your use case (e.g. children
with specific eye conditions), you can train a custom cascade.

REQUIREMENTS
  - OpenCV with opencv_traincascade tool (comes with opencv-python-headless)
  - Positive images: ~1000 cropped eye images (the thing you want to detect)
  - Negative images: ~3000 images that do NOT contain eyes

STEPS

1. Collect positive images
   - Crop eye regions from photos of children
   - Resize to a consistent size, e.g. 24×24 pixels
   - Save to  data/positive/

2. Collect negative images
   - Any images without eyes (backgrounds, objects, etc.)
   - Save to  data/negative/

3. Create the positive samples file
   opencv_createsamples \\
     -img data/positive/ \\
     -bg data/negative/bg.txt \\
     -info data/positive.dat \\
     -num 1000 -w 24 -h 24

4. Train the cascade
   opencv_traincascade \\
     -data models/custom_eye_cascade/ \\
     -vec data/positive.dat \\
     -bg data/negative/bg.txt \\
     -numPos 900 -numNeg 3000 \\
     -numStages 20 -w 24 -h 24 \\
     -featureType HAAR

5. The output cascade.xml will be in models/custom_eye_cascade/
   Update EYE_CASCADE_PATH in eye_analyzer.py to point to it.

NOTE: For a presentation/demo, the bundled haarcascade_eye.xml is sufficient.
      Custom training is only needed for production-grade accuracy.
"""


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="AmbiEye model setup and verification tool"
    )
    parser.add_argument(
        "--test-image",
        metavar="PATH",
        help="Path to a face image to test detection on",
    )
    parser.add_argument(
        "--download-dlib",
        action="store_true",
        help="Download the dlib 68-point shape predictor model (~100 MB)",
    )
    parser.add_argument(
        "--training-guide",
        action="store_true",
        help="Print the custom cascade training guide",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  AmbiEye Eye Tracking — Model Setup")
    print("=" * 60)

    ok = verify_cascades()
    self_test(args.test_image)

    if args.download_dlib:
        download_dlib_model()

    if args.training_guide:
        print(TRAINING_GUIDE)

    print()
    if ok:
        print("✓ All bundled cascades are ready. You can start the server:")
        print("    uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    else:
        print("✗ Some cascades are missing. Reinstall opencv-python:")
        print("    pip install --force-reinstall opencv-python")

    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
