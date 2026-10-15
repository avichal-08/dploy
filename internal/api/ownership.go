package api

import (
	"net/http"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

func findOwnedProject(projectID, userID string, preload ...string) (models.Project, bool) {
	var project models.Project
	if projectID == "" || userID == "" {
		return project, false
	}
	q := db.DB
	for _, p := range preload {
		q = q.Preload(p)
	}
	err := q.First(&project, "id = ? AND user_id = ?", projectID, userID).Error
	return project, err == nil
}

func loadOwnedProject(r *http.Request) (models.Project, bool) {
	return findOwnedProject(r.PathValue("id"), GetUserID(r))
}

func findOwnedDeployment(deploymentID, userID string) (models.Deployment, models.Project, bool) {
	var deployment models.Deployment
	if deploymentID == "" || userID == "" {
		return deployment, models.Project{}, false
	}
	if err := db.DB.First(&deployment, "id = ?", deploymentID).Error; err != nil {
		return deployment, models.Project{}, false
	}
	project, ok := findOwnedProject(deployment.ProjectID, userID)
	if !ok {
		return models.Deployment{}, models.Project{}, false
	}
	return deployment, project, true
}

func findOwnedEnv(envID, userID string) (models.ProjectEnv, bool) {
	var env models.ProjectEnv
	if envID == "" || userID == "" {
		return env, false
	}
	err := db.DB.
		Joins("JOIN projects ON projects.id = project_envs.project_id").
		Where("project_envs.id = ? AND projects.user_id = ?", envID, userID).
		First(&env).Error
	return env, err == nil
}
