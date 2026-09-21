/**
 * utils/accessibilityStorage.ts
 * Global Accessibility Preferences Manager
 * Supports Text Size Scaling, High Contrast, Reduce Motion, and Voice Assist.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TextSizeOption = "small" | "normal" | "large" | "xlarge";

export interface AccessibilitySettings {
  textSize: TextSizeOption;
  highContrast: boolean;
  reduceMotion: boolean;
  voiceAssistEnabled: boolean;
}

const STORAGE_KEY = "ambieye_accessibility_settings";

const DEFAULT_SETTINGS: AccessibilitySettings = {
  textSize: "normal",
  highContrast: false,
  reduceMotion: false,
  voiceAssistEnabled: true,
};

export const accessibilityStorage = {
  async getSettings(): Promise<AccessibilitySettings> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(partial: Partial<AccessibilitySettings>): Promise<AccessibilitySettings> {
    const current = await accessibilityStorage.getSettings();
    const updated = { ...current, ...partial };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  getFontScale(size: TextSizeOption): number {
    switch (size) {
      case "small":
        return 0.9;
      case "normal":
        return 1.0;
      case "large":
        return 1.2;
      case "xlarge":
        return 1.4;
    }
  },
};
