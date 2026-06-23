package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/Meheer17/ambieye/internal/auth"
	"github.com/Meheer17/ambieye/internal/config"
	"github.com/Meheer17/ambieye/internal/db/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler handles authentication related requests
type AuthHandler struct {
	userCollection *mongo.Collection
	cfg            *config.Config
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(db *mongo.Database, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		userCollection: db.Collection("users"),
		cfg:            cfg,
	}
}

// Login handles user login and returns JWT tokens
func (h *AuthHandler) Login(c *gin.Context) {
	var credentials struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&credentials); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find the user by username
	var user models.User
	fmt.Println(credentials)
	err := h.userCollection.FindOne(ctx, bson.M{"username": credentials.Username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		fmt.Println("error1")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Compare passwords
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(credentials.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Create tokens
	tokens, err := auth.CreateTokens(user, h.cfg.JWT.Secret, h.cfg.JWT.AccessExpiry, h.cfg.JWT.RefreshExpiry)
	if err != nil {
		fmt.Println("error2")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
		return
	}

	// Return tokens and user info
	c.JSON(http.StatusOK, gin.H{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"user":          user.ToSafeUser(),
	})
}

// Signup handles user registration
func (h *AuthHandler) Signup(c *gin.Context) {
	var userData struct {
		FullName string `json:"fullName" binding:"required"`
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		UserType string `json:"userType" binding:"required,oneof=doctor patient"`

		Phone       string `json:"phone" binding:"required"`
		Age         string `json:"age" binding:"required"`
		Gender      string `json:"gender" binding:"required"`
		FatherName  string `json:"fatherName" binding:"required"`
		MotherName  string `json:"motherName" binding:"required"`
		Address     string `json:"address" binding:"required"`
		DateOfBirth string `json:"dateOfBirth" binding:"required"`
	}

	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if username already exists
	count, err := h.userCollection.CountDocuments(ctx, bson.M{"username": userData.Username})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	// Check if email already exists
	count, err = h.userCollection.CountDocuments(ctx, bson.M{"email": userData.Email})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(userData.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create new user
	now := time.Now()
	user := models.User{
		ID:       primitive.NewObjectID(),
		FullName: userData.FullName,
		Username: userData.Username,

		Phone:       userData.Phone,
		Age:         userData.Age,
		Gender:      userData.Gender,
		FatherName:  userData.FatherName,
		MotherName:  userData.MotherName,
		Address:     userData.Address,
		DateOfBirth: userData.DateOfBirth,

		VisitRecords: []models.VisitRecord{},

		Uuid:      uuid.NewString()[0:7],
		Email:     userData.Email,
		Password:  string(hashedPassword),
		Role:      userData.UserType,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Insert user into database
	_, err = h.userCollection.InsertOne(ctx, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Create tokens
	tokens, err := auth.CreateTokens(user, h.cfg.JWT.Secret, h.cfg.JWT.AccessExpiry, h.cfg.JWT.RefreshExpiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
		return
	}

	// Return tokens and user info
	c.JSON(http.StatusCreated, gin.H{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"user":          user.ToSafeUser(),
	})
}

// Verify checks if the token is valid and returns the user info
func (h *AuthHandler) Verify(c *gin.Context) {
	// User ID was added to context by AuthMiddleware
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get user from database
	var user models.User
	err := h.userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user.ToSafeUser(),
	})
}

// Logout handles user logout (client-side token removal)
func (h *AuthHandler) Logout(c *gin.Context) {
	// For a simple implementation, let the client handle token removal
	// In a more advanced implementation, you could invalidate tokens using Redis
	c.JSON(http.StatusOK, gin.H{"message": "Successfully logged out"})
}
