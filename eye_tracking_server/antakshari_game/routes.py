"""
FastAPI Routes for Antakshari Game
===================================

API endpoints for game session management, turn processing, and analytics.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse

from .schemas import (
    GameSessionCreate,
    GameSessionResponse,
    TurnRequest,
    TurnResponse,
    AITurnRequest,
    AnalyticsResponse,
    SessionSummaryResponse,
    RegionalSongCreate,
    SyllableQueryRequest,
    SyllableQueryResponse,
    ErrorResponse,
)
from .services import (
    AntakshariGameService,
    SpeechToTextService,
    LyricMatchingService,
    AIResponseService,
    AnalyticsService,
)

logger = logging.getLogger(__name__)

# Initialize router with prefix and tags
router = APIRouter(
    prefix="/api/antakshari",
    tags=["Antakshari Game"],
    responses={
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
        503: {"model": ErrorResponse, "description": "Service Unavailable"},
    }
)

# Service instances (will be initialized on application startup)
game_service: Optional[AntakshariGameService] = None
stt_service: Optional[SpeechToTextService] = None
lyric_service: Optional[LyricMatchingService] = None
ai_service: Optional[AIResponseService] = None
analytics_service: Optional[AnalyticsService] = None


# ============================================================================
# Service Initialization
# ============================================================================

def initialize_services(db_path: str):
    """Initialize all service instances with database connection."""
    global game_service, stt_service, lyric_service, ai_service, analytics_service
    
    game_service = AntakshariGameService(db_path)
    stt_service = SpeechToTextService()
    lyric_service = LyricMatchingService(db_path)
    ai_service = AIResponseService()
    analytics_service = AnalyticsService(db_path)
    
    logger.info("Antakshari game services initialized successfully")


# ============================================================================
# Game Session Endpoints
# ============================================================================

@router.post("/start-game", response_model=TurnResponse, status_code=201)
async def start_game(session_data: GameSessionCreate):
    """
    Start a new Antakshari game session.
    
    Creates a new game session and generates the first AI turn.
    
    **Requirements Validation:**
    - Requirement 1.1: Creates new Game_Session with unique identifier
    - Requirement 1.2: Prompts for AI or family voice mode selection
    - Requirement 1.3: Initializes first AI turn with regional song snippet
    """
    try:
        if not game_service or not ai_service:
            raise HTTPException(status_code=503, detail="Game service not initialized")
        
        # Create new session
        session = game_service.create_session(
            user_id=session_data.user_id,
            mode=session_data.mode,
            family_member_id=session_data.family_member_id
        )
        
        # Generate first AI turn
        first_turn = ai_service.generate_first_turn(session.session_id)
        
        logger.info(f"Game started: session_id={session.session_id}, mode={session_data.mode}")
        
        return TurnResponse(
            turn_id=first_turn["turn_id"],
            session_id=session.session_id,
            turn_number=1,
            is_valid_match=True,
            ai_feedback="Welcome! Listen to this song and continue from the last syllable.",
            next_ai_audio_url=first_turn["audio_url"],
            next_ai_lyrics=first_turn["lyrics"],
            next_syllable=first_turn["ending_syllable"],
            matched_song=None,
            syllable_match_confidence=None,
            hint=None,
        )
        
    except Exception as e:
        logger.exception("Error starting game")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process-turn", response_model=TurnResponse)
async def process_turn(
    session_id: str = Form(...),
    audio: UploadFile = File(...),
    turn_start_timestamp: Optional[int] = Form(None),
):
    """
    Process a patient's audio recording for their turn.
    
    Handles STT transcription, lyric matching, syllable validation,
    AI response generation, and analytics tracking.
    
    **Requirements Validation:**
    - Requirement 2: Audio recording and capture
    - Requirement 3: Speech-to-text transcription
    - Requirement 4: Lyric matching and syllable validation
    - Requirement 5: AI response generation
    - Requirement 7: Silent cognitive analytics
    """
    try:
        if not all([game_service, stt_service, lyric_service, ai_service, analytics_service]):
            raise HTTPException(status_code=503, detail="Services not initialized")
        
        # Read audio file
        audio_bytes = await audio.read()
        
        # Calculate response latency
        response_latency_ms = None
        if turn_start_timestamp:
            from datetime import datetime
            current_ms = int(datetime.utcnow().timestamp() * 1000)
            response_latency_ms = current_ms - turn_start_timestamp
        
        # STT transcription with retry logic (Requirement 3.4, 3.5)
        transcription_result = await stt_service.transcribe_audio(
            audio_bytes=audio_bytes,
            languages=["as", "hi", "en"],  # Assamese, Hindi, English
            max_retries=2
        )
        
        if not transcription_result["success"]:
            return TurnResponse(
                turn_id="",
                session_id=session_id,
                turn_number=0,
                is_valid_match=False,
                ai_feedback="I couldn't hear you clearly. Please try singing again, a bit louder.",
                next_ai_audio_url=None,
                next_ai_lyrics=None,
                next_syllable="",
                matched_song=None,
                syllable_match_confidence=None,
                hint="Speak closer to the microphone",
            )
        
        transcribed_text = transcription_result["text"]
        voice_clarity_score = transcription_result["confidence"]
        
        # Lyric matching (Requirement 4.1, 4.2)
        match_result = lyric_service.match_lyrics(
            transcribed_text=transcribed_text,
            previous_syllable=game_service.get_last_syllable(session_id)
        )
        
        # Validate syllable continuity (Requirement 4.3-4.7)
        is_valid = match_result["syllable_match_confidence"] >= 0.60
        
        # Generate AI response (Requirement 5)
        ai_response = ai_service.generate_response(
            is_valid_match=is_valid,
            match_confidence=match_result["syllable_match_confidence"],
            ending_syllable=match_result["ending_syllable"],
            attempt_number=game_service.get_failed_attempts(session_id)
        )
        
        # Save turn to database
        turn = game_service.save_turn(
            session_id=session_id,
            turn_type="patient",
            transcribed_text=transcribed_text,
            matched_song_id=match_result.get("song_id"),
            matched_lyrics=match_result.get("matched_lyrics"),
            starting_syllable=match_result["starting_syllable"],
            ending_syllable=match_result["ending_syllable"],
            syllable_match_confidence=match_result["syllable_match_confidence"],
            is_valid_match=is_valid,
            response_latency_ms=response_latency_ms,
            voice_clarity_score=voice_clarity_score,
            ai_feedback=ai_response["feedback"],
        )
        
        # Track analytics silently (Requirement 7)
        analytics_service.track_turn(
            session_id=session_id,
            response_latency_ms=response_latency_ms,
            voice_clarity_score=voice_clarity_score,
            is_successful=is_valid,
        )
        
        logger.info(f"Turn processed: session={session_id}, valid={is_valid}, confidence={match_result['syllable_match_confidence']}")
        
        return TurnResponse(
            turn_id=turn.turn_id,
            session_id=session_id,
            turn_number=turn.turn_number,
            is_valid_match=is_valid,
            ai_feedback=ai_response["feedback"],
            next_ai_audio_url=ai_response.get("next_audio_url"),
            next_ai_lyrics=ai_response.get("next_lyrics"),
            next_syllable=ai_response["next_syllable"],
            matched_song=match_result.get("song_data"),
            syllable_match_confidence=match_result["syllable_match_confidence"],
            hint=ai_response.get("hint"),
        )
        
    except Exception as e:
        logger.exception("Error processing turn")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/end-game", response_model=SessionSummaryResponse)
async def end_game(session_id: str):
    """
    End an active game session and calculate final analytics.
    
    **Requirements Validation:**
    - Requirement 1.5: Finalizes Game_Session and saves analytics
    - Requirement 7: Calculates cognitive health metrics
    """
    try:
        if not game_service or not analytics_service:
            raise HTTPException(status_code=503, detail="Services not initialized")
        
        # End session
        session = game_service.end_session(session_id)
        
        # Calculate final analytics
        analytics = analytics_service.calculate_session_analytics(session_id)
        
        # Calculate duration
        duration_minutes = 0.0
        if session.ended_at and session.created_at:
            duration_seconds = (session.ended_at - session.created_at).total_seconds()
            duration_minutes = duration_seconds / 60.0
        
        logger.info(f"Game ended: session={session_id}, turns={session.turn_count}")
        
        return SessionSummaryResponse(
            session_id=session_id,
            status=session.status,
            total_turns=session.turn_count,
            duration_minutes=round(duration_minutes, 2),
            analytics=analytics,
            message="Thank you for playing! Your session has been saved.",
        )
        
    except Exception as e:
        logger.exception("Error ending game")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Analytics Endpoints (Caregiver Only)
# ============================================================================

@router.get("/analytics/{session_id}", response_model=AnalyticsResponse)
async def get_session_analytics(session_id: str):
    """
    Retrieve cognitive analytics for a completed session.
    
    **Note:** This endpoint should only be accessible to caregivers/doctors,
    not patients (Requirement 7.6).
    """
    try:
        if not analytics_service:
            raise HTTPException(status_code=503, detail="Analytics service not initialized")
        
        analytics = analytics_service.get_analytics(session_id)
        
        if not analytics:
            raise HTTPException(status_code=404, detail="Analytics not found")
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error retrieving analytics")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Regional Song Database Endpoints
# ============================================================================

@router.post("/songs/query", response_model=SyllableQueryResponse)
async def query_songs_by_syllable(query: SyllableQueryRequest):
    """
    Query songs by starting syllable.
    
    **Requirements Validation:**
    - Requirement 6.4: Search by starting syllable with <100ms response time
    """
    try:
        if not lyric_service:
            raise HTTPException(status_code=503, detail="Lyric service not initialized")
        
        songs = lyric_service.query_by_syllable(
            syllable=query.syllable,
            language=query.language,
            limit=query.limit
        )
        
        return SyllableQueryResponse(
            syllable=query.syllable,
            matches=songs,
            total_found=len(songs),
        )
        
    except Exception as e:
        logger.exception("Error querying songs")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/songs/add", status_code=201)
async def add_custom_song(song_data: RegionalSongCreate):
    """
    Add a custom family-favorite song to the database.
    
    **Requirements Validation:**
    - Requirement 6.6: Allow caregivers to add custom songs
    """
    try:
        if not lyric_service:
            raise HTTPException(status_code=503, detail="Lyric service not initialized")
        
        song = lyric_service.add_custom_song(song_data)
        
        logger.info(f"Custom song added: {song['title']} by user {song_data.user_id}")
        
        return JSONResponse(
            content={"message": "Song added successfully", "song_id": song["song_id"]},
            status_code=201
        )
        
    except Exception as e:
        logger.exception("Error adding custom song")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Health Check
# ============================================================================

@router.get("/health")
async def health_check():
    """Check if the Antakshari game service is operational."""
    services_status = {
        "game_service": game_service is not None,
        "stt_service": stt_service is not None,
        "lyric_service": lyric_service is not None,
        "ai_service": ai_service is not None,
        "analytics_service": analytics_service is not None,
    }
    
    all_healthy = all(services_status.values())
    
    return JSONResponse(
        content={
            "status": "healthy" if all_healthy else "degraded",
            "services": services_status,
        },
        status_code=200 if all_healthy else 503
    )
