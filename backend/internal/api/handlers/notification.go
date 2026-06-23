package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/Meheer17/ambieye/internal/db/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// NotificationHandler handles notification-related operations
type NotificationHandler struct {
	notificationCollection *mongo.Collection
	deviceTokenCollection  *mongo.Collection
	settingsCollection     *mongo.Collection
	userCollection         *mongo.Collection
}

// NewNotificationHandler creates a new NotificationHandler
func NewNotificationHandler(db *mongo.Database) *NotificationHandler {
	return &NotificationHandler{
		notificationCollection: db.Collection("notifications"),
		deviceTokenCollection:  db.Collection("deviceTokens"),
		settingsCollection:     db.Collection("notificationSettings"),
		userCollection:         db.Collection("users"),
	}
}

// RegisterDevice handles registration of a device for push notifications
func (h *NotificationHandler) RegisterDevice(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	var deviceData struct {
		Token    string `json:"token" binding:"required"`
		Platform string `json:"platform" binding:"required,oneof=ios android web"`
	}

	if err := c.ShouldBindJSON(&deviceData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if device token already exists for this user
	var existingToken models.DeviceToken
	err := h.deviceTokenCollection.FindOne(ctx, bson.M{
		"userId": userID,
		"token":  deviceData.Token,
	}).Decode(&existingToken)

	now := time.Now()

	if err == mongo.ErrNoDocuments {
		// Create new device token
		newToken := models.DeviceToken{
			ID:        primitive.NewObjectID(),
			UserID:    userID.(primitive.ObjectID),
			Token:     deviceData.Token,
			Platform:  deviceData.Platform,
			CreatedAt: now,
			UpdatedAt: now,
		}

		_, err := h.deviceTokenCollection.InsertOne(ctx, newToken)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register device token"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	} else {
		// Update existing token
		_, err := h.deviceTokenCollection.UpdateOne(ctx, bson.M{"_id": existingToken.ID}, bson.M{
			"$set": bson.M{
				"platform":  deviceData.Platform,
				"updatedAt": now,
			},
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update device token"})
			return
		}
	}

	// Check if notification settings exist for this user
	var settings models.NotificationSettings
	err = h.settingsCollection.FindOne(ctx, bson.M{"userId": userID}).Decode(&settings)

	if err == mongo.ErrNoDocuments {
		// Create default notification settings
		defaultSettings := models.NotificationSettings{
			UserID:             userID.(primitive.ObjectID),
			PushEnabled:        true,
			EmailEnabled:       true,
			NewQueryNotif:      true,
			QueryResponseNotif: true,
			ReminderNotif:      true,
			UpdatedAt:          now,
		}

		_, err := h.settingsCollection.InsertOne(ctx, defaultSettings)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification settings"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Device registered successfully"})
}

// UpdateNotificationSettings handles updating a user's notification preferences
func (h *NotificationHandler) UpdateNotificationSettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	var settingsData models.NotificationSettings
	if err := c.ShouldBindJSON(&settingsData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	settingsData.UserID = userID.(primitive.ObjectID)
	settingsData.UpdatedAt = time.Now()

	opts := options.Update().SetUpsert(true)
	_, err := h.settingsCollection.UpdateOne(
		ctx,
		bson.M{"userId": userID},
		bson.M{"$set": settingsData},
		opts,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification settings updated successfully"})
}

// GetNotificationSettings retrieves a user's notification preferences
func (h *NotificationHandler) GetNotificationSettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var settings models.NotificationSettings
	err := h.settingsCollection.FindOne(ctx, bson.M{"userId": userID}).Decode(&settings)

	if err == mongo.ErrNoDocuments {
		// Return default settings if none exist
		settings = models.NotificationSettings{
			UserID:             userID.(primitive.ObjectID),
			PushEnabled:        true,
			EmailEnabled:       true,
			NewQueryNotif:      true,
			QueryResponseNotif: true,
			ReminderNotif:      true,
			UpdatedAt:          time.Now(),
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

// GetNotifications retrieves all notifications for a user
func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get notifications with pagination
	page, perPage := getPaginationParams(c)
	opts := options.Find().
		SetSort(bson.M{"createdAt": -1}).
		SetSkip(int64((page - 1) * perPage)).
		SetLimit(int64(perPage))

	cursor, err := h.notificationCollection.Find(
		ctx,
		bson.M{"userId": userID},
		opts,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	var notifications []models.Notification
	if err := cursor.All(ctx, &notifications); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode notifications"})
		return
	}

	// Get total count for pagination
	totalCount, err := h.notificationCollection.CountDocuments(ctx, bson.M{"userId": userID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Update all unread notifications to read
	if len(notifications) > 0 {
		var notificationIDs []primitive.ObjectID
		for _, notification := range notifications {
			if !notification.IsRead {
				notificationIDs = append(notificationIDs, notification.ID)
			}
		}

		if len(notificationIDs) > 0 {
			_, err := h.notificationCollection.UpdateMany(
				ctx,
				bson.M{"_id": bson.M{"$in": notificationIDs}},
				bson.M{"$set": bson.M{"isRead": true}},
			)

			if err != nil {
				// Just log the error, don't fail the request
				// In a real app, you would use a logger
				c.Error(err)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"pagination": gin.H{
			"page":       page,
			"perPage":    perPage,
			"totalItems": totalCount,
			"totalPages": (totalCount + int64(perPage) - 1) / int64(perPage),
		},
	})
}

// CreateNotification creates a notification for a user (internal use only)
func (h *NotificationHandler) CreateNotification(ctx context.Context, userID primitive.ObjectID, notificationType models.NotificationType, title, message string, data map[string]string) (primitive.ObjectID, error) {
	notification := models.Notification{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Type:      notificationType,
		Title:     title,
		Message:   message,
		Data:      data,
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	_, err := h.notificationCollection.InsertOne(ctx, notification)
	if err != nil {
		return primitive.NilObjectID, err
	}

	return notification.ID, nil
}