import {
  Song,
  AntakshariMatchResult,
  AntakshariMatchOptions,
  MatchReason,
} from "@/types/antakshari";
import { SongRepository } from "./songRepository";
import { LocalSongRepository } from "./localSongRepository";

const defaultRepo: SongRepository = new LocalSongRepository();


/**
 * Common non-lexical vocal fillers produced in spoken/sung audio
 * that should not penalize patient response if followed by the required starting word.
 */
const VOCAL_FILLERS = new Set([
  "um",
  "uh",
  "umm",
  "uhh",
  "hmm",
  "hm",
  "haan",
  "erm",
  "aah",
]);

/**
 * Normalization details extracted from a raw transcript
 */
export interface NormalizedTranscriptInfo {
  raw: string;
  clean: string;
  tokens: string[];
  isEmpty: boolean;
  isUnusable: boolean;
}

/**
 * 1. Normalize transcript text:
 * - trim whitespace
 * - normalize case to lowercase
 * - handle common punctuation, quotes, and musical symbols
 * - safely handle empty, null, or undefined transcript
 */
export function normalizeTranscript(
  text: string | null | undefined
): NormalizedTranscriptInfo {
  if (text === null || text === undefined) {
    return {
      raw: "",
      clean: "",
      tokens: [],
      isEmpty: true,
      isUnusable: false,
    };
  }

  const raw = String(text);
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return {
      raw,
      clean: "",
      tokens: [],
      isEmpty: true,
      isUnusable: false,
    };
  }

  // Remove musical note symbols, emojis, and standard punctuation:
  // e.g. ♪ ♫ ♩ ♬ " ' ` ~ ! ? . , : ; / \ ( ) [ ] { } - _ + = * & ^ % $ # @
  const cleanedPunctuation = trimmed
    .replace(/[♪♫♩♬]/g, " ")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”\[\]\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  // If after removing punctuation nothing remains, transcript was unusable symbols/noise
  if (cleanedPunctuation.length === 0) {
    return {
      raw,
      clean: "",
      tokens: [],
      isEmpty: false,
      isUnusable: true,
    };
  }

  // Check if string contains at least one alphabetic or phonetic character
  // Supports Latin and Unicode Indic/regional alphabets
  const hasValidWordChar = /[\p{L}\p{M}]/u.test(cleanedPunctuation);
  if (!hasValidWordChar) {
    return {
      raw,
      clean: cleanedPunctuation,
      tokens: [],
      isEmpty: false,
      isUnusable: true,
    };
  }

  const tokens = cleanedPunctuation.split(/\s+/).filter(Boolean);

  return {
    raw,
    clean: cleanedPunctuation,
    tokens,
    isEmpty: false,
    isUnusable: tokens.length === 0,
  };
}

/**
 * Computes Levenshtein edit distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const m = a.length;
  const n = b.length;
  let prevRow = new Array(n + 1);
  let currRow = new Array(n + 1);

  for (let j = 0; j <= n; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    const aChar = a[i - 1];
    for (let j = 1; j <= n; j++) {
      const cost = aChar === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    for (let k = 0; k <= n; k++) {
      prevRow[k] = currRow[k];
    }
  }

  return prevRow[n];
}

/**
 * Returns normalized Levenshtein similarity score between 0.0 and 1.0
 */
function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Counts exact token matches between two token arrays
 */
function countExactTokenMatches(source: string[], target: string[]): number {
  let count = 0;
  for (const token of target) {
    if (source.includes(token)) {
      count++;
    }
  }
  return count;
}

/**
 * Counts fuzzy token matches allowing small edit distance for STT phonetic variance
 * (e.g. 'juta' vs 'joota', 'he' vs 'hai', 'ikrar' vs 'iqraar')
 */
function countFuzzyTokenMatches(source: string[], target: string[]): number {
  let matches = 0;
  for (const targetToken of target) {
    const isMatch = source.some((srcToken) => {
      if (srcToken === targetToken) return true;
      if (Math.abs(srcToken.length - targetToken.length) > 2) return false;
      return levenshteinSimilarity(srcToken, targetToken) >= 0.75;
    });
    if (isMatch) matches++;
  }
  return matches;
}

/**
 * AntakshariMatcher
 * Reusable matching engine that validates a patient transcript against:
 * 1. Required Antakshari starting syllable/letter
 * 2. Candidate songs from the SongRepository
 */
export class AntakshariMatcher {
  private repository: SongRepository;
  private defaultThreshold: number;

