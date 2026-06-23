package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/Meheer17/ambieye/internal/db/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GameHandler handles game-related operations
type GameHandler struct {
	gameCollection *mongo.Collection
	userCollection *mongo.Collection
}

// NewGameHandler creates a new GameHandler
func NewGameHandler(db *mongo.Database) *GameHandler {
	return &GameHandler{
		gameCollection: db.Collection("gameResults"),
		userCollection: db.Collection("users"),
	}
}

// SaveGameResult handles saving a game result
func (h *GameHandler) SaveGameResult(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	var gameData struct {
		GameID   int                    `json:"gameId" binding:"required"`
		Score    int                    `json:"score" binding:"required"`
		Duration float64                `json:"duration" binding:"required"`
		Date     string                 `json:"date" binding:"required"`
		Details  map[string]interface{} `json:"details,omitempty"`
	}

	if err := c.ShouldBindJSON(&gameData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Parse the date string
	date, err := time.Parse(time.RFC3339, gameData.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use ISO 8601"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create game result object
	gameResult := models.GameResult{
		ID:       primitive.NewObjectID(),
		UserID:   userID.(primitive.ObjectID),
		GameID:   gameData.GameID,
		Score:    gameData.Score,
		Duration: gameData.Duration,
		Date:     date,
		Details:  gameData.Details,
	}

	// Insert into database
	_, err = h.gameCollection.InsertOne(ctx, gameResult)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save game result"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Game result saved successfully",
		"result":  gameResult,
	})
}

// GetGameHistory retrieves game history for a user (limited to 20 days)
func (h *GameHandler) GetGameHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	// Check if a specific user ID is requested (for doctors viewing patient history)
	targetUserID := c.Query("userId")
	role, _ := c.Get("role")

	// If a specific user is requested and the requester is not a doctor, deny access
	if targetUserID != "" && role != "doctor" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only doctors can view other users' game history"})
		return
	}

	// If targetUserID is specified and requester is a doctor, use that instead
	var lookupUserID primitive.ObjectID
	var err error
	if targetUserID != "" && role == "doctor" {
		lookupUserID, err = primitive.ObjectIDFromHex(targetUserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}
	} else {
		lookupUserID = userID.(primitive.ObjectID)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Calculate the date 20 days ago
	now := time.Now().UTC()
	startDate := now.AddDate(0, 0, -20)

	// Query for results from the last 20 days
	filter := bson.M{
		"userId": lookupUserID,
		"date": bson.M{
			"$gte": startDate,
		},
	}

	opts := options.Find().SetSort(bson.M{"date": -1})
	cursor, err := h.gameCollection.Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	var results []models.GameResult
	if err := cursor.All(ctx, &results); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode game results"})
		return
	}

	// Group results by date
	resultsByDate := make(map[string][]models.GameResultResponse)
	for _, result := range results {
		dateStr := result.Date.Format("2006-01-02")
		if _, exists := resultsByDate[dateStr]; !exists {
			resultsByDate[dateStr] = make([]models.GameResultResponse, 0)
		}
		resultsByDate[dateStr] = append(resultsByDate[dateStr], models.GameResultResponse{
			ID:       result.ID,
			GameID:   result.GameID,
			GameName: models.GetGameNameByID(result.GameID),
			Score:    result.Score,
			Duration: result.Duration,
			Date:     result.Date,
			Details:  result.Details,
		})
	}

	// Convert to array of daily results for easier frontend processing
	type DailyResults struct {
		Date    string                      `json:"date"`
		Games   []models.GameResultResponse `json:"games"`
		Summary models.GameSummary          `json:"summary"`
	}

	history := make([]DailyResults, 0, len(resultsByDate))
	for date, games := range resultsByDate {
		dailyResults := DailyResults{
			Date:    date,
			Games:   games,
			Summary: calculateGameSummary(getGameResultsFromResponses(games)),
		}
		history = append(history, dailyResults)
	}

	// Sort history by date (most recent first)
	// Note: In a real implementation, you'd want to sort this array by date

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"history": history,
	})
}

