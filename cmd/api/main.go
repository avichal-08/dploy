package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/avichal-08/dploy/internal/api"
	"github.com/avichal-08/dploy/internal/db"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: No .env file found")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL env is required")
	}

	db.Init(dsn)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/projects", api.HandleCreateProject)
	mux.HandleFunc("GET /api/projects/{id}", api.HandleGetProject)

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		api.WriteJSON(w, http.StatusOK, map[string]string{"status": "Dploy API is operational 🚀"})
	})

	port := ":8080"
	fmt.Printf("Starting Dploy API on http://localhost%s\n", port)

	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
