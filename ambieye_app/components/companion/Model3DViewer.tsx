import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { OLD_MAN_DATA_URI } from "@/assets/models/modelDataUri";

export type Model3DAction = "talking" | "walking" | "idle";

export interface Model3DViewerProps {
  activeAction?: Model3DAction | null;
  autoRotate?: boolean;
  height?: number;
  width?: number | string;
  cameraOrbit?: string;
  cameraTarget?: string;
  fieldOfView?: string;
  backgroundColor?: string;
  showControls?: boolean;
  onModelLoaded?: () => void;
  onActionChange?: (action: Model3DAction) => void;
  style?: StyleProp<ViewStyle>;
}

// Safely obtain native WebView on Android / iOS
let NativeWebView: any = null;
if (Platform.OS !== "web") {
  try {
    NativeWebView = require("react-native-webview").WebView;
  } catch (err) {
    console.warn("[Model3DViewer] react-native-webview could not be required:", err);
  }
}

export const Model3DViewer: React.FC<Model3DViewerProps> = ({
  activeAction = "talking",
  autoRotate = false,
  height = 280,
  width = "100%",
  cameraOrbit = "0deg 80deg 1.35m",
  cameraTarget = "0m 1.52m 0.05m",
  fieldOfView = "28deg",
  backgroundColor = "transparent",
  showControls = false,
  onModelLoaded,
  onActionChange,
  style,
}) => {
  const [currentAction, setCurrentAction] = useState<Model3DAction>(
    activeAction || "talking"
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);

  // Sync prop changes
  useEffect(() => {
    if (activeAction) {
      setCurrentAction(activeAction);
      sendAnimationMessage(activeAction);
    }
  }, [activeAction]);

  // Sync camera prop changes
  useEffect(() => {
    const msg = JSON.stringify({
      type: "SET_CAMERA",
      orbit: cameraOrbit,
      target: cameraTarget,
      fov: fieldOfView,
    });
    if (Platform.OS === "web") {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(msg, "*");
      }
    } else if (webViewRef.current) {
      webViewRef.current.postMessage(msg);
    }
  }, [cameraOrbit, cameraTarget, fieldOfView]);

  const sendAnimationMessage = (action: Model3DAction) => {
    const msg = JSON.stringify({
      type: action === "idle" ? "PAUSE_ANIMATION" : "PLAY_ANIMATION",
      name: action,
    });

    if (Platform.OS === "web") {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(msg, "*");
      }
    } else if (webViewRef.current) {
      webViewRef.current.postMessage(msg);
    }
  };

  const handleActionSelect = (action: Model3DAction) => {
    setCurrentAction(action);
    sendAnimationMessage(action);
    if (onActionChange) {
      onActionChange(action);
    }
  };

  // Determine model source:
  // On web, direct static URL or data URI; on native, data URI ensures zero sandbox/CORS issues
  const modelSrc =
    Platform.OS === "web" ? "/models/lowpoly_old_man.glb" : OLD_MAN_DATA_URI;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${backgroundColor};
      touch-action: none;
    }
    model-viewer {
      width: 100%;
      height: 100%;
      --poster-color: transparent;
      background-color: ${backgroundColor};
      outline: none;
    }
    #loader {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #6366F1;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    }
    .spinner {
      width: 26px;
      height: 26px;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366F1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>
</head>
<body>
  <div id="loader">
    <div class="spinner"></div>
    <span>Loading 3D Elder...</span>
  </div>
  <model-viewer
    id="oldManViewer"
    src="${modelSrc}"
    alt="3D Elder Companion Character"
    camera-controls
    auto-rotate="${autoRotate ? "true" : "false"}"
    rotation-per-second="12deg"
    auto-play
    animation-name="${currentAction === "idle" ? "" : currentAction}"
    shadow-intensity="1.1"
    shadow-softness="0.8"
    exposure="1.15"
    environment-image="neutral"
    camera-orbit="${cameraOrbit}"
    camera-target="${cameraTarget}"
    field-of-view="${fieldOfView}"
    min-camera-orbit="auto auto 0.6m"
    max-camera-orbit="auto auto 4.0m"
    interaction-prompt="none"
    loading="eager"
  >
  </model-viewer>
  <script>
    const viewer = document.getElementById('oldManViewer');
    const loader = document.getElementById('loader');

    function notifyParent(msg) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      } else if (window.parent && window.parent.postMessage) {
        window.parent.postMessage(JSON.stringify(msg), '*');
      }
    }

    viewer.addEventListener('load', () => {
      if (loader) loader.style.display = 'none';
      notifyParent({ type: 'LOADED', animations: viewer.availableAnimations });
      
      const desiredAnim = '${currentAction}';
      if (desiredAnim && desiredAnim !== 'idle') {
        viewer.animationName = desiredAnim;
        viewer.play();
      }
    });

    viewer.addEventListener('error', (err) => {
      if (loader) {
        loader.innerHTML = '<span style="color:#EF4444;font-size:12px;">3D Model Preview</span>';
      }
      notifyParent({ type: 'ERROR', message: String(err) });
    });

    function setAction(name) {
      if (!viewer) return;
      if (!name || name === 'idle') {
        viewer.pause();
      } else {
        viewer.animationName = name;
        viewer.play();
      }
    }

    function onMessageReceived(event) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'PLAY_ANIMATION') {
          setAction(data.name);
        } else if (data.type === 'PAUSE_ANIMATION') {
          if (viewer) viewer.pause();
        } else if (data.type === 'SET_CAMERA') {
          if (data.orbit && viewer) viewer.cameraOrbit = data.orbit;
          if (data.target && viewer) viewer.cameraTarget = data.target;
          if (data.fov && viewer) viewer.fieldOfView = data.fov;
        }
      } catch (e) {}
    }

    window.addEventListener('message', onMessageReceived);
    document.addEventListener('message', onMessageReceived);
  </script>
