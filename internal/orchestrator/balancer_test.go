package orchestrator_test

import (
	"testing"
)

type Replica struct {
	ID          string
	Connections int
}

func SelectLeastLoadedReplica(replicas []Replica) *Replica {
	if len(replicas) == 0 {
		return nil
	}
	best := &replicas[0]
	for i := 1; i < len(replicas); i++ {
		if replicas[i].Connections < best.Connections {
			best = &replicas[i]
		}
	}
	return best
}

func BenchmarkSelectLeastLoadedReplica(b *testing.B) {
	replicas := make([]Replica, 100)
	for i := 0; i < 100; i++ {
		replicas[i] = Replica{ID: "node", Connections: i * 2}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = SelectLeastLoadedReplica(replicas)
	}
}
