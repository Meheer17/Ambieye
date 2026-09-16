import { Song, SongFilterOptions } from "@/types/antakshari";
import { SongRepository } from "./songRepository";
import { SAMPLE_SONGS } from "./sampleSongs";

/**
 * LocalSongRepository
 * In-memory local dataset implementation of SongRepository.
 * Can be swapped with an API/remote implementation later without modifying callers.
 */
export class LocalSongRepository implements SongRepository {
  private songs: Song[];

  constructor(initialSongs: Song[] = SAMPLE_SONGS) {
    this.songs = [...initialSongs];
  }

  /**
   * Retrieve all songs or apply optional filter criteria
   */
  async getSongs(filter?: SongFilterOptions): Promise<Song[]> {
    if (!filter) {
      return [...this.songs];
    }

    return this.songs.filter((song) => {
      if (filter.language) {
        if (
          song.language.trim().toLowerCase() !==
          filter.language.trim().toLowerCase()
        ) {
          return false;
        }
      }

      if (filter.region && song.region) {
        if (
          song.region.trim().toLowerCase() !==
          filter.region.trim().toLowerCase()
        ) {
          return false;
        }
      }

      if (filter.category) {
        if (
          song.category.trim().toLowerCase() !==
          filter.category.trim().toLowerCase()
        ) {
          return false;
        }
      }

      if (filter.startingSyllable) {
        const target = filter.startingSyllable.trim().toLowerCase();
        const matchesSyllable =
          song.startingSyllable?.trim().toLowerCase() === target ||
          song.startingSyllable?.trim().toLowerCase().startsWith(target);
        const matchesTitlePrefix = song.title
          .trim()
          .toLowerCase()
          .startsWith(target);

        if (!matchesSyllable && !matchesTitlePrefix) {
          return false;
        }
      }

      if (filter.tag && song.tags) {
        const tagTarget = filter.tag.trim().toLowerCase();
        const hasTag = song.tags.some(
          (t) => t.trim().toLowerCase() === tagTarget
        );
        if (!hasTag) {
          return false;
        }
      }

      if (filter.searchQuery) {
        const query = filter.searchQuery.trim().toLowerCase();
        const titleMatch = song.title.toLowerCase().includes(query);
        const artistMatch = song.artist?.toLowerCase().includes(query);
        const snippetMatch = song.lyricsSnippet?.toLowerCase().includes(query);
        const tagMatch = song.tags?.some((t) =>
          t.toLowerCase().includes(query)
        );

        if (!titleMatch && !artistMatch && !snippetMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Retrieve a single song by its unique id
   */
  async getSongById(id: string): Promise<Song | null> {
    const found = this.songs.find((song) => song.id === id);
    return found ? { ...found } : null;
  }

  /**
   * Retrieve songs filtered by language (case-insensitive)
   */
  async getSongsByLanguage(language: string): Promise<Song[]> {
    const target = language.trim().toLowerCase();
    return this.songs.filter(
      (song) => song.language.trim().toLowerCase() === target
    );
  }

  /**
   * Retrieve songs filtered by geographical/cultural region (case-insensitive)
   */
  async getSongsByRegion(region: string): Promise<Song[]> {
    const target = region.trim().toLowerCase();
    return this.songs.filter(
      (song) => song.region && song.region.trim().toLowerCase() === target
    );
  }

  /**
   * Retrieve songs starting with a particular syllable or letter (case-insensitive)
   */
  async getSongsByStartingSyllable(syllable: string): Promise<Song[]> {
    const target = syllable.trim().toLowerCase();
    return this.songs.filter((song) => {
      const matchesSyllable =
        song.startingSyllable?.trim().toLowerCase() === target ||
        song.startingSyllable?.trim().toLowerCase().startsWith(target);
      const matchesTitlePrefix = song.title
        .trim()
        .toLowerCase()
        .startsWith(target);

      return Boolean(matchesSyllable || matchesTitlePrefix);
    });
  }

  /**
   * Retrieve songs matching a specific category
   */
  async getSongsByCategory(category: string): Promise<Song[]> {
    const target = category.trim().toLowerCase();
    return this.songs.filter(
      (song) => song.category.trim().toLowerCase() === target
    );
  }

  /**
   * Pick a random song matching optional filter options
   */
  async getRandomSong(filter?: SongFilterOptions): Promise<Song | null> {
    const pool = await this.getSongs(filter);
    if (pool.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    return { ...pool[randomIndex] };
  }
}
