import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "@/services/api/apiService";
import {
  familyService,
  DEFAULT_FAMILY_MEMBERS,
  DEFAULT_RECENT_CALLS,
  FamilyMember,
} from "../familyService";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@/services/api/apiService", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe("Patient Family Hub Service & Backend Integration Pipeline", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe("1. Real Backend API Integration & Caching", () => {
    it("fetches family members from backend API and persists in AsyncStorage cache", async () => {
      const mockServerFamily: FamilyMember[] = [
        {
          id: "fam-anita",
          patientId: "mahi",
          name: "Anita Barman",
          relationship: "Daughter & Primary Caregiver",
          relationshipAs: "কন্যা আৰু মুখ্য যত্নকৰ্তা",
          relationshipHi: "बेटी एवं मुख्य देखभालकर्ता",
          roleBadge: "At Home · Guwahati",
          phone: "+91 98765 43210",
          avatarEmoji: "👩",
          avatarBg: "#FDF2F8",
          borderColor: "#F472B6",
          themeColor: "#EC4899",
          isFavorite: true,
          isOnline: true,
          statusText: "Ready to talk · At home",
          location: "Guwahati Residence",
          lastSeen: "Just now",
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { success: true, family: mockServerFamily },
      });

      const members = await familyService.getFamilyMembers();
      expect(apiClient.get).toHaveBeenCalledWith("/family");
      expect(members.length).toBe(1);
      expect(members[0].name).toBe("Anita Barman");

      // Verify cached in AsyncStorage
      const cached = await AsyncStorage.getItem("ambieye_family_members_v1");
      expect(cached).toBeTruthy();
      expect(JSON.parse(cached!)).toEqual(mockServerFamily);
    });

    it("fetches patient-specific family members when patientId is provided", async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { success: true, patientId: "patient-102", family: DEFAULT_FAMILY_MEMBERS.slice(0, 2) },
      });

      const members = await familyService.getFamilyMembers("patient-102");
      expect(apiClient.get).toHaveBeenCalledWith("/patients/patient-102/family");
      expect(members.length).toBe(2);
    });

    it("gracefully falls back to AsyncStorage cache when API call fails (offline mode)", async () => {
      // Seed cache first
      await AsyncStorage.setItem(
        "ambieye_family_members_v1",
        JSON.stringify(DEFAULT_FAMILY_MEMBERS)
      );

      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));

      const members = await familyService.getFamilyMembers();
      expect(members.length).toBe(6);
      expect(members[0].name).toBe("Anita Barman");
    });

    it("gracefully falls back to DEFAULT_FAMILY_MEMBERS if both API and cache are empty", async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error("Network connection failed"));

      const members = await familyService.getFamilyMembers();
      expect(members.length).toBe(6);
      expect(members.some((m) => m.id === "fam-doctor")).toBe(true);
    });

    it("fetches a single family member by ID from server or cache", async () => {
      const mockMember = DEFAULT_FAMILY_MEMBERS[0];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { success: true, member: mockMember },
      });

      const member = await familyService.getFamilyMember("fam-anita");
      expect(apiClient.get).toHaveBeenCalledWith("/family/fam-anita");
      expect(member).toBeDefined();
      expect(member?.name).toBe("Anita Barman");
    });
  });

  describe("2. Favorite Members & State Toggling", () => {
    it("retrieves favorite family members filtered from API or cache", async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { success: true, family: DEFAULT_FAMILY_MEMBERS },
      });

      const favorites = await familyService.getFavorites();
      expect(favorites.length).toBe(3);
      expect(favorites.every((m) => m.isFavorite)).toBe(true);
      expect(favorites.map((m) => m.id)).toEqual(["fam-anita", "fam-rahul", "fam-arjun"]);
    });

    it("toggles favorite status via server API and updates local cache", async () => {
      const priya = DEFAULT_FAMILY_MEMBERS.find((m) => m.id === "fam-priya")!;
      const updatedPriya = { ...priya, isFavorite: true };

      // Initial getFamilyMembers call
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, family: DEFAULT_FAMILY_MEMBERS },
      });

      // API toggle call
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, member: updatedPriya },
      });

      const updated = await familyService.toggleFavorite("fam-priya");
      expect(apiClient.post).toHaveBeenCalledWith("/family/fam-priya/toggle-favorite");
      const found = updated.find((m) => m.id === "fam-priya");
      expect(found?.isFavorite).toBe(true);
    });

    it("falls back to local toggle if server toggle fails", async () => {
      await AsyncStorage.setItem(
        "ambieye_family_members_v1",
        JSON.stringify(DEFAULT_FAMILY_MEMBERS)
      );

      (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error("Server timeout"));
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error("Offline"));

      const updated = await familyService.toggleFavorite("fam-priya");
      const found = updated.find((m) => m.id === "fam-priya");
      expect(found?.isFavorite).toBe(true);
    });
  });

  describe("3. Family Member Management (Create, Update, Delete)", () => {
    it("creates a new persistent family member via API", async () => {
      const newMemberPayload = {
        name: "Abhinav Barman",
        relationship: "Nephew",
        phone: "+91 98640 99887",
        avatarEmoji: "🧑",
      };

      const createdResponse: FamilyMember = {
        id: "fam-abhinav-1",
        patientId: "mahi",
        name: "Abhinav Barman",
        relationship: "Nephew",
        relationshipAs: "ভাগিন",
        relationshipHi: "भतीजा",
        roleBadge: "Family Contact",
        phone: "+91 98640 99887",
        avatarEmoji: "🧑",
        avatarBg: "#EFF6FF",
        borderColor: "#93C5FD",
        themeColor: "#2563EB",
        isFavorite: false,
        isOnline: true,
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, member: createdResponse },
      });
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, family: DEFAULT_FAMILY_MEMBERS },
      });

      const created = await familyService.createFamilyMember(newMemberPayload, "mahi");
      expect(apiClient.post).toHaveBeenCalledWith("/family", {
        ...newMemberPayload,
        patientId: "mahi",
      });
      expect(created.id).toBe("fam-abhinav-1");
      expect(created.name).toBe("Abhinav Barman");
    });

    it("updates an existing family member via API", async () => {
      const updatedAnita = { ...DEFAULT_FAMILY_MEMBERS[0], statusText: "Resting in bedroom" };
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { success: true, member: updatedAnita },
      });
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, family: DEFAULT_FAMILY_MEMBERS },
      });

      const updated = await familyService.updateFamilyMember("fam-anita", {
        statusText: "Resting in bedroom",
      });
      expect(apiClient.put).toHaveBeenCalledWith("/family/fam-anita", {
        statusText: "Resting in bedroom",
      });
      expect(updated?.statusText).toBe("Resting in bedroom");
    });

    it("deletes a family member via API and updates cache", async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: "Deleted" },
      });
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, family: DEFAULT_FAMILY_MEMBERS },
      });

      const success = await familyService.deleteFamilyMember("fam-asha");
      expect(apiClient.delete).toHaveBeenCalledWith("/family/fam-asha");
      expect(success).toBe(true);
    });
  });

  describe("4. Recent Calls Log & History", () => {
    it("retrieves recent call logs", async () => {
      const calls = await familyService.getRecentCalls();
      expect(calls.length).toBe(4);
      expect(calls[0].contactName).toBe("Rahul Barman");
      expect(calls[0].callType).toBe("video");
      expect(calls[1].contactName).toBe("Anita Barman");
      expect(calls[1].callType).toBe("audio");
    });

    it("adds a new recent call to the top of the list", async () => {
      const newCalls = await familyService.addRecentCall({
        contactId: "fam-anita",
        contactName: "Anita Barman",
        contactAvatar: "👩",
        contactRelationship: "Daughter",
        contactRelationshipAs: "কন্যা",
        contactRelationshipHi: "बेटी",
        callType: "video",
        direction: "outgoing",
        duration: "Just now",
        phone: "+91 98765 43210",
        themeColor: "#EC4899",
      });

      expect(newCalls.length).toBe(5);
      expect(newCalls[0].contactName).toBe("Anita Barman");
      expect(newCalls[0].callType).toBe("video");
      expect(newCalls[0].direction).toBe("outgoing");
    });

    it("clears recent call history", async () => {
      await familyService.clearRecentCalls();
      const calls = await familyService.getRecentCalls();
      expect(calls).toEqual([]);
    });
  });

  describe("5. Clean Call Boundary (Phase 2 to Phase 3 Contract)", () => {
    it("initiates audio call, logs outgoing call, and returns clean boundary payload", async () => {
      const anita = DEFAULT_FAMILY_MEMBERS[0];
      const result = await familyService.initiateCall(anita, "audio");

      expect(result.success).toBe(true);
      expect(result.callType).toBe("audio");
      expect(result.phone).toBe("+91 98765 43210");
      expect(result.note).toContain("signaling");

      const recent = await familyService.getRecentCalls();
      expect(recent[0].contactId).toBe("fam-anita");
      expect(recent[0].callType).toBe("audio");
    });

    it("initiates video call, logs outgoing call, and notes Phase 3 connection readiness", async () => {
      const rahul = DEFAULT_FAMILY_MEMBERS[1];
      const result = await familyService.initiateCall(rahul, "video");

      expect(result.success).toBe(true);
      expect(result.callType).toBe("video");
      expect(result.phone).toBe("+91 98640 11223");
      expect(result.note).toContain("signaling");

      const recent = await familyService.getRecentCalls();
      expect(recent[0].contactId).toBe("fam-rahul");
      expect(recent[0].callType).toBe("video");
    });
  });
});
