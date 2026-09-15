import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WarmPalette } from "../../constants/theme";
import { caregiverStorage, CaregiverArticle } from "../../utils/caregiverStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const CaregiverArticlesModal: React.FC<Props> = ({ visible, onClose }) => {
  const [articles, setArticles] = useState<CaregiverArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<CaregiverArticle | null>(null);

  useEffect(() => {
    if (visible) {
      loadArticles();
    }
  }, [visible]);

  const loadArticles = async () => {
    const list = await caregiverStorage.getArticles();
    setArticles(list);
    if (list.length > 0 && !selectedArticle) {
      setSelectedArticle(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Caregiver Knowledge & Practical Tips</Text>
              <Text style={styles.headerSubtitle}>
                Clear, human guidance without walls of medical jargon
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
            {selectedArticle ? (
              // Article Detail View
              <View>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedArticle(null)}
                >
                  <Ionicons name="arrow-back" size={16} color={WarmPalette.roseDusty} />
                  <Text style={styles.backButtonText}>All Guides & Tips</Text>
                </TouchableOpacity>

                <View style={styles.articleHeader}>
                  <Text style={styles.categoryBadge}>{selectedArticle.category}</Text>
                  <Text style={styles.articleDetailTitle}>{selectedArticle.title}</Text>
                  <Text style={styles.readTimeText}>
                    <Ionicons name="time-outline" size={12} color={WarmPalette.charcoalWarm + "80"} />{" "}
                    {selectedArticle.readTime} read
                  </Text>
                </View>

                {/* Section 1: What helps */}
                <View style={styles.sectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                    <Text style={[styles.sectionHeading, { color: "#16A34A" }]}>What helps</Text>
                  </View>
                  {selectedArticle.whatHelps.map((point, idx) => (
                    <View key={idx} style={styles.pointRow}>
                      <Text style={styles.bulletCheck}>•</Text>
                      <Text style={styles.pointText}>{point}</Text>
                    </View>
                  ))}
                </View>

                {/* Section 2: What to avoid */}
                <View style={[styles.sectionBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="close-circle" size={18} color="#DC2626" />
                    <Text style={[styles.sectionHeading, { color: "#DC2626" }]}>What to avoid</Text>
                  </View>
                  {selectedArticle.whatToAvoid.map((point, idx) => (
                    <View key={idx} style={styles.pointRow}>
                      <Text style={[styles.bulletCheck, { color: "#DC2626" }]}>•</Text>
                      <Text style={styles.pointText}>{point}</Text>
                    </View>
                  ))}
                </View>

                {/* Section 3: Try this today */}
                <View style={[styles.sectionBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="sparkles" size={18} color="#2563EB" />
                    <Text style={[styles.sectionHeading, { color: "#2563EB" }]}>Try this today</Text>
                  </View>
                  <Text style={styles.tryThisText}>{selectedArticle.tryThis}</Text>
                </View>
              </View>
            ) : (
              // Articles List
              <View style={styles.articlesList}>
                {articles.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.articleCard}
                    onPress={() => setSelectedArticle(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.articleIconBox}>
                      <Ionicons name="bulb-outline" size={20} color={WarmPalette.roseDusty} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cardCategory}>{item.category}</Text>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardTryPrompt} numberOfLines={2}>
                        "{item.tryThis}"
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={WarmPalette.charcoalWarm + "60"} />
                  </TouchableOpacity>
                ))}
              </View>
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
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  articlesList: {
    gap: 12,
  },
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  articleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.roseDusty,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    marginTop: 2,
  },
  cardTryPrompt: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 4,
    fontStyle: "italic",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.roseDusty,
  },
  articleHeader: {
    marginBottom: 16,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.roseDusty,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  articleDetailTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
    lineHeight: 26,
  },
  readTimeText: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 6,
  },
  sectionBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 14,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  bulletCheck: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16A34A",
    marginRight: 8,
    marginTop: -2,
  },
  pointText: {
    flex: 1,
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
    lineHeight: 18,
  },
  tryThisText: {
    fontSize: 14,
    color: WarmPalette.charcoalWarm,
    lineHeight: 20,
    fontWeight: "500",
  },
});
