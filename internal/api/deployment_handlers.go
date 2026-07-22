package api

import (
	"bytes"
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
			slog.Error("failed to create deployment task", "error", err)
			WriteError(w, http.StatusInternalServerError, "failed to create deployment task")
			return
		}
		info, err := asynqClient.Enqueue(task)
		if err != nil {
			slog.Error("failed to enqueue deployment task", "error", err)
			WriteError(w, http.StatusInternalServerError, "failed to enqueue deployment task")
			return
		}
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

	slog.Info("starting rollback replica", "deployment_id", deployment.ID)

	replica := models.Replica{
		ProjectID:    project.ID,
		DeploymentID: deployment.ID,
		Status:       "starting",
	}
	db.DB.Create(&replica)

	var envs []models.ProjectEnv
	db.DB.Where("project_id = ?", project.ID).Find(&envs)

	containerID, portStr, _, runErr := pipeline.RunReplica(deployment.ID, replica.ID, &envs)
	if runErr != nil {
		db.DB.Model(&replica).Update("status", "failed")
		slog.Error("failed to start replica during rollback", "error", runErr)
		WriteError(w, http.StatusInternalServerError, "Failed to start rollback replica")
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

	db.DB.Model(&replica).Updates(map[string]interface{}{
		"container_id":  containerID,
		"internal_port": internalPort,
		"status":        "healthy",
	})

	db.DB.Model(&models.Deployment{ID: deployment.ID}).Updates(map[string]interface{}{
		"container_id":  containerID,
		"internal_port": internalPort,
	})

	slog.Info("traffic successfully routed to rollback deployment", "deployment_id", deployment.ID)

	if oldDeploymentID != "" && oldDeploymentID != deployment.ID {
		go func(oldID string) {
			var oldReplicas []models.Replica
			if err := db.DB.Where("deployment_id = ? AND status != ?", oldID, "terminated").Find(&oldReplicas).Error; err == nil {
				time.Sleep(2 * time.Second)

				for _, oldRep := range oldReplicas {
					db.DB.Model(&oldRep).Update("status", "terminating")
					if oldRep.ContainerID != "" {
						pipeline.StopAndRemoveContainer(oldRep.ContainerID)
						slog.Info("cleaned up old replica after rollback", "container_id", oldRep.ContainerID)
					}
					db.DB.Model(&oldRep).Update("status", "terminated")
				}
			}
		}(oldDeploymentID)
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Rollback successful", "new_container_id": containerID})
}

func HandleGetRuntimeLogs(w http.ResponseWriter, r *http.Request) {
	deploymentID := r.PathValue("id")
	if deploymentID == "" {
		http.Error(w, "Deployment ID is required", http.StatusBadRequest)
		return
	}

	var deployment models.Deployment
	if err := db.DB.First(&deployment, "id = ?", deploymentID).Error; err != nil {
		slog.Error("failed to fetch deployment for logs", "error", err, "deployment_id", deploymentID)
		http.Error(w, "Deployment not found", http.StatusNotFound)
		return
	}

	if deployment.Status != "success" && deployment.Status != "running" && deployment.Status != "deployed" {
		WriteError(w, http.StatusBadRequest, "Deployment is not actively running")
		return
	}

	var replica models.Replica
	if err := db.DB.Where("deployment_id = ? AND status IN ?", deployment.ID, []string{"healthy", "starting", "crashed"}).Order("created_at desc").First(&replica).Error; err != nil {
		WriteError(w, http.StatusBadRequest, "No active replicas found for this deployment to stream logs from")
		return
	}

	if replica.ContainerID == "" {
		WriteError(w, http.StatusBadRequest, "Replica is not fully provisioned yet")
		return
	}

	slog.Info("starting log fetching", "container_id", replica.ContainerID)

	cmd := exec.Command("docker", "logs", "--tail", "200", replica.ContainerID)

	var outputBuffer bytes.Buffer
	cmd.Stdout = &outputBuffer
	cmd.Stderr = &outputBuffer

	if err := cmd.Run(); err != nil {
		slog.Error("failed to start docker logs command", "error", err)
		WriteError(w, http.StatusInternalServerError, "Failed to fetch logs: "+err.Error())
		return
	}

	utcTimeNow := time.Now().UTC()

	WriteJSON(w, http.StatusOK, map[string]string{
		"fetched_at": utcTimeNow.String(),
		"logs":       outputBuffer.String(),
	})
}
