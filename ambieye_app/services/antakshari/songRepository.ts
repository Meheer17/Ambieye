import { Song, SongFilterOptions } from "@/types/antakshari";

/**
 * Abstract Song Repository Interface
 * Defines the contract for fetching songs so that a local dataset,
 * SQLite storage, or remote REST API can be swapped transparently.
 */
export interface SongRepository {
  /**
   * Retrieve all songs, optionally matching provided filter options
   */
  getSongs(filter?: SongFilterOptions): Promise<Song[]>;

  /**
   * Retrieve a single song by its unique identifier
   */
  getSongById(id: string): Promise<Song | null>;

  /**
   * Retrieve songs filtered by language (case-insensitive)
   */
  getSongsByLanguage(language: string): Promise<Song[]>;

  /**
   * Retrieve songs filtered by geographical/cultural region (case-insensitive)
   */
  getSongsByRegion(region: string): Promise<Song[]>;

  /**
   * Retrieve songs starting with a particular syllable or letter (case-insensitive)
   */
  getSongsByStartingSyllable(syllable: string): Promise<Song[]>;

  /**
   * Retrieve songs matching a specific category
   */
  getSongsByCategory(category: string): Promise<Song[]>;

  /**
   * Pick a random song, optionally restricted by filter options
   */
  getRandomSong(filter?: SongFilterOptions): Promise<Song | null>;
}
