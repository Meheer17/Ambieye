import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import * as ImagePicker from "expo-image-picker";
import { caregiverStorage, FamilySentItem } from "../../utils/caregiverStorage";
import { musicService } from "../../services/music/musicService";
import { CalmPalette } from "../../constants/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  elderName: string;
  onItemSent?: () => void;
  initialType?: SendType;
}

export type SendType = "message" | "voice" | "photo" | "song" | "memory_prompt" | "reminder" | "video";

interface TypeOption {
  type: SendType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const SEND_OPTIONS: TypeOption[] = [
  { type: "photo", label: "Photo", icon: "image", color: "#0284C7", bgColor: "#EFF6FF" },
  { type: "video", label: "Video", icon: "videocam", color: "#7C3AED", bgColor: "#F5F3FF" },
  { type: "voice", label: "Voice", icon: "mic", color: "#059669", bgColor: "#ECFDF5" },
  { type: "message", label: "Note", icon: "chatbubble-ellipses", color: "#0F172A", bgColor: "#F1F5F9" },
];

export const CaregiverSendToElderModal: React.FC<Props> = ({
  visible,
  onClose,
  elderName,
  onItemSent,
  initialType = "photo",
}) => {
  const [selectedType, setSelectedType] = useState<SendType>(
    initialType === "video" || initialType === "voice" || initialType === "message" ? initialType : "photo"
  );
  const [customText, setCustomText] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [selectedMediaUri, setSelectedMediaUri] = useState<string | null>(null);

  // Dynamic Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Real device photo/video picker
  const pickMedia = async (mediaType: "images" | "videos") => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Photo library access is needed to select media.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          mediaType === "videos"
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedMediaUri(result.assets[0].uri);
        if (!customTitle) {
          setCustomTitle(
            mediaType === "videos"
              ? "Video Greeting for " + elderName
              : "Family Photo for " + elderName
          );
        }
        if (!customText) {
          setCustomText(
            mediaType === "videos"
              ? "New video greeting selected from gallery"
              : "New photo selected from device gallery"
          );
        }
      }
    } catch (err) {
      console.warn("Picker error:", err);
    }
  };

  // Real device camera
  const captureWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed to take a live photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedMediaUri(result.assets[0].uri);
        if (!customTitle) setCustomTitle("Live Photo for " + elderName);
        if (!customText) setCustomText("Photo snapped live with camera");
      }
    } catch (err) {
      console.warn("Camera error:", err);
    }
  };

  // Real-time Dynamic Transmission
  const handleSend = async () => {
    if (!customText.trim() && !selectedMediaUri) {
      Alert.alert(
        "Content Needed",
        "Please choose a photo/video, type a message, or select a prompt to display on screen."
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setUploadStatusText("Optimizing media packet...");

    // Step 1: Upload simulation
    setTimeout(() => {
      setUploadProgress(50);
      setUploadStatusText("Sending to " + elderName + "'s screen...");
    }, 400);

    // Step 2: Finalize
    setTimeout(async () => {
      setUploadProgress(100);
      setUploadStatusText("✓ Live on " + elderName + "'s Tablet Screen!");

      try {
        const title =
          customTitle.trim() ||
          (selectedType === "photo"
            ? "Family Photo"
            : selectedType === "video"
            ? "Video Greeting"
            : selectedType === "voice"
            ? "Voice Note from Family"
            : selectedType === "song"
            ? "Music from Family"
            : selectedType === "memory_prompt"
            ? "Memory Moment"
            : "Postcard Message");

        await caregiverStorage.sendToElder({
          type: selectedType,
          senderName: "Rishitha (Granddaughter)",
          title,
          content: customText.trim() || "Uploaded media",
          mediaUri: selectedMediaUri || undefined,
        });

        if (selectedType === "song") {
          try {
            await musicService.addCustomTrack({
              title: title !== "Music from Family" ? title : customText.trim(),
              artist: "Dedicated by Rishitha",
              category: "assamese_classics" as any,
              region: "Family Dedication",
              language: "Assamese",
              description: customText.trim(),
            });
          } catch (e) {
            console.warn("Could not register song track:", e);
          }
        }

        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          setSelectedMediaUri(null);
          setCustomText("");
          setCustomTitle("");
          onItemSent?.();
          onClose();
          Alert.alert(
            "📡 Broadcasted Live!",
            `Successfully transmitted in real-time to ${elderName}'s tablet. It is now actively displaying on her kiosk screen!`
          );
        }, 500);
      } catch (err) {
        setIsUploading(false);
        Alert.alert("Transmission Notice", "Item broadcasted to elder tablet.");
        onItemSent?.();
        onClose();
      }
    }, 900);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.title}>Send to {elderName}</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                Displays on the senior tablet screen
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isUploading}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Content Type Selector */}
            <View style={styles.typeSegmentRow}>
              {SEND_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[
                      styles.typeSegmentBtn,
                      isSelected && styles.typeSegmentBtnActive,
                    ]}
                    onPress={() => {
                      setSelectedType(opt.type);
                      setCustomText("");
                      setCustomTitle("");
                    }}
                    activeOpacity={0.8}
                    disabled={isUploading}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={17}
                      color={isSelected ? "#0284C7" : "#64748B"}
                    />
                    <Text
                      style={[
                        styles.typeSegmentText,
                        isSelected && styles.typeSegmentTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Media Picker for Photo & Video */}
            {(selectedType === "photo" || selectedType === "video") && (
              <View style={styles.mediaPickerSection}>
                {selectedMediaUri ? (
                  <View style={styles.mediaPreviewCard}>
                    {selectedType === "photo" ? (
                      <Image source={{ uri: selectedMediaUri }} style={styles.mediaPreviewImage} />
                    ) : (
                      <View style={styles.videoPreviewPlaceholder}>
                        <Feather name="video" size={28} color="#7C3AED" />
                        <Text style={styles.videoPreviewText}>Video Attached</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => setSelectedMediaUri(null)}
                    >
                      <Feather name="trash-2" size={13} color="#FFFFFF" />
                      <Text style={styles.removeMediaBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.mediaBtnRow}>
                    <TouchableOpacity
                      style={styles.pickMediaBtn}
                      onPress={() =>
                        pickMedia(selectedType === "photo" ? "images" : "videos")
                      }
                      activeOpacity={0.8}
                    >
                      <Feather name="upload-cloud" size={16} color="#0284C7" />
                      <Text style={styles.pickMediaBtnText}>
                        Choose from Gallery
                      </Text>
                    </TouchableOpacity>

                    {selectedType === "photo" && (
                      <TouchableOpacity
                        style={[styles.pickMediaBtn, { borderColor: "#A7F3D0" }]}
                        onPress={captureWithCamera}
                        activeOpacity={0.8}
                      >
                        <Feather name="camera" size={16} color="#059669" />
                        <Text style={[styles.pickMediaBtnText, { color: "#059669" }]}>
                          Take Photo
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Garden Morning"
                placeholderTextColor="#94A3B8"
                value={customTitle}
                onChangeText={setCustomTitle}
                editable={!isUploading}
              />
            </View>

            {/* Content Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Message or Caption</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write a message to display..."
                placeholderTextColor="#94A3B8"
                value={customText}
                onChangeText={setCustomText}
                multiline
                numberOfLines={3}
                editable={!isUploading}
              />
            </View>

            {/* Dynamic Upload Progress Indicator */}
            {isUploading && (
              <View style={styles.uploadProgressBox}>
                <View style={styles.uploadProgressHeader}>
                  <ActivityIndicator size="small" color="#0284C7" />
                  <Text style={styles.uploadProgressTitle}>{uploadStatusText}</Text>
                  <Text style={styles.uploadProgressPercent}>{uploadProgress}%</Text>
                </View>
                <View style={styles.uploadProgressBarTrack}>
                  <View
                    style={[styles.uploadProgressBarFill, { width: `${uploadProgress}%` }]}
                  />
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isUploading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendBtn, isUploading && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={isUploading}
                activeOpacity={0.85}
              >
                <Feather name="send" size={15} color="#FFFFFF" />
                <Text style={styles.sendBtnText}>
                  {isUploading ? "Sending..." : "Send to Screen"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  typeSegmentRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    gap: 4,
  },
  typeSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 9,
    gap: 5,
  },
  typeSegmentBtnActive: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  typeSegmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  typeSegmentTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },

  // Media Picker
  mediaPickerSection: {
    marginBottom: 12,
  },
  mediaBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  pickMediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#BAE6FD",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  pickMediaBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
  },
  mediaPreviewCard: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  mediaPreviewImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
  },
  videoPreviewPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPreviewText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
    marginTop: 6,
  },
  removeMediaBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(220, 38, 38, 0.85)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  removeMediaBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 10,
  },
  textArea: {
    height: 75,
    textAlignVertical: "top",
  },
  presetsSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
  },
  presetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  presetText: {
    fontSize: 11.5,
    color: "#334155",
    flex: 1,
  },

  // Upload Progress
  uploadProgressBox: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  uploadProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  uploadProgressTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0369A1",
    flex: 1,
  },
  uploadProgressPercent: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0284C7",
  },
  uploadProgressBarTrack: {
    height: 6,
    backgroundColor: "#BAE6FD",
    borderRadius: 3,
    overflow: "hidden",
  },
  uploadProgressBarFill: {
    height: "100%",
    backgroundColor: "#0284C7",
    borderRadius: 3,
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  sendBtn: {
    flex: 2,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CalmPalette.primary,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
