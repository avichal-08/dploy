// ... existing code ...
package proxy

import (
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

type RouteCache struct {
	DeploymentID string
	Replicas     []models.Replica
	ExpiresAt    time.Time
}

type RouteCacheManager struct {
	store sync.Map
	ttl   time.Duration
}

func NewRouteCacheManager(ttl time.Duration) *RouteCacheManager {
	return &RouteCacheManager{
		ttl: ttl,
	}
}

var CacheManager = NewRouteCacheManager(30 * time.Second)

func (rc *RouteCacheManager) GetRoute(projectName string) (string, []models.Replica, error) {
	if val, ok := rc.store.Load(projectName); ok {
		entry := val.(RouteCache)
		if time.Now().Before(entry.ExpiresAt) {
			return entry.DeploymentID, entry.Replicas, nil
		}
	}

	var project models.Project
	if err := db.DB.Where("name = ?", projectName).First(&project).Error; err != nil {
		return "", nil, fmt.Errorf("project not found")
	}

	if project.ActiveDeploymentID == nil || *project.ActiveDeploymentID == "" {
		return "", nil, fmt.Errorf("no active deployment")
	}

	var replicas []models.Replica
	if err := db.DB.Where("deployment_id = ? AND status = ?", *project.ActiveDeploymentID, "healthy").Find(&replicas).Error; err != nil || len(replicas) == 0 {
		return "", nil, fmt.Errorf("no healthy replicas")
	}

	rc.store.Store(projectName, RouteCache{
		DeploymentID: *project.ActiveDeploymentID,
		Replicas:     replicas,
		ExpiresAt:    time.Now().Add(rc.ttl),
	})

	return *project.ActiveDeploymentID, replicas, nil
}

func (rc *RouteCacheManager) Invalidate(projectName string) {
	rc.store.Delete(projectName)
	slog.Info("invalidated proxy route cache", "project", projectName)
}

func (rc *RouteCacheManager) WarmCache(projectName string, deploymentID string, replicas []models.Replica) {
	rc.store.Store(projectName, RouteCache{
		DeploymentID: deploymentID,
		Replicas:     replicas,
		ExpiresAt:    time.Now().Add(rc.ttl),
	})
	slog.Info("warmed proxy route cache", "project", projectName, "replicas", len(replicas))
}

func ClearProjectCache(projectName string) {
	CacheManager.Invalidate(projectName)
}
