package pipeline

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"os/exec"
	"strings"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

func BuildImage(buildDir string, deploymentID string, isEnvRequired bool, envs *[]models.ProjectEnv, logWriter io.Writer) (string, error) {
	imageName := fmt.Sprintf("dploy-img-%s", deploymentID)
	var buildLogs bytes.Buffer

	multiWriter := io.MultiWriter(&buildLogs, logWriter)

	slog.Info("starting docker build via CLI", "image", imageName, "dir", buildDir)
	buildCtx, cancelBuild := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancelBuild()

	buildArgs := []string{"build", "-t", imageName}

	if isEnvRequired && envs != nil {
		for _, env := range *envs {
			buildArgs = append(buildArgs, "--build-arg", fmt.Sprintf("%s=%s", env.Key, env.Value))
		}
	}

	buildArgs = append(buildArgs, ".")

	buildCmd := exec.CommandContext(buildCtx, "docker", buildArgs...)
	buildCmd.Dir = buildDir
	buildCmd.Stdout = multiWriter
	buildCmd.Stderr = multiWriter

	if err := buildCmd.Run(); err != nil {
		slog.Error("docker build failed", "error", err)
		return buildLogs.String(), fmt.Errorf("build failed: %v", err)
	}

	return buildLogs.String(), nil
}

func RunReplica(deploymentID string, replicaID string, envs *[]models.ProjectEnv) (string, string, string, error) {
	imageName := fmt.Sprintf("dploy-img-%s", deploymentID)

	shortReplica := replicaID
	if len(shortReplica) > 8 {
		shortReplica = shortReplica[:8]
	}
	containerName := fmt.Sprintf("dploy-cnt-%s-%s", deploymentID[:8], shortReplica)

	var runLogs bytes.Buffer

	internalPort := "8000"
	inspectCmd := exec.Command("docker", "image", "inspect", imageName, "--format", "{{json .Config.ExposedPorts}}")
	out, err := inspectCmd.Output()

	if err == nil && len(bytes.TrimSpace(out)) > 0 && string(bytes.TrimSpace(out)) != "null" {
		var exposed map[string]interface{}
		if json.Unmarshal(out, &exposed) == nil && len(exposed) > 0 {
			for k := range exposed {
				parts := strings.Split(k, "/")
				if len(parts) > 0 && parts[0] != "" {
					internalPort = parts[0]
					break
				}
			}
		}
	}

	hostPort, err := getFreePort()
	if err != nil {
		slog.Error("failed to allocate free port", "error", err)
		return "", "", runLogs.String(), fmt.Errorf("failed to allocate free port: %w", err)
	}
	extractedPort := fmt.Sprintf("%d", hostPort)

	slog.Info("starting replica container", "container", containerName, "host_port", extractedPort, "internal_port", internalPort)
	runCtx, cancelRun := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelRun()

	runArgs := []string{
		"run", "-d",
		"-p", fmt.Sprintf("%s:%s", extractedPort, internalPort),
		"-e", fmt.Sprintf("PORT=%s", internalPort),
		"--memory=512m", "--cpus=0.5", "--name", containerName,
	}

	if envs != nil {
		for _, env := range *envs {
			runArgs = append(runArgs, "-e", fmt.Sprintf("%s=%s", env.Key, env.Value))
		}
	}

	runArgs = append(runArgs, imageName)

	runCmd := exec.CommandContext(runCtx, "docker", runArgs...)
	runCmd.Stdout = &runLogs
	runCmd.Stderr = &runLogs

	if err := runCmd.Run(); err != nil {
		slog.Error("docker run failed", "error", err)
		return "", "", runLogs.String(), fmt.Errorf("container run failed: %v", err)
	}

	rawContainerID := strings.TrimSpace(runLogs.String())

	slog.Info("container started successfully", "container_id", rawContainerID, "host_port", extractedPort)

	return rawContainerID, extractedPort, runLogs.String(), nil
}

func getFreePort() (int, error) {
	addr, err := net.ResolveTCPAddr("tcp", "localhost:0")
	if err != nil {
		return 0, err
	}

	l, err := net.ListenTCP("tcp", addr)
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port, nil
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
