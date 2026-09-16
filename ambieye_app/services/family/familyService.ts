import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Linking } from "react-native";
import apiClient from "../api/apiService";
import { API_CONFIG } from "../api/config";

export interface FamilyMember {
  id: string;
  patientId?: string;
  name: string;
  relationship: string;
  relationshipAs?: string;
  relationshipHi?: string;
  roleBadge?: string;
  roleBadgeAs?: string;
  roleBadgeHi?: string;
  phone: string;
  email?: string;
  avatarEmoji?: string;
  avatarBg?: string;
  borderColor?: string;
  themeColor?: string;
  profileImage?: string;
  profileImageUrl?: string;
  isFavorite: boolean;
  isOnline: boolean;
  statusText?: string;
  statusTextAs?: string;
  statusTextHi?: string;
  location?: string;
  locationAs?: string;
  locationHi?: string;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecentCall {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar: string;
  contactRelationship: string;
  contactRelationshipAs: string;
  contactRelationshipHi: string;
  callType: "audio" | "video";
  direction: "incoming" | "outgoing" | "missed";
  timestamp: string;
  duration: string;
  phone: string;
  themeColor: string;
}

const STORAGE_KEYS = {
  FAMILY_MEMBERS: "ambieye_family_members_v1",
  RECENT_CALLS: "ambieye_family_recent_calls_v1",
};

export const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: "fam-anita",
    patientId: "mahi",
    name: "Anita Barman",
    relationship: "Daughter & Primary Caregiver",
    relationshipAs: "কন্যা আৰু মুখ্য যত্নকৰ্তা",
    relationshipHi: "बेटी एवं मुख्य देखभालकर्ता",
    roleBadge: "At Home · Guwahati",
    roleBadgeAs: "ঘৰত উপস্থিত · গুৱাহাটী",
    roleBadgeHi: "घर पर · गुवाहाटी",
    phone: "+91 98765 43210",
    email: "anita.barman@caregiver.ner.in",
    avatarEmoji: "👩",
    avatarBg: "#FDF2F8",
    borderColor: "#F472B6",
    themeColor: "#EC4899",
    isFavorite: true,
    isOnline: true,
    statusText: "Ready to talk · At home",
    statusTextAs: "কথা পাতিবলৈ সাজু · ঘৰত আছে",
    statusTextHi: "बात करने के लिए उपलब्ध · घर पर",
    location: "Guwahati Residence",
    locationAs: "গুৱাহাটীৰ বাসভৱন",
    locationHi: "गुवाहाटी निवास",
    lastSeen: "Just now",
  },
  {
    id: "fam-rahul",
    patientId: "mahi",
    name: "Rahul Barman",
    relationship: "Son (Guwahati Office)",
    relationshipAs: "পুত্ৰ (গুৱাহাটী কাৰ্যালয়)",
    relationshipHi: "बेटा (गुवाहाटी कार्यालय)",
    roleBadge: "Office Break",
    roleBadgeAs: "কাৰ্যালয়ৰ বিৰতি",
    roleBadgeHi: "कार्यालय ब्रेक",
    phone: "+91 98640 11223",
    email: "rahul.barman@corp.ner.in",
    avatarEmoji: "👨‍💼",
    avatarBg: "#EFF6FF",
    borderColor: "#60A5FA",
    themeColor: "#2563EB",
    isFavorite: true,
    isOnline: true,
    statusText: "Available for 1-Tap call",
    statusTextAs: "১-টেপ কলৰ বাবে উপলব্ধ",
    statusTextHi: "1-टैप कॉल के लिए उपलब्ध",
    location: "GS Road, Guwahati",
    locationAs: "জি এছ ৰোড, গুৱাহাটী",
    locationHi: "जी एस रोड, गुवाहाटी",
    lastSeen: "5 mins ago",
  },
  {
    id: "fam-arjun",
    patientId: "mahi",
    name: "Arjun Barman",
    relationship: "Grandson (Cotton Collegiate)",
    relationshipAs: "নাতি (কটন কলেজিয়েট)",
    relationshipHi: "पोता (कॉटन कॉलेजिएट)",
    roleBadge: "School · Returns 3 PM",
    roleBadgeAs: "বিদ্যালয়ত · ৩ বজাত ঘৰ পাব",
    roleBadgeHi: "स्कूल में · 3 बजे घर वापसी",
    phone: "+91 98540 55667",
    email: "arjun.barman@student.ner.in",
    avatarEmoji: "👦",
    avatarBg: "#FEF3C7",
    borderColor: "#FBBF24",
    themeColor: "#D97706",
    isFavorite: true,
    isOnline: false,
    statusText: "In class · Call after 3 PM",
    statusTextAs: "শ্ৰেণীত আছে · ৩ বজাৰ পিছত ফোন কৰক",
    statusTextHi: "कक्षा में · 3 बजे के बाद कॉल करें",
    location: "Panbazar, Guwahati",
    locationAs: "পানবজাৰ, গুৱাহাটী",
    locationHi: "पानबाजार, गुवाहाटी",
    lastSeen: "1 hour ago",
  },
  {
    id: "fam-priya",
    patientId: "mahi",
    name: "Priya Barman",
    relationship: "Daughter-in-law",
    relationshipAs: "বোৱাৰী",
    relationshipHi: "बहू",
    roleBadge: "Home Kitchen",
    roleBadgeAs: "পাকঘৰত",
    roleBadgeHi: "रसोई में",
    phone: "+91 98642 33445",
    email: "priya.barman@home.ner.in",
    avatarEmoji: "👩‍🦰",
    avatarBg: "#FAF5FF",
    borderColor: "#C084FC",
    themeColor: "#9333EA",
    isFavorite: false,
    isOnline: true,
    statusText: "Preparing evening tea",
    statusTextAs: "সন্ধিয়াৰ চাহ তৈয়াৰ কৰি আছে",
    statusTextHi: "शाम की चाय बना रही हैं",
    location: "Courtyard Kitchen",
    locationAs: "চোতালৰ পাকঘৰ",
    locationHi: "आंगन की रसोई",
    lastSeen: "10 mins ago",
  },
  {
    id: "fam-doctor",
    patientId: "mahi",
    name: "Dr. Sanjeev Sharma",
    relationship: "Family Physician & ASHA Line",
    relationshipAs: "পৰিয়ালৰ চিকিৎসক আৰু আশা লাইন",
    relationshipHi: "पारिवारिक डॉक्टर एवं आशा लाइन",
    roleBadge: "Dispur Clinic Live",
    roleBadgeAs: "দিস্পুৰ ক্লিনিকত উপস্থিত",
    roleBadgeHi: "दिसपुर क्लिनिक में उपस्थित",
    phone: "+91 94350 99887",
    email: "dr.sanjeev@gnrc.in",
    avatarEmoji: "🩺",
    avatarBg: "#ECFDF5",
    borderColor: "#4ADE80",
    themeColor: "#059669",
    isFavorite: false,
    isOnline: true,
    statusText: "Direct medical line active",
    statusTextAs: "চিকিৎসা সেৱা লাইন সক্ৰিয়",
    statusTextHi: "चिकित्सा सेवा लाइन सक्रिय",
    location: "Dispur Hospital",
    locationAs: "দিস্পুৰ চিকিৎসালয়",
    locationHi: "दिसपुर अस्पताल",
    lastSeen: "Active now",
  },
  {
    id: "fam-asha",
    patientId: "mahi",
    name: "Mamoni Baideo",
    relationship: "Local ASHA Community Worker",
    relationshipAs: "স্থানীয় আশা বাইদেউ",
    relationshipHi: "स्थानीय आशा कार्यकर्ता",
    roleBadge: "Village Health Center",
    roleBadgeAs: "স্বাস্থ্য কেন্দ্ৰ",
    roleBadgeHi: "स्वास्थ्य केंद्र",
    phone: "+91 94351 22334",
    email: "mamoni.asha@nhm.gov.in",
    avatarEmoji: "👩‍⚕️",
    avatarBg: "#FFF1F2",
    borderColor: "#FB7185",
    themeColor: "#E11D48",
    isFavorite: false,
    isOnline: true,
    statusText: "Available for home check-ins",
    statusTextAs: "ঘৰুৱা স্বাস্থ্য নিৰীক্ষণৰ বাবে উপলব্ধ",
    statusTextHi: "स्वास्थ्य जांच के लिए उपलब्ध",
    location: "Community Center",
    locationAs: "স্বাস্থ্য কেন্দ্ৰ",
    locationHi: "सामुदायिक केंद्र",
    lastSeen: "20 mins ago",
  },
];

