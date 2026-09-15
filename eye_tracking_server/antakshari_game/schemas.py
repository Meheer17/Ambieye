"""
Pydantic Schemas for Antakshari Game API
=========================================

Request and response models for FastAPI endpoints with validation.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator


# ============================================================================
# Game Session Schemas
# ============================================================================

class GameSessionCreate(BaseModel):
    """Request schema for creating a new game session."""
    user_id: str = Field(..., description="Patient user ID")
    mode: str = Field(..., description="Game mode: 'ai' or 'family'")
    family_member_id: Optional[str] = Field(None, description="ID of family member if mode is 'family'")
    
    @validator("mode")
    def validate_mode(cls, v):
        if v not in ["ai", "family"]:
            raise ValueError("Mode must be 'ai' or 'family'")
        return v


class GameSessionResponse(BaseModel):
    """Response schema for game session data."""
    session_id: str
    user_id: str
    mode: str
    status: str
    turn_count: int
    created_at: datetime
    updated_at: datetime
    ended_at: Optional[datetime]
    last_syllable: Optional[str]
    family_member_id: Optional[str]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# ============================================================================
# Game Turn Schemas
# ============================================================================

class TurnRequest(BaseModel):
    """Request schema for processing a patient's turn."""
    session_id: str = Field(..., description="Game session ID")
    audio_base64: Optional[str] = Field(None, description="Base64-encoded audio recording")
    turn_start_timestamp: Optional[int] = Field(None, description="Unix timestamp when patient started recording (ms)")
    
    class Config:
        schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "audio_base64": "data:audio/aac;base64,AAAAIGZ0eXBNNEEg...",
                "turn_start_timestamp": 1705420800000
            }
        }


class TurnResponse(BaseModel):
    """Response schema after processing a turn."""
    turn_id: str
    session_id: str
    turn_number: int
    is_valid_match: bool
    ai_feedback: str
    next_ai_audio_url: Optional[str]
    next_ai_lyrics: Optional[str]
    next_syllable: str
    matched_song: Optional[Dict[str, Any]]
    syllable_match_confidence: Optional[float]
    hint: Optional[str]
    
    class Config:
        schema_extra = {
            "example": {
                "turn_id": "turn-123",
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "turn_number": 3,
                "is_valid_match": True,
                "ai_feedback": "বহুত সুন্দৰ! (Bahut sundar! Very beautiful!)",
                "next_ai_audio_url": "https://storage.example.com/ai-turn-3.aac",
                "next_ai_lyrics": "মোৰ প্ৰাণৰ মানুহ আহে",
                "next_syllable": "হে",
                "matched_song": {
                    "song_id": "song-456",
                    "title": "O Mur Apunar Desh",
                    "artist": "Bhupen Hazarika"
                },
                "syllable_match_confidence": 0.87,
                "hint": None
            }
        }


class AITurnRequest(BaseModel):
    """Request to generate the first AI turn for a new session."""
    session_id: str
    starting_syllable: Optional[str] = Field(None, description="Optional starting syllable")


# ============================================================================
# Analytics Schemas
# ============================================================================

class AnalyticsResponse(BaseModel):
    """Response schema for cognitive analytics (caregiver view only)."""
    analytics_id: str
    session_id: str
    user_id: str
    avg_response_latency_ms: float
    avg_voice_clarity_score: float
    song_recall_rate: float
    total_turns: int
    successful_turns: int
    failed_turns: int
    hint_count: int
    word_retrieval_speed_trend: Optional[str]
    long_term_memory_strength: Optional[str]
    calculated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SessionSummaryResponse(BaseModel):
    """Summary response when a game session ends."""
    session_id: str
    status: str
    total_turns: int
    duration_minutes: float
    analytics: Optional[AnalyticsResponse]
    message: str = "Game session completed successfully!"


# ============================================================================
# Regional Song Database Schemas
# ============================================================================

class RegionalSong(BaseModel):
    """Schema for a regional song in the database."""
    song_id: str
    title: str
    artist: Optional[str]
    language: str
    category: Optional[str]
    lyrics: str
    audio_url: Optional[str]
    starting_syllable: str
    ending_syllable: str
    duration_seconds: Optional[int]
    is_custom: bool = False
    
    @validator("language")
    def validate_language(cls, v):
        if v not in ["assamese", "naga", "hindi", "english"]:
            raise ValueError("Language must be 'assamese', 'naga', 'hindi', or 'english'")
        return v


class RegionalSongCreate(BaseModel):
    """Request schema for adding a custom song."""
    user_id: str
    title: str
    artist: Optional[str]
    language: str
    lyrics: str
    audio_base64: Optional[str]
    
    @validator("language")
    def validate_language(cls, v):
        if v not in ["assamese", "naga", "hindi", "english"]:
            raise ValueError("Language must be 'assamese', 'naga', 'hindi', or 'english'")
        return v


class SyllableQueryRequest(BaseModel):
    """Request to search songs by starting syllable."""
    syllable: str
    language: Optional[str] = None
    limit: int = Field(10, ge=1, le=50)


class SyllableQueryResponse(BaseModel):
    """Response with songs matching the syllable."""
    syllable: str
    matches: List[RegionalSong]
    total_found: int


# ============================================================================
# Error Response Schema
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response schema."""
    error: str
    detail: Optional[str] = None
    status_code: int
    
    class Config:
        schema_extra = {
            "example": {
                "error": "STT service unavailable",
                "detail": "Please try recording again",
                "status_code": 503
            }
        }