  constructor(
    repository: SongRepository = defaultRepo,
    options: AntakshariMatchOptions = {}
  ) {
    this.repository = repository;
    this.defaultThreshold = options.threshold ?? 0.55;
  }

  /**
   * Main matching function
   * Evaluates player STT transcript against required starting syllable and song repository.
   */
  async match(
    transcript: string | null | undefined,
    requiredStartingSyllable: string,
    options?: AntakshariMatchOptions
  ): Promise<AntakshariMatchResult> {
    const threshold = options?.threshold ?? this.defaultThreshold;

    // ── 1. NORMALIZE TRANSCRIPT ──────────────────────────────────────────
    const norm = normalizeTranscript(transcript);

    if (norm.isEmpty) {
      return {
        isMatch: false,
        confidence: 0,
        reason: "empty_transcript",
      };
    }

    if (norm.isUnusable || norm.tokens.length === 0) {
      return {
        isMatch: false,
        confidence: 0,
        reason: "unusable_transcript",
        normalizedTranscript: norm.clean,
      };
    }

    // ── 2. DETERMINE BEGINNING SYLLABLE / LETTER & TOLERATE FILLERS ──────
    let activeTokens = norm.tokens;
    const reqSyllable = (requiredStartingSyllable || "").trim().toLowerCase();

    if (!reqSyllable) {
      return {
        isMatch: false,
        confidence: 0,
        reason: "unusable_transcript",
        normalizedTranscript: norm.clean,
      };
    }

    // If first token is a vocal filler (e.g., 'um', 'uh', 'hmm') and doesn't match reqSyllable,
    // but second token exists and matches reqSyllable, tolerate the filler
    if (
      activeTokens.length > 1 &&
      VOCAL_FILLERS.has(activeTokens[0]) &&
      !activeTokens[0].startsWith(reqSyllable) &&
      activeTokens[1].startsWith(reqSyllable)
    ) {
      activeTokens = activeTokens.slice(1);
    }

    const firstWord = activeTokens[0];
    const detectedSyllable = firstWord
      .slice(0, Math.max(1, reqSyllable.length))
      .toUpperCase();

    // ── 3. COMPARE WITH REQUIRED ANTAKSHARI SYLLABLE ──────────────────────
    const syllableMatches = firstWord.startsWith(reqSyllable);

    if (!syllableMatches) {
      return {
        isMatch: false,
        detectedStartingSyllable: detectedSyllable,
        confidence: 0,
        reason: "invalid_starting_syllable",
        normalizedTranscript: norm.clean,
      };
    }

    // ── 4. QUERY EXISTING SONG REPOSITORY FOR CANDIDATES ─────────────────
    let candidateSongs: Song[] = [];
    try {
      candidateSongs = await this.repository.getSongsByStartingSyllable(
        reqSyllable
      );
    } catch {
      candidateSongs = [];
    }

    // Fallback: If no candidate was returned by specific syllable search,
    // retrieve all songs and filter by starting letter/syllable match
    if (candidateSongs.length === 0) {
      try {
        const allSongs = await this.repository.getSongs();
        candidateSongs = allSongs.filter((s: Song) => {
          const syl = s.startingSyllable?.trim().toLowerCase();
          const title = s.title.trim().toLowerCase();
          const snippet = s.lyricsSnippet?.trim().toLowerCase();
          return (
            syl === reqSyllable ||
            syl?.startsWith(reqSyllable) ||
            title.startsWith(reqSyllable) ||
            snippet?.startsWith(reqSyllable)
          );
        });
      } catch {
        candidateSongs = [];
      }
    }

    if (candidateSongs.length === 0) {
      return {
        isMatch: false,
        detectedStartingSyllable: detectedSyllable,
        confidence: 0,
        reason: "no_matching_song",
        normalizedTranscript: norm.clean,
      };
    }

    // ── 5. EVALUATE FUZZY / TOLERANT SONG MATCHING ────────────────────────
    const activeTranscript = activeTokens.join(" ");
    let bestSong: Song | null = null;
    let bestScore = 0;

    for (const song of candidateSongs) {
      const score = this.calculateSimilarity(
        activeTranscript,
        activeTokens,
        song
      );
      if (score > bestScore) {
        bestScore = score;
        bestSong = song;
      }
    }

    const roundedConfidence = Math.round(bestScore * 100) / 100;

    // ── 6. RETURN STRUCTURED RESULT ───────────────────────────────────────
    if (bestSong && bestScore >= threshold) {
      return {
        isMatch: true,
        matchedSongId: bestSong.id,
        matchedSongTitle: bestSong.title,
        detectedStartingSyllable: detectedSyllable,
        confidence: roundedConfidence,
        reason: "valid_match",
        normalizedTranscript: norm.clean,
      };
    }

    return {
      isMatch: false,
      matchedSongId: bestSong?.id,
      matchedSongTitle: bestSong?.title,
      detectedStartingSyllable: detectedSyllable,
      confidence: roundedConfidence,
      reason: "no_matching_song",
      normalizedTranscript: norm.clean,
    };
  }

