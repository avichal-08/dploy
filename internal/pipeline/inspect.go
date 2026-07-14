package pipeline

import (
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

func InspectRepository(project models.Project) {
	slog.Info("starting background inspection", "project_id", project.ID)

	cwd, err := os.Getwd()
	if err != nil {
		slog.Error("failed to get working directory", "error", err)
		db.DB.Model(&project).Update("status", "failed_internal")
		return
	}

	inspectDir := filepath.Join(cwd, "dploy-clones", "inspect-"+project.ID)

	defer func() {
		var removeErr error
		for i := 0; i < 5; i++ {
			removeErr = os.RemoveAll(inspectDir)
			if removeErr == nil {
				return
			}
			time.Sleep(200 * time.Millisecond)
		}

		if removeErr != nil {
			slog.Error("failed to clean up inspection directory after retries", "dir", inspectDir, "error", removeErr)
		}
	}()

	err = CloneRepo(CloneOptions{
		RepoURL:   project.RepositoryURL,
		TargetDir: inspectDir,
	})
	if err != nil {
		slog.Error("inspection clone failed", "project_id", project.ID, "error", err)
		db.DB.Model(&project).Update("status", "failed_clone")
		return
	}

	db.DB.Model(&project).Update("status", "detecting")

	framework := DetectFramework(inspectDir)
	slog.Info("framework detected", "project_id", project.ID, "framework", framework)

	if framework == "unknown" {
		db.DB.Model(&project).Updates(map[string]interface{}{
			"status": "manual_config_required",
		})
		return
	}

	db.DB.Model(&project).Updates(map[string]interface{}{
		"framework": framework,
		"status":    "pending_config",
	})
}
