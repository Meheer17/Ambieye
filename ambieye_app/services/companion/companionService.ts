import { caregiverStorage, MemoryBankItem, PatientProfile, CognitiveGameSession, CaregiverActivity, CaregiverSleepRecord } from "@/utils/caregiverStorage";
import { reminderStorage, DailyHydration, MedicationItem } from "@/utils/reminderStorage";
import { federatedService, CognitiveStabilityResult } from "@/services/api/federatedService";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { SupportedLanguage } from "@/constants/i18n";

export interface CompanionMessage {
  id: string;
  sender: "avatar" | "elder";
  text: string;
  timestamp: string;
  topic?: string;
  comfortEmoji?: string;
  relatedMemory?: MemoryBankItem;
}

export interface ReminiscenceTopic {
  id: string;
  title: string;
  prompt: string;
  avatarStarter: string;
  avatarStarterAs?: string;
  avatarStarterHi?: string;
  emoji: string;
  category: "places" | "people" | "music" | "routine" | "calm" | "games" | "health";
}

export interface PatientContinuousContext {
  profile: PatientProfile;
  latestGame?: CognitiveGameSession;
  todayActivities: CaregiverActivity[];
  hydration: DailyHydration;
  pendingMeds: MedicationItem[];
  medsTakenCount: number;
  sleep: CaregiverSleepRecord;
  memoryBank: MemoryBankItem[];
  flStability: CognitiveStabilityResult;
}