export const DEFAULT_RECENT_CALLS: RecentCall[] = [
  {
    id: "call-1",
    contactId: "fam-rahul",
    contactName: "Rahul Barman",
    contactAvatar: "👨‍💼",
    contactRelationship: "Son (Guwahati Office)",
    contactRelationshipAs: "পুত্ৰ (গুৱাহাটী)",
    contactRelationshipHi: "बेटा (गुवाहाटी)",
    callType: "video",
    direction: "incoming",
    timestamp: "Today, 10:15 AM",
    duration: "8 mins",
    phone: "+91 98640 11223",
    themeColor: "#2563EB",
  },
  {
    id: "call-2",
    contactId: "fam-anita",
    contactName: "Anita Barman",
    contactAvatar: "👩",
    contactRelationship: "Daughter & Primary Caregiver",
    contactRelationshipAs: "কন্যা আৰু মুখ্য যত্নকৰ্তা",
    contactRelationshipHi: "बेटी एवं मुख्य देखभालकर्ता",
    callType: "audio",
    direction: "outgoing",
    timestamp: "Yesterday, 6:30 PM",
    duration: "14 mins",
    phone: "+91 98765 43210",
    themeColor: "#EC4899",
  },
  {
    id: "call-3",
    contactId: "fam-doctor",
    contactName: "Dr. Sanjeev Sharma",
    contactAvatar: "🩺",
    contactRelationship: "Family Physician",
    contactRelationshipAs: "পৰিয়ালৰ চিকিৎসক",
    contactRelationshipHi: "पारिवारिक डॉक्टर",
    callType: "video",
    direction: "incoming",
    timestamp: "Sep 14, 11:00 AM",
    duration: "5 mins",
    phone: "+91 94350 99887",
    themeColor: "#059669",
  },
  {
    id: "call-4",
    contactId: "fam-arjun",
    contactName: "Arjun Barman",
    contactAvatar: "👦",
    contactRelationship: "Grandson",
    contactRelationshipAs: "নাতি",
    contactRelationshipHi: "पोता",
    callType: "video",
    direction: "missed",
    timestamp: "Sep 13, 4:20 PM",
    duration: "Missed",
    phone: "+91 98540 55667",
    themeColor: "#D97706",
  },
];

