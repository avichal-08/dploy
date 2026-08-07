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
	DeploymentID  string
	ProjectType   string
	StoragePrefix string
	Replicas      []models.Replica
	ExpiresAt     time.Time
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

func (rc *RouteCacheManager) GetRoute(projectName string) (RouteCache, error) {
	if val, ok := rc.store.Load(projectName); ok {
		entry := val.(RouteCache)
		if time.Now().Before(entry.ExpiresAt) {
			return entry, nil
		}
	}

	var project models.Project
	if err := db.DB.Where("name = ?", projectName).First(&project).Error; err != nil {
		return RouteCache{}, fmt.Errorf("project not found")
	}

	if project.ActiveDeploymentID == nil || *project.ActiveDeploymentID == "" {
		return RouteCache{}, fmt.Errorf("no active deployment")
	}

	var deployment models.Deployment
	if err := db.DB.Where("id = ?", *project.ActiveDeploymentID).First(&deployment).Error; err != nil {
		return RouteCache{}, fmt.Errorf("active deployment not found")
	}

	var replicas []models.Replica

	if project.ProjectType == "static" {
		replicas = []models.Replica{}
	} else {
		if err := db.DB.Where("deployment_id = ? AND status = ?", *project.ActiveDeploymentID, "healthy").Find(&replicas).Error; err != nil || len(replicas) == 0 {
			return RouteCache{}, fmt.Errorf("no healthy replicas")
		}
	}

	cacheEntry := RouteCache{
		DeploymentID:  *project.ActiveDeploymentID,
		ProjectType:   project.ProjectType,
		StoragePrefix: deployment.StoragePrefix,
		Replicas:      replicas,
		ExpiresAt:     time.Now().Add(rc.ttl),
	}

	rc.store.Store(projectName, cacheEntry)

	return cacheEntry, nil
}

func (rc *RouteCacheManager) Invalidate(projectName string) {
	rc.store.Delete(projectName)
	slog.Info("invalidated proxy route cache", "project", projectName)
}

func (rc *RouteCacheManager) WarmCache(projectName string, deploymentID string, projectType string, storagePrefix string, replicas []models.Replica) {
	cacheEntry := RouteCache{
		DeploymentID:  deploymentID,
		ProjectType:   projectType,
		StoragePrefix: storagePrefix,
		Replicas:      replicas,
		ExpiresAt:     time.Now().Add(rc.ttl),
	}
	rc.store.Store(projectName, cacheEntry)
	slog.Info("warmed proxy route cache", "project", projectName, "type", projectType)
}
