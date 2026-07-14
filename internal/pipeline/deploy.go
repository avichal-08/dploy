package pipeline

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"

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
		if err := os.RemoveAll(buildDir); err != nil {
			slog.Error("CRITICAL: failed to clean up build directory", "dir", buildDir, "error", err)
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

	if err := GenerateDockerfile(buildDir, project.Framework); err != nil {
		slog.Error("failed to generate dockerfile", "error", err)
		failDeployment(deployment.ID, project.ID, "Dockerfile generation failed: "+err.Error())
		return
	}

	if project.BuildCommand != "" || project.RunCommand != "" {
		if err := injectCustomCommands(buildDir, project.BuildCommand, project.RunCommand); err != nil {
			slog.Error("failed to inject custom commands", "error", err)
			failDeployment(deployment.ID, project.ID, "Command injection failed: "+err.Error())
			return
		}
	}

	logWriter.Write([]byte("--> Starting Docker build phase...\n"))

	buildLogs, buildErr := BuildImage(buildDir, deployment.ID, logWriter)
	if buildErr != nil {
		slog.Error("image build failed", "error", buildErr)
		db.DB.Model(&deployment).Updates(map[string]interface{}{
			"status":     "failed",
			"build_logs": buildLogs,
		})
		db.DB.Model(&project).Update("status", "failed")
		return
	}

	slog.Info("image built successfully, proceeding to running container", "deployment_id", deployment.ID)
	logWriter.Write([]byte("--> Image built successfully. Starting container...\n"))

	containerID, portStr, runLogs, runErr := RunContainer(deployment.ID, logWriter)

	finalLogs := buildLogs + "\n--- RUN PHASE ---\n" + runLogs

	if runErr != nil {
		slog.Error("container run failed", "error", runErr)
		db.DB.Model(&deployment).Updates(map[string]interface{}{
			"status":     "failed",
			"build_logs": finalLogs,
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
	})
	db.DB.Model(&project).Updates(map[string]interface{}{
		"status":               "deployed",
		"active_deployment_id": deployment.ID,
	})

	slog.Info("deployment finished completely", "deployment_id", deployment.ID, "internal_port", internalPort)
}

func failDeployment(deploymentID string, projectID string, reason string) {
	db.DB.Model(&models.Deployment{}).Where("id = ?", deploymentID).Updates(map[string]interface{}{
		"status":     "failed",
		"build_logs": reason,
	})
	db.DB.Model(&models.Project{}).Where("id = ?", projectID).Update("status", "failed")
}

func injectCustomCommands(buildDir string, buildCmd string, runCmd string) error {
	dockerfilePath := filepath.Join(buildDir, "Dockerfile")
	contentBytes, err := os.ReadFile(dockerfilePath)
	if err != nil {
		return err
	}
	content := string(contentBytes)

	if buildCmd != "" {
		content = strings.Replace(content, "RUN npm run build", "RUN "+buildCmd, 1)
	}

	if runCmd != "" {
		parts := strings.Fields(runCmd)
		formattedCmd := `CMD ["` + strings.Join(parts, `", "`) + `"]`
		content = strings.Replace(content, `CMD ["npm", "start"]`, formattedCmd, 1)
		content = strings.Replace(content, `CMD ["python", "main.py"]`, formattedCmd, 1)
	}

	return os.WriteFile(dockerfilePath, []byte(content), 0644)
}
