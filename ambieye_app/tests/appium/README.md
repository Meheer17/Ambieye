# Appium Testing for AmbiEye React Native Client

This directory contains End-to-End (E2E) mobile application testing scripts for the AmbiEye React Native app using Appium and WebdriverIO.

### Included Tests

1. **Doctor Mobile Tests (`doctor_login_mobile.test.js`)**:
   - Tests role selection, validation popup checks.
   - Logs in with doctor credentials (`mahi` / `Meheer17`), checks statistics card views on dashboard.
   - Opens settings screen, executes logout, and handles platform confirm modal dialogs.
   
2. **Patient Mobile Tests (`patient_login_mobile.test.js`)**:
   - Logs in with patient credentials (`mahit` / `Meheer17`).
   - Verifies dashboard displays game categories and reminder panels.
   - Opens Settings page, verifies account configuration, and executes logout.

## Prerequisites

1. **Node.js**: Ensure Node.js is installed.
2. **Appium Server**: Install Appium globally:
   ```bash
   npm install -g appium
   ```
3. **Appium Drivers**: Install platform-specific drivers:
   - For Android: `appium driver install uiautomator2`
   - For iOS: `appium driver install xcuitest`
4. **Android SDK & Emulator** (for Android testing):
   - Configure `$ANDROID_HOME` environment variable.
   - Start an Android Virtual Device (AVD).
5. **Xcode & iOS Simulator** (for iOS testing, macOS only).

## Setup and Installation

1. Navigate to the Appium tests directory:
   ```bash
   cd ambieye_app/tests/appium
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Tests

### 1. Build the Mobile Client

Before running tests, compile a test build of the app. From `ambieye_app` root directory:

**For Android:**
```bash
npx expo run:android
# Or compile an APK directly:
# cd android && ./gradlew assembleDebug
```
Make sure the resulting APK is located at: `ambieye_app/android/app/build/outputs/apk/debug/app-debug.apk` (or override via environment variables).

**For iOS:**
```bash
npx expo run:ios
```

### 2. Start the Appium Server

In a separate terminal window, start the Appium server:
```bash
appium
```

### 3. Execute the Tests

Ensure your emulator or simulator is active, then run:

**For Android:**
```bash
npm run test:android
```

**For iOS:**
```bash
npm run test:ios
```

### Custom Configurations

You can configure device parameters using environment variables:
```bash
ANDROID_DEVICE_NAME="Pixel_5_API_33" ANDROID_APP_PATH="/path/to/custom.apk" npm run test:android
```
