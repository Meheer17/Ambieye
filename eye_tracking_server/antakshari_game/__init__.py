"""
Antakshari Battle Cognitive Game Module
========================================

This module provides the backend functionality for the Antakshari Battle game,
a culturally-relevant singing relay cognitive engagement feature for elderly
dementia patients in the North-East Region (NER) of India.

Key Components:
- models: Database models for game sessions, turns, and analytics
- schemas: Pydantic models for request/response validation
- routes: FastAPI endpoints for game functionality
- services: Business logic for STT, lyric matching, AI responses, and analytics
"""

from .models import GameSession, GameTurn, CognitiveAnalytics
from .schemas import (
    GameSessionCreate,
    GameSessionResponse,
    TurnRequest,
    TurnResponse,
    AnalyticsResponse,
)
from .routes import router as antakshari_router
from .services import (
    AntakshariGameService,
    SpeechToTextService,
    LyricMatchingService,
    AIResponseService,
    AnalyticsService,
)

__all__ = [
    # Models
    "GameSession",
    "GameTurn",
    "CognitiveAnalytics",
    # Schemas
    "GameSessionCreate",
    "GameSessionResponse",
    "TurnRequest",
    "TurnResponse",
    "AnalyticsResponse",
    # Routes
    "antakshari_router",
    # Services
    "AntakshariGameService",
    "SpeechToTextService",
    "LyricMatchingService",
    "AIResponseService",
    "AnalyticsService",
]

__version__ = "1.0.0"
