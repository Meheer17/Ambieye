import { SafeAudio as Audio } from "@/utils/safeAudio";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/apiService";
import { API_CONFIG } from "../api/config";
import {
  MusicTrack,
  MusicInteractionEvent,
  MusicInteractionEventType,
  MusicPlaybackState,
  ReminiscenceReactionType,
  CaregiverMusicSummary,
  CURATED_MUSIC_TRACKS,
} from "@/types/music";

export interface MusicPlayerState {
  currentTrack: MusicTrack | null;
  playbackState: MusicPlaybackState;
  positionSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  isMuted: boolean;
  volume: number;
  favorites: string[];
  lastReaction: ReminiscenceReactionType | null;
  errorMessage: string | null;
  sessionId: string | null;
  customTracks: MusicTrack[];
}

type MusicStateListener = (state: MusicPlayerState) => void;

const FAVORITES_STORAGE_PREFIX = "@ambieye_music_favorites_";
const EVENTS_STORAGE_PREFIX = "@ambieye_music_events_";
const CUSTOM_TRACKS_STORAGE_KEY = "@ambieye_custom_music_tracks";
const MAX_LOCAL_MUSIC_EVENTS = 500;

class MusicService {
  private soundObject: Audio.Sound | null = null;
  private htmlAudio: any = null;
  private webAudioCtx: any = null;
  private webOscillator: any = null;
  private synthInterval: any = null;
  private timerInterval: any = null;

  private currentTrack: MusicTrack | null = null;
  private playbackState: MusicPlaybackState = "idle";
  private positionSeconds = 0;
  private durationSeconds = 0;
  private progressPercent = 0;
  private isMuted = false;
  private volume = 0.85;
  private favorites: Set<string> = new Set();
  private customTracks: MusicTrack[] = [];
  private lastReaction: ReminiscenceReactionType | null = null;
  private errorMessage: string | null = null;
  private sessionId: string | null = null;
  private currentPatientId = "mahi";

