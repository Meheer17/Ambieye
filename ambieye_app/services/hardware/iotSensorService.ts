import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface IoTTelemetry {
  connected: boolean;
  device_name: string;
  heart_rate: number | null;
  spo2: number | null;
  body_temp_c: number | null;
  steps: number;
  sleep_duration_hours: number;
  sleep_restlessness_score: number;
  battery_pct: number;
  last_sync_timestamp: string | null;
  status: "normal" | "elevated" | "attention_needed" | "offline";
  message?: string;
}

export interface IoTGeofence {
  lat: number | null;
  lng: number | null;
  distance_from_home_m: number;
  is_in_safe_zone: boolean;
  zone_name: string;
  last_seen: string | null;
}

export interface IoTHistoryItem {
  time: string;
  heart_rate: number;
  spo2: number;
  steps: number;
}

const SERVER_HOST = "172.25.62.153:8000";
const HTTP_BASE_URL =
  Platform.OS === "android" || Platform.OS === "ios"
    ? `http://${SERVER_HOST}`
    : "http://127.0.0.1:8000";

const WS_BASE_URL =
  Platform.OS === "android" || Platform.OS === "ios"
    ? `ws://${SERVER_HOST}/ws/realtime`
    : "ws://127.0.0.1:8000/ws/realtime";

const IOT_STORAGE_KEY = "ambieye_real_iot_telemetry";

type TelemetryListener = (telemetry: IoTTelemetry, geofence: IoTGeofence) => void;

class IoTSensorService {
  private cachedTelemetry: IoTTelemetry = {
    connected: false,
    device_name: "No Sensor Connected",
    heart_rate: null,
    spo2: null,
    body_temp_c: null,
    steps: 0,
    sleep_duration_hours: 0,
    sleep_restlessness_score: 0,
    battery_pct: 0,
    last_sync_timestamp: null,
    status: "offline",
    message: "Waiting for live hardware telemetry stream...",
  };

  private cachedGeofence: IoTGeofence = {
    lat: null,
    lng: null,
    distance_from_home_m: 0,
    is_in_safe_zone: true,
    zone_name: "Safe Zone Initialized",
    last_seen: null,
  };

  private listeners: Set<TelemetryListener> = new Set();
  private ws: WebSocket | null = null;
  private wsReconnectTimer: any = null;

  constructor() {
    this.initWebSocket();
  }

  /**
   * Initializes real-time bidirectional WebSocket connection
   */
  private initWebSocket() {
    if (typeof WebSocket === "undefined") {
      return;
    }
    try {
      this.ws = new WebSocket(WS_BASE_URL);

      this.ws.onopen = () => {
        console.log("[IoTSensorService] Real-time WebSocket connected.");
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "IOT_TELEMETRY" && msg.data) {
            this.cachedTelemetry = { ...this.cachedTelemetry, ...msg.data, connected: true };
            this.notifyListeners();
          } else if (msg.type === "BEACON_GEOFENCE" && msg.data) {
            this.cachedGeofence = { ...this.cachedGeofence, ...msg.data };
            this.notifyListeners();
          }
        } catch (err) {
          // ignore parse errors
        }
      };

      this.ws.onerror = () => {
        this.scheduleReconnect();
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.wsReconnectTimer) {
      this.wsReconnectTimer = setTimeout(() => {
        this.wsReconnectTimer = null;
        this.initWebSocket();
      }, 5000);
    }
  }

  /**
   * Subscribes a React component to live real-time updates
   */
  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    // Send immediate current state
    listener(this.cachedTelemetry, this.cachedGeofence);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn(this.cachedTelemetry, this.cachedGeofence));
  }

  /**
   * Fetches latest live sensor & geofence data from SQLite backend
   */
  async getLatestTelemetry(): Promise<{ telemetry: IoTTelemetry; geofence: IoTGeofence }> {
    try {
      const res = await fetch(`${HTTP_BASE_URL}/api/iot/latest`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.cachedTelemetry = data.telemetry;
          this.cachedGeofence = data.geofence;
          await AsyncStorage.setItem(IOT_STORAGE_KEY, JSON.stringify(data.telemetry));
          this.notifyListeners();
          return { telemetry: data.telemetry, geofence: data.geofence };
        }
      }
    } catch (e) {
      // Read last real saved reading from storage if available
      try {
        const saved = await AsyncStorage.getItem(IOT_STORAGE_KEY);
        if (saved) {
          this.cachedTelemetry = JSON.parse(saved);
        }
      } catch (err) {
        // ignore
      }
    }

    return {
      telemetry: this.cachedTelemetry,
      geofence: this.cachedGeofence,
    };
  }

  /**
   * Pushes new telemetry reading to the hardware server
   */
  async sendTelemetry(reading: Partial<IoTTelemetry>): Promise<boolean> {
    try {
      const res = await fetch(`${HTTP_BASE_URL}/api/iot/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reading),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.current) {
          this.cachedTelemetry = { ...data.current, connected: true };
          await AsyncStorage.setItem(IOT_STORAGE_KEY, JSON.stringify(data.current));
          this.notifyListeners();
          return true;
        }
      }
    } catch (e) {
      console.warn("Telemetry transmission error:", e);
    }
    return false;
  }

  /**
   * Pushes geofence coordinate update
   */
  async sendBeaconUpdate(distanceM: number): Promise<IoTGeofence> {
    const isSafe = distanceM <= 150.0;
    const update: Partial<IoTGeofence> = {
      distance_from_home_m: distanceM,
      is_in_safe_zone: isSafe,
      zone_name: isSafe ? "Courtyard & Tea Garden" : "Outside Safe Boundary (Tea Garden Gate)",
    };

    try {
      const res = await fetch(`${HTTP_BASE_URL}/api/iot/beacon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.geofence) {
          this.cachedGeofence = data.geofence;
          this.notifyListeners();
          return data.geofence;
        }
      }
    } catch (e) {
      // offline
    }

    this.cachedGeofence = { ...this.cachedGeofence, ...update };
    return this.cachedGeofence;
  }

  /**
   * Fetches historical trend from database (0 mock data)
   */
  async getVitalsHistory(): Promise<IoTHistoryItem[]> {
    try {
      const res = await fetch(`${HTTP_BASE_URL}/api/iot/history`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.history)) {
          return data.history;
        }
      }
    } catch (e) {
      // network error
    }
    return [];
  }
}

export const iotSensorService = new IoTSensorService();
