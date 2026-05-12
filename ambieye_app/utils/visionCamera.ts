type VisionCameraModule = typeof import("react-native-vision-camera");

let cachedModule: VisionCameraModule | null | undefined;

export function getVisionCameraModule(): VisionCameraModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require("react-native-vision-camera");
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}

export function isVisionCameraAvailable(): boolean {
  return getVisionCameraModule() !== null;
}
