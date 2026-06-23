package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User represents the user model in the database
type User struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	FullName string             `bson:"fullName" json:"fullName"`
	Username string             `bson:"username" json:"username"`
	Email    string             `bson:"email" json:"email"`
	Password string             `bson:"password" json:"-"` // Never send password in responses
	Role     string             `bson:"role" json:"role"`  // "doctor" or "patient"
	Uuid     string             `bson:"uuid" json:"uuid"`
	DoctorID string             `bson:"doctor_id" json:"doctor_id"`

	Phone       string `bson:"phone" json:"phone"`
	Age         string `bson:"age" json:"age"`
	Gender      string `bson:"gender" json:"gender"`
	FatherName  string `bson:"fatherName" json:"fatherName"`
	MotherName  string `bson:"motherName" json:"motherName"`
	Address     string `bson:"address" json:"address"`
	DateOfBirth string `bson:"dateOfBirth" json:"dateOfBirth"`

	MedicalInfo  MedicalInfo   `bson:"medicalInfo" json:"medicalInfo"`
	VisitRecords []VisitRecord `bson:"visitRecords" json:"visitRecords"`
	CreatedAt    time.Time     `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time     `bson:"updatedAt" json:"updatedAt"`
}

// MedicalInfo contains relatively static medical information
type MedicalInfo struct {
	VisionWithPG      string `bson:"visionwithpg,omitempty" json:"visionwithpg,omitempty"`
	ChiefComplaint    string `bson:"chiefcomplaint,omitempty" json:"chiefcomplaint,omitempty"`
	PresentingIllness string `bson:"presentingillness,omitempty" json:"presentingillness,omitempty"`
	PastHistory       string `bson:"pastHistory,omitempty" json:"pastHistory,omitempty"`
	PersonalHistory   string `bson:"personalHistory,omitempty" json:"personalHistory,omitempty"`
	FamilyHistory     string `bson:"familyHistory,omitempty" json:"familyHistory,omitempty"`
	DrugHistory       string `bson:"drugHistory,omitempty" json:"drugHistory,omitempty"`
	AllergyHistory    string `bson:"allergyHistory,omitempty" json:"allergyHistory,omitempty"`
	BP                string `bson:"bp,omitempty" json:"bp,omitempty"`
	PR                string `bson:"pr,omitempty" json:"pr,omitempty"`
	Temp              string `bson:"temp,omitempty" json:"temp,omitempty"`
	RespirationRate   string `bson:"respirationrate,omitempty" json:"respirationrate,omitempty"`
	Notes             string `bson:"notes,omitempty" json:"notes,omitempty"`
}

// VisitRecord represents data collected during each patient visit
type VisitRecord struct {
	Date           time.Time `bson:"date" json:"date"`
	PMTVisionTPG   string    `bson:"pmtvisiontpg,omitempty" json:"pmtvisiontpg,omitempty"`
	PGPower        string    `bson:"pgpower,omitempty" json:"pgpower,omitempty"`
	PMT            string    `bson:"pmt,omitempty" json:"pmt,omitempty"`
	PDA            string    `bson:"pda,omitempty" json:"pda,omitempty"`
	ADAR           string    `bson:"adar,omitempty" json:"adar,omitempty"`
	Dryretinoscopy string    `bson:"dryretinoscopy,omitempty" json:"dryretinoscopy,omitempty"`
	Wetretinoscopy string    `bson:"wetretinoscopy,omitempty" json:"wetretinoscopy,omitempty"`
	BCVANear       string    `bson:"bcvanear,omitempty" json:"bcvanear,omitempty"`
	BCVADistant    string    `bson:"bcvadistant,omitempty" json:"bcvadistant,omitempty"`
	NCT            string    `bson:"nct,omitempty" json:"nct,omitempty"`
	ColorVision    string    `bson:"colorvision,omitempty" json:"colorvision,omitempty"`
	AR             string    `bson:"ar,omitempty" json:"ar,omitempty"`
	VisionDistant  string    `bson:"visiondistant,omitempty" json:"visiondistant,omitempty"`
	VisionNear     string    `bson:"visionnear,omitempty" json:"visionnear,omitempty"`
	// Prescription
	GlassPrescription string `bson:"glassPrescription,omitempty" json:"glassPrescription,omitempty"`
	Notes             string `bson:"notes,omitempty" json:"notes,omitempty"`
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
