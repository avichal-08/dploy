package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/avichal-08/dploy/internal/api"
	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/orchestrator"
	"github.com/avichal-08/dploy/internal/proxy"
	"github.com/avichal-08/dploy/internal/pubsub"

	"github.com/hibiken/asynq"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	if err := godotenv.Load(); err != nil {
		slog.Warn("no .env file found")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		slog.Error("DATABASE_URL environment variable is required")
		os.Exit(1)
	}

	db.Init(dsn)

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	redisOpt := asynq.RedisClientOpt{Addr: redisAddr}
	asynqClient := asynq.NewClient(redisOpt)
	defer asynqClient.Close()

	redisClient := redis.NewClient(&redis.Options{Addr: redisAddr})

	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/auth/register", api.HandleRegister)
	mux.HandleFunc("POST /api/auth/login", api.HandleLogin)
	mux.HandleFunc("POST /api/auth/logout", api.HandleLogout)

	mux.HandleFunc("GET /api/users", api.AuthMiddleware(api.HandleGetUser))

	mux.HandleFunc("POST /api/projects", api.AuthMiddleware(api.HandleCreateProject))
	mux.HandleFunc("GET /api/projects", api.AuthMiddleware(api.HandleGetProjects))
	mux.HandleFunc("GET /api/project/{id}", api.AuthMiddleware(api.HandleGetProject))
	mux.HandleFunc("DELETE /api/project/{id}", api.AuthMiddleware(api.HandleDeleteProject))

	mux.HandleFunc("GET /api/projects/{id}/envs", api.AuthMiddleware(api.HandleGetEnvs))
	mux.HandleFunc("POST /api/projects/{id}/envs", api.AuthMiddleware(api.HandleCreateEnvs))

	mux.HandleFunc("PUT /api/envs/{envId}", api.AuthMiddleware(api.HandleUpdateEnv))
	mux.HandleFunc("DELETE /api/envs/{envId}", api.AuthMiddleware(api.HandleDeleteEnv))

	mux.HandleFunc("GET /api/projects/{id}/metrics", api.AuthMiddleware(api.HandleGetProjectMetrics))

	mux.HandleFunc("POST /api/deployments", api.AuthMiddleware(api.HandleCreateDeployment(asynqClient)))
	mux.HandleFunc("GET /api/deployments/{id}", api.AuthMiddleware(api.HandleGetDeployment))
	mux.HandleFunc("POST /api/deployments/{id}/rollback", api.AuthMiddleware(api.HandleRollback))

	subscriber := &pubsub.RedisSubscriber{Client: redisClient}

	mux.HandleFunc("GET /api/deployments/{id}/logs", api.AuthMiddleware(api.HandleLogStream(subscriber)))
	mux.HandleFunc("GET /api/deployments/{id}/logs/runtime", api.AuthMiddleware(api.HandleGetRuntimeLogs))

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		api.WriteJSON(w, http.StatusOK, map[string]string{"status": "operational"})
	})

	corsMux := enableCORS(mux)

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      corsMux,
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	go proxy.StartProxyServer("8000")

	orchCtx, cancelOrchCtx := context.WithCancel(context.Background())
	defer cancelOrchCtx()
	orchestrator.StartOrchestrator(orchCtx)

	go func() {
		slog.Info("Starting Dploy API", "port", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("Server failed to start", "error", err)
			os.Exit(1)
		}
	}()

	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, os.Interrupt, syscall.SIGTERM)
	<-shutdownChan

	slog.Info("shutting down gracefully")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
	}

	slog.Info("Server stopped")
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
