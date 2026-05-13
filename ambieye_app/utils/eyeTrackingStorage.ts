/**
 * eyeTrackingStorage.ts
 * Persists the OpenCV server IP/port to AsyncStorage.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_IP   = "eye_tracking_server_ip";
const KEY_PORT = "eye_tracking_server_port";

export const DEFAULT_PORT = "8000";

export async function getServerConfig(): Promise<{ ip: string; port: string }> {
  const [ip, port] = await Promise.all([
    AsyncStorage.getItem(KEY_IP),
    AsyncStorage.getItem(KEY_PORT),
  ]);
  return { ip: ip ?? "", port: port ?? DEFAULT_PORT };
}

export async function saveServerConfig(ip: string, port: string): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEY_IP, ip.trim()),
    AsyncStorage.setItem(KEY_PORT, port.trim() || DEFAULT_PORT),
  ]);
}

export function buildServerUrl(ip: string, port: string): string {
  const cleanIp = ip.trim().replace(/\/+$/, "");
  const cleanPort = port.trim() || DEFAULT_PORT;
  if (!cleanIp) return "";
  // Support both bare IP and full URL
  if (cleanIp.startsWith("http")) return `${cleanIp}:${cleanPort}`;
  return `http://${cleanIp}:${cleanPort}`;
}
