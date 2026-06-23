package db

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// Connect establishes a connection to MongoDB
func Connect(uri string) (*mongo.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	// Ping the database to verify connection
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		return nil, err
	}

	return client, nil
}

// GetDatabase returns a database instance
func GetDatabase(client *mongo.Client, name string) *mongo.Database {
	return client.Database(name)
}

// GetCollection returns a collection from the specified database
func GetCollection(db *mongo.Database, name string) *mongo.Collection {
	return db.Collection(name)
}
