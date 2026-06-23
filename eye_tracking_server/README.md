# AmbiEye Eye Tracking Server

FastAPI + OpenCV server that receives eye exercise videos from the mobile app and analyses eye movement.

## Setup (run inside your toolbox)

```bash
cd eye_tracking_server
pip install -r requirements.txt
python train_model.py          # verify cascades are ready
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check — app pings this |
| POST | `/analyse-eye-movement` | Upload video, get analysis JSON |

### POST `/analyse-eye-movement`

Multipart form fields:
- `video` — the video file
- `game_id` — integer (optional)
- `game_name` — string (optional)

Response:
```json
{
  "success": true,
  "summary": "Eyes are moving well! Detected 12 distinct eye movements across 45 frames.",
  "total_frames": 900,
  "frames_with_eyes": 45,
  "movement_count": 12,
  "avg_movement": 0.08,
  "verdict": "good",
  "game_id": 6,
  "game_name": "Clockwise"
}
```

Verdicts: `good` | `partial` | `none` | `no_face` | `error`

## Setting the server IP in the app

Go to **Settings → Eye Tracking Server** and enter your laptop's local IP address (e.g. `192.168.1.42`) and port (`8000`). The app will ping `/health` to verify the connection before each game.

## Training / model info

The server uses OpenCV's bundled Haar cascades — no training needed.

To verify or optionally download a more accurate dlib model:
```bash
python train_model.py --training-guide    # print training instructions
python train_model.py --download-dlib     # download dlib 68-point model (~100MB)
python train_model.py --test-image face.jpg  # test on a real photo
```
