import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { bleHeartRateService, BleDiscoveredDevice } from "../../services/hardware/bleHeartRateService";
import { WarmPalette } from "../../constants/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const CaregiverBleScannerModal: React.FC<Props> = ({ visible, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BleDiscoveredDevice | null>(null);
  const [livePulse, setLivePulse] = useState<number | null>(null);
  const [liveSpO2, setLiveSpO2] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const unsubscribe = bleHeartRateService.subscribe((status) => {
      setScanning(status.scanning);
      setConnectedDevice(status.connectedDevice);
      setLivePulse(status.lastHeartRate);
      setLiveSpO2(status.lastSpO2);
      if (status.error) {
        setStatusMessage(status.error);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleStartScan = async () => {
    setStatusMessage("Searching for nearby Bluetooth health devices...");
    const success = await bleHeartRateService.requestDevice();
    if (success) {
      setStatusMessage("Device connected! Listening for live biometric GATT stream.");
    }
  };

  const handleDisconnect = () => {
    bleHeartRateService.disconnect();
    setStatusMessage("Device disconnected.");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <View style={styles.bluetoothIconBox}>
                <Feather name="bluetooth" size={18} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Universal BLE Health Node</Text>
                <Text style={styles.modalSubtitle}>Open GATT 0x180D (HR) & 0x1822 (SpO2)</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Status Info Banner */}
            <View style={styles.infoBanner}>
              <Feather name="shield" size={16} color="#0D9488" style={{ marginTop: 2 }} />
              <Text style={styles.infoText}>
                Connects automatically to any standard Bluetooth fingertip pulse oximeter (ASHA kit),
                smartwatch, or health band without requiring third-party cloud apps.
              </Text>
            </View>

            {/* Live Connected Device View */}
            {connectedDevice ? (
              <View style={styles.connectedCard}>
                <View style={styles.connectedHeader}>
                  <View style={styles.deviceInfoGroup}>
                    <View style={styles.connectedDot} />
                    <Text style={styles.deviceNameText}>{connectedDevice.name}</Text>
                  </View>
                  <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
                    <Text style={styles.disconnectBtnText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.liveVitalsRow}>
                  <View style={styles.vitalBox}>
                    <Feather name="heart" size={18} color="#DC2626" />
                    <Text style={styles.vitalValueText}>
                      {livePulse ? `${livePulse} BPM` : "Reading..."}
                    </Text>
                    <Text style={styles.vitalLabelText}>Live Pulse</Text>
                  </View>

                  <View style={styles.vitalBox}>
                    <Feather name="zap" size={18} color="#7C3AED" />
                    <Text style={styles.vitalValueText}>
                      {liveSpO2 ? `${liveSpO2}%` : "Reading..."}
                    </Text>
                    <Text style={styles.vitalLabelText}>Live SpO2</Text>
                  </View>
                </View>

                <Text style={styles.syncNote}>
                  Streaming live into SQLite database and Caregiver dashboard.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="radio" size={40} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Device Connected</Text>
                <Text style={styles.emptyDesc}>
                  Turn on your Bluetooth pulse oximeter clip or smartwatch with "Heart Rate Broadcast" enabled.
                </Text>
              </View>
            )}

            {/* Status Message */}
            {statusMessage ? (
              <Text style={styles.statusMessageText}>{statusMessage}</Text>
            ) : null}

            {/* Scan Action Button */}
            {!connectedDevice && (
              <TouchableOpacity
                style={[styles.scanBtn, scanning && styles.scanBtnActive]}
                onPress={handleStartScan}
                disabled={scanning}
                activeOpacity={0.8}
              >
                {scanning ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Feather name="search" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.scanBtnText}>
                  {scanning ? "Scanning for BLE Devices..." : "🔍 Scan for Nearby BLE Devices"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Compatible Standards Legend */}
            <View style={styles.standardsBox}>
              <Text style={styles.standardsTitle}>SUPPORTED OPEN PROTOCOLS:</Text>
              <View style={styles.standardPillRow}>
                <View style={styles.standardPill}>
                  <Text style={styles.standardPillText}>✓ GATT 0x180D (Heart Rate)</Text>
                </View>
                <View style={styles.standardPill}>
                  <Text style={styles.standardPillText}>✓ GATT 0x1822 (Pulse Oximeter)</Text>
                </View>
                <View style={styles.standardPill}>
                  <Text style={styles.standardPillText}>✓ ASHA Medical Clips</Text>
                </View>
                <View style={styles.standardPill}>
                  <Text style={styles.standardPillText}>✓ ESP32 Custom Nodes</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bluetoothIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    paddingVertical: 16,
    gap: 16,
  },
  infoBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F0FDFA",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#0F766E",
    lineHeight: 18,
  },
  connectedCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#10B981",
  },
  connectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  deviceInfoGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  deviceNameText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  disconnectBtn: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  disconnectBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  liveVitalsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  vitalBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  vitalValueText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  vitalLabelText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  syncNote: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
  },
  emptyDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  statusMessageText: {
    fontSize: 11.5,
    color: "#475569",
    textAlign: "center",
    fontStyle: "italic",
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  scanBtnActive: {
    backgroundColor: "#1E40AF",
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  standardsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  standardsTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  standardPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  standardPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  standardPillText: {
    fontSize: 10.5,
    color: "#334155",
    fontWeight: "600",
  },
});
