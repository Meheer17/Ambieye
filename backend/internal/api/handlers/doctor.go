package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/Meheer17/ambieye/internal/db/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// DoctorHandler handles doctor-related requests
type DoctorHandler struct {
	userCollection  *mongo.Collection
	queryCollection *mongo.Collection
}

// NewDoctorHandler creates a new DoctorHandler
func NewDoctorHandler(db *mongo.Database) *DoctorHandler {
	return &DoctorHandler{
		userCollection:  db.Collection("users"),
		queryCollection: db.Collection("queries"),
	}
}

// // GetDashboard returns dashboard data for doctors
// func (h *DoctorHandler) GetDashboard(c *gin.Context) {
// 	doctorID, exists := c.Get("userID")
// 	if !exists {
// 		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
// 		return
// 	}

// 	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
// 	defer cancel()

// 	// Get counts of different query statuses
// 	pendingCount, err := h.queryCollection.CountDocuments(ctx, bson.M{
// 		"doctorId": doctorID,
// 		"status":   "pending",
// 	})
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
// 		return
// 	}

// 	answeredCount, err := h.queryCollection.CountDocuments(ctx, bson.M{
// 		"doctorId": doctorID,
// 		"status":   "answered",
// 	})
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
// 		return
// 	}

// 	// Get recent queries
// 	opts := options.Find().SetSort(bson.M{"createdAt": -1}).SetLimit(5)
// 	cursor, err := h.queryCollection.Find(ctx, bson.M{
// 		"doctorId": doctorID,
// 	}, opts)
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
// 		return
// 	}
// 	defer cursor.Close(ctx)

// 	var recentQueries []models.Query
// 	if err := cursor.All(ctx, &recentQueries); err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
// 		return
// 	}

// 	// Prepare enhanced queries with patient information
// 	recentQueriesWithInfo := make([]models.QueryWithUserInfo, 0, len(recentQueries))
// 	for _, query := range recentQueries {
// 		// Get patient information
// 		var patient models.User
// 		err := h.userCollection.FindOne(ctx, bson.M{"_id": query.PatientID}).Decode(&patient)
// 		if err == nil { // Only add if patient found
// 			queryWithInfo := models.QueryWithUserInfo{
// 				ID:          query.ID,
// 				PatientID:   query.PatientID,
// 				PatientName: patient.FullName,
// 				DoctorID:    query.DoctorID,
// 				Question:    query.Question,
// 				Response:    query.Response,
// 				Status:      query.Status,
// 				CreatedAt:   query.CreatedAt,
// 				UpdatedAt:   query.UpdatedAt,
// 				AnsweredAt:  query.AnsweredAt,
// 			}
// 			recentQueriesWithInfo = append(recentQueriesWithInfo, queryWithInfo)
// 		}
// 	}

// 	c.JSON(http.StatusOK, gin.H{
// 		"stats": gin.H{
// 			"pendingQueries":  pendingCount,
// 			"answeredQueries": answeredCount,
// 		},
// 		"recentQueries": recentQueriesWithInfo,
// 	})
// }

