import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WarmPalette } from "../../constants/theme";
import { caregiverStorage, CaregiverServiceItem } from "../../utils/caregiverStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
  elderName: string;
}

export const CaregiverServicesModal: React.FC<Props> = ({ visible, onClose, elderName }) => {
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<CaregiverServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<CaregiverServiceItem | null>(null);
  const [requestConfirmed, setRequestConfirmed] = useState(false);

  React.useEffect(() => {
    if (visible) {
      loadServices();
      setRequestConfirmed(false);
      setSelectedService(null);
    }
  }, [visible]);

  const loadServices = async () => {
    const list = await caregiverStorage.getServices();
    setServices(list);
  };

  const handleRequestService = (item: CaregiverServiceItem) => {
    setSelectedService(item);
    Alert.alert(
      `Request ${item.title}?`,
      `Would you like to request ${item.provider} for ${elderName}? They will contact Anita (Primary Caregiver) directly within 30 minutes.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Request",
          onPress: () => {
            setRequestConfirmed(true);
            setTimeout(() => {
              setRequestConfirmed(false);
              onClose();
            }, 1800);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Home & Care Services</Text>
              <Text style={styles.headerSubtitle}>
                "What kind of help does {elderName} need today?"
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={WarmPalette.charcoalWarm} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {requestConfirmed ? (
              <View style={styles.confirmationCard}>
                <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
                <Text style={styles.confirmTitle}>Service Requested!</Text>
                <Text style={styles.confirmSub}>
                  {selectedService?.provider} has been notified. The coordinator will call you shortly to confirm timing and safety precautions.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionHeader}>VERIFIED ELDERCARE SERVICES</Text>
                <View style={styles.servicesGrid}>
                  {services.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.serviceCard}
                      onPress={() => handleRequestService(item)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.serviceIconCircle}>
                        <Ionicons name={item.icon as any} size={22} color={WarmPalette.roseDusty} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.serviceTitle}>{item.title}</Text>
                        <Text style={styles.serviceDesc}>{item.description}</Text>
                        <View style={styles.serviceMetaRow}>
                          <Text style={styles.servicePrice}>{item.priceGuide}</Text>
                          <Text style={styles.serviceProvider}>• {item.provider}</Text>
                        </View>
                      </View>
                      <View style={styles.requestPill}>
                        <Text style={styles.requestPillText}>Request</Text>
                        <Ionicons name="chevron-forward" size={14} color={WarmPalette.roseDusty} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(40, 37, 36, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: WarmPalette.ivory,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  headerSubtitle: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "99",
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WarmPalette.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm + "90",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  servicesGrid: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  serviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  serviceDesc: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 2,
    lineHeight: 16,
  },
  serviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  servicePrice: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.sageWarm,
  },
  serviceProvider: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "70",
  },
  requestPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.peach,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 2,
  },
  requestPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.roseDusty,
  },
  confirmationCard: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    marginTop: 14,
  },
  confirmSub: {
    fontSize: 14,
    color: WarmPalette.charcoalWarm + "90",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
