package pipeline

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os/exec"
	"strings"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

func BuildImage(buildDir string, deploymentID string, logWriter io.Writer) (string, error) {
	imageName := fmt.Sprintf("dploy-img-%s", deploymentID)
	var buildLogs bytes.Buffer

	multiWriter := io.MultiWriter(&buildLogs, logWriter)

	slog.Info("starting docker build via CLI", "image", imageName, "dir", buildDir)
	buildCtx, cancelBuild := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancelBuild()

	buildCmd := exec.CommandContext(buildCtx, "docker", "build", "-t", imageName, ".")
	buildCmd.Dir = buildDir
	buildCmd.Stdout = multiWriter
	buildCmd.Stderr = multiWriter

	if err := buildCmd.Run(); err != nil {
		slog.Error("docker build failed", "error", err)
		return buildLogs.String(), fmt.Errorf("build failed: %v", err)
	}

	return buildLogs.String(), nil
}

func RunContainer(deploymentID string) (string, string, string, error) {
	imageName := fmt.Sprintf("dploy-img-%s", deploymentID)
	containerName := fmt.Sprintf("dploy-cnt-%s", deploymentID)
	var runLogs bytes.Buffer

	slog.Info("starting container with resource limits", "container", containerName)
	runCtx, cancelRun := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelRun()

	runCmd := exec.CommandContext(runCtx, "docker", "run", "-d", "-P", "--memory=512m", "--cpus=0.5", "--name", containerName, imageName)
	runCmd.Stdout = &runLogs
	runCmd.Stderr = &runLogs

	if err := runCmd.Run(); err != nil {
		slog.Error("docker run failed", "error", err)
		return "", "", runLogs.String(), fmt.Errorf("container run failed: %v", err)
	}

	rawContainerID := strings.TrimSpace(runLogs.String())

	portCmd := exec.Command("docker", "port", rawContainerID)
	portOut, err := portCmd.Output()
	if err != nil {
		slog.Error("failed to extract mapped port", "container_id", rawContainerID, "error", err)
		return rawContainerID, "", runLogs.String(), fmt.Errorf("port extraction failed: %v", err)
	}

	portLines := strings.Split(strings.TrimSpace(string(portOut)), "\n")
	if len(portLines) == 0 || portLines[0] == "" {
		return rawContainerID, "", runLogs.String(), fmt.Errorf("no ports exposed or mapped for container")
	}

	parts := strings.Split(portLines[0], ":")
	extractedPort := parts[len(parts)-1]

	slog.Info("container started successfully", "container_id", rawContainerID, "host_port", extractedPort)

	return rawContainerID, extractedPort, runLogs.String(), nil
}

func StopAndRemoveContainer(containerID string) error {
	if containerID == "" {
		return nil
	}

	slog.Info("stopping and removing previous container", "container_id", containerID)

	cmd := exec.Command("docker", "rm", "-f", containerID)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to remove container %s: %v", containerID, err)
	}

	return nil
}

func CleanupOldImages(projectID string) {
	var deployments []models.Deployment
	if err := db.DB.Where("project_id = ? AND status = ?", projectID, "success").Order("created_at desc").Find(&deployments).Error; err != nil {
		slog.Error("failed to fetch deployments for image cleanup", "error", err)
		return
	}

	const keepCount = 3
	if len(deployments) <= keepCount {
		return
	}

	deploymentsToDelete := deployments[keepCount:]

	for _, dep := range deploymentsToDelete {
		imageName := fmt.Sprintf("dploy-img-%s", dep.ID)

		cmd := exec.Command("docker", "rmi", "-f", imageName)
		if err := cmd.Run(); err != nil {
			slog.Warn("failed to remove old docker image", "image", imageName, "error", err)
		} else {
			slog.Info("cleaned up old docker image", "image", imageName)
		}
	}

	exec.Command("docker", "image", "prune", "-f").Run()
}