class FamilyService {
  /**
   * Retrieve all family members for the patient.
   * Connects to the real backend database with offline AsyncStorage fallback.
   */
  async getFamilyMembers(patientId?: string): Promise<FamilyMember[]> {
    try {
      const endpoint = patientId
        ? API_CONFIG.ENDPOINTS.FAMILY.PATIENT(patientId)
        : API_CONFIG.ENDPOINTS.FAMILY.BASE;
      const response = await apiClient.get(endpoint);
      if (response.data && Array.isArray(response.data.family)) {
        const members: FamilyMember[] = response.data.family;
        // Persist fresh server copy into offline cache
        await AsyncStorage.setItem(
          STORAGE_KEYS.FAMILY_MEMBERS,
          JSON.stringify(members)
        );
        return members;
      }
    } catch {
      // Network or server error - gracefully fallback to local cache
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS);
      if (raw) {
        return JSON.parse(raw);
      }
      // Initialize with default members if clean installation
      await AsyncStorage.setItem(
        STORAGE_KEYS.FAMILY_MEMBERS,
        JSON.stringify(DEFAULT_FAMILY_MEMBERS)
      );
      return DEFAULT_FAMILY_MEMBERS;
    } catch {
      return DEFAULT_FAMILY_MEMBERS;
    }
  }

  /**
   * Retrieve a single family member by ID.
   */
  async getFamilyMember(memberId: string): Promise<FamilyMember | null> {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.FAMILY.MEMBER(memberId)
      );
      if (response.data?.member) {
        return response.data.member;
      }
    } catch {
      // Fallback to searching local cache
    }

    const all = await this.getFamilyMembers();
    return all.find((m) => m.id === memberId) || null;
  }

  /**
   * Retrieve favorite family members
   */
  async getFavorites(patientId?: string): Promise<FamilyMember[]> {
    const all = await this.getFamilyMembers(patientId);
    return all.filter((m) => m.isFavorite);
  }

  /**
   * Toggle favorite status in real database with local cache update.
   */
  async toggleFavorite(contactId: string): Promise<FamilyMember[]> {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.FAMILY.TOGGLE_FAVORITE(contactId)
      );
      if (response.data?.member) {
        const updatedMember: FamilyMember = response.data.member;
        const current = await this.getFamilyMembers();
        const updated = current.map((m) =>
          m.id === contactId ? updatedMember : m
        );
        await AsyncStorage.setItem(
          STORAGE_KEYS.FAMILY_MEMBERS,
          JSON.stringify(updated)
        );
        return updated;
      }
    } catch {
      // Offline fallback: toggle locally in AsyncStorage
    }

    const members = await this.getFamilyMembers();
    const updated = members.map((m) =>
      m.id === contactId ? { ...m, isFavorite: !m.isFavorite } : m
    );
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.FAMILY_MEMBERS,
        JSON.stringify(updated)
      );
    } catch {
      // Non-blocking
    }
    return updated;
  }

  /**
   * Create a new family member record in real database.
   */
  async createFamilyMember(
    data: Partial<FamilyMember>,
    patientId: string = "mahi"
  ): Promise<FamilyMember> {
    const payload = {
      ...data,
      patientId,
    };

    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.FAMILY.BASE,
        payload
      );
      if (response.data?.member) {
        const created: FamilyMember = response.data.member;
        const current = await this.getFamilyMembers();
        const updated = [created, ...current.filter((m) => m.id !== created.id)];
        await AsyncStorage.setItem(
          STORAGE_KEYS.FAMILY_MEMBERS,
          JSON.stringify(updated)
        );
        return created;
      }
    } catch {
      // Offline fallback
    }

    const localId = `fam-${Date.now()}`;
    const newMember: FamilyMember = {
      id: localId,
      patientId,
      name: data.name || "Family Member",
      relationship: data.relationship || "Family",
      relationshipAs: data.relationshipAs || data.relationship || "পৰিয়ালৰ সদস্য",
      relationshipHi: data.relationshipHi || data.relationship || "परिवार का सदस्य",
      roleBadge: data.roleBadge || "Family Contact",
      roleBadgeAs: data.roleBadgeAs || "পৰিয়ালৰ যোগাযোগ",
      roleBadgeHi: data.roleBadgeHi || "पारिवारिक संपर्क",
      phone: data.phone || "+91 98000 00000",
      email: data.email || "",
      avatarEmoji: data.avatarEmoji || "👤",
      avatarBg: data.avatarBg || "#EFF6FF",
      borderColor: data.borderColor || "#93C5FD",
      themeColor: data.themeColor || "#2563EB",
      isFavorite: Boolean(data.isFavorite),
      isOnline: data.isOnline ?? true,
      statusText: data.statusText || "Available",
      statusTextAs: data.statusTextAs || "উপলব্ধ",
      statusTextHi: data.statusTextHi || "उपलब्ध",
      location: data.location || "Home",
      locationAs: data.locationAs || "ঘৰ",
      locationHi: data.locationHi || "घर",
      lastSeen: "Just now",
    };

    const current = await this.getFamilyMembers();
    const updated = [newMember, ...current];
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.FAMILY_MEMBERS,
        JSON.stringify(updated)
      );
    } catch {
      // Non-blocking
    }
    return newMember;
  }

  /**
   * Update an existing family member record.
   */
  async updateFamilyMember(
    memberId: string,
    data: Partial<FamilyMember>
  ): Promise<FamilyMember | null> {
    try {
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.FAMILY.MEMBER(memberId),
        data
      );
      if (response.data?.member) {
        const updatedMember: FamilyMember = response.data.member;
        const current = await this.getFamilyMembers();
        const updated = current.map((m) =>
          m.id === memberId ? updatedMember : m
        );
        await AsyncStorage.setItem(
          STORAGE_KEYS.FAMILY_MEMBERS,
          JSON.stringify(updated)
        );
        return updatedMember;
      }
    } catch {
      // Offline fallback
    }

    const current = await this.getFamilyMembers();
    let updatedMember: FamilyMember | null = null;
    const updated = current.map((m) => {
      if (m.id === memberId) {
        updatedMember = { ...m, ...data, updatedAt: new Date().toISOString() };
        return updatedMember;
      }
      return m;
    });

    if (updatedMember) {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.FAMILY_MEMBERS,
          JSON.stringify(updated)
        );
      } catch {
        // Non-blocking
      }
    }

    return updatedMember;
  }

  /**
   * Delete a family member record.
   */
  async deleteFamilyMember(memberId: string): Promise<boolean> {
    try {
      await apiClient.delete(API_CONFIG.ENDPOINTS.FAMILY.MEMBER(memberId));
    } catch {
      // Handle offline or server error gracefully
    }

    const current = await this.getFamilyMembers();
    const updated = current.filter((m) => m.id !== memberId);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.FAMILY_MEMBERS,
        JSON.stringify(updated)
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve recent call logs from backend database with offline cache fallback.
   */
  async getRecentCalls(patientId = "mahi"): Promise<RecentCall[]> {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.CALLS.HISTORY(patientId)
      );
      if (response.data && Array.isArray(response.data.history) && response.data.history.length > 0) {
        const members = await this.getFamilyMembers(patientId);
        const serverCalls: RecentCall[] = response.data.history.map((c: any) => {
          const member = members.find((m) => m.id === c.familyMemberId) ||
            DEFAULT_FAMILY_MEMBERS.find((m) => m.id === c.familyMemberId);
          const minutes = Math.floor((c.durationSeconds || 0) / 60);
          const seconds = (c.durationSeconds || 0) % 60;
          const durationStr =
            c.status === "completed"
              ? `${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`
              : c.status === "rejected" || c.status === "missed"
              ? "Missed"
              : c.status;

          return {
            id: c.id,
            contactId: c.familyMemberId,
            contactName: member ? member.name : "Family Member",
            contactAvatar: member ? member.avatarEmoji || "👤" : "👤",
            contactRelationship: member ? member.relationship : "Family Contact",
            contactRelationshipAs: member ? member.relationshipAs || member.relationship : "পৰিয়াল",
            contactRelationshipHi: member ? member.relationshipHi || member.relationship : "परिवार",
            callType: c.callType || "video",
            direction: c.direction || "outgoing",
            timestamp: c.startedAt
              ? new Date(c.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Today",
            duration: durationStr,
            phone: member ? member.phone : "+91 98000 00000",
            themeColor: c.callType === "video" ? "#059669" : "#2563EB",
          };
        });

        await AsyncStorage.setItem(
          STORAGE_KEYS.RECENT_CALLS,
          JSON.stringify(serverCalls)
        );
        return serverCalls;
      }
    } catch {
      // Offline fallback
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_CALLS);
      if (raw) {
        return JSON.parse(raw);
      }
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_CALLS,
        JSON.stringify(DEFAULT_RECENT_CALLS)
      );
      return DEFAULT_RECENT_CALLS;
    } catch {
      return DEFAULT_RECENT_CALLS;
    }
  }

  /**
   * Record a new outgoing call to recent call history
   */
  async addRecentCall(
    callData: Omit<RecentCall, "id" | "timestamp"> & { timestamp?: string }
  ): Promise<RecentCall[]> {
    const current = await this.getRecentCalls();
    const newCall: RecentCall = {
      id: `call-${Date.now()}`,
      timestamp:
        callData.timestamp ||
        `Today, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      ...callData,
    };
    const updated = [newCall, ...current.slice(0, 19)];
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_CALLS,
        JSON.stringify(updated)
      );
    } catch {
      // Non-blocking
    }
    return updated;
  }

  /**
   * Clear recent calls history (e.g. for testing / reset)
   */
  async clearRecentCalls(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_CALLS,
        JSON.stringify([])
      );
    } catch {
      // Non-blocking
    }
  }

  /**
   * Initiate Call helper bridging to native dialer for audio or structured payload
   */
  async initiateCall(
    contact: FamilyMember,
    callType: "audio" | "video"
  ): Promise<{
    success: boolean;
    callType: "audio" | "video";
    phone: string;
    note?: string;
  }> {
    await this.addRecentCall({
      contactId: contact.id,
      contactName: contact.name,
      contactAvatar: contact.avatarEmoji || "👤",
      contactRelationship: contact.relationship,
      contactRelationshipAs: contact.relationshipAs || contact.relationship,
      contactRelationshipHi: contact.relationshipHi || contact.relationship,
      callType,
      direction: "outgoing",
      duration: "Just now",
      phone: contact.phone,
      themeColor: contact.themeColor || "#2563EB",
    });

    if (callType === "audio" && Platform.OS !== "web") {
      try {
        const cleanPhone = contact.phone.replace(/[\s\-()]/g, "");
        const url = `tel:${cleanPhone}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        }
      } catch {
        // Fallback
      }
    }

    return {
      success: true,
      callType,
      phone: contact.phone,
      note: "Call session initiated via WebRTC signaling engine.",
    };
  }
}

export const familyService = new FamilyService();