  /**
   * Internal scoring calculation between transcript and a song definition
   */
  private calculateSimilarity(
    transcript: string,
    transcriptTokens: string[],
    song: Song
  ): number {
    const normTitle = normalizeTranscript(song.title).clean;
    const titleTokens = normTitle.split(/\s+/).filter(Boolean);

    const normSnippet = normalizeTranscript(song.lyricsSnippet || "").clean;
    const snippetTokens = normSnippet.split(/\s+/).filter(Boolean);

    // Rule A: Exact title match
    if (transcript === normTitle) {
      return 1.0;
    }

    // Rule B: Transcript contains the full song title
    if (transcript.includes(normTitle)) {
      return 0.96;
    }

    // Rule C: Transcript starts with title or title starts with transcript (partial sing)
    if (normTitle.startsWith(transcript) && transcript.length >= 4) {
      const charRatio = transcript.length / normTitle.length;
      return Math.min(0.92, 0.72 + charRatio * 0.2);
    }

    // Rule D: Lyrics snippet contains transcript or vice-versa
    if (normSnippet.length > 0) {
      if (normSnippet.includes(transcript) && transcript.length >= 6) {
        return 0.92;
      }
      if (transcript.includes(normSnippet)) {
        return 0.94;
      }

      // Check first phrase of snippet (first 3-5 words)
      const snippetOpening = snippetTokens.slice(0, 4).join(" ");
      if (snippetOpening && transcript.includes(snippetOpening)) {
        return 0.9;
      }
    }

    // Rule E: Exact Token Overlap with Title
    const exactTitleMatches = countExactTokenMatches(
      transcriptTokens,
      titleTokens
    );
    const titleTokenRatio =
      titleTokens.length > 0 ? exactTitleMatches / titleTokens.length : 0;
    if (titleTokenRatio >= 0.75) {
      return 0.85 + (titleTokenRatio - 0.75) * 0.35;
    }

    // Rule F: Fuzzy Token Overlap with Title (tolerates STT phonetic typos)
    const fuzzyTitleMatches = countFuzzyTokenMatches(
      transcriptTokens,
      titleTokens
    );
    const fuzzyTitleRatio =
      titleTokens.length > 0 ? fuzzyTitleMatches / titleTokens.length : 0;
    if (fuzzyTitleRatio >= 0.75) {
      return 0.8 + (fuzzyTitleRatio - 0.75) * 0.3;
    }

    // Rule G: Token Overlap with Lyrics Snippet
    if (snippetTokens.length > 0) {
      const snippetMatches = countFuzzyTokenMatches(
        transcriptTokens,
        snippetTokens
      );
      const snippetRatio =
        snippetMatches /
        Math.min(transcriptTokens.length, snippetTokens.length);
      if (snippetRatio >= 0.6) {
        return 0.75 + (snippetRatio - 0.6) * 0.25;
      }
    }

    // Rule H: Overall Levenshtein ratio on title
    const levSim = levenshteinSimilarity(transcript, normTitle);
    if (levSim >= 0.7) {
      return levSim;
    }

    // Weak / partial correlation
    return Math.max(
      0,
      titleTokenRatio * 0.5,
      fuzzyTitleRatio * 0.45,
      levSim * 0.4
    );
  }
}

/**
 * Singleton instance of AntakshariMatcher using the default song repository
 */
export const antakshariMatcher = new AntakshariMatcher();

/**
 * Functional convenience helper for quick matching calls
 */
export async function matchAntakshariResponse(
  transcript: string | null | undefined,
  requiredStartingSyllable: string,
  repository: SongRepository = defaultRepo,
  options?: AntakshariMatchOptions
): Promise<AntakshariMatchResult> {
  const matcher = new AntakshariMatcher(repository, options);
  return matcher.match(transcript, requiredStartingSyllable, options);
}