// GetPatients returns all patients associated with a doctor
func (h *DoctorHandler) GetPatients(c *gin.Context) {
	doctorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	// Get doctor details
	verifyCtx, verifyCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer verifyCancel()

	var doctor models.User
	err := h.userCollection.FindOne(verifyCtx, bson.M{"_id": doctorID}).Decode(&doctor)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Doctor not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Verify the user is actually a doctor
	if doctor.Role != "doctor" {
		c.JSON(http.StatusForbidden, gin.H{"error": "User is not a doctor"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find all users where doctor_id matches this user's ID
	cursor, err := h.userCollection.Find(ctx, bson.M{"doctor_id": doctor.Uuid})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	// Decode all patients into a slice
	var patients []models.User
	if err := cursor.All(ctx, &patients); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode patients data"})
		return
	}

	// Convert to safe user objects to hide sensitive information
	safePatients := make([]interface{}, len(patients))
	for i, patient := range patients {
		safePatients[i] = patient
	}

	c.JSON(http.StatusOK, gin.H{"patients": safePatients})
}

// GetProfile returns the doctor's profile
func (h *DoctorHandler) GetProfile(c *gin.Context) {
	doctorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var doctor models.User
	err := h.userCollection.FindOne(ctx, bson.M{"_id": doctorID}).Decode(&doctor)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Doctor not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get query stats
	totalQueries, err := h.queryCollection.CountDocuments(ctx, bson.M{"doctorId": doctorID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	answeredQueries, err := h.queryCollection.CountDocuments(ctx, bson.M{
		"doctorId": doctorID,
		"status":   "answered",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"profile": doctor.ToSafeUser(),
		"stats": gin.H{
			"totalQueries":    totalQueries,
			"answeredQueries": answeredQueries,
			"responseRate":    calculateResponseRate(totalQueries, answeredQueries),
		},
	})
}

// Helper function to calculate response rate
func calculateResponseRate(total, answered int64) float64 {
	if total == 0 {
		return 0
	}
	return float64(answered) / float64(total) * 100
}

func (h *DoctorHandler) GetDashboard(c *gin.Context) {
	doctorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get counts of different query statuses
	pendingCount, err := h.queryCollection.CountDocuments(ctx, bson.M{
		"doctorId": doctorID,
		"status":   "pending",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	answeredCount, err := h.queryCollection.CountDocuments(ctx, bson.M{
		"doctorId": doctorID,
		"status":   "answered",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get patient count for this doctor
	patientCount, err := h.userCollection.CountDocuments(ctx, bson.M{
		"role":     "patient",
		"doctorId": doctorID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get doctor info
	var doctor models.User
	err = h.userCollection.FindOne(ctx, bson.M{"_id": doctorID}).Decode(&doctor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get recent queries
	opts := options.Find().SetSort(bson.M{"createdAt": -1}).SetLimit(5)
	cursor, err := h.queryCollection.Find(ctx, bson.M{
		"doctorId": doctorID,
	}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	var recentQueries []models.Query
	if err := cursor.All(ctx, &recentQueries); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Prepare enhanced queries with patient information
	recentQueriesWithInfo := make([]models.QueryWithUserInfo, 0, len(recentQueries))
	for _, query := range recentQueries {
		// Get patient information
		var patient models.User
		err := h.userCollection.FindOne(ctx, bson.M{"_id": query.PatientID}).Decode(&patient)
		if err == nil { // Only add if patient found
			queryWithInfo := models.QueryWithUserInfo{
				ID:          query.ID,
				PatientID:   query.PatientID,
				PatientName: patient.FullName,
				DoctorID:    query.DoctorID,
				Question:    query.Question,
				Response:    query.Response,
				Status:      query.Status,
				Urgency:     query.Urgency,
				CreatedAt:   query.CreatedAt,
				UpdatedAt:   query.UpdatedAt,
				AnsweredAt:  query.AnsweredAt,
			}
			recentQueriesWithInfo = append(recentQueriesWithInfo, queryWithInfo)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"profile": doctor.ToSafeUser(),
		"stats": gin.H{
			"pendingQueries":  pendingCount,
			"answeredQueries": answeredCount,
			"totalQueries":    pendingCount + answeredCount,
			"totalPatients":   patientCount,
		},
		"recentQueries": recentQueriesWithInfo,
	})
}

// GetPatientById returns a specific patient by ID
func (h *DoctorHandler) GetPatientById(c *gin.Context) {
	doctorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	// Get the patient ID from the URL parameter
	patientID := c.Param("id")
	if patientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Patient ID is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// First verify that the user is a doctor
	var doctor models.User
	// Use doctorIDStr instead of doctorID for the database query
	err := h.userCollection.FindOne(ctx, bson.M{"_id": doctorID}).Decode(&doctor)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Doctor not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Verify the user is actually a doctor
	if doctor.Role != "doctor" {
		c.JSON(http.StatusForbidden, gin.H{"error": "User is not a doctor"})
		return
	}

	// Find the specific patient
	var patient models.User
	patienId, err := primitive.ObjectIDFromHex(patientID)
	err = h.userCollection.FindOne(ctx, bson.M{
		"_id":       patienId,
		"doctor_id": doctor.Uuid, // Ensure patient belongs to this doctor
	}).Decode(&patient)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotImplemented, gin.H{"error": "Patient not found or not assigned to you"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"patient": patient})
}

// UpdatePatientMedicalInfo updates a patient's medical information
func (h *DoctorHandler) UpdatePatientMedicalInfo(c *gin.Context) {
	doctorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	// Get the patient ID from the URL parameter
	patientID := c.Param("id")
	if patientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Patient ID is required"})
		return
	}

	// Read the raw body to debug what's being received
	rawData, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Create a temporary struct to handle the actual JSON structure
	var requestBody struct {
		MedicalInfo models.MedicalInfo `json:"medicalInfo"`
	}

	// Try to unmarshal into the wrapper struct
	if err := json.Unmarshal(rawData, &requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format: " + err.Error()})
		return
	}

	// Extract the medical info from the wrapper
	medicalInfo := requestBody.MedicalInfo

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// First verify that the user is a doctor
	var doctor models.User
	err = h.userCollection.FindOne(ctx, bson.M{"_id": doctorID}).Decode(&doctor)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Doctor not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Verify the user is actually a doctor
	if doctor.Role != "doctor" {
		c.JSON(http.StatusForbidden, gin.H{"error": "User is not a doctor"})
		return
	}

	// Convert patient ID to ObjectID
	patientObjID, err := primitive.ObjectIDFromHex(patientID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid patient ID format"})
		return
	}

	// Verify patient belongs to this doctor
	var patient models.User
	err = h.userCollection.FindOne(ctx, bson.M{
		"_id":       patientObjID,
		"doctor_id": doctor.Uuid,
	}).Decode(&patient)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusForbidden, gin.H{"error": "Patient not found or not assigned to you"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Update the patient's medical info
	updateResult, err := h.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": patientObjID},
		bson.M{
			"$set": bson.M{
				"medicalInfo": medicalInfo,
				"updatedAt":   time.Now(),
			},
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update medical info"})
		return
	}

	if updateResult.ModifiedCount == 0 {
		c.JSON(http.StatusNotModified, gin.H{"message": "No changes made"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Medical info updated successfully",
		"medicalInfo": medicalInfo,
	})
}

// AddPatientVisitRecord adds a new visit record to a patient's history
func (h *DoctorHandler) AddPatientVisitRecord(c *gin.Context) {
	doctorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	// Get the patient ID from the URL parameter
	patientID := c.Param("id")
	if patientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Patient ID is required"})
		return
	}

	// Read the raw body to debug what's being received
	rawData, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Create a temporary struct to handle the actual JSON structure
	var requestBody struct {
		VisitRecord models.VisitRecord `json:"visitRecord"`
	}

	// Try to unmarshal into the wrapper struct
	if err := json.Unmarshal(rawData, &requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format: " + err.Error()})
		return
	}

	// Extract the visit record from the wrapper
	visitRecord := requestBody.VisitRecord

	// Set the date to now if not provided
	if visitRecord.Date.IsZero() {
		visitRecord.Date = time.Now()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// First verify that the user is a doctor
	var doctor models.User
	err = h.userCollection.FindOne(ctx, bson.M{"_id": doctorID}).Decode(&doctor)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Doctor not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Verify the user is actually a doctor
	if doctor.Role != "doctor" {
		c.JSON(http.StatusForbidden, gin.H{"error": "User is not a doctor"})
		return
	}

	// Convert patient ID to ObjectID
	patientObjID, err := primitive.ObjectIDFromHex(patientID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid patient ID format"})
		return
	}

	// Verify patient belongs to this doctor
	var patient models.User
	err = h.userCollection.FindOne(ctx, bson.M{
		"_id":       patientObjID,
		"doctor_id": doctor.Uuid,
	}).Decode(&patient)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusForbidden, gin.H{"error": "Patient not found or not assigned to you"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Add the new visit record to the patient's records
	updateResult, err := h.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": patientObjID},
		bson.M{
			"$push": bson.M{"visitRecords": visitRecord},
			"$set":  bson.M{"updatedAt": time.Now()},
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add visit record"})
		return
	}

	if updateResult.ModifiedCount == 0 {
		c.JSON(http.StatusNotModified, gin.H{"message": "No changes made"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Visit record added successfully",
		"visitRecord": visitRecord,
	})
}
