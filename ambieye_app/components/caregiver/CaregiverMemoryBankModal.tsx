import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WarmPalette } from "../../constants/theme";
import { caregiverStorage, MemoryBankItem } from "../../utils/caregiverStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
  elderName: string;
}

type MemoryCategory = "people" | "places" | "foods" | "songs" | "hobbies" | "dates" | "stories";

const CATEGORY_TABS: Array<{ cat: MemoryCategory; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { cat: "people", label: "People", icon: "people-outline" },
  { cat: "places", label: "Places", icon: "location-outline" },
  { cat: "foods", label: "Foods", icon: "restaurant-outline" },
  { cat: "songs", label: "Songs", icon: "musical-notes-outline" },
  { cat: "hobbies", label: "Hobbies", icon: "sparkles-outline" },
  { cat: "dates", label: "Important Dates", icon: "calendar-outline" },
  { cat: "stories", label: "Stories", icon: "book-outline" },
];

export const CaregiverMemoryBankModal: React.FC<Props> = ({ visible, onClose, elderName }) => {
  const [items, setItems] = useState<MemoryBankItem[]>([]);
  const [activeTab, setActiveTab] = useState<MemoryCategory>("people");
  const [showAddForm, setShowAddForm] = useState(false);

  // New item form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newEmoji, setNewEmoji] = useState("❤️");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMemoryBank();
    }
  }, [visible]);

  const loadMemoryBank = async () => {
    const list = await caregiverStorage.getMemoryBank();
    setItems(list);
  };

  const filteredItems = items.filter((item) => item.category === activeTab);

  const handleAddItem = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Missing Name / Title", "Please enter a name or title for this memory.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await caregiverStorage.addMemoryBankItem({
        category: activeTab,
        title: newTitle.trim(),
        description: newDesc.trim() || "Cherished family memory",
        yearOrDate: newYear.trim() || undefined,
        photoEmoji: newEmoji || "❤️",
      });

      setItems(updated);
      setNewTitle("");
      setNewDesc("");
      setNewYear("");
      setShowAddForm(false);
      setSubmitting(false);
    } catch {
      setSubmitting(false);
      Alert.alert("Error", "Could not save memory item.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{elderName}'s Personal Memory Bank</Text>
              <Text style={styles.headerSubtitle}>
                Private memories that personalize cognitive games and daily conversations
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={WarmPalette.charcoalWarm} />
            </TouchableOpacity>
          </View>

          {/* Category Tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeTab === tab.cat;
                return (
                  <TouchableOpacity
                    key={tab.cat}
                    style={[styles.tabChip, isActive && styles.tabChipActive]}
                    onPress={() => {
                      setActiveTab(tab.cat);
                      setShowAddForm(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={15}
                      color={isActive ? "#FFFFFF" : WarmPalette.charcoalWarm}
                    />
                    <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Action Bar */}
            <View style={styles.actionBar}>
              <Text style={styles.countText}>
                {filteredItems.length} {activeTab} recorded
              </Text>
              <TouchableOpacity
                style={styles.addTriggerBtn}
                onPress={() => setShowAddForm(!showAddForm)}
              >
                <Ionicons
                  name={showAddForm ? "chevron-up" : "add"}
                  size={16}
                  color={WarmPalette.roseDusty}
                />
                <Text style={styles.addTriggerText}>
                  {showAddForm ? "Hide Form" : `Add ${CATEGORY_TABS.find((t) => t.cat === activeTab)?.label}`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Add New Item Form */}
            {showAddForm && (
              <View style={styles.addFormCard}>
                <Text style={styles.formTitle}>
                  Add to {CATEGORY_TABS.find((t) => t.cat === activeTab)?.label}
                </Text>

                <Text style={styles.inputLabel}>NAME / TITLE *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    activeTab === "people"
                      ? "e.g. Grandson: Arjun"
                      : activeTab === "places"
                      ? "e.g. Ooty Botanical Garden"
                      : activeTab === "foods"
                      ? "e.g. Soft Idlis with Coconut Chutney"
                      : activeTab === "songs"
                      ? "e.g. Yeh Shaam Mastani - Kishore Kumar"
                      : activeTab === "stories"
                      ? "e.g. 1998 Family Vacation in Kerala"
                      : "Title or name"
                  }
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                <Text style={styles.inputLabel}>DETAILS / CONTEXT</Text>
                <TextInput
                  style={[styles.textInput, { height: 60, textAlignVertical: "top" }]}
                  multiline
                  numberOfLines={2}
                  placeholder="e.g. Loved visiting every summer. Always orders with filter coffee."
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={newDesc}
                  onChangeText={setNewDesc}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>YEAR / DATE (OPTIONAL)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 1998, Every Sunday"
                      placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                      value={newYear}
                      onChangeText={setNewYear}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ width: 80 }}>
                    <Text style={styles.inputLabel}>EMOJI</Text>
                    <TextInput
                      style={[styles.textInput, { textAlign: "center" }]}
                      value={newEmoji}
                      onChangeText={setNewEmoji}
                      maxLength={4}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleAddItem}
                  disabled={submitting}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {submitting ? "Saving..." : "Save to Memory Bank"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* List of Existing Items */}
            {filteredItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="folder-open-outline" size={36} color={WarmPalette.charcoalWarm + "50"} />
                <Text style={styles.emptyTitle}>No entries yet in {activeTab}</Text>
                <Text style={styles.emptySub}>
                  Add familiar memories to help {elderName} feel anchored and recognized.
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {filteredItems.map((item) => (
                  <View key={item.id} style={styles.memoryItemCard}>
                    <View style={styles.memoryEmojiBox}>
                      <Text style={styles.memoryEmojiText}>{item.photoEmoji || "❤️"}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.memoryTitleRow}>
                        <Text style={styles.memoryItemTitle}>{item.title}</Text>
                        {item.yearOrDate && (
                          <Text style={styles.memoryYearBadge}>{item.yearOrDate}</Text>
                        )}
                      </View>
                      <Text style={styles.memoryItemDesc}>{item.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: "92%",
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
    fontSize: 12,
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
  tabsContainer: {
    backgroundColor: WarmPalette.ivory,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
    paddingVertical: 10,
  },
  tabsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabChipActive: {
    backgroundColor: WarmPalette.roseDusty,
    borderColor: WarmPalette.roseDusty,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  tabChipTextActive: {
    color: "#FFFFFF",
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm + "90",
  },
  addTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: WarmPalette.peach + "80",
  },
  addTriggerText: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.roseDusty,
  },
  addFormCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm + "80",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: WarmPalette.ivory,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WarmPalette.roseDusty,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
    gap: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "90",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  itemsList: {
    gap: 10,
  },
  memoryItemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  memoryEmojiBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryEmojiText: {
    fontSize: 20,
  },
  memoryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memoryItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    flex: 1,
  },
  memoryYearBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: WarmPalette.roseDusty,
    backgroundColor: WarmPalette.peach,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  memoryItemDesc: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "99",
    marginTop: 4,
    lineHeight: 18,
  },
});