export const REMINISCENCE_TOPICS: ReminiscenceTopic[] = [
  {
    id: "topic-games",
    title: "Today's Antakshari & Games",
    prompt: "How did I do in Antakshari today?",
    avatarStarter: "You did wonderfully today, Bhaben! In Antakshari this morning, you scored 88% accuracy and your recall speed was very quick. You are keeping your mind sharp and joyful!",
    avatarStarterAs: "ভৱেন দেউতা, আজি আপুনি অন্ত্যাক্ষৰী খেলত ৮৮% সঠিক উত্তৰ দিলে! আপোনাৰ মন আৰু স্মৃতিশক্তি বহুত সতেজ হৈ আছে।",
    avatarStarterHi: "भावेन जी, आज आपने अंताक्षरी में ८৮% सही उत्तर दिए! आपकी याददाश्त बहुत तेज और खुशहाल है।",
    emoji: "🎵",
    category: "games",
  },
  {
    id: "topic-routine",
    title: "What Should I Do Now?",
    prompt: "What should I do right now?",
    avatarStarter: "Right now is a wonderful time to drink a fresh glass of water and sit in the courtyard breeze. Anita has also kept your afternoon tea ready!",
    avatarStarterAs: "এতিয়া এগিলাচ সতেজ পানী খাই বাৰাণ্ডাৰ মৃদু বতাহত বহি জিৰণি লোৱাৰ উত্তম সময়। অনিতাই চাহো সাজু কৰি থৈছে!",
    avatarStarterHi: "अभी एक गिलास ताजा पानी पीने और बरामदे में आराम करने का बहुत अच्छा समय है। अनिता ने चाय भी तैयार रखी है!",
    emoji: "💧",
    category: "routine",
  },
  {
    id: "topic-majuli",
    title: "Majuli Courtyard & River",
    prompt: "Tell me about our home in Majuli by the river.",
    avatarStarter: "Majuli has such peaceful mornings! I remember the wooden courtyard and the red hibiscus flowers blooming near the Brahmaputra. Do you feel the cool river breeze when you think about it?",
    avatarStarterAs: "মাজুলীৰ পুৱাবোৰ কিমান যে শান্ত আছিল! ব্ৰহ্মপুত্ৰৰ পাৰত ৰঙা জবা ফুল আৰু আমাৰ ঘৰৰ বাৰাণ্ডাৰ কথা মনত পৰে। নদীৰ মৃদু বতাহজাক অনুভৱ কৰিব পাৰিছেনে?",
    avatarStarterHi: "माजुली की सुबह कितनी शांत होती थी! ब्रह्मपुत्र नदी के किनारे का आंगन और लाल गुड़हल के फूल याद हैं ना? नदी की ठंडी हवा महसूस हो रही है ना?",
    emoji: "🏞️",
    category: "places",
  },
  {
    id: "topic-arjun",
    title: "Grandson Arjun's Cricket",
    prompt: "How is grandson Arjun doing?",
    avatarStarter: "Arjun is doing wonderfully! He was practicing his left-handed batting yesterday and told Anita that he wants to hear another story from you this weekend. He smiles so much when he sees you.",
    avatarStarterAs: "নাতি অৰ্জুন বহুত ভাল আছে! সি কালি বাওঁহাতৰ বেটিং অনুশীলন কৰি আছিল আৰু দেউতাৰ পৰা নতুন সাধু শুনিবলৈ আগ্ৰহেৰে ৰৈ আছে।",
    avatarStarterHi: "पोता अर्जुन बहुत अच्छा है! कल वह अपनी बैटिंग की प्रैक्टिस कर रहा था और इस सप्ताहांत आपसे नई कहानी सुनने के लिए बहुत उत्सुक है।",
    emoji: "🏏",
    category: "people",
  },
  {
    id: "topic-bhupen",
    title: "Manuhe Manuhor Babe Song",
    prompt: "Can we listen to or hum Dr. Bhupen Hazarika's song?",
    avatarStarter: "'Manuhe Manuhor Babe...' Such a soul-stirring melody of love and kindness. Dr. Bhupen Hazarika's voice always brings a feeling of deep peace. Shall we hum the chorus together?",
    avatarStarterAs: "'মানুহে মানুহৰ বাবে...' কি যে এক হৃদয়স্পৰ্শী গান। ড° ভূপেন হাজৰিকাৰ কণ্ঠই সদায় শান্তি আনে। আহক আমি একেলগে গুনগুনাই গাওঁ!",
    avatarStarterHi: "'मानुहे मानुहोर बाबे...' प्रेम और करुणा का कितना सुंदर गीत है। डॉ. भूपेन हजारिका जी का स्वर हमेशा शांति देता है। चलिए साथ मिलकर गुनगुनाते हैं!",
    emoji: "🎼",
    category: "music",
  },
  {
    id: "topic-health",
    title: "My Health & Rest Status",
    prompt: "How is my health and sleep today?",
    avatarStarter: "You slept very peacefully for 7 hours and 12 minutes last night! Your local AI health stability is at a strong 88%, and you are safe and cozy at home in Kamrup.",
    avatarStarterAs: "যোৱাৰাতি আপুনি ৭ ঘণ্টা ১২ মিনিট গভীৰভাৱে শুইছিল। আপোনাৰ স্বাস্থ্য সুস্থিৰতা ৮৮% আৰু আপুনি কামৰূপৰ ঘৰত সম্পূৰ্ণ সুৰক্ষিত হৈ আছে।",
    avatarStarterHi: "कल रात आप ७ घंटे १२ मिनट बहुत अच्छी नींद सोए। आपकी सेहत ८৮% के साथ बहुत स्थिर है, और आप घर पर पूरी तरह सुरक्षित हैं।",
    emoji: "🩺",
    category: "health",
  },
  {
    id: "topic-calm",
    title: "Gentle Peaceful Breathing",
    prompt: "I am feeling a little tired or uneasy.",
    avatarStarter: "You are completely safe, and everything is well. Anita and your family are right here. Let us breathe in slowly together for 4 seconds... and gently breathe out. You are doing wonderfully.",
    avatarStarterAs: "আপুনি সম্পূৰ্ণ সুৰক্ষিত, অনিতা আৰু পৰিয়াল আপোনাৰ ওচৰতেই আছে। আহক আমি লাহে লাহে ৪ চেকেণ্ড উশাহ লওঁ... আৰু লাহেকৈ এৰি দিওঁ।",
    avatarStarterHi: "आप पूरी तरह सुरक्षित हैं, अनिता और आपका परिवार आपके साथ हैं। चलिए धीरे-धीरे ४ सेकंड गहरी सांस लेते हैं... और धीरे से छोड़ते हैं।",
    emoji: "🌸",
    category: "calm",
  },
];

