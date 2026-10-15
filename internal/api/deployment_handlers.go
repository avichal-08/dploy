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
	"github.com/avichal-08/dploy/internal/proxy"
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

		project, ok := findOwnedProject(payload.ProjectID, GetUserID(r))
		if !ok {
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

		deployment, err := enqueueDeployment(asynqClient, project, "HEAD", "")
		if err != nil {
			slog.Error("failed to start deployment", "error", err)
			WriteError(w, http.StatusInternalServerError, "Failed to start deployment")
			return
		}

		WriteJSON(w, http.StatusCreated, deployment)
	}
}

func HandleGetDeployment(w http.ResponseWriter, r *http.Request) {
	deploymentID := r.PathValue("id")
	if deploymentID == "" {
		WriteError(w, http.StatusBadRequest, "Deployment ID is required")
		return
	}

	deployment, _, ok := findOwnedDeployment(deploymentID, GetUserID(r))
	if !ok {
		WriteError(w, http.StatusNotFound, "Deployment not found")
		return
	}

	WriteJSON(w, http.StatusOK, deployment)
}

const rollbackReadyTimeout = 20 * time.Second

func HandleRollback(w http.ResponseWriter, r *http.Request) {
	deploymentID := r.PathValue("id")
	if deploymentID == "" {
		WriteError(w, http.StatusBadRequest, "Deployment ID is required")
		return
	}

	deployment, project, ok := findOwnedDeployment(deploymentID, GetUserID(r))
	if !ok {
		WriteError(w, http.StatusNotFound, "Deployment not found")
		return
	}

	if deployment.Status != "success" {
		WriteError(w, http.StatusBadRequest, "Cannot rollback to a failed or incomplete deployment")
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
		ContainerID:  fmt.Sprintf("pending-rollback-%d", time.Now().UnixNano()),
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
	db.DB.Model(&replica).Updates(map[string]interface{}{
		"container_id":  containerID,
		"internal_port": internalPort,
	})

	if err := pipeline.WaitForReplicaReady(containerID, internalPort, min(pipeline.ReadyTimeoutFromEnv(), rollbackReadyTimeout)); err != nil {
		slog.Error("rollback replica never became ready", "deployment_id", deployment.ID, "error", err)
		pipeline.StopAndRemoveContainer(containerID)
		db.DB.Model(&replica).Update("status", "failed")
		WriteError(w, http.StatusBadGateway, "The rollback version did not pass its health check; the current version is still serving")
		return
	}

	var oldDeploymentID string
	if project.ActiveDeploymentID != nil {
		oldDeploymentID = *project.ActiveDeploymentID
	}

	db.DB.Model(&replica).Update("status", "healthy")

	db.DB.Model(&models.Project{ID: project.ID}).Updates(map[string]interface{}{
		"active_deployment_id": deployment.ID,
		"status":               "deployed",
	})

	db.DB.Model(&models.Deployment{ID: deployment.ID}).Updates(map[string]interface{}{
		"container_id":  containerID,
		"internal_port": internalPort,
	})

	proxy.CacheManager.Invalidate(project.Name)

	slog.Info("traffic successfully routed to rollback deployment", "deployment_id", deployment.ID)

	if oldDeploymentID != "" && oldDeploymentID != deployment.ID {
		if err := pipeline.MarkDeploymentDraining(oldDeploymentID); err != nil {
			slog.Error("failed to mark previous deployment for draining", "deployment_id", oldDeploymentID, "error", err)
		}
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Rollback successful", "new_container_id": containerID})
}

func HandleGetRuntimeLogs(w http.ResponseWriter, r *http.Request) {
	deploymentID := r.PathValue("id")
	if deploymentID == "" {
		http.Error(w, "Deployment ID is required", http.StatusBadRequest)
		return
	}

	deployment, _, ok := findOwnedDeployment(deploymentID, GetUserID(r))
	if !ok {
		WriteError(w, http.StatusNotFound, "Deployment not found")
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
