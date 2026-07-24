package api

import (
	"log/slog"
	"net/http"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/proxy"
)

func HandleGetProjectMetrics(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")
	if projectID == "" {
		WriteError(w, http.StatusBadRequest, "Project ID is required")
		return
	}

	var project models.Project
	if err := db.DB.First(&project, "id = ?", projectID).Error; err != nil {
		slog.Warn("project not found for metrics", "id", projectID)
		WriteError(w, http.StatusNotFound, "Project not found")
		return
	}

	targetConcurrency := 50
	if project.TargetConcurrency != nil && *project.TargetConcurrency > 0 {
		targetConcurrency = *project.TargetConcurrency
	}

	if project.ActiveDeploymentID == nil || *project.ActiveDeploymentID == "" {
		WriteJSON(w, http.StatusOK, map[string]interface{}{
			"replicas":           0,
			"active_connections": 0,
			"target_concurrency": targetConcurrency,
			"replica_stats":      []map[string]interface{}{},
		})
		return
	}

	var replicas []models.Replica
	db.DB.Where("deployment_id = ? AND status = ?", *project.ActiveDeploymentID, "healthy").Find(&replicas)

	var totalConnections int32 = 0
	replicaStats := make([]map[string]interface{}, 0)

	for _, rep := range replicas {
		conns := proxy.GetReplicaConnectionCount(rep.ID)
		totalConnections += conns
		replicaStats = append(replicaStats, map[string]interface{}{
			"id":          rep.ID,
			"port":        rep.InternalPort,
			"connections": conns,
		})
	}

	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"replicas":           len(replicas),
		"active_connections": totalConnections,
		"target_concurrency": targetConcurrency,
		"replica_stats":      replicaStats,
	})
}
