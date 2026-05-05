import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import Feather from "@expo/vector-icons/Feather";
import { Colors, BorderRadius, Shadows } from "@/constants/theme";

const { width } = Dimensions.get("window");

export default function UserTypeScreen() {
  const { setSelectedUserType } = useAuth();

  const handleUserTypeSelection = (type: "doctor" | "patient") => {
    setSelectedUserType(type);
    router.push("/auth/login");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Background decorations */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
            />
          </View>
          <View>
            <Text style={styles.appName}>AmbiEye</Text>
            <Text style={styles.tagline}>Vision Therapy Platform</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Choose your role</Text>
        <Text style={styles.subtitle}>
          Select how you'll be using AmbiEye to get the right experience
        </Text>

        {/* Doctor Card */}
        <TouchableOpacity
          style={[styles.card, styles.doctorCard]}
          onPress={() => handleUserTypeSelection("doctor")}
          activeOpacity={0.9}
        >
          <View style={styles.cardInner}>
            <View style={[styles.cardIconBg, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
              <Feather name="activity" size={32} color={Colors.primary} />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Doctor</Text>
              <Text style={styles.cardDesc}>
                Manage patients, track progress, and respond to queries
              </Text>
              <View style={styles.cardFeatures}>
                <View style={styles.featureTag}>
                  <Feather name="users" size={11} color={Colors.primary} />
                  <Text style={[styles.featureText, { color: Colors.primary }]}>Patient Management</Text>
                </View>
                <View style={styles.featureTag}>
                  <Feather name="bar-chart-2" size={11} color={Colors.primary} />
                  <Text style={[styles.featureText, { color: Colors.primary }]}>Analytics</Text>
                </View>
              </View>
            </View>
            <View style={[styles.cardArrow, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
              <Feather name="arrow-right" size={18} color={Colors.primary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Patient Card */}
        <TouchableOpacity
          style={[styles.card, styles.patientCard]}
          onPress={() => handleUserTypeSelection("patient")}
          activeOpacity={0.9}
        >
          <View style={styles.cardInner}>
            <View style={[styles.cardIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Feather name="eye" size={32} color={Colors.secondary} />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Patient</Text>
              <Text style={styles.cardDesc}>
                Play vision therapy games and track your eye health journey
              </Text>
              <View style={styles.cardFeatures}>
                <View style={[styles.featureTag, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Feather name="play-circle" size={11} color={Colors.secondary} />
                  <Text style={[styles.featureText, { color: Colors.secondary }]}>12 Games</Text>
                </View>
                <View style={[styles.featureTag, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Feather name="trending-up" size={11} color={Colors.secondary} />
                  <Text style={[styles.featureText, { color: Colors.secondary }]}>Progress Tracking</Text>
                </View>
              </View>
            </View>
            <View style={[styles.cardArrow, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Feather name="arrow-right" size={18} color={Colors.secondary} />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🏥 Helping children overcome amblyopia
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  bgCircle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: Colors.primary,
    opacity: 0.07,
    top: -80,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.secondary,
    opacity: 0.07,
    bottom: 100,
    left: -60,
  },
  header: {
    paddingTop: 70,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  logo: {
    width: 34,
    height: 34,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 22,
    marginBottom: 32,
  },
  card: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  doctorCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  patientCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  cardIconBg: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFeatures: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  footer: {
    paddingBottom: 44,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.3,
  },
});
