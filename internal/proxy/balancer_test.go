package proxy

import (
	"testing"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/stretchr/testify/require"
)

func clearConnections() {
	activeConnections.Range(func(key, value interface{}) bool {
		activeConnections.Delete(key)
		return true
	})
}

func TestSelectLeastLoadedReplica(t *testing.T) {
	t.Run("Picks the replica with zero connections", func(t *testing.T) {
		clearConnections()
		incConn("node-1")
		incConn("node-1")
		incConn("node-2")

		replicas := []models.Replica{
			{ID: "node-1", InternalPort: 8081},
			{ID: "node-2", InternalPort: 8082},
			{ID: "node-3", InternalPort: 8083},
		}

		best := SelectLeastLoadedReplica(replicas)
		require.NotNil(t, best)
		require.Equal(t, "node-3", best.ID)
	})

	t.Run("Skips replicas with port 0", func(t *testing.T) {
		clearConnections()

		replicas := []models.Replica{
			{ID: "node-starting", InternalPort: 0},
			{ID: "node-ready", InternalPort: 8080},
		}

		best := SelectLeastLoadedReplica(replicas)
		require.NotNil(t, best)
		require.Equal(t, "node-ready", best.ID)
	})
}
