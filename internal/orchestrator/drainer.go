package orchestrator

import (
	"log/slog"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/pipeline"
	"github.com/avichal-08/dploy/internal/proxy"
)

const (
	drainGrace          = 2 * time.Second
	defaultDrainTimeout = 60 * time.Second
)

var drainStarted sync.Map

type drainAction int

const (
	drainWait drainAction = iota
	drainRemove
	drainForceRemove
)

func decideDrain(elapsed time.Duration, openConns int32, timeout time.Duration) drainAction {
	switch {
	case elapsed < drainGrace:
		return drainWait
	case openConns <= 0:
		return drainRemove
	case elapsed >= timeout:
		return drainForceRemove
	default:
		return drainWait
	}
}

func drainTimeoutFromEnv() time.Duration {
	if d, err := time.ParseDuration(os.Getenv("DRAIN_TIMEOUT")); err == nil && d > 0 {
		return d
	}
	return defaultDrainTimeout
}

func Drain() {
	var replicas []models.Replica
	if err := db.DB.Where("status = ?", "draining").Find(&replicas).Error; err != nil {
		slog.Error("drainer failed to fetch replicas", "error", err)
		return
	}
	if len(replicas) == 0 {
		return
	}

	timeout := drainTimeoutFromEnv()
	now := time.Now()
	invalidated := map[string]bool{}

	for _, rep := range replicas {
		startedAny, seen := drainStarted.LoadOrStore(rep.ID, now)
		if !seen && !invalidated[rep.ProjectID] {
			invalidateProjectRoute(rep.ProjectID)
			invalidated[rep.ProjectID] = true
		}

		elapsed := now.Sub(startedAny.(time.Time))
		open := proxy.GetReplicaConnectionCount(rep.ID)

		switch decideDrain(elapsed, open, timeout) {
		case drainWait:
			continue
		case drainForceRemove:
			slog.Warn("drain timeout reached, removing replica with open connections",
				"replica_id", rep.ID, "open_connections", open, "timeout", timeout)
		case drainRemove:
			slog.Info("replica drained", "replica_id", rep.ID, "drained_in", elapsed.Round(time.Millisecond))
		}

		res := db.DB.Model(&models.Replica{}).
			Where("id = ? AND status = ?", rep.ID, "draining").
			Update("status", "terminating")
		if res.Error != nil || res.RowsAffected == 0 {
			continue
		}
		drainStarted.Delete(rep.ID)

		go func(r models.Replica) {
			if r.ContainerID != "" && !strings.HasPrefix(r.ContainerID, "pending-") {
				if err := pipeline.StopAndRemoveContainer(r.ContainerID); err != nil {
					slog.Warn("failed to remove drained replica", "container", r.ContainerID, "error", err)
				}
			}
			db.DB.Model(&models.Replica{}).Where("id = ?", r.ID).Update("status", "terminated")
		}(rep)
	}
}

func invalidateProjectRoute(projectID string) {
	var project models.Project
	if err := db.DB.Select("name").First(&project, "id = ?", projectID).Error; err != nil {
		slog.Warn("drainer could not resolve project for route invalidation", "project_id", projectID, "error", err)
		return
	}
	proxy.CacheManager.Invalidate(project.Name)
}
