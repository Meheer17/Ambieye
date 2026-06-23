package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type NotificationType string

const (
	NotificationTypeNewQuery    NotificationType = "new_query"
	NotificationTypeQueryAnswer NotificationType = "query_answer"
	NotificationTypeReminder    NotificationType = "reminder"
)

// Notification represents a notification that can be sent to users
type Notification struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	Type      NotificationType   `bson:"type" json:"type"`
	Title     string             `bson:"title" json:"title"`
	Message   string             `bson:"message" json:"message"`
	Data      map[string]string  `bson:"data" json:"data"`
	IsRead    bool               `bson:"isRead" json:"isRead"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

// DeviceToken represents a user's device token for push notifications
type DeviceToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	Token     string             `bson:"token" json:"token"`
	Platform  string             `bson:"platform" json:"platform"` // "ios" or "android"
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// NotificationSettings represents a user's notification preferences
type NotificationSettings struct {
	UserID             primitive.ObjectID `bson:"userId" json:"userId"`
	PushEnabled        bool               `bson:"pushEnabled" json:"pushEnabled"`               // Master toggle for push notifications
	EmailEnabled       bool               `bson:"emailEnabled" json:"emailEnabled"`             // Master toggle for email notifications
	NewQueryNotif      bool               `bson:"newQueryNotif" json:"newQueryNotif"`           // Notify when receiving new queries
	QueryResponseNotif bool               `bson:"queryResponseNotif" json:"queryResponseNotif"` // Notify when queries are answered
	ReminderNotif      bool               `bson:"reminderNotif" json:"reminderNotif"`           // Notify for reminders
	UpdatedAt          time.Time          `bson:"updatedAt" json:"updatedAt"`
}
