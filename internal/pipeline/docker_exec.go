package pipeline

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
	"time"
)

func BuildImage(buildDir string, deploymentID string) (string, error) {
	imageName := fmt.Sprintf("dploy-img-%s", deploymentID)
	var buildLogs bytes.Buffer

	slog.Info("starting docker build via CLI", "image", imageName, "dir", buildDir)
	buildCtx, cancelBuild := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancelBuild()

	buildCmd := exec.CommandContext(buildCtx, "docker", "build", "-t", imageName, ".")
	buildCmd.Dir = buildDir
	buildCmd.Stdout = &buildLogs
	buildCmd.Stderr = &buildLogs

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
