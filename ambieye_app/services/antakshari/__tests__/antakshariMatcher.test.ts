import {
  AntakshariMatcher,
  matchAntakshariResponse,
  normalizeTranscript,
} from "../antakshariMatcher";
import { LocalSongRepository } from "../localSongRepository";
import { SongRepository } from "../songRepository";
import { Song } from "@/types/antakshari";

describe("Antakshari Matching Engine", () => {
  let matcher: AntakshariMatcher;

  beforeEach(() => {
    // Uses LocalSongRepository with sample songs
    matcher = new AntakshariMatcher();
  });

  describe("1. Text Normalization", () => {
    it("safely handles null and undefined", () => {
      const resNull = normalizeTranscript(null);
      expect(resNull.isEmpty).toBe(true);
      expect(resNull.clean).toBe("");

      const resUndef = normalizeTranscript(undefined);
      expect(resUndef.isEmpty).toBe(true);
      expect(resUndef.clean).toBe("");
    });

    it("safely handles empty string and whitespace", () => {
      const res = normalizeTranscript("   \n\t  ");
      expect(res.isEmpty).toBe(true);
    });

    it("strips common punctuation and musical notes", () => {
      const res = normalizeTranscript('♪ "Mera Joota Hai, Japani!" ♫');
      expect(res.clean).toBe("mera joota hai japani");
      expect(res.tokens).toEqual(["mera", "joota", "hai", "japani"]);
      expect(res.isUnusable).toBe(false);
    });

    it("flags symbol-only noise as unusable", () => {
      const res = normalizeTranscript("... ??!! -- __");
      expect(res.isEmpty).toBe(false);
      expect(res.isUnusable).toBe(true);
    });
  });

  describe("2. Empty and Unusable Transcripts", () => {
    it("returns empty_transcript for null or empty strings", async () => {
      const res1 = await matcher.match("", "M");
      expect(res1.isMatch).toBe(false);
      expect(res1.reason).toBe("empty_transcript");
      expect(res1.confidence).toBe(0);

      const res2 = await matcher.match(null, "M");
      expect(res2.isMatch).toBe(false);
      expect(res2.reason).toBe("empty_transcript");

      const res3 = await matcher.match("   ", "M");
      expect(res3.isMatch).toBe(false);
      expect(res3.reason).toBe("empty_transcript");
    });

    it("returns unusable_transcript for punctuation noise", async () => {
      const res = await matcher.match("...?!", "M");
      expect(res.isMatch).toBe(false);
      expect(res.reason).toBe("unusable_transcript");
      expect(res.confidence).toBe(0);
    });
  });

  describe("3. Invalid Starting Syllable", () => {
    it("rejects transcript starting with incorrect letter", async () => {
      // Player sings 'Yeh Shaam Mastani' when required syllable is 'M'
      const res = await matcher.match("Yeh shaam mastani", "M");
      expect(res.isMatch).toBe(false);
      expect(res.reason).toBe("invalid_starting_syllable");
      expect(res.detectedStartingSyllable).toBe("Y");
      expect(res.confidence).toBe(0);
    });

    it("rejects transcript when required syllable is 'B' but player sings 'Kabhi'", async () => {
      const res = await matcher.match("Kabhi kabhi mere dil mein", "B");
      expect(res.isMatch).toBe(false);
      expect(res.reason).toBe("invalid_starting_syllable");
      expect(res.detectedStartingSyllable).toBe("K");
    });
  });

  describe("4. No Matching Song", () => {
    it("rejects transcript starting with required letter but matching no song in repo", async () => {
      // Starts with 'M', but random spoken sentence
      const res = await matcher.match("Mumbai is a large coastal city", "M");
      expect(res.isMatch).toBe(false);
      expect(res.reason).toBe("no_matching_song");
      expect(res.detectedStartingSyllable).toBe("M");
      expect(res.confidence).toBeLessThan(0.55);
    });

    it("rejects food items starting with required letter", async () => {
      const res = await matcher.match("Banana apple mango", "B");
      expect(res.isMatch).toBe(false);
      expect(res.reason).toBe("no_matching_song");
      expect(res.detectedStartingSyllable).toBe("B");
    });
  });

  describe("5. Valid Matches & Fuzzy Tolerance", () => {
    it("matches exact song title (Bollywood classic)", async () => {
      const res = await matcher.match("Mera Joota Hai Japani", "M");
      expect(res.isMatch).toBe(true);
      expect(res.matchedSongId).toBe("bw-classic-001");
      expect(res.matchedSongTitle).toBe("Mera Joota Hai Japani");
      expect(res.detectedStartingSyllable).toBe("M");
      expect(res.confidence).toBeGreaterThanOrEqual(0.95);
      expect(res.reason).toBe("valid_match");
    });

    it("matches partial title singing", async () => {
      const res = await matcher.match("Mera joota hai", "M");
      expect(res.isMatch).toBe(true);
      expect(res.matchedSongId).toBe("bw-classic-001");
      expect(res.confidence).toBeGreaterThanOrEqual(0.7);
      expect(res.reason).toBe("valid_match");
    });

    it("matches lyrics snippet (Assamese folk)", async () => {
      const res = await matcher.match("Bihu re bihu lagise gaa", "B");
      expect(res.isMatch).toBe(true);
      expect(res.matchedSongId).toBe("as-bihu-001");
      expect(res.reason).toBe("valid_match");
    });

    it("matches lyrics snippet of patriotic anthem", async () => {
      const res = await matcher.match("O mur apunar desh o mur sikuni desh", "O");
      expect(res.isMatch).toBe(true);
      expect(res.matchedSongId).toBe("as-bihu-002");
      expect(res.reason).toBe("valid_match");
    });

    it("matches with minor STT phonetic typo (tolerant matching)", async () => {
      // 'he' instead of 'hai'
      const res = await matcher.match("mera joota he japani", "M");
      expect(res.isMatch).toBe(true);
      expect(res.matchedSongId).toBe("bw-classic-001");
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
      expect(res.reason).toBe("valid_match");
    });

    it("tolerates leading vocal fillers (e.g. 'uh', 'um')", async () => {
      const res = await matcher.match("uh mera joota hai japani", "M");
      expect(res.isMatch).toBe(true);
      expect(res.matchedSongId).toBe("bw-classic-001");
      expect(res.reason).toBe("valid_match");
    });

    it("works via functional convenience wrapper matchAntakshariResponse", async () => {
      const res = await matchAntakshariResponse("Yeh Shaam Mastani", "Y");
      expect(res.isMatch).toBe(true);
      expect(res.matchedSongId).toBe("bw-classic-002");
      expect(res.reason).toBe("valid_match");
    });
  });

  describe("6. Custom SongRepository Dependency Injection", () => {
    it("works with any custom SongRepository implementation", async () => {
      const customSongs: Song[] = [
        {
          id: "custom-001",
          title: "Rang De Basanti",
          language: "Hindi",
          startingSyllable: "R",
          category: "bollywood_classics",
          lyricsSnippet: "Thodi si dhool meri...",
        },
      ];

      const customRepo: SongRepository = new LocalSongRepository(customSongs);
      const customMatcher = new AntakshariMatcher(customRepo);

      const matchRes = await customMatcher.match("Rang De Basanti", "R");
      expect(matchRes.isMatch).toBe(true);
      expect(matchRes.matchedSongId).toBe("custom-001");
      expect(matchRes.reason).toBe("valid_match");

      // Should not find Mera Joota Hai Japani in this custom repo
      const missingRes = await customMatcher.match("Mera Joota Hai Japani", "M");
      expect(missingRes.isMatch).toBe(false);
      expect(missingRes.reason).toBe("no_matching_song");
    });
  });
});
