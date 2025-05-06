package middleware

import (
	"net/http"
	"strings"

	"github.com/Meheer17/ambieye/internal/auth"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuthMiddleware verifies the token and adds the user ID and role to the context
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		// Check if the header has the format "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer <token>"})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Verify the token
		token, err := auth.VerifyToken(tokenString, jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Extract claims from the token
		claims, err := auth.ExtractTokenClaims(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to extract token claims"})
			c.Abort()
			return
		}

		// Convert user ID string to ObjectID
		userID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
			c.Abort()
			return
		}

		// Set user ID and role in context for later use
		c.Set("userID", userID)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// RoleMiddleware checks if the user has the required role
func RoleMiddleware(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: role not found"})
			c.Abort()
			return
		}

		// Check if the user's role is in the allowed roles
		allowed := false
		for _, role := range roles {
			if userRole == role {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}
