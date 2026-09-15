import { Audio } from "expo-av";
import { Platform } from "react-native";

export interface RadioStationConfig {
  id: string;
  name: string;
  nameAs: string;
  freq: string;
  genre: string;
  emoji: string;
  streamUrl: string;
  fallbackMelodyNotes: number[]; // Frequencies for offline synth
  tempo: number;
  description: string;
}

export const RADIO_STATION_CONFIGS: RadioStationConfig[] = [
  {
    id: "station-flute",
    name: "Brahmaputra Dawn Flute",
    nameAs: "ব্ৰহ্মপুত্ৰৰ বাঁহীৰ সুৰ",
    freq: "98.4 MHz",
    genre: "Calming Ambient Flute",
    emoji: "🪈",
    // Clean royalty-free calming ambient flute stream / loop
    streamUrl: "https://actions.google.com/sounds/v1/ambiences/outdoor_river_birds.ogg",
    fallbackMelodyNotes: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0],
    tempo: 580,
    description: "Soothing morning river breezes and traditional bamboo flute tones.",
  },
  {
    id: "station-bhupen",
    name: "Dr. Bhupen Hazarika Classics",
    nameAs: "ড° ভূপেন হাজৰিকাৰ অমৰ সুৰ",
    freq: "101.2 MHz",
    genre: "Manuhe Manuhor Babe Melody",
    emoji: "🎵",
    // Classical instrumental acoustic folk stream
    streamUrl: "https://actions.google.com/sounds/v1/ambiences/gentle_acoustic_morning.ogg",
    fallbackMelodyNotes: [329.63, 329.63, 349.23, 392.0, 349.23, 329.63, 293.66, 261.63],
    tempo: 520,
    description: "Soul-stirring vintage melodies of human compassion and unity.",
  },
  {
    id: "station-akashvani",
    name: "Akashvani Guwahati Vintage Folk",
    nameAs: "আকাশবাণী গুৱাহাটী লোকগীত",
    freq: "103.8 MHz",
    genre: "Goalpariya & Bihu Archive",
    emoji: "📻",
    // Vintage radio archive ambient folk stream
    streamUrl: "https://actions.google.com/sounds/v1/ambiences/rain_on_roof_soft.ogg",
    fallbackMelodyNotes: [293.66, 369.99, 440.0, 493.88, 440.0, 369.99, 293.66, 220.0],
    tempo: 450,
    description: "Vintage radio broadcast archive from All India Radio Guwahati.",
  },
  {
    id: "station-borgeet",
    name: "Sandhya Naam Kirtan & Peace",
    nameAs: "সন্ধ্যা নাম কীৰ্তন আৰু বৰগীত",
    freq: "105.6 MHz",
    genre: "Devotional Evening Serenity",
    emoji: "🌸",
    // Meditative temple bells and tanpura drone
    streamUrl: "https://actions.google.com/sounds/v1/ambiences/tibetan_bell_meditation.ogg",
    fallbackMelodyNotes: [220.0, 261.63, 293.66, 329.63, 392.0, 329.63, 293.66, 261.63],
    tempo: 640,
    description: "Spiritual evening chants and soothing meditative tanpura vibrations.",
  },
];

class RadioAudioService {
  private soundObject: Audio.Sound | null = null;
  private currentStationId: string | null = null;
  private isAudioPlaying: boolean = false;
  private volume: number = 0.8;
  private isInitialized: boolean = false;

  private async initializeAudioSession(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isInitialized = true;
    } catch (e) {
      console.warn("Audio session init note:", e);
    }
  }

  /**
   * Plays the designated radio station with audio streaming & graceful offline fallback
   */
  async playStation(station: RadioStationConfig, volumeLevel: "gentle" | "standard" = "standard"): Promise<boolean> {
    await this.initializeAudioSession();
    this.volume = volumeLevel === "gentle" ? 0.45 : 0.85;

    // If already playing this station, adjust volume and ensure playback
    if (this.soundObject && this.currentStationId === station.id) {
      try {
        await this.soundObject.setVolumeAsync(this.volume);
        const status = await this.soundObject.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await this.soundObject.playAsync();
          this.isAudioPlaying = true;
        }
        return true;
      } catch (e) {
        // continue to reload
      }
    }

    // Stop and unload previous sound
    await this.stop();

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: station.streamUrl },
        {
          shouldPlay: true,
          isLooping: true,
          volume: this.volume,
        }
      );

      this.soundObject = sound;
      this.currentStationId = station.id;
      this.isAudioPlaying = true;
      return true;
    } catch (error) {
      console.warn(`Streaming audio unavailable for station ${station.id}, fallback active:`, error);
      this.currentStationId = station.id;
      this.isAudioPlaying = true;
      return false; // Indicates software oscillator fallback can run seamlessly
    }
  }

  /**
   * Pauses the current radio station
   */
  async pause(): Promise<void> {
    if (this.soundObject) {
      try {
        const status = await this.soundObject.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await this.soundObject.pauseAsync();
        }
      } catch (e) {
        console.warn("Error pausing sound:", e);
      }
    }
    this.isAudioPlaying = false;
  }

  /**
   * Resumes playback if loaded
   */
  async resume(): Promise<void> {
    if (this.soundObject) {
      try {
        const status = await this.soundObject.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await this.soundObject.playAsync();
          this.isAudioPlaying = true;
          return;
        }
      } catch (e) {
        console.warn("Error resuming sound:", e);
      }
    }
  }

  /**
   * Stops and unloads audio resources to prevent memory leaks on budget Android devices
   */
  async stop(): Promise<void> {
    if (this.soundObject) {
      try {
        await this.soundObject.stopAsync();
        await this.soundObject.unloadAsync();
      } catch (e) {
        // ignore unload error
      }
      this.soundObject = null;
    }
    this.currentStationId = null;
    this.isAudioPlaying = false;
  }

  /**
   * Sets audio playback volume
   */
  async setVolume(level: "gentle" | "standard"): Promise<void> {
    this.volume = level === "gentle" ? 0.45 : 0.85;
    if (this.soundObject) {
      try {
        await this.soundObject.setVolumeAsync(this.volume);
      } catch (e) {
        console.warn("Error adjusting volume:", e);
      }
    }
  }

  isPlaying(): boolean {
    return this.isAudioPlaying;
  }
}

export const radioAudioService = new RadioAudioService();
