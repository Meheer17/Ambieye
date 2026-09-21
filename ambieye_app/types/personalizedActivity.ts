/**
 * types/personalizedActivity.ts
 * Type definitions for Caregiver-Created Personalized Memory & Recognition Activities.
 */

export type ActivityMediaType = "photo" | "audio" | "video";

export type ActivityCategory =
  | "people"
  | "places"
  | "events"
  | "voice"
  | "music"
  | "objects";

export interface ActivityOption {
  id: string;
  text: string;
  textAs?: string;
  textHi?: string;
  emoji?: string;
  avatarUrl?: string;
  subtitle?: string;
  isCorrect: boolean;
}

export interface PersonalizedActivity {
  id: string;
  patientId: string;
  caregiverId: string;
  title: string;
  promptQuestion: string;
  promptQuestionAs?: string;
  promptQuestionHi?: string;
  mediaType: ActivityMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  hintText?: string;
  category: ActivityCategory;
  options: ActivityOption[];
  status: "active" | "completed" | "archived";
  createdAt: string;
  lastResult?: PersonalizedActivityResult;
}

export interface PersonalizedActivityResult {
  id: string;
  activityId: string;
  patientId: string;
  activityTitle?: string;
  promptQuestion?: string;
  mediaType?: ActivityMediaType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  category?: ActivityCategory;
  selectedOptionId: string;
  selectedOptionName?: string;
  correctOptionName?: string;
  isCorrect: boolean;
  attemptsCount: number;
  hintUsed: boolean;
  responseTimeSeconds: number;
  patientReaction?: "loved" | "smiled" | "talk" | "comforted" | string;
  completedAt: string;
}

export interface CaregiverRecognitionSummary {
  patientId: string;
  totalCreated: number;
  totalCompleted: number;
  totalPlayed: number;
  accuracyPercent: number;
  firstAttemptAccuracyPercent: number;
  avgResponseTimeSeconds: number;
  hintsUsedCount: number;
  recentReactions: Array<{
    reaction: string;
    completedAt: string;
    title: string;
    mediaType: ActivityMediaType;
  }>;
  categoryBreakdown: Array<{
    category: ActivityCategory;
    played: number;
    correct: number;
    accuracy: number;
  }>;
}

export interface CreatePersonalizedActivityParams {
  patientId?: string;
  caregiverId?: string;
  title: string;
  promptQuestion: string;
  promptQuestionAs?: string;
  promptQuestionHi?: string;
  mediaType: ActivityMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  hintText?: string;
  category: ActivityCategory;
  options: ActivityOption[];
}