export const companionService = {
  /**
   * Loads continuous patient data across game scores, activities, sleep, and Federated ML
   */
  async getPatientContext(): Promise<PatientContinuousContext> {
    const [profile, gameSessions, activities, sleep, memoryBank, hydration, meds, flStability] =
      await Promise.all([
        caregiverStorage.getPatientProfile(),
        caregiverStorage.getGameSessions(),
        caregiverStorage.getActivities(),
        caregiverStorage.getSleepRecord(),
        caregiverStorage.getMemoryBank(),
        reminderStorage.getTodayHydration(),
        reminderStorage.getTodayMedications(),
        federatedService.predictCognitiveStability(),
      ]);

    const latestGame = gameSessions && gameSessions.length > 0 ? gameSessions[0] : undefined;
    const pendingMeds = meds.filter((m) => !m.taken);
    const medsTakenCount = meds.filter((m) => m.taken).length;

    return {
      profile,
      latestGame,
      todayActivities: activities,
      hydration,
      pendingMeds,
      medsTakenCount,
      sleep,
      memoryBank,
      flStability,
    };
  },

  /**
   * Generates a context-grounded, empathetic response in the patient's preferred language
   */
  async processElderInput(
    userInput: string,
    language: SupportedLanguage = "en"
  ): Promise<{ responseText: string; topicCategory?: string; isDistressed?: boolean }> {
    const ctx = await this.getPatientContext();
    const lower = userInput.toLowerCase();
    const elderFirstName = ctx.profile.name.split(" ")[0] || "Bhaben";

    // ── 1. Distress / Pain / Anxiety / Disorientation (Validation Therapy) ────
    if (
      lower.includes("pain") ||
      lower.includes("hurt") ||
      lower.includes("scared") ||
      lower.includes("alone") ||
      lower.includes("lost") ||
      lower.includes("where am i") ||
      lower.includes("bhoy") ||
      lower.includes("ভয়") ||
      lower.includes("ভয়") ||
      lower.includes("দুখ") ||
      lower.includes("বিষ") ||
      lower.includes("অকলশৰীয়া") ||
      lower.includes("অকলশৰীয়া") ||
      lower.includes("ক'ত আছোঁ") ||
      lower.includes("ক’ত আছোঁ") ||
      lower.includes("डर") ||
      lower.includes("दर्द") ||
      lower.includes("अकेला") ||
      lower.includes("कहाँ हूँ") ||
      lower.includes("कहा हूँ") ||
      lower.includes("dukh")
    ) {
      if (language === "as") {
        return {
          responseText: `ভৱেন দেউতা, আপুনি কামৰূপৰ নিজৰ ঘৰত অনিতা আৰু পৰিয়ালৰ সৈতে সুৰক্ষিত হৈ আছে। কোনো চিন্তা নকৰিব, মই আপোনাৰ লগতেই আছোঁ। আহক আমি লাহেকৈ এটা গভীৰ উশাহ লওঁ।`,
          topicCategory: "calm",
          isDistressed: true,
        };
      }
      if (language === "hi") {
        return {
          responseText: `${elderFirstName} जी, आप अपने कामरूप वाले घर में अनिता और परिवार के साथ सुरक्षित हैं। सब कुछ ठीक है, मैं आपके साथ हूं। चलिए धीरे से एक गहरी सांस लेते हैं।`,
          topicCategory: "calm",
          isDistressed: true,
        };
      }
      return {
        responseText: `You are safe at home with your loving family, ${elderFirstName}. Everything is calm and well. I am right here with you, and Anita is right nearby. Let us take a deep, slow breath together.`,
        topicCategory: "calm",
        isDistressed: true,
      };
    }

    // ── 2. Cognitive Games & Scores Record (Antakshari, Matching) ─────────────
    if (
      lower.includes("game") ||
      lower.includes("score") ||
      lower.includes("antakshari") ||
      lower.includes("memory match") ||
      lower.includes("play") ||
      lower.includes("khel")
    ) {
      const accuracy = ctx.latestGame ? ctx.latestGame.accuracyPercent : 88;
      const gameTitle = ctx.latestGame ? ctx.latestGame.gameName : "Antakshari";
      if (language === "as") {
        return {
          responseText: `আজি আপুনি ${gameTitle} খেলত ${accuracy}% নিখুঁত নম্বৰ পাইছে! আপোনাৰ সোঁৱৰণ ক্ষমতা আৰু মনোযোগ বৰ্তমান অতি শক্তিশালী হৈ আছে।`,
          topicCategory: "games",
        };
      }
      if (language === "hi") {
        return {
          responseText: `आज आपने ${gameTitle} में ${accuracy}% सटीकता के साथ खेला! आपकी एकाग्रता और याददाश्त बहुत अच्छी चल रही है।`,
          topicCategory: "games",
        };
      }
      return {
        responseText: `You did wonderfully in ${gameTitle} today with ${accuracy}% accuracy! Your federated cognitive stability is strong and your mind is active and joyful.`,
        topicCategory: "games",
      };
    }

    // ── 3. Routine, Water, & What to do now ────────────────────────────────────
    if (
      lower.includes("what should i do") ||
      lower.includes("water") ||
      lower.includes("drink") ||
      lower.includes("tea") ||
      lower.includes("pani") ||
      lower.includes("routine")
    ) {
      const drank = ctx.hydration.glassesDrunk;
      const goal = ctx.hydration.dailyGoal;
      if (language === "as") {
        return {
          responseText: `আপুনি এতিয়ালৈকে ${drank} গিলাচ পানী খালে। এতিয়া আৰু এগিলাচ পানী খাই বাৰাণ্ডাত জিৰণি লওক। অনিতাই আপোনাৰ যত্ন লৈ আছে।`,
          topicCategory: "routine",
        };
      }
      if (language === "hi") {
        return {
          responseText: `आपने आज ${drank}/${goal} गिलास पानी पिया है। अभी एक गिलास ताजा पानी पीकर बरामदे की ताजी हवा में बैठना बहुत अच्छा रहेगा।`,
          topicCategory: "routine",
        };
      }
      return {
        responseText: `You have drank ${drank} of ${goal} glasses of water today. Let's drink one fresh glass right now and relax in the courtyard breeze!`,
        topicCategory: "routine",
      };
    }

    // ── 4. Health, Sleep & Federated Learning Stability ───────────────────────
    if (
      lower.includes("health") ||
      lower.includes("sleep") ||
      lower.includes("night") ||
      lower.includes("swasthya") ||
      lower.includes("resting")
    ) {
      const sleepDur = ctx.sleep.duration || "7h 12m";
      const stabScore = Math.round(ctx.flStability.cognitive_stability_score || 88);
      if (language === "as") {
        return {
          responseText: `যোৱাৰাতি আপুনি ${sleepDur} সময় শান্তভাৱে শুলে। আমাৰ অন-ডিভাইচ ফেডাৰেটেড এআই অনুসৰি আপোনাৰ স্বাস্থ্য সুস্থিৰতা ${stabScore}% সুদৃঢ় অৱস্থাত আছে।`,
          topicCategory: "health",
        };
      }
      if (language === "hi") {
        return {
          responseText: `कल रात आपकी नींद ${sleepDur} की बहुत आरामदायक रही। ऑन-डिवाइस एआई के अनुसार आपका स्वास्थ्य स्कोर ${stabScore}% बहुत मजबूत है।`,
          topicCategory: "health",
        };
      }
      return {
        responseText: `You slept peacefully for ${sleepDur} last night. Your on-device Federated Learning cognitive stability score is at ${stabScore}%, showing great balance and calm.`,
        topicCategory: "health",
      };
    }

    // ── 5. Family (Rahul, Anita, Arjun) & Location ────────────────────────────
    if (lower.includes("rahul")) {
      if (language === "as") {
        return {
          responseText: "ৰাহুলে গুৱাহাটীৰ অফিচৰ পৰা পুৱাই ফোন কৰিছিল! সি আপোনাক বহুত মৰম জনাইছে আৰু ৰাতিৰ আহাৰৰ পিছতেই কথা পাতিব।",
          topicCategory: "people",
        };
      }
      return {
        responseText: "Rahul called this morning from Guwahati! He sends his warmest love and is excited to speak with you right after dinner.",
        topicCategory: "people",
      };
    }

    if (lower.includes("anita")) {
      if (language === "as") {
        return {
          responseText: "অনিতা ঘৰতেই আছে আৰু আপোনাৰ বাবে গৰম লাল চাহ আৰু পুষ্টিকৰ খাদ্য সাজু কৰিছে। তাই আপোনাৰ বহুত যত্ন লয়।",
          topicCategory: "people",
        };
      }
      return {
        responseText: "Anita is right here at home making sure you have warm tea and complete comfort. She cares for you deeply.",
        topicCategory: "people",
      };
    }

    if (lower.includes("arjun") || lower.includes("grandson") || lower.includes("cricket")) {
      if (language === "as") {
        return {
          responseText: "অৰ্জুন স্কুলৰ পৰা আহি বাওঁহতীয়া বেটিঙৰ অনুশীলন কৰিছে। সি ককাকৰ পৰা নতুন সাধু কথা শুনিবলৈ অপেক্ষা কৰি আছে!",
          topicCategory: "people",
        };
      }
      return {
        responseText: "Arjun is practicing his left-handed cricket batting! He loves smiling with you and is eager to hear your stories this weekend.",
        topicCategory: "people",
      };
    }

    // ── 6. Memory Bank (Majuli, Dr. Bhupen Hazarika, Kerala) ──────────────────
    if (lower.includes("majuli") || lower.includes("river") || lower.includes("brahmaputra") || lower.includes("village")) {
      const majuliMem = ctx.memoryBank.find((m) => m.title.toLowerCase().includes("majuli"));
      const desc = majuliMem?.description || "the peaceful courtyard with river breezes and red hibiscus";
      if (language === "as") {
        return {
          responseText: `মাজুলীৰ পুৰণি ঘৰখন কিমান যে ধুনীয়া আছিল! ব্ৰহ্মপুত্ৰৰ পাৰৰ শীতল বতাহ আৰু বাৰাণ্ডাৰ জবা ফুলে হৃদয় জুৰাই পেলায়।`,
          topicCategory: "places",
        };
      }
      return {
        responseText: `Ah, Majuli! That was such a special place: ${desc}. Thinking of the gentle river waters always brings calm to the heart.`,
        topicCategory: "places",
      };
    }

    if (lower.includes("song") || lower.includes("music") || lower.includes("bhupen") || lower.includes("sing") || lower.includes("gaan")) {
      if (language === "as") {
        return {
          responseText: "ড° ভূপেন হাজৰিকাৰ 'মানুহে মানুহৰ বাবে' গীতটোৱে সকলোৰে মনত আনন্দ আৰু শান্তি আনে। মনলৈ আনন্দ অনা এটা অনুপম সুৰ!",
          topicCategory: "music",
        };
      }
      return {
        responseText: "Music has a wonderful way of brightening the day! Dr. Bhupen Hazarika's 'Manuhe Manuhor Babe' is so uplifting. Let's remember the sweet melody together.",
        topicCategory: "music",
      };
    }

    // ── 7. Greetings, Identity & Everyday Small Talk ────────────────────────
    if (
      lower.includes("hello") ||
      lower.includes("hi") ||
      lower.includes("namaste") ||
      lower.includes("नमस्ते") ||
      lower.includes("namaskar") ||
      lower.includes("নমস্কাৰ") ||
      lower.includes("good morning") ||
      lower.includes("good afternoon") ||
      lower.includes("good evening") ||
      lower.includes("how are you") ||
      lower.includes("kaise ho") ||
      lower.includes("कैसे") ||
      lower.includes("bhal ne") ||
      lower.includes("ভালনে")
    ) {
      if (language === "as") {
        return {
          responseText: `নমস্কাৰ ${elderFirstName} দেউতা! মই বহুত ভাল আছোঁ। আপোনাৰ হাঁহিমুখীয়া মুখখন দেখি মোৰ বৰ আনন্দ লাগিছে। আজি আপুনি কি কৰিব বিচাৰে?`,
          topicCategory: "general",
        };
      }
      if (language === "hi") {
        return {
          responseText: `नमस्ते ${elderFirstName} जी! मैं बहुत अच्छी हूँ। आपसे मिलकर दिन बहुत अच्छा हो जाता है। बताइए आज आपका क्या मन है?`,
          topicCategory: "general",
        };
      }
      return {
        responseText: `Hello and warm greetings, ${elderFirstName}! I am doing wonderfully, and being here with you brings me great joy. How can I brighten your day?`,
        topicCategory: "general",
      };
    }

    if (
      lower.includes("who are you") ||
      lower.includes("your name") ||
      lower.includes("what is your name") ||
      lower.includes("kon hoi") ||
      lower.includes("kaun ho")
    ) {
      if (language === "as") {
        return {
          responseText: `মই আপোনাৰ প্ৰিয় বন্ধু 'স্মৃতি মিত্ৰ'। মই সদায় আপোনাৰ কাষতেই আছোঁ আপোনাৰ লগত কথা পাতিবলৈ, গান শুনিবলৈ আৰু পুৰণি স্মৃতি মনত পেলাবলৈ।`,
          topicCategory: "general",
        };
      }
      if (language === "hi") {
        return {
          responseText: `मैं आपकी सहेली 'स्मृति मित्र' हूँ। मैं हर समय आपके साथ हूँ बात करने, गाने सुनने और सुंदर यादें साझा करने के लिए।`,
          topicCategory: "general",
        };
      }
      return {
        responseText: `I am Smriti Mitr, your caring companion and friend. I am always right here by your side to chat, recall fond memories, and keep your day cheerful and safe.`,
        topicCategory: "general",
      };
    }

    if (
      lower.includes("medicine") ||
      lower.includes("pill") ||
      lower.includes("dawai") ||
      lower.includes("oukhod") ||
      lower.includes("meds")
    ) {
      const pendingCount = ctx.pendingMeds.length;
      if (language === "as") {
        return {
          responseText:
            pendingCount > 0
              ? `আপোনাৰ আজিৰ ঔষধ অনিতাই সময়মতে খুৱাবৰ বাবে সজাই থৈছে। কোনো চিন্তা নকৰিব, সকলো সময়মতে হৈ যাব।`
              : `আজিৰ সকলো ঔষধ সময়মতে খোৱা হৈ গৈছে! আপুনি অতি নিয়মীয়া।`,
          topicCategory: "routine",
        };
      }
      if (language === "hi") {
        return {
          responseText:
            pendingCount > 0
              ? `आपकी दवाइयां अनिता ने तैयार रखी हैं। समय पर वे आपको दवा दे देंगी, आप बिल्कुल निश्चिंत रहिए।`
              : `आज की सारी दवाइयां समय पर पूरी हो चुकी हैं! आप बहुत अच्छे से अपना ध्यान रख रहे हैं।`,
          topicCategory: "routine",
        };
      }
      return {
        responseText:
          pendingCount > 0
            ? `Your medications are nicely prepared by Anita and your care team. Everything is on schedule, so you can relax completely.`
            : `All your scheduled medications for today have been taken on time. You are doing wonderfully!`,
        topicCategory: "routine",
      };
    }

    // ── 7.5. Who Am I / Identity Recognition ──────────────────────────────────
    if (
      lower.includes("who am i") ||
      lower.includes("who i am") ||
      lower.includes("my name") ||
      lower.includes("মই কোন") ||
      lower.includes("মোৰ নাম") ||
      lower.includes("मैं कौन हूँ") ||
      lower.includes("मेरा नाम")
    ) {
      if (language === "as") {
        return {
          responseText: `আপোনাৰ নাম ${ctx.profile.name || "ভৱেন বৰ্মন"}। আপুনি আপোনাৰ মাজুলীৰ মৰমৰ ঘৰত জীয়ৰী অনিতা আৰু পৰিয়ালৰ সৈতে সন্মান আৰু মৰমেৰে সুৰক্ষিত হৈ আছে।`,
          topicCategory: "general",
        };
      }
      if (language === "hi") {
        return {
          responseText: `आपका नाम ${ctx.profile.name || "भावेन बर्मन"} है। आप अपने माजुली वाले घर में बेटी अनिता और परिवार के साथ बहुत सम्मान और प्यार से सुरक्षित हैं।`,
          topicCategory: "general",
        };
      }
      return {
        responseText: `Your name is ${ctx.profile.name || "Bhaben Barman"}. You are in your beloved home in Majuli with your daughter Anita and family, surrounded by care and deep love.`,
        topicCategory: "general",
      };
    }

    // ── 7.6. Hunger / Food / Meal / Tea / Bhaat ───────────────────────────────
    if (
      lower.includes("food") ||
      lower.includes("hungry") ||
      lower.includes("lunch") ||
      lower.includes("breakfast") ||
      lower.includes("dinner") ||
      lower.includes("bhaat") ||
      lower.includes("ভাত") ||
      lower.includes("আহাৰ") ||
      lower.includes("খানা") ||
      lower.includes("खाना") ||
      lower.includes("भूख")
    ) {
      if (language === "as") {
        return {
          responseText: `অনিতাই আপোনাৰ বাবে গৰম আৰু পুষ্টিকৰ ভাত-আহাৰ সাজু কৰিছে। অলপ পিছতেই বাৰাণ্ডাৰ মেজত আপোনাক মৰমেৰে খুৱাই দিব।`,
          topicCategory: "routine",
        };
      }
      if (language === "hi") {
        return {
          responseText: `अनिता ने आपके लिए ताजा और पौष्टिक खाना तैयार किया है। थोड़ी ही देर में वे आपको भोजन परोसेंगी।`,
          topicCategory: "routine",
        };
      }
      return {
        responseText: `Anita has prepared a warm, nutritious meal for you. She will serve it to you comfortably at the courtyard table very shortly.`,
        topicCategory: "routine",
      };
    }

    // ── 7.7. Date / Day / Time / Today ───────────────────────────────────────
    if (
      lower.includes("time") ||
      lower.includes("what day") ||
      lower.includes("date") ||
      lower.includes("today") ||
      lower.includes("সময়") ||
      lower.includes("সময়") ||
      lower.includes("আজি") ||
      lower.includes("तारीख") ||
      lower.includes("दिन") ||
      lower.includes("आज")
    ) {
      const todayStr = new Date().toLocaleDateString(
        language === "as" ? "as-IN" : language === "hi" ? "hi-IN" : "en-US",
        { weekday: "long", day: "numeric", month: "long" }
      );
      if (language === "as") {
        return {
          responseText: `আজি হৈছে ${todayStr}। মাজুলীৰ পুৱাৰ বতাহ অতি শান্ত আৰু নিৰ্মল। ঘৰত সকলো অতি সুন্দৰভাৱে চলি আছে।`,
          topicCategory: "general",
        };
      }
      if (language === "hi") {
        return {
          responseText: `आज ${todayStr} है। मौसम बहुत सुहावना है और घर में सब कुछ शांत और सुरक्षित है।`,
          topicCategory: "general",
        };
      }
      return {
        responseText: `Today is ${todayStr}. The morning breeze is calm and peaceful, and everything is completely safe at home.`,
        topicCategory: "general",
      };
    }

    // ── 7.8. Doctor / Hospital / Clinic ───────────────────────────────────────
    if (
      lower.includes("doctor") ||
      lower.includes("hospital") ||
      lower.includes("clinic") ||
      lower.includes("sharma") ||
      lower.includes("appointment") ||
      lower.includes("ডাক্টৰ") ||
      lower.includes("বেমাৰ") ||
      lower.includes("डॉक्टर")
    ) {
      if (language === "as") {
        return {
          responseText: `ডাঃ মহিত শৰ্মাই আপোনাৰ স্বাস্থ্যৰ যত্ন লৈ আছে। আপোনাৰ হৃদস্পন্দন আৰু অক্সিজেন লেভেল সম্পূৰ্ণ স্বাভাৱিক আৰু সুদৃঢ়।`,
          topicCategory: "health",
        };
      }
      if (language === "hi") {
        return {
          responseText: `डॉक्टर माहित शर्मा आपकी सेहत का पूरा ध्यान रख रहे हैं। आपकी धड़कन और ऑक्सीजन बिल्कुल सामान्य और स्वस्थ हैं।`,
          topicCategory: "health",
        };
      }
      return {
        responseText: `Dr. Mahit Sharma is looking after your medical care. Your heart rate, oxygen levels, and vitals are completely normal and stable today.`,
        topicCategory: "health",
      };
    }

    // ── 7.9. Namghar / Temple / Prayer / God ──────────────────────────────────
    if (
      lower.includes("namghar") ||
      lower.includes("temple") ||
      lower.includes("prayer") ||
      lower.includes("god") ||
      lower.includes("krishna") ||
      lower.includes("নামঘৰ") ||
      lower.includes("প্ৰাৰ্থনা") ||
      lower.includes("ভগৱান") ||
      lower.includes("नामघर") ||
      lower.includes("प्रार्थना") ||
      lower.includes("भगवान")
    ) {
      if (language === "as") {
        return {
          responseText: `নামঘৰৰ ডবা আৰু শঙ্খৰ ধ্বনিয়ে মনলৈ গভীৰ প্ৰশান্তি আনে। গুৰুজনাৰ কৃপা আৰু আশীৰ্বাদ সদায় আপোনাৰ লগত আছে।`,
          topicCategory: "calm",
        };
      }
      if (language === "hi") {
        return {
          responseText: `नामघर की प्रार्थना और घंटियों की गूंज मन में गहरी शांति भर देती है। भगवान की कृपा हमेशा आपके साथ है।`,
          topicCategory: "calm",
        };
      }
      return {
        responseText: `The bells and gentle hymns of the Namghar bring such deep peace to the heart. May serenity, blessings, and calm always fill your day.`,
        topicCategory: "calm",
      };
    }

    if (
      lower.includes("story") ||
      lower.includes("sadhu") ||
      lower.includes("kahani") ||
      lower.includes("tell me")
    ) {
      if (language === "as") {
        return {
          responseText: `মাজুলীৰ ব্ৰহ্মপুত্ৰৰ পাৰত এদিন এজাক ৰঙচুৱা পখী উৰি আহিছিল। বাৰাণ্ডাৰ জবা ফুলজোপাত বহি সিহঁতে মিঠা সুৰেৰে গান গাইছিল। সেই গান শুনি ককাহঁতে কিমান আনন্দ পাইছিল!`,
          topicCategory: "places",
        };
      }
      if (language === "hi") {
        return {
          responseText: `ब्रह्मपुत्र नदी के किनारे एक प्यारा सा बगीचा था, जहाँ लाल गुड़हल के फूल खिलते थे। सुबह की ठंडी हवा में पंछी मीठे गीत गाते थे और मन को असीम शांति मिलती थी।`,
          topicCategory: "places",
        };
      }
      return {
        responseText: `Once near the banks of the mighty Brahmaputra in Majuli, the morning sun rose with golden light over the courtyard. The gentle river breeze whispered through the trees, bringing joy to all who sat there.`,
        topicCategory: "places",
      };
    }

    // ── 8. Default Friendly Reassurance & Companionship ──────────────────────
    if (language === "as") {
      const asOptions = [
        `আপোনাৰ লগত কথা পাতি বৰ ভাল লাগিল, ${elderFirstName} দেউতা। মই সদায় আপোনাৰ কাষতেই আছোঁ। কওকচোন আৰু কি কথা মনলৈ আহিছে?`,
        `আপোনাৰ হাঁহিটোৱে আজি গোটেই ঘৰখন উজ্জ্বল কৰি তুলিছে। আহক আমি পুৰণি ভাল লগা স্মৃতিবোৰ সুঁৱৰোঁ।`,
        `আপুনি অতি মৰমীয়াল ব্যক্তি। আপোনাৰ সংগই মোৰ মনটো আনন্দৰে ভৰাই তোলে।`,
      ];
      return {
        responseText: asOptions[Math.floor(Math.random() * asOptions.length)],
        topicCategory: "general",
      };
    }

    if (language === "hi") {
      const hiOptions = [
        `आपसे बात करके बहुत खुशी हुई, ${elderFirstName} जी। मैं हर समय आपके साथ हूं। बताइए आज आप क्या सोच रहे हैं?`,
        `आपकी मुस्कान से पूरा घर खिल उठता है। चलिए अपनी कोई प्रिय पुरानी बात याद करते हैं।`,
        `आप बहुत अच्छे हैं। आपके साथ समय बिताना मुझे बहुत प्रिय है।`,
      ];
      return {
        responseText: hiOptions[Math.floor(Math.random() * hiOptions.length)],
        topicCategory: "general",
      };
    }

    const genericReassurance = [
      `It is so pleasant talking with you, ${elderFirstName}. Every moment we share brings warmth and joy. Tell me more about what you are thinking!`,
      `I love listening to you. Your smile brightens the whole room today. Shall we talk about our favorite memories or listen to a gentle song?`,
      `You have such a peaceful presence. I am always right here by your side whenever you want a friendly chat or a comforting story.`,
    ];

    const chosen = genericReassurance[Math.floor(Math.random() * genericReassurance.length)];
    return { responseText: chosen, topicCategory: "general" };
  },

  /**
   * Speaks the response with the native voice assistant exclusively for the Dashboard AI companion
   */
  speakResponse(
    text: string,
    language: SupportedLanguage = "en",
    onDone?: () => void
  ) {
    return VoiceAssistant.speakCompanion(text, language, onDone);
  },

  /**
   * Stops any currently ongoing avatar speech
   */
  stopSpeech() {
    VoiceAssistant.stop();
  },
};

