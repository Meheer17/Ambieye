package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/Meheer17/ambieye/internal/db/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// PatientHandler handles patient-related requests
type PatientHandler struct {
	userCollection  *mongo.Collection
	queryCollection *mongo.Collection
}

// NewPatientHandler creates a new PatientHandler
func NewPatientHandler(db *mongo.Database) *PatientHandler {
	return &PatientHandler{
		userCollection:  db.Collection("users"),
		queryCollection: db.Collection("queries"),
	}
}

// GetDashboard returns dashboard data for patients
func (h *PatientHandler) GetDashboard(c *gin.Context) {
	patientID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get counts of different query statuses
	pendingCount, err := h.queryCollection.CountDocuments(ctx, bson.M{
		"patientId": patientID,
		"status":    "pending",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	answeredCount, err := h.queryCollection.CountDocuments(ctx, bson.M{
		"patientId": patientID,
		"status":    "answered",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get recent queries
	opts := options.Find().SetSort(bson.M{"updatedAt": -1}).SetLimit(5)
	cursor, err := h.queryCollection.Find(ctx, bson.M{
		"patientId": patientID,
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

	// Prepare enhanced queries with doctor information where available
	recentQueriesWithInfo := make([]models.QueryWithUserInfo, 0, len(recentQueries))
	for _, query := range recentQueries {
		queryWithInfo := models.QueryWithUserInfo{
			ID:         query.ID,
			PatientID:  query.PatientID,
			Question:   query.Question,
			Response:   query.Response,
			Status:     query.Status,
			CreatedAt:  query.CreatedAt,
			UpdatedAt:  query.UpdatedAt,
			AnsweredAt: query.AnsweredAt,
		}

		// Add doctor information if available
		if !query.DoctorID.IsZero() {
			var doctor models.User
			err := h.userCollection.FindOne(ctx, bson.M{"_id": query.DoctorID}).Decode(&doctor)
			if err == nil {
				queryWithInfo.DoctorID = query.DoctorID
				queryWithInfo.DoctorName = doctor.FullName
			}
		}

		recentQueriesWithInfo = append(recentQueriesWithInfo, queryWithInfo)
	}

	// Get available doctors
	cursor, err = h.userCollection.Find(ctx, bson.M{"role": "doctor"})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	var doctors []models.SafeUser
	for cursor.Next(ctx) {
		var user models.User
		if err := cursor.Decode(&user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		doctors = append(doctors, user.ToSafeUser())
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": gin.H{
			"pendingQueries":  pendingCount,
			"answeredQueries": answeredCount,
			"totalQueries":    pendingCount + answeredCount,
		},
		"recentQueries": recentQueriesWithInfo,
		"doctors":       doctors,
	})
}

// GetAppointments returns all queries made by the patient
func (h *PatientHandler) GetAppointments(c *gin.Context) {
	patientID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	status := c.Query("status") // Optional status filter

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Build filter
	filter := bson.M{"patientId": patientID}
	if status != "" {
		filter["status"] = status
	}

	// Get queries with pagination
	page, perPage := getPaginationParams(c)
	opts := options.Find().
		SetSort(bson.M{"createdAt": -1}).
		SetSkip(int64((page - 1) * perPage)).
		SetLimit(int64(perPage))

	cursor, err := h.queryCollection.Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	var queries []models.Query
	if err := cursor.All(ctx, &queries); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get total count for pagination
	totalCount, err := h.queryCollection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Prepare enhanced queries with doctor information
	queriesWithInfo := make([]models.QueryWithUserInfo, 0, len(queries))
	for _, query := range queries {
		queryWithInfo := models.QueryWithUserInfo{
			ID:         query.ID,
			PatientID:  query.PatientID,
			Question:   query.Question,
			Response:   query.Response,
			Status:     query.Status,
			CreatedAt:  query.CreatedAt,
			UpdatedAt:  query.UpdatedAt,
			AnsweredAt: query.AnsweredAt,
		}

		// Add doctor information if available
		if !query.DoctorID.IsZero() {
			var doctor models.User
			err := h.userCollection.FindOne(ctx, bson.M{"_id": query.DoctorID}).Decode(&doctor)
			if err == nil {
				queryWithInfo.DoctorID = query.DoctorID
				queryWithInfo.DoctorName = doctor.FullName
			}
		}

		queriesWithInfo = append(queriesWithInfo, queryWithInfo)
	}

	c.JSON(http.StatusOK, gin.H{
		"queries": queriesWithInfo,
		"pagination": gin.H{
			"page":       page,
			"perPage":    perPage,
			"totalItems": totalCount,
			"totalPages": (totalCount + int64(perPage) - 1) / int64(perPage),
		},
	})
}

// GetProfile returns the patient's profile
func (h *PatientHandler) GetProfile(c *gin.Context) {
	patientID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var patient models.User
	err := h.userCollection.FindOne(ctx, bson.M{"_id": patientID}).Decode(&patient)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Patient not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	patient.Password = "" // Exclude password from response
	// Get query stats
	totalQueries, err := h.queryCollection.CountDocuments(ctx, bson.M{"patientId": patientID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	answeredQueries, err := h.queryCollection.CountDocuments(ctx, bson.M{
		"patientId": patientID,
		"status":    "answered",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"profile": patient,
		"stats": gin.H{
			"totalQueries":    totalQueries,
			"answeredQueries": answeredQueries,
		},
	})
}

// Helper function to get pagination parameters from the request
func getPaginationParams(c *gin.Context) (page, perPage int) {
	// Default values
	page = 1
	perPage = 10

	// Parse page parameter
	if pageParam, exists := c.GetQuery("page"); exists {
		if p, err := strconv.Atoi(pageParam); err == nil && p > 0 {
			page = p
		}
	}

	// Parse perPage parameter
	if perPageParam, exists := c.GetQuery("perPage"); exists {
		if pp, err := strconv.Atoi(perPageParam); err == nil && pp > 0 && pp <= 100 {
			perPage = pp
		}
	}

	return page, perPage
}

func (h *PatientHandler) GetPatientQueries(c *gin.Context) {
	patientID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	role, exists := c.Get("role")
	if !exists || role != "patient" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only patients can access their queries"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Build filter to find only this patient's queries
	filter := bson.M{"patientId": patientID}

	// Add status filter if provided
	status := c.Query("status")
	if status != "" {
		filter["status"] = status
	}

	// Get queries with pagination
	page, perPage := getPaginationParams(c)
	opts := options.Find().
		SetSort(bson.M{"createdAt": -1}).
		SetSkip(int64((page - 1) * perPage)).
		SetLimit(int64(perPage))

	cursor, err := h.queryCollection.Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(ctx)

	var queries []models.Query
	if err := cursor.All(ctx, &queries); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get total count for pagination
	totalCount, err := h.queryCollection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Prepare enhanced queries with doctor information
	queriesWithInfo := make([]models.QueryWithUserInfo, 0, len(queries))
	for _, query := range queries {
		queryWithInfo := models.QueryWithUserInfo{
			ID:         query.ID,
			PatientID:  query.PatientID,
			DoctorID:   query.DoctorID,
			Question:   query.Question,
			Response:   query.Response,
			Status:     query.Status,
			Urgency:    query.Urgency,
			CreatedAt:  query.CreatedAt,
			UpdatedAt:  query.UpdatedAt,
			AnsweredAt: query.AnsweredAt,
		}

		// Add doctor information if query has been assigned to a doctor
		if !query.DoctorID.IsZero() {
			var doctor models.User
			err := h.userCollection.FindOne(ctx, bson.M{"_id": query.DoctorID}).Decode(&doctor)
			if err == nil { // Only set if doctor found
				queryWithInfo.DoctorName = doctor.FullName
			}
		}
		queriesWithInfo = append(queriesWithInfo, queryWithInfo)
	}

	c.JSON(http.StatusOK, gin.H{
		"queries": queriesWithInfo,
		"pagination": gin.H{
			"page":       page,
			"perPage":    perPage,
			"totalItems": totalCount,
			"totalPages": (totalCount + int64(perPage) - 1) / int64(perPage),
		},
	})
}

func (h *PatientHandler) UpdateProfile(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	patientID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	// Parse request body
	var updateData struct {
		FullName   string `json:"fullName"`
		Phone      string `json:"phone"`
		Age        string `json:"age"`
		Gender     string `json:"gender"`
		FatherName string `json:"fatherName"`
		MotherName string `json:"motherName"`
		Address    string `json:"address"`
		DoctorID   string `json:"doctor_id"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Create update document with only the provided fields
	updateDoc := bson.M{"updatedAt": time.Now()}

	if updateData.FullName != "" {
		updateDoc["fullName"] = updateData.FullName
	}
	if updateData.Phone != "" {
		updateDoc["phone"] = updateData.Phone
	}
	if updateData.Age != "" {
		updateDoc["age"] = updateData.Age
	}
	if updateData.Gender != "" {
		updateDoc["gender"] = updateData.Gender
	}
	if updateData.FatherName != "" {
		updateDoc["fatherName"] = updateData.FatherName
	}
	if updateData.MotherName != "" {
		updateDoc["motherName"] = updateData.MotherName
	}
	if updateData.Address != "" {
		updateDoc["address"] = updateData.Address
	}
	if updateData.DoctorID != "" {
		updateDoc["doctor_id"] = updateData.DoctorID
	}

	// Update the user document
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	fmt.Println(updateDoc)
	result, err := h.userCollection.UpdateOne(
		ctx,
		bson.M{"_id": patientID},
		bson.M{"$set": updateDoc},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Patient not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

func (h *PatientHandler) GetDoctorById(c *gin.Context) {
	// Get doctor ID from the URL parameter
	doctorID := c.Param("id")
	if doctorID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Doctor ID is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Convert string ID to ObjectID
	objectID := doctorID

	// Find the doctor in the database
	var doctor models.User
	err := h.userCollection.FindOne(ctx, bson.M{
		"uuid": objectID,
		"role": "doctor",
	}).Decode(&doctor)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Doctor not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Return the doctor information (as SafeUser to exclude sensitive fields)
	c.JSON(http.StatusOK, gin.H{"doctor": doctor.ToSafeUser()})
}

func (h *PatientHandler) DeletePatient(c *gin.Context) {
	patientID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var patient models.User
	err := h.userCollection.FindOne(ctx, bson.M{"_id": patientID, "role": "patient"}).Decode(&patient)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Patient not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	_, err = h.userCollection.DeleteOne(ctx, bson.M{"_id": patientID, "role": "patient"})
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Patient not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"response": "Deleted",
	})
}
