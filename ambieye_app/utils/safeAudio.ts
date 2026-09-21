/**
 * utils/safeAudio.ts
 * Safe wrapper around expo-av to prevent "Cannot find native module 'ExponentAV'"
 * crashes on Web, Expo Go, or platforms where ExponentAV is not compiled in.
 */
import { Platform, NativeModules } from "react-native";

let ExpoAV: any = null;
let AudioModule: any = null;

try {
  // Only attempt requiring expo-av if the native module is present in the runtime
  const hasNativeAV =
    Platform.OS !== "web" &&
    !!(
      NativeModules?.ExponentAV ||
      (global as any)?.expo?.modules?.ExponentAV ||
      (global as any)?.__expo_modules__?.ExponentAV
    );

  if (hasNativeAV) {
    ExpoAV = require("expo-av");
    AudioModule = ExpoAV?.Audio;
  }
} catch (err) {
  AudioModule = null;
}

// Fallback Sound Class with full Audio.Sound interface emulation
class FallbackSound {
  private _statusCallback: ((status: any) => void) | null = null;
  private _isLoaded = false;
  private _isPlaying = false;
  private _positionMillis = 0;
  private _durationMillis = 180000;

  async loadAsync(source: any, initialStatus: any = {}) {
    this._isLoaded = true;
    this._isPlaying = initialStatus.shouldPlay || false;
    this._positionMillis = initialStatus.positionMillis || 0;
    this._notifyStatus();
    return this.getStatusAsync();
  }

  async unloadAsync() {
    this._isLoaded = false;
    this._isPlaying = false;
    return { isLoaded: false };
  }

  async playAsync() {
    this._isPlaying = true;
    this._notifyStatus();
    return this.getStatusAsync();
  }

  async pauseAsync() {
    this._isPlaying = false;
    this._notifyStatus();
    return this.getStatusAsync();
  }

  async stopAsync() {
    this._isPlaying = false;
    this._positionMillis = 0;
    this._notifyStatus();
    return this.getStatusAsync();
  }

  async setVolumeAsync(vol: number) {
    return this.getStatusAsync();
  }

  async setIsMutedAsync(muted: boolean) {
    return this.getStatusAsync();
  }

  async setPositionAsync(millis: number) {
    this._positionMillis = millis;
    this._notifyStatus();
    return this.getStatusAsync();
  }

  setOnPlaybackStatusUpdate(callback: ((status: any) => void) | null) {
    this._statusCallback = callback;
    if (callback) {
      this._notifyStatus();
    }
  }

  async getStatusAsync() {
    return {
      isLoaded: this._isLoaded,
      isPlaying: this._isPlaying,
      positionMillis: this._positionMillis,
      durationMillis: this._durationMillis,
      didJustFinish: false,
    };
  }

  private _notifyStatus() {
    if (this._statusCallback) {
      this._statusCallback({
        isLoaded: this._isLoaded,
        isPlaying: this._isPlaying,
        positionMillis: this._positionMillis,
        durationMillis: this._durationMillis,
        didJustFinish: false,
      });
    }
  }

  static async createAsync(source: any, initialStatus: any = {}, onPlaybackStatusUpdate: any = null) {
    const sound = new FallbackSound();
    await sound.loadAsync(source, initialStatus);
    if (onPlaybackStatusUpdate) {
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    }
    const status = await sound.getStatusAsync();
    return { sound: sound as any, status };
  }
}

// Fallback Recording Class with Audio.Recording emulation
class FallbackRecording {
  private _isRecording = false;

  async prepareToRecordAsync(options: any) {
    return { canRecord: true, isRecording: false };
  }

  async startAsync() {
    this._isRecording = true;
    return { isRecording: true };
  }

  async stopAndUnloadAsync() {
    this._isRecording = false;
    return { isRecording: false };
  }

  getURI() {
    return null;
  }

  getStatusAsync() {
    return Promise.resolve({
      canRecord: true,
      isRecording: this._isRecording,
      durationMillis: 0,
    });
  }

  setOnRecordingStatusUpdate(callback: any) {}

  static async createAsync(options: any = {}) {
    const rec = new FallbackRecording();
    await rec.prepareToRecordAsync(options);
    await rec.startAsync();
    return { recording: rec, status: await rec.getStatusAsync() };
  }
}

export const SafeAudio = {
  Sound: (AudioModule?.Sound && Platform.OS !== "web") ? AudioModule.Sound : FallbackSound,
  Recording: (AudioModule?.Recording && Platform.OS !== "web") ? AudioModule.Recording : FallbackRecording,
  RecordingOptionsPresets: AudioModule?.RecordingOptionsPresets || {
    HIGH_QUALITY: {
      android: {},
      ios: {},
      web: {},
    },
  },
  setAudioModeAsync: async (options: any) => {
    try {
      if (AudioModule?.setAudioModeAsync && Platform.OS !== "web") {
        return await AudioModule.setAudioModeAsync(options);
      }
    } catch (e) {
      // Safe fallback
    }
    return Promise.resolve();
  },
  requestPermissionsAsync: async () => {
    try {
      if (AudioModule?.requestPermissionsAsync && Platform.OS !== "web") {
        return await AudioModule.requestPermissionsAsync();
      }
    } catch (e) {
      // Safe fallback
    }
    return Promise.resolve({ status: "granted", granted: true, expires: "never", canAskAgain: true });
  },
  getPermissionsAsync: async () => {
    try {
      if (AudioModule?.getPermissionsAsync && Platform.OS !== "web") {
        return await AudioModule.getPermissionsAsync();
      }
    } catch (e) {
      // Safe fallback
    }
    return Promise.resolve({ status: "granted", granted: true, expires: "never", canAskAgain: true });
  },
  isAvailable: !!AudioModule && Platform.OS !== "web",
};

export namespace SafeAudio {
  export type Sound = FallbackSound | any;
  export type Recording = FallbackRecording | any;
}

export const SafeSound = SafeAudio.Sound;
export const SafeRecording = SafeAudio.Recording;
