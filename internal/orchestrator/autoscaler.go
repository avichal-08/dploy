package orchestrator

import (
	"log/slog"
	"math"
	"strconv"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/pipeline"
	"github.com/avichal-08/dploy/internal/proxy"
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
	if err := db.DB.Where("deployment_id = ? AND status = ?", *project.ActiveDeploymentID, "healthy").Find(&replicas).Error; err != nil || len(replicas) == 0 {
		return
	}

	activeCount := len(replicas)
	var totalConnections int32 = 0

	for _, rep := range replicas {
		totalConnections += proxy.GetReplicaConnectionCount(rep.ID)
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

	if activeCount < desiredReplicas {
		slog.Info("traffic spike detected: scaling UP", "project", project.Name, "current", activeCount, "desired", desiredReplicas, "connections", totalConnections)
		go provisionReplica(*project.ActiveDeploymentID, project.ID)
	} else if activeCount > desiredReplicas {
		slog.Info("traffic dropping: scaling DOWN", "project", project.Name, "current", activeCount, "desired", desiredReplicas, "connections", totalConnections)
		go terminateReplica(replicas[activeCount-1])
	}
}

func provisionReplica(deploymentID string, projectID string) {
	replica := models.Replica{
		ProjectID:    projectID,
		DeploymentID: deploymentID,
		Status:       "starting",
	}
	db.DB.Create(&replica)

	var envs []models.ProjectEnv
	db.DB.Where("project_id = ?", projectID).Find(&envs)

	containerID, portStr, _, runErr := pipeline.RunReplica(deploymentID, replica.ID, &envs)
	if runErr != nil {
		slog.Error("autoscaler failed to provision new replica", "error", runErr)
		db.DB.Model(&replica).Update("status", "failed")
		return
	}

	internalPort, _ := strconv.Atoi(portStr)
	db.DB.Model(&replica).Updates(map[string]interface{}{
		"status":        "healthy",
		"container_id":  containerID,
		"internal_port": internalPort,
	})
}

func terminateReplica(replica models.Replica) {
	db.DB.Model(&replica).Update("status", "terminating")

	time.Sleep(5 * time.Second)

	pipeline.StopAndRemoveContainer(replica.ContainerID)
	db.DB.Model(&replica).Update("status", "terminated")
}
