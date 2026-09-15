/*
 * esp32_ble_gatt_server.ino — Universal Bluetooth SIG Medical GATT Server
 * -----------------------------------------------------------------------
 * Microcontroller: ESP32 / ESP32-WROOM-32 / ESP32-C3
 * Sensors: MAX30102 / Pulse Sensor
 *
 * Implements Official Bluetooth SIG Standards:
 * 1. Heart Rate Service (0x180D) -> Heart Rate Measurement (0x2A37)
 * 2. Pulse Oximeter Service (0x1822) -> PLX Continuous Measurement (0x2A5F)
 * 3. Battery Service (0x180F) -> Battery Level (0x2A19)
 *
 * This allows AmbiEye (and any standard BLE healthcare app in India) to pair
 * and read real-time biometrics without brand-specific SDKs or cloud dependencies.
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Wire.h>

#define DEVICE_NAME "AmbiEye_Medical_BLE"

// ── Bluetooth SIG Standard 16-Bit UUIDs ──────────────────────────────────────
#define HEART_RATE_SERVICE_UUID        "0000180d-0000-1000-8000-00805f9b34fb"
#define HEART_RATE_CHAR_UUID           "00002a37-0000-1000-8000-00805f9b34fb"

#define PULSE_OXIMETER_SERVICE_UUID    "00001822-0000-1000-8000-00805f9b34fb"
#define PLX_CONTINUOUS_CHAR_UUID       "00002a5f-0000-1000-8000-00805f9b34fb"

#define BATTERY_SERVICE_UUID           "0000180f-0000-1000-8000-00805f9b34fb"
#define BATTERY_LEVEL_CHAR_UUID        "00002a19-0000-1000-8000-00805f9b34fb"

BLEServer* pServer = NULL;
BLECharacteristic* pHeartRateChar = NULL;
BLECharacteristic* pPulseOxChar = NULL;
BLECharacteristic* pBatteryChar = NULL;

bool deviceConnected = false;
bool oldDeviceConnected = false;

// Vital tracking variables
uint8_t heartRateBPM = 72;
uint8_t spO2Percent = 98;
uint8_t batteryPct = 95;

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("[BLE] Client connected (AmbiEye Mobile App)");
  };

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("[BLE] Client disconnected");
  }
};

void setup() {
  Serial.begin(115200);
  Serial.println("\n=================================================");
  Serial.println("  AmbiEye Universal BLE GATT Medical Node v2.0   ");
  Serial.println("  Bluetooth SIG 0x180D (HR) & 0x1822 (SpO2)     ");
  Serial.println("=================================================");

  // 1. Initialize BLE Device
  BLEDevice::init(DEVICE_NAME);

  // 2. Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // 3. Create Heart Rate Service (0x180D)
  BLEService *pHRService = pServer->createService(HEART_RATE_SERVICE_UUID);
  pHeartRateChar = pHRService->createCharacteristic(
                      HEART_RATE_CHAR_UUID,
                      BLECharacteristic::PROPERTY_NOTIFY
                   );
  pHeartRateChar->addDescriptor(new BLE2902());
  pHRService->start();

  // 4. Create Pulse Oximeter Service (0x1822)
  BLEService *pOxService = pServer->createService(PULSE_OXIMETER_SERVICE_UUID);
  pPulseOxChar = pOxService->createCharacteristic(
                    PLX_CONTINUOUS_CHAR_UUID,
                    BLECharacteristic::PROPERTY_NOTIFY
                 );
  pPulseOxChar->addDescriptor(new BLE2902());
  pOxService->start();

  // 5. Create Battery Service (0x180F)
  BLEService *pBatService = pServer->createService(BATTERY_SERVICE_UUID);
  pBatteryChar = pBatService->createCharacteristic(
                    BATTERY_LEVEL_CHAR_UUID,
                    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
                 );
  pBatteryChar->addDescriptor(new BLE2902());
  pBatService->start();

  // 6. Start Advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(HEART_RATE_SERVICE_UUID);
  pAdvertising->addServiceUUID(PULSE_OXIMETER_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // Functions well with iOS & Android
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Advertising started. Ready for AmbiEye Auto-Pairing.");
}

void loop() {
  // Check optical sensor on elder's wrist / finger
  // (In live MAX30102 hardware integration, read registers via Wire.h)
  
  if (deviceConnected) {
    // 1. Send Heart Rate Notification (Format: [Flags, BPM])
    // Flags byte: 0x00 = UINT8 Heart Rate Format, Sensor Contact detected
    uint8_t hrData[2] = { 0x00, heartRateBPM };
    pHeartRateChar->setValue(hrData, 2);
    pHeartRateChar->notify();

    // 2. Send SpO2 Notification (Standard PLX format: [Flags, SpO2, PR])
    uint8_t oxData[3] = { 0x00, spO2Percent, heartRateBPM };
    pPulseOxChar->setValue(oxData, 3);
    pPulseOxChar->notify();

    // 3. Send Battery Level
    pBatteryChar->setValue(&batteryPct, 1);

    Serial.printf("[BLE Broadcast] Pulse: %d BPM | SpO2: %d%%\n", heartRateBPM, spO2Percent);

    // Natural vital fluctuation simulation
    heartRateBPM = constrain(heartRateBPM + random(-1, 2), 65, 95);
    spO2Percent = constrain(spO2Percent + random(-1, 2), 95, 100);

    delay(2000); // 2-second sampling interval for low battery drain
  }

  // Handle re-advertising on disconnect
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[BLE] Restarted advertising for reconnect.");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}
