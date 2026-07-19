package pipeline

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

func RunDeployment(project models.Project, deployment models.Deployment, logWriter io.Writer) {
	slog.Info("starting deployment phase", "deployment_id", deployment.ID, "project_id", project.ID)
	logWriter.Write([]byte("--> Preparing build environment...\n"))

	db.DB.Model(&deployment).Update("status", "cloning")

	cwd, _ := os.Getwd()
	buildDir := filepath.Join(cwd, "dploy-clones", "build-"+deployment.ID)

	defer func() {
		var removeErr error
		for i := 0; i < 5; i++ {
			removeErr = os.RemoveAll(buildDir)
			if removeErr == nil {
				return
			}
			time.Sleep(200 * time.Millisecond)
		}
		if removeErr != nil {
			slog.Error("CRITICAL: failed to clean up build directory after retries", "dir", buildDir, "error", removeErr)
		}
	}()

	if err := CloneRepo(CloneOptions{RepoURL: project.RepositoryURL, TargetDir: buildDir}); err != nil {
		slog.Error("deployment clone failed", "error", err)
		failDeployment(deployment.ID, project.ID, "Clone failed: "+err.Error())
		return
	}

	commitSha, err := GetCommitSHA(buildDir)
	if err != nil {
		slog.Error("commit sha extraction failed", "error", err)
	}

	commitMessage, err := GetCommitMessage(buildDir)
	if err != nil {
		slog.Error("commit message extraction failed", "error", err)
	}

	db.DB.Model(&deployment).Updates(map[string]interface{}{
		"status":         "building",
		"commit_sha":     strings.TrimSpace(commitSha),
		"commit_message": strings.TrimSpace(commitMessage),
	})

	if err := GenerateDockerfile(buildDir, project.Framework, project.BuildCommand, project.RunCommand); err != nil {
		slog.Error("failed to generate dockerfile", "error", err)
		failDeployment(deployment.ID, project.ID, "Dockerfile generation failed: "+err.Error())
		return
	}

	logWriter.Write([]byte("--> Starting Docker build phase...\n"))

	buildLogs, buildErr := BuildImage(buildDir, deployment.ID, logWriter)
	if buildErr != nil {
		slog.Error("image build failed", "error", buildErr)
		db.DB.Model(&deployment).Updates(map[string]interface{}{
			"status":      "failed",
			"build_logs":  buildLogs,
			"finished_at": time.Now(),
		})
		db.DB.Model(&project).Update("status", "failed")
		return
	}

	slog.Info("image built successfully, proceeding to running container", "deployment_id", deployment.ID)
	logWriter.Write([]byte("--> Image built successfully. Starting container...\n"))

	containerID, portStr, runLogs, runErr := RunContainer(deployment.ID)

	finalLogs := buildLogs + "\n--- RUN PHASE ---\n" + runLogs

	if runErr != nil {
		slog.Error("container run failed", "error", runErr)
		db.DB.Model(&deployment).Updates(map[string]interface{}{
			"status":      "failed",
			"build_logs":  finalLogs,
			"finished_at": time.Now(),
		})
		db.DB.Model(&project).Update("status", "failed")
		return
	}

	internalPort, _ := strconv.Atoi(portStr)

	db.DB.Model(&deployment).Updates(map[string]interface{}{
		"status":        "success",
		"container_id":  containerID,
		"internal_port": internalPort,
		"build_logs":    finalLogs,
		"finished_at":   time.Now(),
	})

	var oldDeploymentID string
	if project.ActiveDeploymentID != nil {
		oldDeploymentID = *project.ActiveDeploymentID
	}

	db.DB.Model(&project).Updates(map[string]interface{}{
		"status":               "deployed",
		"active_deployment_id": deployment.ID,
	})

	slog.Info("traffic safely routed to new deployment", "deployment_id", deployment.ID, "internal_port", internalPort)

	if oldDeploymentID != "" && oldDeploymentID != deployment.ID {
		var oldDeployment models.Deployment
		if err := db.DB.First(&oldDeployment, "id = ?", oldDeploymentID).Error; err == nil {
			if oldDeployment.ContainerID != "" {
				time.Sleep(2 * time.Second) //sleep so that the container has time to stop gracefully after serving ongoing requests
				if err := StopAndRemoveContainer(oldDeployment.ContainerID); err != nil {
					slog.Warn("failed to cleanup old container, it might be orphaned", "old_container", oldDeployment.ContainerID, "error", err)
				} else {
					slog.Info("gracefully destroyed old container", "old_container", oldDeployment.ContainerID)
				}
			}
		}
	}

	go CleanupOldImages(project.ID)

	slog.Info("deployment finished completely", "deployment_id", deployment.ID, "internal_port", internalPort)
}

func failDeployment(deploymentID string, projectID string, reason string) {
	db.DB.Model(&models.Deployment{ID: deploymentID}).Updates(map[string]interface{}{
		"status":      "failed",
		"build_logs":  reason,
		"finished_at": time.Now(),
	})
	db.DB.Model(&models.Project{ID: projectID}).Update("status", "failed")
}
