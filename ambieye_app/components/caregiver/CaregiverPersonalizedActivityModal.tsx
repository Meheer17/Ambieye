import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { SafeAudio, SafeRecording } from "../../utils/safeAudio";
import { personalizedActivityService } from "../../services/personalizedActivity/personalizedActivityService";
import { API_CONFIG } from "../../services/api/config";
import {
  ActivityMediaType,
  ActivityCategory,
  ActivityOption,
} from "../../types/personalizedActivity";
import { CalmPalette, WarmPalette } from "../../constants/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  elderName?: string;
  onActivityCreated?: () => void;
  initialMediaType?: ActivityMediaType;
  initialPreset?: "family" | "voice" | "place" | "dish" | null;
}

export const CaregiverPersonalizedActivityModal: React.FC<Props> = ({
  visible,
  onClose,
  elderName = "Lakshmi",
  onActivityCreated,
  initialMediaType = "photo",
  initialPreset = null,
}) => {
  // Step 1 = Media & Question | Step 2 = Choices & Send
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [selectedMediaType, setSelectedMediaType] = useState<ActivityMediaType>(initialMediaType);
  const [category, setCategory] = useState<ActivityCategory>("people");
  const [promptQuestion, setPromptQuestion] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [hintText, setHintText] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Real-Time Transmission State
  const [transmitProgress, setTransmitProgress] = useState(0);
  const [transmitStage, setTransmitStage] = useState("");

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<any>(null);

  // Dynamic Options (2 to 4 items)
  const [options, setOptions] = useState<ActivityOption[]>([
    { id: "1", text: "Priya (Granddaughter)", emoji: "👧", subtitle: "Correct Choice", isCorrect: true },
    { id: "2", text: "Anita (Daughter)", emoji: "👩", subtitle: "Lives at home", isCorrect: false },
    { id: "3", text: "Sunita (Neighbor)", emoji: "🌸", subtitle: "Courtyard visitor", isCorrect: false },
  ]);

  // Reset or initialize on open
  useEffect(() => {
    if (visible) {
      setCurrentStep(1);
      if (initialMediaType) {
        setSelectedMediaType(initialMediaType);
      }
      if (initialPreset) {
        applyPreset(initialPreset);
      } else if (!promptQuestion) {
        applyPreset("family");
      }
    }
  }, [visible, initialMediaType, initialPreset]);

  const applyPreset = (preset: "family" | "voice" | "place" | "dish") => {
    if (preset === "family") {
      setSelectedMediaType("photo");
      setCategory("people");
      setPromptQuestion(`Who is this in the family photo?`);
      setHintText("She visited you last Sunday and brought sweets.");
      setOptions([
        { id: "1", text: "Priya (Granddaughter)", emoji: "👧", subtitle: "Correct Choice", isCorrect: true },
        { id: "2", text: "Anita (Daughter)", emoji: "👩", subtitle: "Lives at home", isCorrect: false },
        { id: "3", text: "Sunita (Neighbor)", emoji: "🌸", subtitle: "Courtyard visitor", isCorrect: false },
      ]);
    } else if (preset === "voice") {
      setSelectedMediaType("audio");
      setCategory("voice");
      setPromptQuestion(`Whose sweet voice is this speaking?`);
      setHintText("He is your grandson who loves singing folk tunes with you.");
      setOptions([
        { id: "1", text: "Aarav (Grandson)", emoji: "👦", subtitle: "Correct Choice", isCorrect: true },
        { id: "2", text: "Rajiv (Son)", emoji: "👨", subtitle: "Calling from Delhi", isCorrect: false },
        { id: "3", text: "Dr. Sharma", emoji: "🩺", subtitle: "Family doctor", isCorrect: false },
      ]);
    } else if (preset === "place") {
      setSelectedMediaType("photo");
      setCategory("places");
      setPromptQuestion(`Where was this special photo taken?`);
      setHintText("It is where you lived during childhood.");
      setOptions([
        { id: "1", text: "Ancestral Home", emoji: "🏡", subtitle: "Correct Choice", isCorrect: true },
        { id: "2", text: "Guwahati Temple", emoji: "🛕", subtitle: "Holiday visit", isCorrect: false },
        { id: "3", text: "Tea Garden", emoji: "🍃", subtitle: "Morning stroll", isCorrect: false },
      ]);
    } else if (preset === "dish") {
      setSelectedMediaType("photo");
      setCategory("objects");
      setPromptQuestion(`Which favorite traditional dish is this?`);
      setHintText("Your favorite Sunday lunch with fresh lemon.");
      setOptions([
        { id: "1", text: "Masor Tenga", emoji: "🍲", subtitle: "Correct Choice", isCorrect: true },
        { id: "2", text: "Pitha & Laru", emoji: "🥟", subtitle: "Sweet treat", isCorrect: false },
        { id: "3", text: "Payas (Kheer)", emoji: "🍚", subtitle: "Festival dessert", isCorrect: false },
      ]);
    }
  };

  // ── Media Pickers & Upload ──────────────────────────────────────────────────

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant photo gallery permission.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: selectedMediaType === "video" ? ["videos"] : ["images"],
        allowsEditing: selectedMediaType === "photo",
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingMedia(true);
        const uploaded = await personalizedActivityService.uploadMedia({
          uri: asset.uri,
          name: asset.fileName || `media_${Date.now()}.${selectedMediaType === "video" ? "mp4" : "jpg"}`,
          type: asset.mimeType || (selectedMediaType === "video" ? "video/mp4" : "image/jpeg"),
        });
        setUploadingMedia(false);
        setMediaUrl(uploaded.mediaUrl || asset.uri);
      }
    } catch (e: any) {
      setUploadingMedia(false);
      Alert.alert("Upload Notice", "Could not attach the file right now. Please try again.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant camera access.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingMedia(true);
        const uploaded = await personalizedActivityService.uploadMedia({
          uri: asset.uri,
          name: `camera_${Date.now()}.jpg`,
          type: "image/jpeg",
        });
        setUploadingMedia(false);
        setMediaUrl(uploaded.mediaUrl || asset.uri);
      }
    } catch (e: any) {
      setUploadingMedia(false);
      Alert.alert("Camera Notice", "Could not take photo right now. Please try again.");
    }
  };

  const handlePickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingMedia(true);
        const uploaded = await personalizedActivityService.uploadMedia({
          uri: asset.uri,
          name: asset.name || `audio_${Date.now()}.m4a`,
          type: asset.mimeType || "audio/m4a",
        });
        setUploadingMedia(false);
        setMediaUrl(uploaded.mediaUrl || asset.uri);
      }
    } catch (e: any) {
      setUploadingMedia(false);
      Alert.alert("Audio Notice", "Could not select audio file. Please try again.");
    }
  };

  const handleToggleVoiceRecording = async () => {
    if (isRecording) {
      try {
        if (!recordingRef.current) return;
        setIsRecording(false);
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        if (uri) {
          setUploadingMedia(true);
          const uploaded = await personalizedActivityService.uploadMedia({
            uri,
            name: `voice_note_${Date.now()}.m4a`,
            type: "audio/m4a",
          });
          setUploadingMedia(false);
          setMediaUrl(uploaded.mediaUrl || uri);
          Alert.alert("Voice Note Saved! 🎙️", "Your voice message was successfully attached.");
        }
      } catch (e: any) {
        setIsRecording(false);
        setUploadingMedia(false);
        Alert.alert("Voice Recording", "Could not finish recording. Please try again.");
      }
    } else {
      try {
        const permission = await SafeAudio.requestPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission Required", "Microphone access is needed to record.");
          return;
        }

        await SafeAudio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await SafeRecording.createAsync(
          SafeAudio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsRecording(true);
      } catch (e: any) {
        Alert.alert("Voice Recording", "Could not start microphone recording. Please try again.");
      }
    }
  };

  // ── Options Handling ────────────────────────────────────────────────────────

  const handleAddOption = () => {
    if (options.length >= 4) {
      Alert.alert("Maximum Choices", "Up to 4 choices is recommended for easy elder recognition.");
      return;
    }
    const newId = String(Date.now());
    setOptions([
      ...options,
      {
        id: newId,
        text: "",
        emoji: "🌸",
        subtitle: `Option ${options.length + 1}`,
        isCorrect: false,
      },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert("Minimum Choices", "At least 2 choices are needed for a guessing game.");
      return;
    }
    const filtered = options.filter((_, i) => i !== index);
    if (!filtered.some((o) => o.isCorrect)) {
      filtered[0].isCorrect = true;
    }
    setOptions(filtered);
  };

  const handleSetCorrectOption = (index: number) => {
    const updated = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setOptions(updated);
  };

  const handleUpdateOptionText = (index: number, text: string) => {
    const updated = [...options];
    updated[index].text = text;
    setOptions(updated);
  };

  const handleUpdateOptionSubtitle = (index: number, subtitle: string) => {
    const updated = [...options];
    updated[index].subtitle = subtitle;
    setOptions(updated);
  };

  const handleUpdateOptionEmoji = (index: number, emoji: string) => {
    const updated = [...options];
    updated[index].emoji = emoji;
    setOptions(updated);
  };

  // ── Step Navigation ─────────────────────────────────────────────────────────

  const handleGoToStep2 = () => {
    if (!mediaUrl.trim()) {
      Alert.alert("Upload Required", "Please attach a photo, voice note, or video first.");
      return;
    }
    if (!promptQuestion.trim()) {
      Alert.alert("Question Required", "Please enter what question the avatar should ask.");
      return;
    }
    setCurrentStep(2);
  };

  // ── Save & Broadcast ────────────────────────────────────────────────────────

  const handleSaveAndSend = async () => {
    const emptyOptions = options.filter((o) => !o.text.trim());
    if (emptyOptions.length > 0) {
      Alert.alert("Incomplete Choices", "Please enter names/text for all guessing choices.");
      return;
    }

    const hasCorrect = options.some((o) => o.isCorrect);
    if (!hasCorrect) {
      Alert.alert("Select Correct Answer", "Please tap the checkmark on the correct choice.");
      return;
    }

    setSubmitting(true);
    setTransmitProgress(15);
    setTransmitStage("Uploading media & challenge data...");

    try {
      await new Promise((r) => setTimeout(r, 350));
      setTransmitProgress(55);
      setTransmitStage("Sending challenge to senior's screen...");

      await personalizedActivityService.createActivity({
        patientId: "mahi",
        caregiverId: "caregiver",
        title: promptQuestion.trim(),
        promptQuestion: promptQuestion.trim(),
        mediaType: selectedMediaType,
        mediaUrl: mediaUrl.trim(),
        hintText: hintText.trim(),
        category,
        options: options.map((o) => ({
          ...o,
          text: o.text.trim(),
          subtitle: o.subtitle?.trim() || undefined,
        })),
      });

      setTransmitProgress(85);
      setTransmitStage("Configuring elder interactive touch buttons & voice prompt...");
      await new Promise((r) => setTimeout(r, 400));

      setTransmitProgress(100);
      setTransmitStage("Live on Senior Kiosk Screen!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      setTimeout(() => {
        setSubmitting(false);
        setTransmitProgress(0);
        setTransmitStage("");
        Alert.alert(
          "Guessing Game Sent! 🌟",
          `${elderName}'s tablet screen just displayed this challenge with voice narration.`,
          [
            {
              text: "Done",
              onPress: () => {
                setPromptQuestion("");
                setMediaUrl("");
                setHintText("");
                setCurrentStep(1);
                onClose();
                if (onActivityCreated) onActivityCreated();
              },
            },
          ]
        );
      }, 500);
    } catch (e: any) {
      setSubmitting(false);
      setTransmitProgress(0);
      setTransmitStage("");
      Alert.alert("Notice", "Could not send challenge right now. Please check connection and try again.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.headerStepPill}>
                <Text style={styles.headerStepPillText}>
                  {currentStep === 1 ? "STEP 1 OF 2 · MEDIA & QUESTION" : "STEP 2 OF 2 · GUESSING CHOICES"}
                </Text>
              </View>
              <Text style={styles.modalTitle}>
                {currentStep === 1 ? "Create Guessing Game" : "Set Elder's Choices"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={{ paddingBottom: 35 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ══════════════════════════════════════════════════════════════
                STEP 1: UPLOAD MEDIA & QUESTION
            ══════════════════════════════════════════════════════════════ */}
            {currentStep === 1 && (
              <View>
                {/* 1. Media Upload Card */}
                <Text style={styles.fieldLabel}>Attach Photo, Voice, or Video</Text>

                {/* If media is attached, show elegant preview */}
                {mediaUrl ? (
                  <View style={styles.mediaAttachedCard}>
                    {selectedMediaType === "photo" ? (
                      <Image source={{ uri: mediaUrl }} style={styles.mediaPreviewThumb} resizeMode="cover" />
                    ) : (
                      <View style={styles.mediaPreviewAudioBox}>
                        <Feather
                          name={selectedMediaType === "audio" ? "mic" : "video"}
                          size={28}
                          color={selectedMediaType === "audio" ? "#E11D48" : "#7C3AED"}
                        />
                      </View>
                    )}

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.mediaAttachedTitle}>
                        {selectedMediaType === "photo"
                          ? "Photo Attached"
                          : selectedMediaType === "audio"
                          ? "Voice Note Attached"
                          : "Video Clip Attached"}
                      </Text>
                      <Text style={styles.mediaAttachedSub} numberOfLines={1}>
                        Ready for {elderName}'s screen
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.changeMediaBtn}
                      onPress={() => setMediaUrl("")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.changeMediaBtnText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* 3 Big Visual Upload Cards */
                  <View style={styles.mediaPickerRow}>
                    <TouchableOpacity
                      style={[
                        styles.bigMediaTile,
                        selectedMediaType === "photo" && styles.bigMediaTileActive,
                      ]}
                      onPress={() => {
                        setSelectedMediaType("photo");
                        handlePickFromGallery();
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.bigMediaIconBg, { backgroundColor: "#EFF6FF" }]}>
                        <Feather name="image" size={24} color="#2563EB" />
                      </View>
                      <Text style={styles.bigMediaTitle}>Choose Photo</Text>
                      <Text style={styles.bigMediaSub}>Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.bigMediaTile}
                      onPress={() => {
                        setSelectedMediaType("photo");
                        handleTakePhoto();
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.bigMediaIconBg, { backgroundColor: "#F0FDF4" }]}>
                        <Feather name="camera" size={24} color="#16A34A" />
                      </View>
                      <Text style={styles.bigMediaTitle}>Take Photo</Text>
                      <Text style={styles.bigMediaSub}>Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.bigMediaTile,
                        isRecording && { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
                      ]}
                      onPress={() => {
                        setSelectedMediaType("audio");
                        handleToggleVoiceRecording();
                      }}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.bigMediaIconBg,
                          { backgroundColor: isRecording ? "#FEE2E2" : "#FFF1F2" },
                        ]}
                      >
                        <Feather
                          name={isRecording ? "stop-circle" : "mic"}
                          size={24}
                          color={isRecording ? "#DC2626" : "#E11D48"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.bigMediaTitle,
                          isRecording && { color: "#DC2626" },
                        ]}
                      >
                        {isRecording ? "Stop & Save" : "Record Voice"}
                      </Text>
                      <Text style={styles.bigMediaSub}>
                        {isRecording ? "Recording..." : "Microphone"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {uploadingMedia && (
                  <View style={styles.uploadingNotice}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.uploadingNoticeText}>Processing media file...</Text>
                  </View>
                )}

                {/* 2. Question Field */}
                <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
                  Question for {elderName}
                </Text>

                <TextInput
                  style={styles.questionInput}
                  placeholder="e.g. Who is smiling in this picture?"
                  value={promptQuestion}
                  onChangeText={setPromptQuestion}
                  placeholderTextColor="#94A3B8"
                  multiline
                />

                {/* Quick Question Suggestions */}
                <View style={[styles.suggestionsRow, { marginTop: 8 }]}>
                  <TouchableOpacity
                    style={styles.suggestionChip}
                    onPress={() => applyPreset("family")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.suggestionChipText}>Who is this?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.suggestionChip}
                    onPress={() => applyPreset("voice")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.suggestionChipText}>Whose voice is this?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.suggestionChip}
                    onPress={() => applyPreset("place")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.suggestionChipText}>Where was this?</Text>
                  </TouchableOpacity>
                </View>

                {/* Optional Clue */}
                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                  Gentle Clue (Optional)
                </Text>
                <TextInput
                  style={styles.hintInput}
                  placeholder="e.g. She visited you last Sunday"
                  value={hintText}
                  onChangeText={setHintText}
                  placeholderTextColor="#94A3B8"
                />

                {/* Continue to Step 2 Button */}
                <TouchableOpacity
                  style={styles.nextStepBtn}
                  onPress={handleGoToStep2}
                  activeOpacity={0.85}
                >
                  <Text style={styles.nextStepBtnText}>Next: Set Choices</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STEP 2: GUESSING CHOICES & BROADCAST
            ══════════════════════════════════════════════════════════════ */}
            {currentStep === 2 && (
              <View>
                {/* Summary Pill of Question */}
                <View style={styles.step2SummaryBox}>
                  <Feather name="help-circle" size={16} color="#2563EB" />
                  <Text style={styles.step2SummaryText} numberOfLines={2}>
                    "{promptQuestion}"
                  </Text>
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.fieldLabel}>
                    Choices ({options.length})
                  </Text>
                  {options.length < 4 && (
                    <TouchableOpacity
                      style={styles.addChoicePill}
                      onPress={handleAddOption}
                      activeOpacity={0.8}
                    >
                      <Feather name="plus" size={13} color="#2563EB" />
                      <Text style={styles.addChoicePillText}>Add Choice</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {options.map((opt, idx) => (
                  <View
                    key={opt.id || idx}
                    style={[
                      styles.choiceCard,
                      opt.isCorrect && styles.choiceCardCorrect,
                    ]}
                  >
                    <View style={styles.choiceCardTopRow}>
                      <TouchableOpacity
                        style={[
                          styles.correctRadioBtn,
                          opt.isCorrect && styles.correctRadioBtnActive,
                        ]}
                        onPress={() => handleSetCorrectOption(idx)}
                        activeOpacity={0.8}
                      >
                        {opt.isCorrect ? (
                          <Feather name="check" size={13} color="#FFFFFF" />
                        ) : (
                          <View style={styles.correctRadioInner} />
                        )}
                      </TouchableOpacity>

                      <Text style={styles.choiceIndexTitle}>
                        Choice {idx + 1}
                        {opt.isCorrect && (
                          <Text style={{ color: "#16A34A", fontWeight: "700" }}>
                            {" "}• Correct
                          </Text>
                        )}
                      </Text>

                      {options.length > 2 && (
                        <TouchableOpacity
                          onPress={() => handleRemoveOption(idx)}
                          style={{ padding: 4 }}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={14} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.choiceInputRow}>
                      <TextInput
                        style={styles.choiceEmojiInput}
                        value={opt.emoji || "👤"}
                        onChangeText={(t) => handleUpdateOptionEmoji(idx, t)}
                      />
                      <TextInput
                        style={styles.choiceTextInput}
                        placeholder={`Name or answer (e.g. ${
                          idx === 0 ? "Granddaughter Priya" : idx === 1 ? "Daughter Anita" : "Neighbor"
                        })`}
                        value={opt.text}
                        onChangeText={(t) => handleUpdateOptionText(idx, t)}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <TextInput
                      style={styles.choiceSubtitleInput}
                      placeholder="Short clue (e.g. Eldest Granddaughter)"
                      value={opt.subtitle || ""}
                      onChangeText={(t) => handleUpdateOptionSubtitle(idx, t)}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                ))}

                {/* Real-Time Transmission Indicator */}
                {submitting && (
                  <View style={styles.transmitProgressBox}>
                    <View style={styles.transmitHeader}>
                      <Text style={styles.transmitTitle}>⚡ Broadcasting to Senior Tablet Kiosk</Text>
                      <Text style={styles.transmitPct}>{transmitProgress}%</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${transmitProgress}%` }]} />
                    </View>
                    <Text style={styles.transmitStageText}>{transmitStage}</Text>
                  </View>
                )}

                {/* Footer Buttons */}
                <View style={styles.step2FooterRow}>
                  <TouchableOpacity
                    style={styles.backStepBtn}
                    onPress={() => setCurrentStep(1)}
                    activeOpacity={0.7}
                    disabled={submitting}
                  >
                    <Feather name="arrow-left" size={15} color="#475569" />
                    <Text style={styles.backStepBtnText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sendChallengeBtn,
                      submitting && { opacity: 0.7 },
                    ]}
                    onPress={handleSaveAndSend}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    <Feather name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.sendChallengeBtnText}>
                      {submitting ? "Transmitting..." : "Send Live to Tablet"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerStepPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  headerStepPillText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 0.6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  mediaPickerRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  bigMediaTile: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  bigMediaTileActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  bigMediaIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  bigMediaTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  bigMediaSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  mediaAttachedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  mediaPreviewThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  mediaPreviewAudioBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaAttachedTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#166534",
  },
  mediaAttachedSub: {
    fontSize: 11.5,
    color: "#475569",
    marginTop: 2,
  },
  changeMediaBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  changeMediaBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#166534",
  },
  uploadingNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    marginBottom: 8,
  },
  uploadingNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  questionInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    color: "#0F172A",
    minHeight: 65,
    textAlignVertical: "top",
  },
  suggestionTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  suggestionChip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E40AF",
  },
  hintInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  nextStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CalmPalette.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 22,
    shadowColor: CalmPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  nextStepBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Step 2 Styles
  step2SummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  step2SummaryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
    fontStyle: "italic",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addChoicePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addChoicePillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  choicesHelpText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
    marginTop: 2,
  },
  choiceCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  choiceCardCorrect: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  choiceCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  correctRadioBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  correctRadioBtnActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  correctRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "transparent",
  },
  choiceIndexTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    marginLeft: 8,
  },
  choiceInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  choiceEmojiInput: {
    width: 44,
    height: 42,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    fontSize: 20,
    textAlign: "center",
  },
  choiceTextInput: {
    flex: 1,
    marginLeft: 8,
    height: 42,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13.5,
    color: "#0F172A",
  },
  choiceSubtitleInput: {
    height: 36,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: "#475569",
  },
  transmitProgressBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    padding: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  transmitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  transmitTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E40AF",
  },
  transmitPct: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: "#DBEAFE",
    borderRadius: 2.5,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 2.5,
  },
  transmitStageText: {
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: "600",
  },
  step2FooterRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  backStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
  },
  backStepBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#475569",
  },
  sendChallengeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CalmPalette.primary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: CalmPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  sendChallengeBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
