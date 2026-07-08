package main

import (
	"fmt"
	"log"
	"os"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("warning: No .env file found")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL env is required")
	}

	db.Init(dsn)

	mockUser := models.User{
		GitHubID:  "github_12345678",
		Email:     "founder@dploy.local",
		AvatarURL: "https://avatars.githubusercontent.com/u/9919?v=4",
	}

	result := db.DB.Create(&mockUser)

	if result.Error != nil {
		log.Fatalf("failed to create user (they might already exist): %v", result.Error)
	}

	fmt.Printf("mock user id: %s\n", mockUser.ID)
}
