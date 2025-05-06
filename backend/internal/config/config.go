package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the API
type Config struct {
	Server struct {
		Port         string
		ReadTimeout  time.Duration
		WriteTimeout time.Duration
		IdleTimeout  time.Duration
	}
	MongoDB struct {
		URI        string
		Database   string
		Collection string
	}
	JWT struct {
		Secret           string
		AccessExpiry     time.Duration
		RefreshExpiry    time.Duration
		RefreshTokenName string
	}
}

// Load reads configuration from environment and returns Config
func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	cfg := &Config{}

	// Server configuration
	cfg.Server.Port = getEnv("PORT", "5000")
	cfg.Server.ReadTimeout = time.Duration(getEnvAsInt("READ_TIMEOUT", 15)) * time.Second
	cfg.Server.WriteTimeout = time.Duration(getEnvAsInt("WRITE_TIMEOUT", 15)) * time.Second
	cfg.Server.IdleTimeout = time.Duration(getEnvAsInt("IDLE_TIMEOUT", 60)) * time.Second

	// MongoDB configuration
	cfg.MongoDB.URI = getEnv("MONGODB_URI", "mongodb://localhost:27017")
	cfg.MongoDB.Database = getEnv("MONGODB_DATABASE", "ambieye")

	// JWT configuration
	cfg.JWT.Secret = getEnv("JWT_SECRET", "your-secret-key-change-in-production")
	cfg.JWT.AccessExpiry = time.Duration(getEnvAsInt("JWT_ACCESS_EXPIRY", 15)) * time.Minute
	cfg.JWT.RefreshExpiry = time.Duration(getEnvAsInt("JWT_REFRESH_EXPIRY", 7*24)) * time.Hour
	cfg.JWT.RefreshTokenName = getEnv("REFRESH_TOKEN_NAME", "refresh_token")

	return cfg, nil
}

// Helper function to read environment variables with default values
func getEnv(key string, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}

// Helper function to read environment variables as integers
func getEnvAsInt(key string, defaultVal int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultVal
}
