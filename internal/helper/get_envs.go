package helper

import (
	"log/slog"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

func GetProjectEnvs(deploymentID string) ([]models.ProjectEnv, error) {
	var deployment models.Deployment
	if err := db.DB.First(&deployment, "id = ?", deploymentID).Error; err != nil {
		slog.Error("failed to fetch deployment for envs", "error", err)
		return nil, err
	}

	var envs []models.ProjectEnv
	db.DB.Where("project_id = ?", deployment.ProjectID).Find(&envs)
	return envs, nil
}
