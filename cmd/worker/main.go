package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/pipeline"
	"github.com/avichal-08/dploy/internal/tasks"
	"github.com/hibiken/asynq"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	db.Init(os.Getenv("DATABASE_URL"))

	redisOpt := asynq.RedisClientOpt{Addr: "localhost:6379"}

	srv := asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: 3,
			Queues: map[string]int{
				"default": 10,
			},
		},
	)

	slog.Info("starting Dploy Worker Node...")

	if err := srv.Run(asynq.HandlerFunc(deployWorkerOrchestrator)); err != nil {
		slog.Error("Could not run Asynq server", "error", err)
	}
}

func deployWorkerOrchestrator(ctx context.Context, t *asynq.Task) error {

	if t.Type() != tasks.TypeDeployApp {
		slog.Warn("Worker received unknown task type, skipping", "type", t.Type())
		return fmt.Errorf("unsupported task type: %s", asynq.SkipRetry)
	}

	var payload tasks.DeployPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %v", asynq.SkipRetry)
	}

	slog.Info("Worker processing deployment", "deployment_id", payload.DeploymentID)

	var project models.Project
	var deployment models.Deployment

	if err := db.DB.First(&project, "id = ?", payload.ProjectID).Error; err != nil {
		return fmt.Errorf("failed to hydrate project: %w", err)
	}
	if err := db.DB.First(&deployment, "id = ?", payload.DeploymentID).Error; err != nil {
		return fmt.Errorf("failed to hydrate deployment: %w", err)
	}

	pipeline.RunDeployment(project, deployment)

	return nil
}
