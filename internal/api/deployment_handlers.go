package api

import (
	"log/slog"
	"net/http"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/tasks"
	"github.com/hibiken/asynq"
)

type CreateDeploymentPayload struct {
	ProjectID    string  `json:"project_id"`
	BuildCommand *string `json:"build_command"`
	RunCommand   *string `json:"run_command"`
}

func HandleCreateDeployment(asynqClient *asynq.Client) http.HandlerFunc {
   return func(w http.ResponseWriter, r *http.Request) {
	var payload CreateDeploymentPayload

	if err := ReadJSON(r, &payload); err != nil {
		slog.Error("failed to parse deployment payload", "error", err)
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	if payload.ProjectID == "" {
		WriteError(w, http.StatusBadRequest, "project_id is required")
		return
	}

	var project models.Project
	if err := db.DB.First(&project, "id = ?", payload.ProjectID).Error; err != nil {
		WriteError(w, http.StatusNotFound, "Project not found")
		return
	}

	if payload.BuildCommand != nil {
		project.BuildCommand = *payload.BuildCommand
	}
	if payload.RunCommand != nil {
		project.RunCommand = *payload.RunCommand
	}

	if err := db.DB.Save(&project).Error; err != nil {
		slog.Error("failed to update project commands", "error", err)
		WriteError(w, http.StatusInternalServerError, "Failed to save project configuration")
		return
	}

	deployment := models.Deployment{
		ProjectID: project.ID,
		CommitSHA: "HEAD",
		Status:    "pending",
	}

	if err := db.DB.Create(&deployment).Error; err != nil {
		slog.Error("failed to create deployment record", "error", err)
		WriteError(w, http.StatusInternalServerError, "Failed to start deployment")
		return
	}

	task, err := tasks.NewDeployTask(project.ID, deployment.ID)
	if err != nil {

	}
	info, err := asynqClient.Enqueue(task)
	slog.Info("Enqueued Deployment Task", "task_id", info.ID, "queue", info.Queue)

	WriteJSON(w, http.StatusCreated, deployment)
   }
}


func HandleGetDeployment(w http.ResponseWriter, r *http.Request) {
	deploymentID := r.PathValue("id")
	if deploymentID == "" {
		WriteError(w, http.StatusBadRequest, "Deployment ID is required")
		return
	}

	var deployment models.Deployment
	if err := db.DB.First(&deployment, "id = ?", deploymentID).Error; err != nil {
		slog.Error("failed to fetch deployment", "error", err, "deployment_id", deploymentID)
		WriteError(w, http.StatusNotFound, "Deployment not found")
		return
	}

	WriteJSON(w, http.StatusOK, deployment)
}
