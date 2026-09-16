/**
 * Antakshari Song Data Types & Categories
 * Reusable data definitions for the Antakshari Battle feature
 */

export type SongCategory =
  | "assamese_folk_bihu"
  | "naga_folk"
  | "northeast_regional"
  | "bollywood_classics"
  | "other_regional"
  | (string & {});

export interface Song {
  id: string;
  title: string;
  language: string; // e.g., 'Assamese', 'Nagamese', 'Hindi', 'Bengali', 'Manipuri'
  region?: string; // e.g., 'Assam', 'Nagaland', 'Northeast India', 'Pan-India'
  artist?: string; // Singer / composer if available
  startingSyllable?: string; // e.g., 'M', 'B', 'K', 'O', 'ম', 'ব'
  lyricsSnippet?: string; // Short sample snippet or cultural line (not copyrighted full lyrics)
  category: SongCategory; // Source category
  tags?: string[]; // Searchable tags/keywords
  metadata?: Record<string, any>; // Extensible metadata for future enhancements
}

export interface SongFilterOptions {
  language?: string;
  region?: string;
  category?: SongCategory;
  startingSyllable?: string;
  tag?: string;
  searchQuery?: string;
}

/**
 * Standard Match Reason identifiers returned by the Matching Engine
 */
export type MatchReason =
  | "valid_match"
  | "invalid_starting_syllable"
  | "no_matching_song"
  | "empty_transcript"
  | "unusable_transcript";

/**
 * Structured result returned by the Antakshari Matching Engine
 */
export interface AntakshariMatchResult {
  isMatch: boolean;
  matchedSongId?: string;
  matchedSongTitle?: string;
  detectedStartingSyllable?: string;
  confidence?: number;
  reason?: MatchReason | string;
  normalizedTranscript?: string;
}

/**
 * Configuration options for the Antakshari Matcher
 */
export interface AntakshariMatchOptions {
  /**
   * Minimum confidence score (0.0 - 1.0) to qualify as a valid match.
   * Default is 0.55.
   */
  threshold?: number;
}