</body>
</html>
`;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "LOADED") {
        setIsLoaded(true);
        if (onModelLoaded) onModelLoaded();
      }
    } catch (e) {}
  };

  // Web message listener
  useEffect(() => {
    if (Platform.OS === "web") {
      const onWebMsg = (e: MessageEvent) => {
        try {
          const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
          if (data && data.type === "LOADED") {
            setIsLoaded(true);
            if (onModelLoaded) onModelLoaded();
          }
        } catch (err) {}
      };
      window.addEventListener("message", onWebMsg);
      return () => window.removeEventListener("message", onWebMsg);
    }
  }, [onModelLoaded]);

  return (
    <View style={[styles.container, { height, width: width as any }, style]}>
      {/* Loading state indicator */}
      {!isLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>Initializing 3D Companion...</Text>
        </View>
      )}

      {/* 3D Model Canvas Viewport */}
      <View style={styles.viewerWrapper}>
        {Platform.OS === "web" ? (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              backgroundColor: "transparent",
            }}
            title="3D Elder Model"
          />
        ) : NativeWebView ? (
          <NativeWebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            androidLayerType="hardware"
            androidHardwareAccelerationDisabled={false}
            scalesPageToFit={true}
            scrollEnabled={false}
            bounces={false}
            style={styles.webView}
            containerStyle={{ backgroundColor: "transparent" }}
            onMessage={handleMessage}
          />
        ) : (
          <View style={styles.fallbackBox}>
            <Text style={styles.fallbackEmoji}>🧓</Text>
            <Text style={styles.fallbackText}>3D Companion Character</Text>
          </View>
        )}
      </View>

      {/* Control Buttons (Talk / Walk / Stop) */}
      {showControls && (
        <View style={styles.controlBar}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              currentAction === "talking" && styles.actionBtnActive,
            ]}
            onPress={() => handleActionSelect("talking")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.actionBtnText,
                currentAction === "talking" && styles.actionBtnTextActive,
              ]}
            >
              🗣️ Talk
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              currentAction === "walking" && styles.actionBtnActive,
            ]}
            onPress={() => handleActionSelect("walking")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.actionBtnText,
                currentAction === "walking" && styles.actionBtnTextActive,
              ]}
            >
              🚶 Walk
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              currentAction === "idle" && styles.actionBtnActive,
            ]}
            onPress={() => handleActionSelect("idle")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.actionBtnText,
                currentAction === "idle" && styles.actionBtnTextActive,
              ]}
            >
              ⏹️ Pause
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "transparent",
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(250, 247, 253, 0.85)",
    zIndex: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
  },
  viewerWrapper: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fallbackBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAF7FD",
    gap: 8,
  },
  fallbackEmoji: {
    fontSize: 48,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F46E5",
  },
  controlBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "#EDE8F5",
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  actionBtnActive: {
    backgroundColor: "#6366F1",
    borderColor: "#4F46E5",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
  },
  actionBtnTextActive: {
    color: "#FFFFFF",
  },
});
