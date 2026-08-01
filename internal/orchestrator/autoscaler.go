package orchestrator

import (
	"fmt"
	"log/slog"
	"math"
	"strconv"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/pipeline"
	"github.com/avichal-08/dploy/internal/proxy"
)

const (
	ScaleUpCooldown   = 10 * time.Second
	ScaleDownCooldown = 30 * time.Second
)

func Autoscale() {
	var projects []models.Project
	if err := db.DB.Where("active_deployment_id IS NOT NULL").Find(&projects).Error; err != nil {
		return
	}

	for _, proj := range projects {
		scaleProject(proj)
	}
}

func scaleProject(project models.Project) {
	var replicas []models.Replica

	if err := db.DB.Where("deployment_id = ? AND status IN ?", *project.ActiveDeploymentID, []string{"healthy", "starting"}).Find(&replicas).Error; err != nil || len(replicas) == 0 {
		return
	}

	activeCount := len(replicas)
	var totalConnections int32 = 0

	for _, rep := range replicas {
		if rep.Status == "healthy" {
			totalConnections += proxy.GetReplicaConnectionCount(rep.ID)
		}
	}

	targetConcurrency := 50
	if project.TargetConcurrency != nil && *project.TargetConcurrency > 0 {
		targetConcurrency = *project.TargetConcurrency
	}

	effectiveTarget := float64(targetConcurrency) * 0.8
	desiredReplicas := int(math.Ceil(float64(totalConnections) / effectiveTarget))

	if desiredReplicas < 1 {
		desiredReplicas = 1
	}
	if desiredReplicas > 5 {
		desiredReplicas = 5
	}

	timeSinceLastScale := time.Since(time.Time{})
	if project.LastScaledAt != nil {
		timeSinceLastScale = time.Since(*project.LastScaledAt)
	}

	if activeCount < desiredReplicas {
		if timeSinceLastScale < ScaleUpCooldown {
			return
		}

		toAdd := desiredReplicas - activeCount
		slog.Info("traffic spike detected: scaling UP", "project", project.Name, "current", activeCount, "desired", desiredReplicas, "adding", toAdd, "connections", totalConnections)

		markProjectScaled(project.ID)

		for i := 0; i < toAdd; i++ {
			go provisionReplica(*project.ActiveDeploymentID, project.ID)
		}

	} else if activeCount > desiredReplicas {
		if timeSinceLastScale < ScaleDownCooldown {
			return
		}

		toRemove := activeCount - desiredReplicas
		slog.Info("traffic dropping: scaling DOWN", "project", project.Name, "current", activeCount, "desired", desiredReplicas, "removing", toRemove, "connections", totalConnections)

		markProjectScaled(project.ID)

		removed := 0
		for i := len(replicas) - 1; i >= 0 && removed < toRemove; i-- {
			if replicas[i].Status == "healthy" {
				go terminateReplica(replicas[i])
				removed++
			}
		}
	}
}

// this updates last_scaled_at to prevent thrashing
func markProjectScaled(projectID string) {
	now := time.Now()
	db.DB.Model(&models.Project{ID: projectID}).Update("last_scaled_at", now)
}

func provisionReplica(deploymentID string, projectID string) {
	replica := models.Replica{
		ProjectID:    projectID,
		DeploymentID: deploymentID,
		Status:       "starting",
		ContainerID:  fmt.Sprintf("pending-scale-%d", time.Now().UnixNano()),
	}
	db.DB.Create(&replica)

	var envs []models.ProjectEnv
	db.DB.Where("project_id = ?", projectID).Find(&envs)

	containerID, portStr, _, runErr := pipeline.RunReplica(deploymentID, replica.ID, &envs)
	if runErr != nil {
		slog.Error("autoscaler failed to provision new replica", "error", runErr)
		db.DB.Model(&replica).Updates(map[string]interface{}{
			"status":     "failed",
			"updated_at": time.Now(),
		})
		return
	}

	internalPort, _ := strconv.Atoi(portStr)
	db.DB.Model(&replica).Updates(map[string]interface{}{
		"status":        "healthy",
		"container_id":  containerID,
		"internal_port": internalPort,
		"updated_at":    time.Now(),
	})
}

func terminateReplica(replica models.Replica) {
	db.DB.Model(&replica).Update("status", "terminating")
	// this allows in-flight requests to finish processing within 5 seconds before the container is stopped
	time.Sleep(5 * time.Second)

	pipeline.StopAndRemoveContainer(replica.ContainerID)

	db.DB.Model(&replica).Update("status", "terminated")
}
