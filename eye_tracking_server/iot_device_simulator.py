"""
iot_device_simulator.py — Interactive Hardware & Wearable Simulator
-------------------------------------------------------------------
Simulates ESP32 Smart Bands, MAX30102 Pulse Oximeters, and Gramin
Suraksha BLE Beacons for testing and live demonstration.

Usage:
  python iot_device_simulator.py --mode stream
  python iot_device_simulator.py --mode tachycardia (Elevated Heart Rate)
  python iot_device_simulator.py --mode wandering   (Breach 150m Safe Zone)
"""

import sys
import time
import json
import random
import argparse
import urllib.request
import urllib.error

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

SERVER_URL = "http://127.0.0.1:8000"


def post_json(endpoint: str, data: dict):
    url = f"{SERVER_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"❌ [Network Error] Could not connect to {url}: {e}")
        return None


def simulate_continuous_stream(interval_sec=3):
    print("\n🟢 [AmbiEye Hardware Simulator] Starting continuous telemetry stream...")
    print(f"📡 Transmitting to {SERVER_URL}/api/iot/telemetry every {interval_sec}s")
    print("Press Ctrl+C to stop.\n")

    hr = 72
    spo2 = 98
    steps = 2840
    battery = 92

    while True:
        hr += random.choice([-1, 0, 1, 2, -2])
        hr = max(60, min(88, hr))

        spo2 += random.choice([-1, 0, 1])
        spo2 = max(96, min(100, spo2))

        steps += random.randint(0, 5)
        battery = max(10, battery - random.choice([0, 0, 0, 1]))

        payload = {
            "user_id": "mahi",
            "device_name": "ESP32 Wearable Pulse Band (Node-01)",
            "heart_rate": hr,
            "spo2": spo2,
            "body_temp_c": 36.6,
            "steps": steps,
            "battery_pct": battery,
        }

        res = post_json("/api/iot/telemetry", payload)
        if res and res.get("success"):
            print(f"💓 [Vitals Sent] HR: {hr} BPM | SpO2: {spo2}% | Steps: {steps} | Battery: {battery}% -> Saved to DB")
        time.sleep(interval_sec)


def simulate_wandering_breach():
    print("\n🚨 [Simulating Safe-Zone Breach] Senior stepping outside 150m boundary...")
    payload = {
        "user_id": "mahi",
        "lat": 26.1480,
        "lng": 91.7390,
        "distance_from_home_m": 220.5,
        "zone_name": "Outside Safe Boundary (Tea Garden Gate)",
    }
    res = post_json("/api/iot/beacon", payload)
    if res and res.get("success"):
        print(f"⚠️ [Alert Triggered] Distance: 220.5m | Safe Zone: False | Dispatched to Caregiver Dashboard")


def simulate_tachycardia():
    print("\n🚨 [Simulating Acute Tachycardia] Heart rate spike to 115 BPM...")
    payload = {
        "user_id": "mahi",
        "device_name": "ESP32 Wearable Pulse Band (Node-01)",
        "heart_rate": 115,
        "spo2": 94,
        "body_temp_c": 37.8,
        "steps": 2900,
        "battery_pct": 85,
    }
    res = post_json("/api/iot/telemetry", payload)
    if res and res.get("success"):
        print(f"⚠️ [Vital Alert] HR: 115 BPM (Elevated) | SpO2: 94% -> Recorded in SQLite DB")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AmbiEye IoT Hardware Simulator")
    parser.add_argument(
        "--mode",
        choices=["stream", "wandering", "tachycardia"],
        default="stream",
        help="Simulation scenario",
    )
    parser.add_argument("--interval", type=int, default=3, help="Interval in seconds for continuous stream")

    args = parser.parse_args()

    if args.mode == "stream":
        simulate_continuous_stream(interval_sec=args.interval)
    elif args.mode == "wandering":
        simulate_wandering_breach()
    elif args.mode == "tachycardia":
        simulate_tachycardia()
