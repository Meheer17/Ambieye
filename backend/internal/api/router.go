package api

import (
	"github.com/Meheer17/ambieye/internal/api/handlers"
	"github.com/Meheer17/ambieye/internal/api/middleware"
	"github.com/Meheer17/ambieye/internal/config"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// SetupRouter configures the API routes
func SetupRouter(client *mongo.Client, cfg *config.Config) *gin.Engine {
	router := gin.Default()

	// Configure CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"*"} // In production, specify your actual domains
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	router.Use(cors.New(corsConfig))

	// Get database
	db := client.Database(cfg.MongoDB.Database)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg)
	notificationHandler := handlers.NewNotificationHandler(db)
	doctorHandler := handlers.NewDoctorHandler(db)
	patientHandler := handlers.NewPatientHandler(db)
	queryHandler := handlers.NewQueryHandler(db, notificationHandler)

	// Authentication middleware
	authMiddleware := middleware.AuthMiddleware(cfg.JWT.Secret)
	doctorMiddleware := middleware.RoleMiddleware("doctor")
	patientMiddleware := middleware.RoleMiddleware("patient")

	// API routes
	api := router.Group("/api")
	{
		// Auth routes - no auth required
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/signup", authHandler.Signup)
			auth.POST("/logout", authHandler.Logout) // Client-side token removal
			auth.GET("/verify", authMiddleware, authHandler.Verify)
		}

		// Doctor routes - require auth and doctor role
		doctor := api.Group("/doctor", authMiddleware, doctorMiddleware)
		{
			doctor.GET("/dashboard", doctorHandler.GetDashboard)
			doctor.GET("/patients", doctorHandler.GetPatients)
			doctor.GET("/patients/:id", doctorHandler.GetPatientById)
			doctor.POST("/patients/medicalinfo/:id", doctorHandler.UpdatePatientMedicalInfo)
			doctor.POST("/patients/visitrecord/:id", doctorHandler.AddPatientVisitRecord)
			doctor.GET("/profile", doctorHandler.GetProfile)
			doctor.GET("/queries", queryHandler.GetAllQueries)
		}

		// Patient routes - require auth and patient role
		patient := api.Group("/patient", authMiddleware)
		{
			patient.GET("/dashboard", patientHandler.GetDashboard)
			patient.GET("/profile", patientHandler.GetProfile)
			patient.GET("/doctors/:id", patientHandler.GetDoctorById, patientMiddleware)
			patient.PUT("/profile", patientHandler.UpdateProfile)
			patient.GET("/queries", patientHandler.GetPatientQueries)
			patient.POST("/queries", queryHandler.CreateQuery, patientMiddleware)
		}

		gameHandler := handlers.NewGameHandler(db)
		games := api.Group("/games", authMiddleware)
		{
			games.POST("/results", gameHandler.SaveGameResult, patientMiddleware)
			games.GET("/today", gameHandler.GetTodayGameResults)
			games.GET("/history", gameHandler.GetGameHistory)
		}

		// Query routes - require auth, role checked in handlers
		queries := api.Group("/queries", authMiddleware)
		{
			queries.GET("/:id", queryHandler.GetQuery)
			queries.PUT("/:id/answer", queryHandler.AnswerQuery) // Doctor only
		}

		// Notification routes - require auth
		// notifications := api.Group("/notifications", authMiddleware)
		// {
		// 	notifications.POST("/register", notificationHandler.RegisterDevice)
		// 	notifications.GET("/", notificationHandler.GetNotifications)
		// 	notifications.GET("/settings", notificationHandler.GetNotificationSettings)
		// 	notifications.PUT("/settings", notificationHandler.UpdateNotificationSettings)
		// }
	}

	return router
}
