package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User represents the user model in the database
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	FullName     string             `bson:"fullName" json:"fullName"`
	Username     string             `bson:"username" json:"username"`
	Email        string             `bson:"email" json:"email"`
	Password     string             `bson:"password" json:"-"` // Never send password in responses
	Role         string             `bson:"role" json:"role"`  // "doctor" or "patient"
	Uuid         string             `bson:"uuid" json:"uuid"`
	DoctorID     string             `bson:"doctor_id,omitempty" json:"doctor_id,omitempty"`
	Phone        string             `bson:"phone,omitempty" json:"phone,omitempty"`
	Age          string             `bson:"age,omitempty" json:"age,omitempty"`
	Gender       string             `bson:"gender,omitempty" json:"gender,omitempty"`
	FatherName   string             `bson:"fatherName,omitempty" json:"fatherName,omitempty"`
	MotherName   string             `bson:"motherName,omitempty" json:"motherName,omitempty"`
	Address      string             `bson:"address,omitempty" json:"address,omitempty"`
	MedicalInfo  MedicalInfo        `bson:"medicalInfo,omitempty" json:"medicalInfo,omitempty"`
	VisitRecords []VisitRecord      `bson:"visitRecords,omitempty" json:"visitRecords,omitempty"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// MedicalInfo contains relatively static medical information
type MedicalInfo struct {
	PastHistory     string `bson:"pastHistory,omitempty" json:"pastHistory"`
	PersonalHistory string `bson:"personalHistory,omitempty" json:"personalHistory"`
	FamilyHistory   string `bson:"familyHistory,omitempty" json:"familyHistory"`
	DrugHistory     string `bson:"drugHistory,omitempty" json:"drugHistory"`
	AllergyHistory  string `bson:"allergyHistory,omitempty" json:"allergyHistory"`
}

// VisitRecord represents data collected during each patient visit
type VisitRecord struct {
	Date time.Time `bson:"date" json:"date"`

	// Vision assessment
	DistantVision string `bson:"distantVision,omitempty" json:"distantVision,omitempty"`
	NearVision    string `bson:"nearVision,omitempty" json:"nearVision,omitempty"`
	ARBCVA        string `bson:"arBcva,omitempty" json:"arBcva,omitempty"`
	Retroscopy    string `bson:"retroscopy,omitempty" json:"retroscopy,omitempty"`
	NetADAR       string `bson:"netAdar,omitempty" json:"netAdar,omitempty"`
	PDA           string `bson:"pda,omitempty" json:"pda,omitempty"`
	NCT           string `bson:"nct,omitempty" json:"nct,omitempty"`
	ColorVision   string `bson:"colorVision,omitempty" json:"colorVision,omitempty"`
	VisionWithPG  string `bson:"visionWithPg,omitempty" json:"visionWithPg,omitempty"`
	PGPower       string `bson:"pgPower,omitempty" json:"pgPower,omitempty"`
	PMT           string `bson:"pmt,omitempty" json:"pmt,omitempty"`

	// Clinical data for this visit
	ChiefComplaint    string `bson:"chiefComplaint,omitempty" json:"chiefComplaint,omitempty"`
	PresentingIllness string `bson:"presentingIllness,omitempty" json:"presentingIllness,omitempty"`

	// Vitals
	BP          string `bson:"bp,omitempty" json:"bp,omitempty"`
	PR          string `bson:"pr,omitempty" json:"pr,omitempty"`
	Temperature string `bson:"temperature,omitempty" json:"temperature,omitempty"`

	// Prescription
	GlassPrescription string `bson:"glassPrescription,omitempty" json:"glassPrescription,omitempty"`
}

// SafeUser is a User object that can be safely returned to clients
type SafeUser struct {
	ID       primitive.ObjectID `json:"id"`
	FullName string             `json:"fullName"`
	Username string             `json:"username"`
	Email    string             `json:"email"`
	Role     string             `json:"role"`
}

// ToSafeUser converts a User to a SafeUser, omitting sensitive fields
func (u *User) ToSafeUser() SafeUser {
	return SafeUser{
		ID:       u.ID,
		FullName: u.FullName,
		Username: u.Username,
		Email:    u.Email,
		Role:     u.Role,
	}
}
