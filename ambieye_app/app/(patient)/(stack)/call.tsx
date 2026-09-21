import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { AestheticTheme, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const { width } = Dimensions.get("window");

export default function ActiveCallScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { currentLang } = useTranslation();
  const params = useLocalSearchParams<{
    contactId?: string;
    contactName?: string;
    contactAvatar?: string;
    contactRelationship?: string;
    contactRelation?: string;
    callType?: "audio" | "video";
    phone?: string;
    initiator?: string;
    incoming?: string;
  }>();

  const contactName = params.contactName || "Family Member / Doctor";
  const contactAvatar = params.contactAvatar || "👤";
  const contactRelationship =
    params.contactRelationship || params.contactRelation || "Care Circle Contact";
  const rawPhone = params.phone || "+91 98765 43210";
  const cleanPhone = rawPhone.replace(/[\s\-()]/g, "");

  const [hasDialed, setHasDialed] = useState(false);

  // Automatically trigger native dialer on mount
  useEffect(() => {
    const dialMessage =
      currentLang === "as"
        ? `${contactName} লৈ অফিচিয়েল ফোন কল সংযোগ কৰা হৈছে...`
        : currentLang === "hi"
        ? `${contactName} को ऑफिशियल फोन कॉल से जोड़ा जा रहा है...`
        : `Redirecting to official phone call for ${contactName}...`;

    VoiceAssistant.speak(dialMessage, currentLang);

    if (Platform.OS !== "web") {
      Linking.openURL(`tel:${cleanPhone}`)
        .then(() => setHasDialed(true))
        .catch(() => {
          Alert.alert("Official Phone Line", `Please dial directly: ${rawPhone}`);
        });
    } else {
      setHasDialed(true);
    }

    return () => {
      VoiceAssistant.stop();
    };
  }, [cleanPhone, contactName, currentLang, rawPhone]);

  // Hide bottom tab bar while on call screen
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: "none" },
      });
    }
    return () => {
      if (parent) {
        parent.setOptions({
          tabBarStyle: undefined,
        });
      }
    };
  }, [navigation]);

  const handleManualRedial = () => {
    if (Platform.OS !== "web") {
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        Alert.alert("Official Phone Line", `Please dial: ${rawPhone}`);
      });
    } else {
      Alert.alert(
        "Official Phone Line",
        `Due to medical app regulations, please dial ${contactName} at: ${rawPhone}`
      );
    }
  };

  const handleReturn = () => {
    VoiceAssistant.stop();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(patient)");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Ambient background auras */}
      <View style={styles.ambientAuraTop} pointerEvents="none" />
      <View style={styles.ambientAuraBottom} pointerEvents="none" />

      {/* Top Header / Compliance Banner */}
      <View style={styles.topBar}>
        <View style={styles.secureBadge}>
          <Feather name="shield" size={14} color="#059669" />
          <Text style={styles.secureBadgeText}>
            {currentLang === "as"
              ? "নিয়ম অনুসৰি অফিচিয়েল ফোনলৈ স্থানান্তৰিত"
              : currentLang === "hi"
              ? "नियमों के अनुसार ऑफिशियल फोन पर रीडायरेक्टेड"
              : "Official Phone Redirect Active"}
          </Text>
        </View>
      </View>

      {/* Main Card */}
      <View style={styles.centerCardContainer}>
        <View style={styles.callCard}>
          {/* Avatar */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{contactAvatar}</Text>
          </View>

          {/* Contact Details */}
          <Text style={styles.contactNameText}>{contactName}</Text>
          <Text style={styles.contactRelationText}>{contactRelationship}</Text>

          {/* Phone Display Box */}
          <View style={styles.phoneBox}>
            <Feather name="phone" size={18} color="#0284C7" />
            <Text style={styles.phoneNumberText}>{rawPhone}</Text>
          </View>

          {/* Status Note */}
          <View style={styles.statusPill}>
            <View style={styles.activeDot} />
            <Text style={styles.statusText}>
              {currentLang === "as"
                ? "ডিভাইছৰ অফিচিয়েল ফোন কলৰ সৈতে সংযুক্ত"
                : currentLang === "hi"
                ? "डिवाइस के ऑफिशियल फोन से जुड़ा हुआ"
                : "Connected via Device Official Phone"}
            </Text>
          </View>

          {/* Compliance & Rules Explanatory Box */}
          <View style={styles.complianceBox}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#475569" />
            <Text style={styles.complianceText}>
              {currentLang === "as"
                ? "চিকিৎসা আৰু ব্যক্তিগত গোপনীয়তাৰ নিয়ম অনুসৰি, এপৰ ভিতৰত কল বা ভিডিঅ' কল নহয়। সকলো কল প্ৰত্যক্ষভাৱে আপোনাৰ অফিচিয়েল ফোন নম্বৰলৈ স্থানান্তৰ কৰা হয়।"
                : currentLang === "hi"
                ? "चिकित्सा और गोपनीयता नियमों के तहत, ऐप के अंदर कॉल या वीडियो कॉल की अनुमति नहीं है। सभी कॉल सीधे आपके ऑफिशियल फोन नेटवर्क पर रीडायरेक्ट की जाती हैं।"
                : "Due to tele-consultation and privacy compliance rules, calling is not hosted inside the app. All communications are securely placed via your device's official external phone dialer."}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Action Deck */}
      <View style={styles.bottomDeck}>
        {/* Redial Button */}
        <TouchableOpacity
          style={styles.redialButton}
          onPress={handleManualRedial}
          activeOpacity={0.85}
        >
          <Feather name="phone-call" size={20} color="#FFFFFF" />
          <Text style={styles.redialButtonText}>
            {currentLang === "as"
              ? "পুনৰ অফিচিয়েল কল কৰক"
              : currentLang === "hi"
              ? "दोबारा ऑफिशियल फोन मिलाएं"
              : "Redial on Official Phone"}
          </Text>
        </TouchableOpacity>

        {/* Return Button */}
        <TouchableOpacity
          style={styles.returnButton}
          onPress={handleReturn}
          activeOpacity={0.85}
        >
          <Feather name="arrow-left" size={18} color="#334155" />
          <Text style={styles.returnButtonText}>
            {currentLang === "as"
              ? "ডেশ্ববৰ্ডলৈ উভতি যাওক"
              : currentLang === "hi"
              ? "डैशबोर्ड पर वापस जाएं"
              : "Return to Dashboard"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AestheticTheme.canvas,
    position: "relative",
    justifyContent: "space-between",
  },
  ambientAuraTop: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: AestheticTheme.ambientLavender,
  },
  ambientAuraBottom: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: AestheticTheme.ambientMint,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: "center",
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  secureBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  centerCardContainer: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  callCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AestheticTheme.cardBorder,
    ...AestheticTheme.cardShadow,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarEmoji: {
    fontSize: 42,
  },
  contactNameText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  contactRelationText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 3,
    fontWeight: "600",
    textAlign: "center",
  },
  phoneBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 14,
  },
  phoneNumberText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0284C7",
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#0284C7",
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0284C7",
  },
  complianceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  complianceText: {
    flex: 1,
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
    fontWeight: "500",
  },
  bottomDeck: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  redialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 16,
    ...Shadows.md,
    minHeight: 52,
  },
  redialButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  returnButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AestheticTheme.cardSurface,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AestheticTheme.cardBorder,
    minHeight: 46,
  },
  returnButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
});
