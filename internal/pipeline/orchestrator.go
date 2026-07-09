package pipeline

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

func Start(project models.Project, deployment models.Deployment) {

	db.DB.Model(&deployment).Update("status", "building")

	cwd, _ := os.Getwd()
	buildDir := filepath.Join(cwd, "dploy-clones", deployment.ID)

	err := CloneRepo(CloneOptions{
		RepoURL:   project.RepositoryURL,
		TargetDir: buildDir,
	})

	if err != nil {
		fmt.Printf("clone failed: %v\n", err)

		db.DB.Model(&deployment).Updates(map[string]interface{}{
			"status":     "failed",
			"build_logs": err.Error(),
		})
		return
	}

	db.DB.Model(&deployment).Update("build_logs", "Repository cloned successfully.\n")

	commitSHA, err := GetCommitSHA(buildDir)
	if err != nil {
		slog.Error("not able to get commit sha", "error", err)
	}
	db.DB.Model(&deployment).Update("commit_sha", commitSHA)

	framework := DetectFramework(buildDir)

	db.DB.Model(&project).Update("framework", framework)

}