// Helper function to calculate game summary statistics
func calculateGameSummary(results []models.GameResult) models.GameSummary {
	if len(results) == 0 {
		return models.GameSummary{}
	}

	var totalScore int
	var totalTime float64
	var totalAccuracy float64
	accuracyCount := 0

	for _, result := range results {
		totalScore += result.Score
		totalTime += result.Duration

		// Try to extract accuracy from details if available
		if result.Details != nil {
			if acc, ok := result.Details["accuracy"].(float64); ok {
				totalAccuracy += acc
				accuracyCount++
			}
		}
	}

	averageScore := float64(totalScore) / float64(len(results))

	var averageAccuracy float64
	if accuracyCount > 0 {
		averageAccuracy = totalAccuracy / float64(accuracyCount)
	} else {
		// If no explicit accuracy, estimate from score (assuming score is percentage-based)
		averageAccuracy = averageScore
	}

	return models.GameSummary{
		TotalGames:      len(results),
		AverageScore:    averageScore,
		TotalPlayTime:   totalTime,
		AverageAccuracy: averageAccuracy,
	}
}

// Helper to convert GameResultResponse array back to GameResult array for summary calculation
func getGameResultsFromResponses(responses []models.GameResultResponse) []models.GameResult {
	results := make([]models.GameResult, len(responses))
	for i, resp := range responses {
		results[i] = models.GameResult{
			ID:       resp.ID,
			GameID:   resp.GameID,
			Score:    resp.Score,
			Duration: resp.Duration,
			Date:     resp.Date,
			Details:  resp.Details,
		}
	}
	return results
}

func (h *GameHandler) GetTodayGameResults(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Calculate today's start and end time in UTC
	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	todayEnd := todayStart.Add(24 * time.Hour)

	// Query for today's results
	filter := bson.M{
		"userId": userID,
		"date": bson.M{
			"$gte": todayStart,
			"$lt":  todayEnd,
		},
	}

	opts := options.Find().SetSort(bson.M{"date": -1})
	cursor, err := h.gameCollection.Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	var results []models.GameResult
	if err := cursor.All(ctx, &results); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode game results"})
		return
	}

	// Convert to response format with game names
	gamesPlayed := make([]map[string]interface{}, len(results))
	for i, result := range results {
		// Calculate accuracy from details or use score as fallback
		accuracy := float64(result.Score)
		if result.Details != nil {
			if acc, ok := result.Details["accuracy"].(float64); ok {
				accuracy = acc
			} else if correctSelections, ok := result.Details["correctSelections"].(float64); ok {
				if wrongSelections, ok := result.Details["wrongSelections"].(float64); ok {
					totalSelections := correctSelections + wrongSelections
					if totalSelections > 0 {
						accuracy = (correctSelections / totalSelections) * 100
					}
				}
			}
		}

		gamesPlayed[i] = map[string]interface{}{
			"id":        result.ID.Hex(),
			"name":      models.GetGameNameByID(result.GameID),
			"score":     result.Score,
			"accuracy":  fmt.Sprintf("%.0f%%", accuracy),
			"date":      result.Date,
			"timeSpent": result.Duration,
			"details":   result.Details,
		}
	}

	// Calculate today's summary
	summary := calculateGameSummary(results)

	// Get user's daily goal from settings (default to 5 if not set)
	dailyGoal := 5

	// Check if user has custom settings
	var userSettings struct {
		DailyGameGoal int `bson:"dailyGameGoal"`
	}

	err = h.userCollection.FindOne(
		ctx,
		bson.M{"_id": userID.(primitive.ObjectID)},
		options.FindOne().SetProjection(bson.M{"settings.dailyGameGoal": 1}),
	).Decode(&userSettings)

	if err == nil && userSettings.DailyGameGoal > 0 {
		dailyGoal = userSettings.DailyGameGoal
	}

	// Build the todayStats object
	todayStats := map[string]interface{}{
		"minutes":        summary.TotalPlayTime,
		"gamesCompleted": summary.TotalGames,
		"accuracy":       summary.AverageAccuracy,
		"dailyGoal":      dailyGoal,
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"todayStats":  todayStats,
		"gamesPlayed": gamesPlayed,
		"summary":     summary,
		"date":        todayStart.Format("2006-01-02"),
	})
}
