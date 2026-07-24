package orchestrator

import (
	"log/slog"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/pipeline"
)

func Reconcile() {
	var replicas []models.Replica
	if err := db.DB.Where("status IN ?", []string{"starting", "healthy", "crashed"}).Find(&replicas).Error; err != nil {
		slog.Error("orchestrator failed to fetch replicas", "error", err)
		return
	}

	for _, replica := range replicas {
		checkAndHealReplica(replica)
	}
}

func checkAndHealReplica(replica models.Replica) {
	if replica.ContainerID == "" {
		return
	}

	cmd := exec.Command("docker", "inspect", "-f", "{{.State.Status}}", replica.ContainerID)
	out, err := cmd.Output()

	statusStr := strings.TrimSpace(string(out))
	isDockerRunning := err == nil && statusStr == "running"

	if replica.Status == "healthy" || replica.Status == "starting" {
		if !isDockerRunning {
			slog.Warn("orchestrator detected crashed replica", "replica_id", replica.ID, "container_id", replica.ContainerID)

			db.DB.Model(&replica).Updates(map[string]interface{}{
				"status":        "crashed",
				"restart_count": replica.RestartCount + 1,
				"last_crash_at": time.Now(),
			})
		}
	} else if replica.Status == "crashed" {
		baseDelay := 5 * time.Second
		maxDelay := 300 * time.Second

		multiplier := 1 << (replica.RestartCount - 1)
		delay := baseDelay * time.Duration(multiplier)

		if delay > maxDelay || delay <= 0 {
			delay = maxDelay
		}

		if time.Since(replica.LastCrashAt) > delay {
			slog.Info("orchestrator attempting to heal replica", "replica_id", replica.ID, "attempt", replica.RestartCount)

			pipeline.StopAndRemoveContainer(replica.ContainerID)

			var envs []models.ProjectEnv
			db.DB.Where("project_id = ?", replica.ProjectID).Find(&envs)

			newContainerID, portStr, _, runErr := pipeline.RunReplica(replica.DeploymentID, replica.ID, &envs)

			if runErr != nil {
				slog.Error("orchestrator failed to respawn replica", "error", runErr)
				db.DB.Model(&replica).Updates(map[string]interface{}{
					"last_crash_at": time.Now(),
					"restart_count": replica.RestartCount + 1,
				})
			} else {
				internalPort, _ := strconv.Atoi(portStr)
				slog.Info("orchestrator successfully healed replica", "replica_id", replica.ID)
				db.DB.Model(&replica).Updates(map[string]interface{}{
					"status":        "healthy",
					"container_id":  newContainerID,
					"internal_port": internalPort,
				})
			}
		}
	}
}
