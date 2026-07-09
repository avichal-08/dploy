package pipeline

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func GetCommitSHA(repoDir string) (string, error) {
	cmd := exec.Command("git", "rev-parse", "HEAD")
	cmd.Dir = repoDir

	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get commit SHA: %v", err)
	}

	return strings.TrimSpace(string(out)), nil
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	if os.IsNotExist(err) {
		return false
	}
	return !info.IsDir()
}

func DetectFramework(repoDir string) string {

	if fileExists(filepath.Join(repoDir, "next.config.js")) || fileExists(filepath.Join(repoDir, "next.config.mjs")) || fileExists(filepath.Join(repoDir, "next.config.ts")) {
		return "nextjs"
	}

	if fileExists(filepath.Join(repoDir, "go.mod")) {
		return "go"
	}

	if fileExists(filepath.Join(repoDir, "vite.config.js")) || fileExists(filepath.Join(repoDir, "vite.config.ts")) {
		return "static"
	}

	if fileExists(filepath.Join(repoDir, "bun.lock")) || fileExists(filepath.Join(repoDir, "bun.lockb")) {
		return "bun"
	}

	if fileExists(filepath.Join(repoDir, "package.json")) {
		return "nodejs"
	}

	if fileExists(filepath.Join(repoDir, "requirements.txt")) || fileExists(filepath.Join(repoDir, "main.py")) {
		return "python"
	}

	slog.Warn("could not detect framework, falling back to unknown", "dir", repoDir)
	return "unknown"
}
