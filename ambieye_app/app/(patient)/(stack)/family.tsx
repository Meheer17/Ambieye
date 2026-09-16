import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  familyService,
  FamilyMember,
  RecentCall,
} from "@/services/family";
import { callService } from "@/services/family/callService";
import { IncomingCallModal } from "@/components/family/IncomingCallModal";
import { IncomingCallPayload } from "@/services/family/callSignalingService";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const { width } = Dimensions.get("window");

export default function PatientFamilyScreen() {
  const router = useRouter();
  const { currentLang } = useTranslation();

  // ── State ──────────────────────────────────────────────────────────────────
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Incoming Call Listener ──────────────────────────────────────────────────
  useEffect(() => {
    const unsub = callService.onIncomingCall((incoming) => {
      setIncomingCall(incoming);
    });
    return unsub;
  }, []);

  // ── Load Data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [members, calls] = await Promise.all([
        familyService.getFamilyMembers(),
        familyService.getRecentCalls(),
      ]);
      setFamilyMembers(members);
      setRecentCalls(calls);
    } catch (err: any) {
      setError(err?.message || "Failed to load family members");
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [fadeAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Localized Helpers ──────────────────────────────────────────────────────
  const getRelation = (member: FamilyMember) => {
    if (currentLang === "as") return member.relationshipAs || member.relationship;
    if (currentLang === "hi") return member.relationshipHi || member.relationship;
    return member.relationship;
  };

  const getRoleBadge = (member: FamilyMember) => {
    if (currentLang === "as") return member.roleBadgeAs || member.roleBadge;
    if (currentLang === "hi") return member.roleBadgeHi || member.roleBadge;
    return member.roleBadge;
  };

  const getStatusText = (member: FamilyMember) => {
    if (currentLang === "as") return member.statusTextAs || member.statusText;
    if (currentLang === "hi") return member.statusTextHi || member.statusText;
    return member.statusText;
  };

  const getLocationText = (member: FamilyMember) => {
    if (currentLang === "as") return member.locationAs || member.location;
    if (currentLang === "hi") return member.locationHi || member.location;
    return member.location;
  };

  // ── Call Handlers ──────────────────────────────────────────────────────────
  const handleStartCall = (member: FamilyMember, callType: "audio" | "video") => {
    const callText =
      callType === "video"
        ? currentLang === "as"
          ? `${member.name} লৈ ভিডিঅ' কল লাইন প্ৰস্তুত কৰা হৈছে...`
          : currentLang === "hi"
          ? `${member.name} के लिए वीडियो कॉल लाइन तैयार की जा रही है...`
          : `Preparing video line for ${member.name}...`
        : currentLang === "as"
        ? `${member.name} লৈ ফোন কৰা হৈছে...`
        : currentLang === "hi"
        ? `${member.name} को फोन मिलाया जा रहा है...`
        : `Calling ${member.name}...`;

    VoiceAssistant.speak(callText, currentLang);

    router.push({
      pathname: "/(patient)/(stack)/call",
      params: {
        contactId: member.id,
        contactName: member.name,
        contactAvatar: member.avatarEmoji,
        contactRelation: getRelation(member),
        callType: callType,
        initiator: "patient",
      },
    });
  };

  const handleAcceptIncomingCall = (incoming: IncomingCallPayload) => {
    setIncomingCall(null);
    router.push({
      pathname: "/(patient)/(stack)/call",
      params: {
        callId: incoming.callId,
        contactId: incoming.callerId,
        contactName: incoming.callerName,
        contactAvatar: "👤",
        contactRelation: "Family Member",
        callType: incoming.callType,
        initiator: "family",
      },
    });
  };

  const handleDeclineIncomingCall = (incoming: IncomingCallPayload) => {
    callService.declineCall(incoming.callId, "mahi", incoming.callerId);
    setIncomingCall(null);
  };

  const handleNativeDialDirect = (phone: string) => {
    const cleanPhone = phone.replace(/[\s\-()]/g, "");
    if (Platform.OS !== "web") {
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const updated = await familyService.toggleFavorite(id);
    setFamilyMembers(updated);
  };

  const handleVoiceHeader = () => {
    const headerMsg =
      currentLang === "as"
        ? "আপোনাৰ পৰিয়াল আৰু আপোন মানুহ। ভিডিঅ' কল বা ফোন কৰিবলৈ বুটামত চপক।"
        : currentLang === "hi"
        ? "आपका परिवार। वीडियो कॉल या फोन करने के लिए बटन दबाएं।"
        : "Your Family Hub. Tap Video Call or Audio Call to connect with your loved ones.";
    VoiceAssistant.speak(headerMsg, currentLang);
  };

  // ── Filter Favorites & All ─────────────────────────────────────────────────
  const favoriteMembers = familyMembers.filter((m) => m.isFavorite);
  const otherMembers = familyMembers.filter((m) => !m.isFavorite);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4899" />
          <Text style={styles.loadingText}>
            {currentLang === "as" ? "পৰিয়ালৰ তালিকা খোলা হৈছে..." : "Loading Family Hub..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && familyMembers.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>
            {currentLang === "as" ? "সংযোগত সমস্যা হৈছে" : "Connection Issue"}
          </Text>
          <Text style={styles.errorDesc}>
            {currentLang === "as"
              ? "পৰিয়ালৰ তালিকা লোড কৰিব পৰা নগ'ল। পুনৰ চেষ্টা কৰক।"
              : "Could not load family members from the server. Please try again."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadData}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Retry Loading Family"
          >
            <Feather name="refresh-cw" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>
              {currentLang === "as" ? "পুনৰ চেষ্টা কৰক" : "Retry"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ── 1. HEADER ─────────────────────────────────────────────────────── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.navTitle}>
              {currentLang === "as"
                ? "পৰিয়াল ❤️"
                : currentLang === "hi"
                ? "परिवार ❤️"
                : "Family ❤️"}
            </Text>
          </View>
          <Text style={styles.navSubtitle}>
            {currentLang === "as"
              ? "আপোন মানুহৰ লগত আনন্দৰে কথা পাতক"
              : currentLang === "hi"
              ? "अपनों के साथ हमेशा जुड़े रहें"
              : "Stay close to the people you love"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.voiceHelpButton}
          onPress={handleVoiceHeader}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Listen to Instructions"
        >
          <Feather name="volume-2" size={22} color="#EC4899" />
        </TouchableOpacity>
      </View>

      {/* ── MAIN SCROLL CONTENT ───────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
          {/* Welcome Soft Banner */}
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeIconBox}>
              <Text style={styles.welcomeEmoji}>🏡</Text>
            </View>
            <View style={styles.welcomeTextBox}>
              <Text style={styles.welcomeTitle}>
                {currentLang === "as"
                  ? "ঘৰৰ আপোন মানুহৰ কোঠা"
                  : currentLang === "hi"
                  ? "घर के अपनों का कोना"
                  : "Family & Loved Ones Hub"}
              </Text>
              <Text style={styles.welcomeDesc}>
                {currentLang === "as"
                  ? "১-টেপ ভিডিঅ' কল আৰু স্পষ্ট ফোন সংযোগ"
                  : currentLang === "hi"
                  ? "1-टैप वीडियो कॉल और सहज बातचीत"
                  : "1-Tap video and audio calls with familiar faces"}
              </Text>
            </View>
          </View>

          {/* ── 2. FAVORITE FAMILY MEMBERS ─────────────────────────────────── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Text style={styles.sectionEmoji}>⭐</Text>
                <Text style={styles.sectionTitle}>
                  {currentLang === "as"
                    ? "প্ৰিয় পৰিয়াল সদস্য"
                    : currentLang === "hi"
                    ? "पसंदीदा सदस्य"
                    : "Favorite Family Members"}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{favoriteMembers.length}</Text>
              </View>
            </View>

            {favoriteMembers.length > 0 ? (
              <View style={styles.favoritesGrid}>
                {favoriteMembers.map((member) => (
                  <View
                    key={member.id}
                    style={[
                      styles.favoriteCard,
                      { borderColor: member.borderColor, backgroundColor: "#FFFFFF" },
                    ]}
                  >
                    {/* Card Header: Avatar, Name, Favorite Star */}
                    <View style={styles.favCardTopRow}>
                      <View
                        style={[
                          styles.avatarContainer,
                          {
                            backgroundColor: member.avatarBg,
                            borderColor: member.borderColor,
                          },
                        ]}
                      >
                        <Text style={styles.avatarEmojiText}>{member.avatarEmoji}</Text>
                        <View
                          style={[
                            styles.onlineDot,
                            { backgroundColor: member.isOnline ? "#10B981" : "#94A3B8" },
                          ]}
                        />
                      </View>

                      <View style={styles.favInfoContainer}>
                        <View style={styles.favNameRow}>
                          <Text style={styles.favNameText} numberOfLines={1}>
                            {member.name}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleToggleFavorite(member.id)}
                            style={styles.starBtn}
                            activeOpacity={0.7}
                            accessibilityLabel="Toggle Favorite"
                          >
                            <Feather name="star" size={20} color="#F59E0B" fill="#F59E0B" />
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.favRelationText} numberOfLines={1}>
                          {getRelation(member)}
                        </Text>

                        <View style={styles.statusPillRow}>
                          <View
                            style={[
                              styles.statusPill,
                              {
                                backgroundColor: member.isOnline ? "#ECFDF5" : "#F1F5F9",
                                borderColor: member.isOnline ? "#A7F3D0" : "#E2E8F0",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.statusPulseDot,
                                { backgroundColor: member.isOnline ? "#10B981" : "#94A3B8" },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusPillText,
                                { color: member.isOnline ? "#065F46" : "#64748B" },
                              ]}
                              numberOfLines={1}
                            >
                              {getStatusText(member)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Role & Location Banner */}
                    <View style={styles.locationBanner}>
                      <Feather name="map-pin" size={13} color="#64748B" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {getRoleBadge(member)} · {getLocationText(member)}
                      </Text>
                    </View>

                    {/* 2 Big Touch Action Buttons: Video Call & Audio Call */}
                    <View style={styles.favActionsRow}>
                      <TouchableOpacity
                        style={styles.videoCallBtn}
                        onPress={() => handleStartCall(member, "video")}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={`Video Call ${member.name}`}
                      >
                        <Feather name="video" size={22} color="#FFFFFF" />
                        <Text style={styles.videoCallBtnText}>
                          {currentLang === "as"
                            ? "ভিডিঅ' কল"
                            : currentLang === "hi"
                            ? "वीडियो कॉल"
                            : "Video Call"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.audioCallBtn}
                        onPress={() => handleStartCall(member, "audio")}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={`Audio Call ${member.name}`}
                      >
                        <Feather name="phone" size={20} color="#0F172A" />
                        <Text style={styles.audioCallBtnText}>
                          {currentLang === "as"
                            ? "ফোন কল"
                            : currentLang === "hi"
                            ? "फोन कॉल"
                            : "Audio Call"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>⭐</Text>
                <Text style={styles.emptyTitle}>
                  {currentLang === "as" ? "কোনো প্ৰিয় সদস্য নাই" : "No Favorites Selected"}
                </Text>
                <Text style={styles.emptyDesc}>
                  {currentLang === "as"
                    ? "পৰিয়ালৰ সদস্যৰ কাষত থকা তৰা ⭐ চিহ্নত চুই ইয়াত পিন কৰক"
                    : "Tap the star ⭐ icon on any family member below to pin them here for fast 1-tap dialing."}
                </Text>
              </View>
            )}
          </View>

          {/* ── 3. ALL FAMILY MEMBERS ──────────────────────────────────────── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Text style={styles.sectionEmoji}>👨‍👩‍👧‍👦</Text>
                <Text style={styles.sectionTitle}>
                  {currentLang === "as"
                    ? "সকলো পৰিয়াল আৰু চিকিৎসক"
                    : currentLang === "hi"
                    ? "सभी सदस्य एवं चिकित्सक"
                    : "All Family Members"}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{familyMembers.length}</Text>
              </View>
            </View>

            {familyMembers.length > 0 ? (
              <View style={styles.allMembersList}>
                {familyMembers.map((member) => (
                  <View
                    key={`all-${member.id}`}
                    style={[
                      styles.memberListItem,
                      { borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
                    ]}
                  >
                    <View style={styles.memberListTopRow}>
                      <View
                        style={[
                          styles.smallAvatarBox,
                          {
                            backgroundColor: member.avatarBg,
                            borderColor: member.borderColor,
                          },
                        ]}
                      >
                        <Text style={styles.smallAvatarEmoji}>{member.avatarEmoji}</Text>
                        <View
                          style={[
                            styles.smallOnlineDot,
                            { backgroundColor: member.isOnline ? "#10B981" : "#94A3B8" },
                          ]}
                        />
                      </View>

                      <View style={styles.memberListInfo}>
                        <View style={styles.memberListNameRow}>
                          <Text style={styles.memberListName} numberOfLines={1}>
                            {member.name}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleToggleFavorite(member.id)}
                            style={styles.starBtnSmall}
                            activeOpacity={0.7}
                            accessibilityLabel="Toggle Favorite"
                          >
                            <Feather
                              name="star"
                              size={18}
                              color={member.isFavorite ? "#F59E0B" : "#CBD5E1"}
                              fill={member.isFavorite ? "#F59E0B" : "transparent"}
                            />
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.memberListRelation} numberOfLines={1}>
                          {getRelation(member)}
                        </Text>

                        <Text style={styles.memberListStatus} numberOfLines={1}>
                          {getStatusText(member)}
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons for list items */}
                    <View style={styles.memberListActionsRow}>
                      <TouchableOpacity
                        style={styles.listVideoBtn}
                        onPress={() => handleStartCall(member, "video")}
                        activeOpacity={0.8}
                      >
                        <Feather name="video" size={18} color="#059669" />
                        <Text style={styles.listVideoBtnText}>
                          {currentLang === "as" ? "ভিডিঅ'" : "Video"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.listAudioBtn}
                        onPress={() => handleStartCall(member, "audio")}
                        activeOpacity={0.8}
                      >
                        <Feather name="phone" size={18} color="#2563EB" />
                        <Text style={styles.listAudioBtnText}>
                          {currentLang === "as" ? "ফোন" : "Phone"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.listDialDirectBtn}
                        onPress={() => handleNativeDialDirect(member.phone)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="phone-outgoing" size={18} color="#64748B" />
                        <Text style={styles.listDialDirectText}>Dial</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>👨‍👩‍👧‍👦</Text>
                <Text style={styles.emptyTitle}>
                  {currentLang === "as" ? "পৰিয়ালৰ তালিকা খালী" : "No Family Members"}
                </Text>
                <Text style={styles.emptyDesc}>
                  {currentLang === "as"
                    ? "তত্বাৱধায়কে কেয়াৰগিভাৰ ডেচব'ৰ্ডৰ পৰা পৰিয়ালৰ সদস্য যোগ কৰিব পাৰিব।"
                    : "Your caregiver can configure family contacts from the Caregiver Dashboard."}
                </Text>
              </View>
            )}
          </View>

          {/* ── 4. RECENT CALLS ────────────────────────────────────────────── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Text style={styles.sectionEmoji}>🕒</Text>
                <Text style={styles.sectionTitle}>
                  {currentLang === "as"
                    ? "শেহতীয়া কলসমূহ"
                    : currentLang === "hi"
                    ? "हाल की कॉल"
                    : "Recent Calls"}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{recentCalls.length}</Text>
              </View>
            </View>

            {recentCalls.length > 0 ? (
              <View style={styles.recentCallsList}>
                {recentCalls.map((call) => {
                  const isIncoming = call.direction === "incoming";
                  const isOutgoing = call.direction === "outgoing";
                  const isMissed = call.direction === "missed";
                  const isVideo = call.callType === "video";

                  return (
                    <View key={call.id} style={styles.recentCallItem}>
                      <View style={styles.recentCallAvatarBox}>
                        <Text style={styles.recentCallAvatarEmoji}>{call.contactAvatar}</Text>
                      </View>

                      <View style={styles.recentCallInfo}>
                        <View style={styles.recentCallNameRow}>
                          <Text style={styles.recentCallName} numberOfLines={1}>
                            {call.contactName}
                          </Text>
                          <View
                            style={[
                              styles.callTypeBadge,
                              { backgroundColor: isVideo ? "#EFF6FF" : "#F0FDF4" },
                            ]}
                          >
                            <Feather
                              name={isVideo ? "video" : "phone"}
                              size={12}
                              color={isVideo ? "#2563EB" : "#16A34A"}
                            />
                            <Text
                              style={[
                                styles.callTypeBadgeText,
                                { color: isVideo ? "#1E40AF" : "#166534" },
                              ]}
                            >
                              {isVideo ? "VIDEO" : "AUDIO"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.callMetaRow}>
                          <Feather
                            name={
                              isIncoming
                                ? "arrow-down-left"
                                : isOutgoing
                                ? "arrow-up-right"
                                : "x-circle"
                            }
                            size={14}
                            color={
                              isIncoming ? "#10B981" : isOutgoing ? "#2563EB" : "#EF4444"
                            }
                          />
                          <Text
                            style={[
                              styles.callDirectionText,
                              {
                                color: isIncoming
                                  ? "#059669"
                                  : isOutgoing
                                  ? "#1D4ED8"
                                  : "#DC2626",
                              },
                            ]}
                          >
                            {isIncoming
                              ? "Incoming"
                              : isOutgoing
                              ? "Outgoing"
                              : "Missed"}
                          </Text>
                          <Text style={styles.callDotSeparator}>•</Text>
                          <Text style={styles.callTimeText}>{call.timestamp}</Text>
                        </View>
                      </View>

                      {/* Call Back Button */}
                      <TouchableOpacity
                        style={styles.callBackBtn}
                        onPress={() => {
                          const member = familyMembers.find((m) => m.id === call.contactId);
                          if (member) {
                            handleStartCall(member, call.callType);
                          } else {
                            handleNativeDialDirect(call.phone);
                          }
                        }}
                        activeOpacity={0.8}
                        accessibilityLabel={`Call back ${call.contactName}`}
                      >
                        <Feather
                          name={isVideo ? "video" : "phone-call"}
                          size={18}
                          color="#2563EB"
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📞</Text>
                <Text style={styles.emptyTitle}>
                  {currentLang === "as" ? "কোনো শেহতীয়া কল নাই" : "No Recent Calls"}
                </Text>
                <Text style={styles.emptyDesc}>
                  {currentLang === "as"
                    ? "পৰিয়ালৰ সদস্যলৈ ভিডিঅ' বা ফোন কল কৰিলে ইয়াত সময় লিপিবদ্ধ হ'ব।"
                    : "Outgoing and incoming family calls will appear here."}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── INCOMING CALL MODAL ─────────────────────────────────────────── */}
      <IncomingCallModal
        visible={!!incomingCall}
        incomingCall={incomingCall}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />
    </SafeAreaView>
  );
}

