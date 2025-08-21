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

// QueryHandler handles query-related operations
type QueryHandler struct {
	queryCollection        *mongo.Collection
	userCollection         *mongo.Collection
	notificationCollection *mongo.Collection
	notificationHandler    *NotificationHandler
}

// NewQueryHandler creates a new QueryHandler
func NewQueryHandler(db *mongo.Database, notificationHandler *NotificationHandler) *QueryHandler {
	return &QueryHandler{
		queryCollection:        db.Collection("queries"),
		userCollection:         db.Collection("users"),
		notificationCollection: db.Collection("notifications"),
		notificationHandler:    notificationHandler,
	}
}

// CreateQuery handles the creation of a new query by a patient
func (h *QueryHandler) CreateQuery(c *gin.Context) {
	patientID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	var queryData struct {
		Question string `json:"question" binding:"required"`
		Urgency  string `json:"urgency"`
	}

	if err := c.ShouldBindJSON(&queryData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body" + err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Verify that the patient exists
	var patient models.User
	err := h.userCollection.FindOne(ctx, bson.M{
		"_id":  patientID,
		"role": "patient",
	}).Decode(&patient)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only patients can create queries"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Create the query object
	now := time.Now()
	query := models.Query{
		ID:        primitive.NewObjectID(),
		PatientID: patientID.(primitive.ObjectID),
		Question:  queryData.Question,
		Status:    "pending",
		CreatedAt: now,
		UpdatedAt: now,
	}

	// If patient has an assigned doctor, set the query's doctorID
	if patient.DoctorID != "" {
		var doctor models.User
		err = h.userCollection.FindOne(ctx, bson.M{"uuid": patient.DoctorID}).Decode(&doctor)
		if err == nil {
			query.DoctorID = doctor.ID
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "U Need a Valid doctor ID"})

		}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "U Need a doctor ID"})
	}

	// Set urgency if provided
	if queryData.Urgency != "" {
		query.Urgency = queryData.Urgency
	} else {
		query.Urgency = "medium" // Default urgency
	}

	// var doctorID primitive.ObjectID
	// Insert the query into the database
	_, err = h.queryCollection.InsertOne(ctx, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create query"})
		return
	}

	// Create notification for doctor if one was assigned
	// if !doctorID.IsZero() {
	// 	notificationData := map[string]string{
	// 		"queryId":     query.ID.Hex(),
	// 		"patientId":   patientID.(primitive.ObjectID).Hex(),
	// 		"patientName": patient.FullName,
	// 	}

	// 	// Create notification for the doctor
	// 	_, err = h.notificationHandler.CreateNotification(
	// 		ctx,
	// 		doctorID,
	// 		models.NotificationTypeNewQuery,
	// 		"New Query",
	// 		"You have received a new query from "+patient.FullName,
	// 		notificationData,
	// 	)

	// 	if err != nil {
	// 		// Log error but don't fail the request
	// 		c.Error(err)
	// 	}
	// }

	c.JSON(http.StatusCreated, gin.H{"query": query})
}

// GetQuery retrieves a specific query by ID
func (h *QueryHandler) GetQuery(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	role, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
		return
	}

	queryID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find the query
	var query models.Query
	err = h.queryCollection.FindOne(ctx, bson.M{"_id": queryID}).Decode(&query)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Query not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Verify that the user has access to this query (either as the patient or as the assigned doctor)
	if role == "patient" && query.PatientID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have access to this query"})
		return
	}

	if role == "doctor" && !query.DoctorID.IsZero() && query.DoctorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have access to this query"})
		return
	}

	// Get patient information
	var patient models.User
	err = h.userCollection.FindOne(ctx, bson.M{"_id": query.PatientID}).Decode(&patient)
	if err != nil && err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get doctor information if available
	var doctor models.User
	if !query.DoctorID.IsZero() {
		err = h.userCollection.FindOne(ctx, bson.M{"_id": query.DoctorID}).Decode(&doctor)
		if err != nil && err != mongo.ErrNoDocuments {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"query":   query,
		"patient": patient.ToSafeUser(),
		"doctor":  doctor.ToSafeUser(),
	})
}

// AnswerQuery allows a doctor to answer a patient's query
func (h *QueryHandler) AnswerQuery(c *gin.Context) {
	doctorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	role, exists := c.Get("role")
	if !exists || role != "doctor" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only doctors can answer queries"})
		return
	}

	queryID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query ID"})
		return
	}

	var answerData struct {
		Response string `json:"response" binding:"required"`
	}

	if err := c.ShouldBindJSON(&answerData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find the query
	var query models.Query
	err = h.queryCollection.FindOne(ctx, bson.M{"_id": queryID}).Decode(&query)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Query not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// If query is already answered, don't allow changes
	if query.Status == "answered" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query has already been answered"})
		return
	}

	// If the query is assigned to a specific doctor, verify it's this doctor
	if !query.DoctorID.IsZero() && query.DoctorID != doctorID {
		c.JSON(http.StatusForbidden, gin.H{"error": "This query is assigned to another doctor"})
		return
	}

	// Update the query with the answer
	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"response":   answerData.Response,
			"status":     "answered",
			"doctorId":   doctorID,
			"updatedAt":  now,
			"answeredAt": now,
		},
	}

	_, err = h.queryCollection.UpdateOne(ctx, bson.M{"_id": queryID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update query"})
		return
	}

	// Get doctor information for notification
	var doctor models.User
	err = h.userCollection.FindOne(ctx, bson.M{"_id": doctorID}).Decode(&doctor)
	if err != nil {
		// Log the error but don't fail the request
		c.Error(err)
	}

	// Create notification for the patient
	notificationData := map[string]string{
		"queryId":    queryID.Hex(),
		"doctorId":   doctorID.(primitive.ObjectID).Hex(),
		"doctorName": doctor.FullName,
	}

	_, err = h.notificationHandler.CreateNotification(
		ctx,
		query.PatientID,
		models.NotificationTypeQueryAnswer,
		"Query Answered",
		"Your query has been answered by Dr. "+doctor.FullName,
		notificationData,
	)

	if err != nil {
		// Log error but don't fail the request
		c.Error(err)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Query answered successfully"})
}

func (h *QueryHandler) GetAllQueries(c *gin.Context) {
	doctorID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	role, exists := c.Get("role")
	if !exists || role != "doctor" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only doctors can access all queries"})
		return
	}

	status := c.Query("status") // Optional filter by status

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Build filter
	filter := bson.M{}
	includeAll := c.Query("includeAll")
	// Check if includeAll parameter exists and is set to "true"
	if includeAll == "true" {
		// If includeAll is true, don't filter by doctor ID
		// But if status is provided, still filter by status
		if status != "" {
			filter["status"] = status
		}
	} else {
		// Normal case - filter by doctor ID
		filter["doctorId"] = doctorID
		if status != "" {
			filter["status"] = status
		}
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

	// Prepare enhanced queries with patient information
	queriesWithInfo := make([]models.QueryWithUserInfo, 0, len(queries))
	for _, query := range queries {
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
			queriesWithInfo = append(queriesWithInfo, queryWithInfo)
		}
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
