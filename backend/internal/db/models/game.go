// Ambieye/backend/internal/db/models/game.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GameResult represents a saved game result
type GameResult struct {
	ID       primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	UserID   primitive.ObjectID  `bson:"userId" json:"userId"`
	GameID   int                 `bson:"gameId" json:"gameId"`
	Score    int                 `bson:"score" json:"score"`
	Duration float64             `bson:"duration" json:"duration"`
	Date     time.Time           `bson:"date" json:"date"`
	Details  map[string]interface{} `bson:"details,omitempty" json:"details,omitempty"`
}

// GameResultResponse represents a game result with additional information
type GameResultResponse struct {
	ID       primitive.ObjectID  `json:"id"`
	GameID   int                 `json:"gameId"`
	GameName string              `json:"game"`
	Score    int                 `json:"score"`
	Duration float64             `json:"time"`
	Date     time.Time           `json:"date"`
	Details  map[string]interface{} `json:"details,omitempty"`
}

// GameSummary represents summary statistics for games
type GameSummary struct {
	TotalGames      int     `json:"totalGames"`
	AverageScore    float64 `json:"averageScore"`
	TotalPlayTime   float64 `json:"totalPlayTime"`
	AverageAccuracy float64 `json:"averageAccuracy"`
}

// GetGameNameByID returns the name of the game based on its ID
func GetGameNameByID(gameID int) string {
	games := map[int]string{
		1:  "Select the colored balls",
		2:  "Select the alphabet",
		3:  "Select the correct object for the alphabets",
		4:  "Identify the symbol",
		5:  "Identify the color of the object",
		6:  "Follow the ball in clockwise direction",
		7:  "Follow the ball in anti-clockwise direction",
		8:  "Eyeball movement",
		9:  "Direction of the target",
		10: "Find the characters",
		11: "Count and choose",
		12: "Match the following",
	}

	if name, ok := games[gameID]; ok {
		return name
	}
	return "Unknown Game"
}