import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { useCameraPermissions } from "expo-camera";
import { Audio } from "expo-av";

export interface CallMediaState {
  hasCameraPermission: boolean;
  hasAudioPermission: boolean;
  isPermissionDenied: boolean;
  requestPermissions: () => Promise<boolean>;
}

export function useCallMedia(): CallMediaState {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean>(true);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);

  const setupAudioMode = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.warn("[useCallMedia] Audio mode configuration warning:", e);
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    let camGranted = true;
    let audGranted = true;

    // 1. Camera permission
    try {
      if (Platform.OS !== "web") {
        const camRes = await requestCameraPermission();
        camGranted = camRes.granted;
      }
    } catch {
      camGranted = false;
    }

    // 2. Audio / Microphone permission
    try {
      if (Platform.OS !== "web") {
        const audRes = await Audio.requestPermissionsAsync();
        audGranted = audRes.granted;
        setHasAudioPermission(audRes.granted);
      }
    } catch {
      audGranted = false;
      setHasAudioPermission(false);
    }

    const allGranted = camGranted && audGranted;
    setIsPermissionDenied(!allGranted);

    if (allGranted) {
      await setupAudioMode();
    }

    return allGranted;
  }, [requestCameraPermission, setupAudioMode]);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  return {
    hasCameraPermission: cameraPermission ? cameraPermission.granted : true,
    hasAudioPermission,
    isPermissionDenied,
    requestPermissions,
  };
}