  private listeners: Set<MusicStateListener> = new Set();
  private isAudioSessionInitialized = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadFavoritesFromStorage(this.currentPatientId);
    await this.loadCustomTracksFromStorage();
  }

  public subscribe(listener: MusicStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): MusicPlayerState {
    return {
      currentTrack: this.currentTrack,
      playbackState: this.playbackState,
      positionSeconds: this.positionSeconds,
      durationSeconds: this.durationSeconds,
      progressPercent: this.progressPercent,
      isMuted: this.isMuted,
      volume: this.volume,
      favorites: Array.from(this.favorites),
      lastReaction: this.lastReaction,
      errorMessage: this.errorMessage,
      sessionId: this.sessionId,
      customTracks: this.customTracks,
    };
  }

  public getAllTracks(): MusicTrack[] {
    return [...this.customTracks, ...CURATED_MUSIC_TRACKS];
  }

  public getCustomTracks(): MusicTrack[] {
    return this.customTracks;
  }

  /**
   * Adds a new custom track dedicated by caregiver / family
   */
  public async addCustomTrack(
    trackData: Partial<MusicTrack> & { title: string }
  ): Promise<MusicTrack> {
    const newTrack: MusicTrack = {
      id: `custom_music_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: trackData.title.trim(),
      titleAs: trackData.titleAs || trackData.title.trim(),
      titleHi: trackData.titleHi || trackData.title.trim(),
      artist: trackData.artist?.trim() || "Family Dedication",
      category: trackData.category || "hindi_classics",
      language: trackData.language || "Hindi",
      region: trackData.region || "Family Pick",
      artworkEmoji: trackData.artworkEmoji || "🎵",
      artworkBg: trackData.artworkBg || "#FDF2F8",
      borderColor: trackData.borderColor || "#EC4899",
      accentColor: trackData.accentColor || "#DB2777",
      audioUri:
        trackData.audioUri ||
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      durationSeconds: trackData.durationSeconds || 180,
      description:
        trackData.description ||
        `Dedicated with love by ${trackData.recommendedBy || "Family"}`,
      descriptionAs:
        trackData.descriptionAs ||
        `পৰিয়ালৰ মৰমৰ উপহাৰ: ${trackData.recommendedBy || "পৰিয়াল"}`,
      descriptionHi:
        trackData.descriptionHi ||
        `परिवार का स्नेह भरा संगीत: ${trackData.recommendedBy || "परिवार"}`,
      isFamilyRecommended: true,
      recommendedBy: trackData.recommendedBy || "Anita (Daughter)",
    };

    this.customTracks = [newTrack, ...this.customTracks];
    this.favorites.add(newTrack.id);

    await this.saveCustomTracksToStorage();
    await this.saveFavoritesToStorage(this.currentPatientId);
    this.notify();

    return newTrack;
  }

  /**
   * Deletes a custom track
   */
  public async deleteCustomTrack(trackId: string): Promise<void> {
    this.customTracks = this.customTracks.filter((t) => t.id !== trackId);
    this.favorites.delete(trackId);
    if (this.currentTrack?.id === trackId) {
      await this.stop();
    }
    await this.saveCustomTracksToStorage();
    await this.saveFavoritesToStorage(this.currentPatientId);
    this.notify();
  }

  private async loadCustomTracksFromStorage(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(CUSTOM_TRACKS_STORAGE_KEY);
      if (raw) {
        this.customTracks = JSON.parse(raw);
        this.notify();
      }
    } catch (e) {
      console.warn("[MusicService] Failed to load custom tracks:", e);
    }
  }

  private async saveCustomTracksToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CUSTOM_TRACKS_STORAGE_KEY,
        JSON.stringify(this.customTracks)
      );
    } catch (e) {
      console.warn("[MusicService] Failed to save custom tracks:", e);
    }
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.warn("[MusicService] Listener error:", e);
      }
    });
  }

  private async initAudioMode(): Promise<void> {
    if (this.isAudioSessionInitialized) return;
    try {
      if (Platform.OS !== "web") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
      this.isAudioSessionInitialized = true;
    } catch (err) {
      console.warn("[MusicService] Audio session configuration warning:", err);
    }
  }

  /**
   * Starts playback of a selected track with multi-tier audio fallback (expo-av -> HTML5 audio -> procedural harmonic audio)
   */
  public async playTrack(track: MusicTrack, patientId = "mahi"): Promise<boolean> {
    this.currentPatientId = patientId;
    await this.initAudioMode();

    // Clean up previous playback and synth intervals
    await this.stopAndRecordPreviousSession("music_skipped");

    this.currentTrack = track;
    this.sessionId = `sess_music_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.playbackState = "loading";
    this.positionSeconds = 0;
    this.durationSeconds = track.durationSeconds || 180;
    this.progressPercent = 0;
    this.lastReaction = null;
    this.errorMessage = null;
    this.notify();

    // 1. Try HTML5 Audio on Web
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof (window as any).Audio !== "undefined") {
      try {
        if (this.htmlAudio) {
          this.htmlAudio.pause();
          this.htmlAudio = null;
        }

        const audio = new (window as any).Audio(track.audioUri);
        audio.volume = this.volume;
        audio.muted = this.isMuted;
        this.htmlAudio = audio;

        audio.onloadedmetadata = () => {
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            this.durationSeconds = Math.floor(audio.duration);
          }
        };

        audio.onplay = () => {
          this.playbackState = "playing";
          this.startProgressTimer();
          this.notify();
        };

        audio.onpause = () => {
          if (this.playbackState === "playing") {
            this.playbackState = "paused";
            this.stopProgressTimer();
            this.notify();
          }
        };

        audio.onended = () => {
          this.handleTrackNaturalFinish();
        };

        audio.onerror = () => {
          console.warn("[MusicService Web] HTML5 Audio failed, using Procedural Harmonic Engine.");
          this.startProceduralMelodicPlayback();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.playbackState = "playing";
              this.startProgressTimer();
              this.notify();
            })
            .catch((e: any) => {
              console.warn("[MusicService Web] Audio autoplay blocked or network issue:", e);
              this.startProceduralMelodicPlayback();
            });
        }

        await this.recordEvent("music_play_started", 0, {
          trackTitle: track.title,
          category: track.category,
          language: track.language,
          durationSeconds: this.durationSeconds,
          recommendedBy: track.recommendedBy,
        });

        return true;
      } catch (e) {
        console.warn("[MusicService Web] Error launching HTML5 audio, using fallback synth:", e);
        this.startProceduralMelodicPlayback();
        return true;
      }
    }

    // 2. Try Native expo-av on iOS & Android
    try {
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: track.audioUri },
        { shouldPlay: true, volume: this.volume, isMuted: this.isMuted },
        this.onPlaybackStatusUpdate
      );

      this.soundObject = sound;

      if (status.isLoaded) {
        this.playbackState = "playing";
        if (status.durationMillis) {
          this.durationSeconds = Math.floor(status.durationMillis / 1000);
        }
        this.startProgressTimer();
        this.notify();

        await this.recordEvent("music_play_started", 0, {
          trackTitle: track.title,
          category: track.category,
          language: track.language,
          durationSeconds: this.durationSeconds,
          recommendedBy: track.recommendedBy,
        });

        return true;
      } else {
        this.startProceduralMelodicPlayback();
        return true;
      }
    } catch (err: any) {
      console.warn("[MusicService Native] Audio.Sound failed, starting Procedural Soundscape:", err);
      this.startProceduralMelodicPlayback();
      return true;
    }
  }

  /**
   * Procedural Harmonic Soundscape Fallback
   * Plays real ambient musical frequencies via Web Audio API or timer advance
   */
  private startProceduralMelodicPlayback(): void {
    this.playbackState = "playing";
    this.errorMessage = null;
    this.notify();

    // If Web Audio API exists (in browser), synthesize real soothing acoustic tones
    if (typeof window !== "undefined" && ((window as any).AudioContext || (window as any).webkitAudioContext)) {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!this.webAudioCtx || this.webAudioCtx.state === "closed") {
          this.webAudioCtx = new AudioCtx();
        }
        if (this.webAudioCtx.state === "suspended") {
          this.webAudioCtx.resume();
        }

        // Play gentle melodic folk notes in pentatonic scale
        const melodyFrequencies = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0];
        let noteIdx = 0;

        if (this.synthInterval) clearInterval(this.synthInterval);
        this.synthInterval = setInterval(() => {
          if (this.playbackState !== "playing" || !this.webAudioCtx) return;
          try {
            const osc = this.webAudioCtx.createOscillator();
            const gain = this.webAudioCtx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(melodyFrequencies[noteIdx % melodyFrequencies.length], this.webAudioCtx.currentTime);

            gain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.15, this.webAudioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.webAudioCtx.currentTime + 1.2);

            osc.connect(gain);
            gain.connect(this.webAudioCtx.destination);

            osc.start();
            osc.stop(this.webAudioCtx.currentTime + 1.2);

            noteIdx++;
          } catch (_) {}
        }, 1400);
      } catch (err) {
        console.warn("[MusicService] Web Audio synth notice:", err);
      }
    }

    this.startProgressTimer();

    if (this.currentTrack) {
      this.recordEvent("music_play_started", 0, {
        trackTitle: this.currentTrack.title,
        category: this.currentTrack.category,
        language: this.currentTrack.language,
        mode: "acoustic_soundscape_active",
      }).catch(() => {});
    }
  }

  private startProgressTimer(): void {
    this.stopProgressTimer();
    this.timerInterval = setInterval(() => {
      if (this.playbackState !== "playing") return;

      if (this.htmlAudio && !isNaN(this.htmlAudio.currentTime)) {
        this.positionSeconds = Math.floor(this.htmlAudio.currentTime);
      } else {
        this.positionSeconds += 1;
      }

      if (this.durationSeconds > 0) {
        this.progressPercent = Math.min(100, Math.round((this.positionSeconds / this.durationSeconds) * 100));
      }

      if (this.positionSeconds >= this.durationSeconds && this.durationSeconds > 0) {
        this.handleTrackNaturalFinish();
      } else {
        this.notify();
      }
    }, 1000);
  }

  private stopProgressTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private async handleTrackNaturalFinish(): Promise<void> {
    this.playbackState = "finished";
    this.positionSeconds = this.durationSeconds;
    this.progressPercent = 100;
    this.stopProgressTimer();
    this.notify();

    if (this.currentTrack && this.sessionId) {
      await this.recordEvent("music_play_completed", this.durationSeconds, {
        trackTitle: this.currentTrack.title,
        category: this.currentTrack.category,
        language: this.currentTrack.language,
        durationSeconds: this.durationSeconds,
        completionPercent: 100,
      });
    }
  }

  private onPlaybackStatusUpdate = async (status: any): Promise<void> => {
    if (!status.isLoaded) return;

    const posSec = Math.floor((status.positionMillis || 0) / 1000);
    const durSec = status.durationMillis ? Math.floor(status.durationMillis / 1000) : this.durationSeconds;

    this.positionSeconds = posSec;
    if (durSec > 0) {
      this.durationSeconds = durSec;
      this.progressPercent = Math.min(100, Math.round((posSec / durSec) * 100));
    }

    if (status.isPlaying && this.playbackState !== "playing") {
      this.playbackState = "playing";
    } else if (!status.isPlaying && status.positionMillis > 0 && this.playbackState === "playing") {
      this.playbackState = "paused";
    }

    if (status.didJustFinish) {
      await this.handleTrackNaturalFinish();
      return;
    }

    this.notify();
  };

  /**
   * Pause playback
   */
  public async pause(): Promise<void> {
    if (this.playbackState === "playing") {
      try {
        if (this.htmlAudio) {
          this.htmlAudio.pause();
        }
        if (this.soundObject) {
          await this.soundObject.pauseAsync();
        }
      } catch (_) {}

      this.playbackState = "paused";
      this.stopProgressTimer();
      this.notify();

      if (this.currentTrack && this.sessionId) {
        await this.recordEvent("music_play_paused", this.positionSeconds, {
          trackTitle: this.currentTrack.title,
          category: this.currentTrack.category,
        });
      }
    }
  }

  /**
   * Resume playback
   */
  public async resume(): Promise<void> {
    if (this.playbackState === "paused" || this.playbackState === "finished") {
      try {
        if (this.playbackState === "finished") {
          this.positionSeconds = 0;
          this.progressPercent = 0;
        }

        if (this.htmlAudio) {
          if (this.playbackState === "finished") {
            this.htmlAudio.currentTime = 0;
          }
          this.htmlAudio.play().catch(() => {});
        } else if (this.soundObject) {
          if (this.playbackState === "finished") {
            await this.soundObject.setPositionAsync(0);
          }
          await this.soundObject.playAsync();
        }
      } catch (_) {}

      this.playbackState = "playing";
      this.startProgressTimer();
      this.notify();

      if (this.currentTrack && this.sessionId) {
        await this.recordEvent("music_play_resumed", this.positionSeconds, {
          trackTitle: this.currentTrack.title,
          category: this.currentTrack.category,
        });
      }
    }
  }

  /**
   * Seek to specific second in track
   */
  public async seek(seconds: number): Promise<void> {
    const clamped = Math.max(0, Math.min(seconds, this.durationSeconds));
    this.positionSeconds = clamped;
    if (this.durationSeconds > 0) {
      this.progressPercent = Math.round((clamped / this.durationSeconds) * 100);
    }

    try {
      if (this.htmlAudio) {
        this.htmlAudio.currentTime = clamped;
      }
      if (this.soundObject) {
        await this.soundObject.setPositionAsync(clamped * 1000);
      }
    } catch (_) {}

    this.notify();
  }

  /**
   * Stop current track
   */
  public async stop(): Promise<void> {
    this.stopProgressTimer();
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }

    try {
      if (this.htmlAudio) {
        this.htmlAudio.pause();
        this.htmlAudio = null;
      }
      if (this.soundObject) {
        await this.soundObject.stopAsync();
        await this.soundObject.unloadAsync();
        this.soundObject = null;
      }
    } catch (_) {}

    this.playbackState = "idle";
    this.positionSeconds = 0;
    this.progressPercent = 0;
    this.notify();
  }

  /**
   * Stops previous session and records final duration
   */
  private async stopAndRecordPreviousSession(
    eventType: MusicInteractionEventType = "music_skipped"
  ): Promise<void> {
    await this.stop();

    if (this.currentTrack && this.sessionId && this.positionSeconds > 0 && this.playbackState !== "finished") {
      await this.recordEvent(eventType, this.positionSeconds, {
        trackTitle: this.currentTrack.title,
        category: this.currentTrack.category,
      });
    }
  }

  /**
   * Play Next Track
   */
  public async playNext(): Promise<boolean> {
    const all = this.getAllTracks();
    if (all.length === 0) return false;

    let nextIndex = 0;
    if (this.currentTrack) {
      const currentIndex = all.findIndex((t) => t.id === this.currentTrack?.id);
      nextIndex = (currentIndex + 1) % all.length;
    }
    return this.playTrack(all[nextIndex], this.currentPatientId);
  }

  /**
   * Play Previous Track
   */
  public async playPrevious(): Promise<boolean> {
    const all = this.getAllTracks();
    if (all.length === 0) return false;

    let prevIndex = 0;
    if (this.currentTrack) {
      const currentIndex = all.findIndex((t) => t.id === this.currentTrack?.id);
      prevIndex = (currentIndex - 1 + all.length) % all.length;
    }
    return this.playTrack(all[prevIndex], this.currentPatientId);
  }

  /**
   * Records a gentle non-clinical reminiscence reaction
   */
  public async recordReminiscenceReaction(
    reaction: ReminiscenceReactionType,
    patientId?: string,
    trackId?: string
  ): Promise<void> {
    if (patientId) this.currentPatientId = patientId;
    this.lastReaction = reaction;
    this.notify();

    const all = this.getAllTracks();
    const targetTrack = trackId
      ? all.find((t) => t.id === trackId) || this.currentTrack
      : this.currentTrack;

    await this.recordEvent("music_reaction", this.positionSeconds, {
      trackTitle: targetTrack?.title || trackId || "Unknown Track",
      category: targetTrack?.category,
      language: targetTrack?.language,
      reaction,
    });
  }

  /**
   * Records that patient launched Sing-Along (Antakshari)
   */
  public async recordSingAlongStarted(patientId?: string, trackId?: string): Promise<void> {
    if (patientId) this.currentPatientId = patientId;
    const all = this.getAllTracks();
    const targetTrack = trackId
      ? all.find((t) => t.id === trackId) || this.currentTrack
      : this.currentTrack;

    await this.recordEvent("sing_along_started", 0, {
      trackTitle: targetTrack?.title || "Antakshari Session",
      category: targetTrack?.category || "sing_along",
    });
  }

  /**
   * Favorites or Unfavorites a Track
   */
  public async toggleFavorite(trackId: string, patientId?: string): Promise<boolean> {
    if (patientId) this.currentPatientId = patientId;
    const isFav = this.favorites.has(trackId);
    if (isFav) {
      this.favorites.delete(trackId);
    } else {
      this.favorites.add(trackId);
    }
    const newFavState = !isFav;
    this.notify();

    await this.saveFavoritesToStorage(this.currentPatientId);

    const all = this.getAllTracks();
    const track = all.find((t) => t.id === trackId);
    await this.recordEvent(
      newFavState ? "music_favorited" : "music_unfavorited",
      this.positionSeconds,
      {
        trackTitle: track?.title || trackId,
        category: track?.category,
        language: track?.language,
      }
    );

    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.MUSIC.FAVORITES(this.currentPatientId), {
        trackId,
        isFavorite: newFavState,
      });
    } catch {
      // Offline safe
    }

    return newFavState;
  }

  public isFavorite(trackId: string): boolean {
    return this.favorites.has(trackId);
  }

  public getFavoritesList(): string[] {
    return Array.from(this.favorites);
  }

  /**
   * Record raw factual music interaction event
   */
  private async recordEvent(
    eventType: MusicInteractionEventType,
    playbackPositionSeconds: number,
    metadata: Record<string, any> = {}
  ): Promise<MusicInteractionEvent> {
    const event: MusicInteractionEvent = {
      id: `music_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: this.currentPatientId,
      sessionId: this.sessionId || `session_${Date.now()}`,
      trackId: this.currentTrack?.id || "general",
      eventType,
      timestamp: new Date().toISOString(),
      playbackPositionSeconds: Math.round(playbackPositionSeconds * 10) / 10,
      metadata,
    };

    try {
      const storageKey = `${EVENTS_STORAGE_PREFIX}${this.currentPatientId}`;
      const raw = await AsyncStorage.getItem(storageKey);
      const events: MusicInteractionEvent[] = raw ? JSON.parse(raw) : [];
      const updated = [event, ...events].slice(0, MAX_LOCAL_MUSIC_EVENTS);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("[MusicService] Local event store error:", e);
    }

    this.syncEventToBackend(event).catch(() => {});
    return event;
  }

  private async syncEventToBackend(event: MusicInteractionEvent): Promise<void> {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.MUSIC.EVENTS, event);
    } catch {
      // Offline resilience
    }
  }

  private async loadFavoritesFromStorage(patientId: string): Promise<void> {
    try {
      const storageKey = `${FAVORITES_STORAGE_PREFIX}${patientId}`;
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const list: string[] = JSON.parse(raw);
        this.favorites = new Set(list);
        this.notify();
      }
    } catch (e) {
      console.warn("[MusicService] Load favorites error:", e);
    }
  }

  private async saveFavoritesToStorage(patientId: string): Promise<void> {
    try {
      const storageKey = `${FAVORITES_STORAGE_PREFIX}${patientId}`;
      const list = Array.from(this.favorites);
      await AsyncStorage.setItem(storageKey, JSON.stringify(list));
    } catch (e) {
      console.warn("[MusicService] Save favorites error:", e);
    }
  }

  public async getLocalEvents(patientId = "mahi"): Promise<MusicInteractionEvent[]> {
    try {
      const storageKey = `${EVENTS_STORAGE_PREFIX}${patientId}`;
      const raw = await AsyncStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async getCaregiverSummary(patientId = "mahi"): Promise<CaregiverMusicSummary> {
    try {
      const res = await apiClient.get<CaregiverMusicSummary>(
        API_CONFIG.ENDPOINTS.MUSIC.SUMMARY(patientId)
      );
      if (res.data) {
        return res.data;
      }
    } catch {}

    const events = await this.getLocalEvents(patientId);

    const startedCount = events.filter((e) => e.eventType === "music_play_started").length;
    const completedCount = events.filter((e) => e.eventType === "music_play_completed").length;
    const skippedCount = events.filter((e) => e.eventType === "music_skipped").length;

    const sessionMaxPositions = new Map<string, number>();
    events.forEach((e) => {
      const current = sessionMaxPositions.get(e.sessionId) || 0;
      if (e.playbackPositionSeconds > current) {
        sessionMaxPositions.set(e.sessionId, e.playbackPositionSeconds);
      }
    });

    let totalDurationSeconds = 0;
    sessionMaxPositions.forEach((pos) => {
      totalDurationSeconds += pos;
    });
    totalDurationSeconds = Math.round(totalDurationSeconds);

    const recentReactions = events
      .filter((e) => e.eventType === "music_reaction" && e.metadata?.reaction)
      .slice(0, 5)
      .map((e) => ({
        trackId: e.trackId,
        trackTitle: e.metadata?.trackTitle || e.trackId,
        reaction: e.metadata?.reaction || "familiar",
        timestamp: e.timestamp,
      }));

    const categoryMap: Record<string, number> = {};
    const languageMap: Record<string, number> = {};
    const distinctDates = new Set<string>();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    events.forEach((e) => {
      if (e.metadata?.category) {
        categoryMap[e.metadata.category] = (categoryMap[e.metadata.category] || 0) + 1;
      }
      if (e.metadata?.language) {
        languageMap[e.metadata.language] = (languageMap[e.metadata.language] || 0) + 1;
      }
      if (e.timestamp) {
        const dateStr = e.timestamp.substring(0, 10);
        const eventDate = new Date(e.timestamp);
        if (eventDate >= sevenDaysAgo) {
          distinctDates.add(dateStr);
        }
      }
    });

    const preferredCategories = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const preferredLanguages = Object.entries(languageMap)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    return {
      patientId,
      totalListeningDurationSeconds: totalDurationSeconds,
      totalListeningMinutes: Math.round((totalDurationSeconds / 60) * 10) / 10,
      songsStartedCount: startedCount,
      songsCompletedCount: completedCount,
      songsSkippedCount: skippedCount,
      favoritesCount: this.favorites.size,
      favoriteTrackIds: Array.from(this.favorites),
      recentReactions,
      preferredCategories,
      preferredLanguages,
      activeDaysLast7: distinctDates.size,
    };
  }

  public async cleanup(): Promise<void> {
    await this.stop();
  }
}

export const musicService = new MusicService();
