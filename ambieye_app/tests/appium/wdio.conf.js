const path = require('path');

// Determine platform from CLI arguments or environment variable
let platform = 'android';
const platformArgIndex = process.argv.indexOf('--platform');
if (platformArgIndex !== -1 && platformArgIndex + 1 < process.argv.length) {
  platform = process.argv[platformArgIndex + 1].toLowerCase();
} else if (process.env.PLATFORM) {
  platform = process.env.PLATFORM.toLowerCase();
}

const isAndroid = platform === 'android';

const androidCaps = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
  'appium:app': process.env.ANDROID_APP_PATH || path.join(__dirname, '../../android/app/build/outputs/apk/debug/app-debug.apk'),
  'appium:appPackage': 'com.meheer17.ambieye',
  'appium:appActivity': 'com.meheer17.ambieye.MainActivity',
  'appium:noReset': false,
  'appium:fullReset': false,
  'appium:newCommandTimeout': 240,
};

const iosCaps = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone Simulator',
  'appium:platformVersion': process.env.IOS_VERSION || '17.0',
  'appium:app': process.env.IOS_APP_PATH || path.join(__dirname, '../../ios/build/Build/Products/Debug-iphonesimulator/AmbiEye.app'),
  'appium:bundleId': 'com.meheer17.ambieye',
  'appium:noReset': false,
  'appium:newCommandTimeout': 240,
};

exports.config = {
  runner: 'local',
  port: parseInt(process.env.APPIUM_PORT || '4723', 10),
  hostname: process.env.APPIUM_HOST || '127.0.0.1',
  path: '/',
  specs: [
    './*.test.js'
  ],
  exclude: [],
  maxInstances: 1,
  capabilities: [isAndroid ? androidCaps : iosCaps],
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 20000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: [], // External Appium server is expected to be running
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000 // 2 minutes
  },
};
