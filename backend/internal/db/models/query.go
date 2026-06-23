package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Query represents a question from a patient and a response from a doctor
type Query struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	PatientID  primitive.ObjectID `bson:"patientId" json:"patientId"`
	DoctorID   primitive.ObjectID `bson:"doctorId,omitempty" json:"doctorId,omitempty"`
	Question   string             `bson:"question" json:"question"`
	Response   string             `bson:"response,omitempty" json:"response,omitempty"`
	Status     string             `bson:"status" json:"status"` // "pending", "answered", "closed"
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time          `bson:"updatedAt" json:"updatedAt"`
	AnsweredAt *time.Time         `bson:"answeredAt,omitempty" json:"answeredAt,omitempty"`
	Urgency    string             `bson:"urgency,omitempty" json:"urgency,omitempty"` // "low", "medium", "high"
}

// QueryWithUserInfo represents a query with additional user information
type QueryWithUserInfo struct {
	ID          primitive.ObjectID `json:"id"`
	PatientID   primitive.ObjectID `json:"patientId"`
	PatientName string             `json:"patientName"`
	DoctorID    primitive.ObjectID `json:"doctorId,omitempty"`
	DoctorName  string             `json:"doctorName,omitempty"`
	Question    string             `json:"question"`
	Response    string             `json:"response,omitempty"`
	Status      string             `json:"status"`
	Urgency     string             `json:"urgency,omitempty"`
	CreatedAt   time.Time          `json:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt"`
	AnsweredAt  *time.Time         `json:"answeredAt,omitempty"`
}