package pipeline

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/avichal-08/dploy/internal/models"
)

func BuildStaticAssets(buildDir string, framework string, customBuildCmd string, outputDirName string, envs *[]models.ProjectEnv, logWriter io.Writer) (string, error) {
	var logs bytes.Buffer
	multiWriter := io.MultiWriter(logWriter, &logs)

	if framework == "static-html" {
		multiWriter.Write([]byte("--> Pure Static HTML detected. Bypassing container build...\n"))

		outPath := filepath.Join(buildDir, outputDirName)
		if err := os.MkdirAll(outPath, 0755); err != nil {
			return logs.String(), err
		}

		moveCmd := exec.Command("sh", "-c", fmt.Sprintf("mv * %s/ 2>/dev/null || true", outputDirName))
		moveCmd.Dir = buildDir
		moveCmd.Run()

		return logs.String(), nil
	}

	var baseImage, installSteps, defaultBuildCmd string

	switch framework {
	case "vite-bun":
		baseImage = "oven/bun:alpine"
		installSteps = "COPY package.json bun.lock* ./\nRUN bun install"
		defaultBuildCmd = "bun run build"
	default:
		baseImage = "node:20-alpine"
		installSteps = "COPY package*.json ./\nRUN npm ci || npm install"
		defaultBuildCmd = "npm run build"
	}

	dockerfilePath := filepath.Join(buildDir, "Dockerfile.static")
	dockerfileContent := fmt.Sprintf("FROM %s\nWORKDIR /app\n%s\nCOPY . .\n", baseImage, installSteps)

	if envs != nil {
		for _, env := range *envs {
			safeVal := strings.ReplaceAll(env.Value, "\"", "\\\"")
			dockerfileContent += fmt.Sprintf("ENV %s=\"%s\"\n", env.Key, safeVal)
		}
	}

	buildCmd := defaultBuildCmd
	if customBuildCmd != "" {
		buildCmd = customBuildCmd
	}
	dockerfileContent += fmt.Sprintf("RUN %s\n", buildCmd)

	if err := os.WriteFile(dockerfilePath, []byte(dockerfileContent), 0644); err != nil {
		return logs.String(), fmt.Errorf("failed to write static Dockerfile: %w", err)
	}

	imageTag := fmt.Sprintf("dploy-static-%s", filepath.Base(buildDir))
	multiWriter.Write([]byte(fmt.Sprintf("--> Building isolated %s container for static assets...\n", baseImage)))

	cmdBuild := exec.Command("docker", "build", "-t", imageTag, "-f", "Dockerfile.static", ".")
	cmdBuild.Dir = buildDir
	cmdBuild.Stdout = multiWriter
	cmdBuild.Stderr = multiWriter

	if err := cmdBuild.Run(); err != nil {
		return logs.String(), fmt.Errorf("docker build failed: %w", err)
	}

	defer exec.Command("docker", "rmi", "-f", imageTag).Run()

	containerName := fmt.Sprintf("extract-%s", filepath.Base(buildDir))
	multiWriter.Write([]byte(fmt.Sprintf("--> Extracting '%s' folder from container...\n", outputDirName)))

	exec.Command("docker", "create", "--name", containerName, imageTag).Run()
	defer exec.Command("docker", "rm", "-f", containerName).Run()

	containerPath := fmt.Sprintf("%s:/app/%s", containerName, outputDirName)
	localPath := filepath.Join(buildDir, outputDirName)

	cmdExtract := exec.Command("docker", "cp", containerPath, localPath)
	cmdExtract.Stdout = multiWriter
	cmdExtract.Stderr = multiWriter

	if err := cmdExtract.Run(); err != nil {
		return logs.String(), fmt.Errorf("failed to extract output directory '%s' (did the build command generate it?): %w", outputDirName, err)
	}

	return logs.String(), nil
}
