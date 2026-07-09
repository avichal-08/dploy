package pipeline

import (
	"log/slog"
	"os"
	"path/filepath"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

func Start(project models.Project, deployment models.Deployment) {
	slog.Info("starting deployment pipeline",
		"project_id", project.ID,
		"deployment_id", deployment.ID,
	)

	db.DB.Model(&deployment).Update("status", "building")

	cwd, err := os.Getwd()
	if err != nil {
		slog.Error("failed to get current working directory", "error", err)
	}
	buildDir := filepath.Join(cwd, "dploy-clones", deployment.ID)

	slog.Info("cloning repository",
		"deployment_id", deployment.ID,
		"repo_url", project.RepositoryURL,
		"target_dir", buildDir,
	)

	err = CloneRepo(CloneOptions{
		RepoURL:   project.RepositoryURL,
		TargetDir: buildDir,
	})

	if err != nil {
		slog.Error("clone failed",
			"deployment_id", deployment.ID,
			"error", err,
		)

		db.DB.Model(&deployment).Updates(map[string]interface{}{
			"status":     "failed",
			"build_logs": err.Error(),
		})
		return
	}

	slog.Info("repository cloned successfully", "deployment_id", deployment.ID)
	db.DB.Model(&deployment).Update("build_logs", "Repository cloned successfully.\n")

	commitSHA, err := GetCommitSHA(buildDir)
	if err != nil {
		slog.Error("failed to get commit sha",
			"deployment_id", deployment.ID,
			"error", err,
		)
	} else {
		slog.Info("retrieved commit sha",
			"deployment_id", deployment.ID,
			"commit_sha", commitSHA,
		)
	}
	db.DB.Model(&deployment).Update("commit_sha", commitSHA)

	framework := DetectFramework(buildDir)
	slog.Info("framework detected",
		"deployment_id", deployment.ID,
		"framework", framework,
	)

	db.DB.Model(&project).Update("framework", framework)
}
