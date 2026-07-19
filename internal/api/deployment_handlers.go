package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"os/exec"
	"strconv"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/pipeline"
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

func HandleRollback(w http.ResponseWriter, r *http.Request) {
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

	if deployment.Status != "success" {
		WriteError(w, http.StatusBadRequest, "Cannot rollback to a failed or incomplete deployment")
		return
	}

	var project models.Project
	if err := db.DB.First(&project, "id = ?", deployment.ProjectID).Error; err != nil {
		slog.Error("failed to fetch project for rollback", "error", err)
		WriteError(w, http.StatusInternalServerError, "Project not found")
		return
	}

	imageName := fmt.Sprintf("dploy-img-%s", deployment.ID)
	checkCmd := exec.Command("docker", "image", "inspect", imageName)
	if err := checkCmd.Run(); err != nil {
		slog.Warn("rollback failed: image pruned", "image", imageName)
		WriteError(w, http.StatusGone, "The Docker image for this deployment has been cleaned up and cannot be rolled back")
		return
	}

	slog.Info("starting rollback container", "deployment_id", deployment.ID)
	containerID, portStr, _, runErr := pipeline.RunContainer(deployment.ID)
	if runErr != nil {
		slog.Error("failed to start container during rollback", "error", runErr)
		WriteError(w, http.StatusInternalServerError, "Failed to start rollback container")
		return
	}

	internalPort, _ := strconv.Atoi(portStr)

	var oldDeploymentID string
	if project.ActiveDeploymentID != nil {
		oldDeploymentID = *project.ActiveDeploymentID
	}

	db.DB.Model(&models.Project{ID: project.ID}).Updates(map[string]interface{}{
		"active_deployment_id": deployment.ID,
		"status":               "deployed",
	})

	db.DB.Model(&models.Deployment{ID: deployment.ID}).Updates(map[string]interface{}{
		"container_id":  containerID,
		"internal_port": internalPort,
	})

	slog.Info("traffic successfully routed to rollback deployment", "deployment_id", deployment.ID)

	if oldDeploymentID != "" && oldDeploymentID != deployment.ID {
		go func(oldID string) {
			var oldDeployment models.Deployment
			if err := db.DB.First(&oldDeployment, "id = ?", oldID).Error; err == nil {
				if oldDeployment.ContainerID != "" {
					time.Sleep(2 * time.Second) // small buffer to let proxy connections drain
					pipeline.StopAndRemoveContainer(oldDeployment.ContainerID)
					slog.Info("cleaned up old container after rollback", "container_id", oldDeployment.ContainerID)
				}
			}
		}(oldDeploymentID)
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Rollback successful", "new_container_id": containerID})
}
