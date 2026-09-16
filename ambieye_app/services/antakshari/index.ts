import { SongRepository } from "./songRepository";
import { LocalSongRepository } from "./localSongRepository";

export * from "@/types/antakshari";
export * from "./songRepository";
export * from "./localSongRepository";
export * from "./sampleSongs";
export * from "./antakshariMatcher";
export * from "./antakshariGameLoop";

/**
 * Default shared SongRepository singleton.
 * Can later be swapped with RemoteSongRepository without changing consumer code.
 */
export const songRepository: SongRepository = new LocalSongRepository();