// ── Stylesheet ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748B",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  errorDesc: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EC4899",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    gap: 8,
    ...Shadows.sm,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitleContainer: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  navSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  voiceHelpButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FDF2F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FCE7F3",
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  welcomeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F2",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    gap: 14,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  welcomeIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE4E6",
  },
  welcomeEmoji: {
    fontSize: 26,
  },
  welcomeTextBox: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#9F1239",
    marginBottom: 2,
  },
  welcomeDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: "#BE123C",
    lineHeight: 18,
  },
  sectionContainer: {
    marginBottom: Spacing.xxl,
    width: "100%",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  sectionTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionEmoji: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
  favoritesGrid: {
    gap: Spacing.lg,
    width: "100%",
  },
  favoriteCard: {
    width: "100%",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 2,
    ...Shadows.md,
  },
  favCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarEmojiText: {
    fontSize: 34,
  },
  onlineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  favInfoContainer: {
    flex: 1,
  },
  favNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  favNameText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    flex: 1,
  },
  starBtn: {
    padding: 4,
  },
  favRelationText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 1,
  },
  statusPillRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  statusPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
    marginBottom: Spacing.md,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    flex: 1,
  },
  favActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  videoCallBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    gap: 8,
    ...Shadows.sm,
  },
  videoCallBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  audioCallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    gap: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  audioCallBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  allMembersList: {
    gap: Spacing.md,
    width: "100%",
  },
  memberListItem: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1.5,
    ...Shadows.sm,
  },
  memberListTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.sm,
  },
  smallAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  smallAvatarEmoji: {
    fontSize: 26,
  },
  smallOnlineDot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  memberListInfo: {
    flex: 1,
  },
  memberListNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberListName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  starBtnSmall: {
    padding: 2,
  },
  memberListRelation: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 1,
  },
  memberListStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    marginTop: 2,
  },
  memberListActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  listVideoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  listVideoBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#059669",
  },
  listAudioBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  listAudioBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
  },
  listDialDirectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  listDialDirectText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  recentCallsList: {
    gap: Spacing.sm,
    width: "100%",
  },
  recentCallItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
    ...Shadows.sm,
  },
  recentCallAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  recentCallAvatarEmoji: {
    fontSize: 22,
  },
  recentCallInfo: {
    flex: 1,
  },
  recentCallNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentCallName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  callTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  callTypeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  callMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  callDirectionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  callDotSeparator: {
    fontSize: 12,
    color: "#94A3B8",
  },
  callTimeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  callBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  emptyCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
});
