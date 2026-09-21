"""
Database Models for Antakshari Game
====================================

SQLite/SQLAlchemy models for game sessions, turns, and cognitive analytics.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
import json


@dataclass
class GameSession:
    """
    Represents a single Antakshari game session.
    
    Tracks the overall game state, mode (AI or family voice), and session metadata.
    """
    session_id: str
    user_id: str
    mode: str  # "ai" or "family"
    status: str  # "active", "completed", "interrupted"
    turn_count: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    last_syllable: Optional[str] = None
    family_member_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "mode": self.mode,
            "status": self.status,
            "turn_count": self.turn_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "last_syllable": self.last_syllable,
            "family_member_id": self.family_member_id,
        }


@dataclass
class GameTurn:
    """
    Represents a single turn in an Antakshari game session.
    
    Tracks who sang (AI or patient), the audio, transcription, lyric match,
    and syllable validation results.
    """
    turn_id: str
    session_id: str
    turn_number: int
    turn_type: str  # "ai" or "patient"
    audio_url: Optional[str] = None
    transcribed_text: Optional[str] = None
    matched_song_id: Optional[str] = None
    matched_lyrics: Optional[str] = None
    starting_syllable: Optional[str] = None
    ending_syllable: Optional[str] = None
    syllable_match_confidence: Optional[float] = None
    is_valid_match: bool = False
    response_latency_ms: Optional[int] = None
    voice_clarity_score: Optional[float] = None
    ai_feedback: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "turn_id": self.turn_id,
            "session_id": self.session_id,
            "turn_number": self.turn_number,
            "turn_type": self.turn_type,
            "audio_url": self.audio_url,
            "transcribed_text": self.transcribed_text,
            "matched_song_id": self.matched_song_id,
            "matched_lyrics": self.matched_lyrics,
            "starting_syllable": self.starting_syllable,
            "ending_syllable": self.ending_syllable,
            "syllable_match_confidence": self.syllable_match_confidence,
            "is_valid_match": self.is_valid_match,
            "response_latency_ms": self.response_latency_ms,
            "voice_clarity_score": self.voice_clarity_score,
            "ai_feedback": self.ai_feedback,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


@dataclass
class CognitiveAnalytics:
    """
    Silent cognitive health analytics derived from game sessions.
    
    Tracks response latency, voice clarity, song recall rate, and other
    cognitive health indicators without displaying scores to patients.
    """
    analytics_id: str
    session_id: str
    user_id: str
    avg_response_latency_ms: float
    avg_voice_clarity_score: float
    song_recall_rate: float  # Percentage of successful matches
    total_turns: int
    successful_turns: int
    failed_turns: int
    hint_count: int = 0
    word_retrieval_speed_trend: Optional[str] = None  # "improving", "stable", "declining"
    long_term_memory_strength: Optional[str] = None  # "strong", "moderate", "weak"
    calculated_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "analytics_id": self.analytics_id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "avg_response_latency_ms": self.avg_response_latency_ms,
            "avg_voice_clarity_score": self.avg_voice_clarity_score,
            "song_recall_rate": self.song_recall_rate,
            "total_turns": self.total_turns,
            "successful_turns": self.successful_turns,
            "failed_turns": self.failed_turns,
            "hint_count": self.hint_count,
            "word_retrieval_speed_trend": self.word_retrieval_speed_trend,
            "long_term_memory_strength": self.long_term_memory_strength,
            "calculated_at": self.calculated_at.isoformat() if self.calculated_at else None,
        }


# Database schema creation SQL for SQLite
SCHEMA_SQL = """
-- Game Sessions Table
CREATE TABLE IF NOT EXISTS antakshari_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('ai', 'family')),
    status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'interrupted')),
    turn_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    last_syllable TEXT,
    family_member_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Game Turns Table
CREATE TABLE IF NOT EXISTS antakshari_turns (
    turn_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    turn_number INTEGER NOT NULL,
    turn_type TEXT NOT NULL CHECK(turn_type IN ('ai', 'patient')),
    audio_url TEXT,
    transcribed_text TEXT,
    matched_song_id TEXT,
    matched_lyrics TEXT,
    starting_syllable TEXT,
    ending_syllable TEXT,
    syllable_match_confidence REAL,
    is_valid_match BOOLEAN DEFAULT FALSE,
    response_latency_ms INTEGER,
    voice_clarity_score REAL,
    ai_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES antakshari_sessions(session_id)
);

-- Cognitive Analytics Table
CREATE TABLE IF NOT EXISTS antakshari_analytics (
    analytics_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    avg_response_latency_ms REAL NOT NULL,
    avg_voice_clarity_score REAL NOT NULL,
    song_recall_rate REAL NOT NULL,
    total_turns INTEGER NOT NULL,
    successful_turns INTEGER NOT NULL,
    failed_turns INTEGER NOT NULL,
    hint_count INTEGER DEFAULT 0,
    word_retrieval_speed_trend TEXT,
    long_term_memory_strength TEXT,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES antakshari_sessions(session_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Regional Songs Database Table
CREATE TABLE IF NOT EXISTS regional_songs (
    song_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT,
    language TEXT NOT NULL CHECK(language IN ('assamese', 'naga', 'hindi', 'english')),
    category TEXT CHECK(category IN ('bihu', 'folk', 'bollywood', 'custom')),
    lyrics TEXT NOT NULL,
    audio_url TEXT,
    starting_syllable TEXT NOT NULL,
    ending_syllable TEXT NOT NULL,
    duration_seconds INTEGER,
    is_custom BOOLEAN DEFAULT FALSE,
    added_by_user_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sessions_user ON antakshari_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON antakshari_sessions(status);
CREATE INDEX IF NOT EXISTS idx_turns_session ON antakshari_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON antakshari_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_syllable ON regional_songs(starting_syllable);
CREATE INDEX IF NOT EXISTS idx_songs_language ON regional_songs(language);
"""
