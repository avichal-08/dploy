package orchestrator

import (
	"testing"
	"time"
)

func TestDecideDrain(t *testing.T) {
	const timeout = 60 * time.Second
	cases := []struct {
		name    string
		elapsed time.Duration
		open    int32
		want    drainAction
	}{
		{"inside grace with no connections still waits", 500 * time.Millisecond, 0, drainWait},
		{"inside grace with connections waits", time.Second, 5, drainWait},
		{"after grace with no connections is removed", drainGrace, 0, drainRemove},
		{"after grace with open connections keeps draining", 10 * time.Second, 3, drainWait},
		{"timeout with open connections is forced out", timeout, 3, drainForceRemove},
		{"past timeout with zero connections is a normal removal", 2 * timeout, 0, drainRemove},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := decideDrain(tc.elapsed, tc.open, timeout); got != tc.want {
				t.Fatalf("decideDrain(%v, %d) = %v, want %v", tc.elapsed, tc.open, got, tc.want)
			}
		})
	}
}

func TestDrainTimeoutFromEnv(t *testing.T) {
	t.Setenv("DRAIN_TIMEOUT", "")
	if got := drainTimeoutFromEnv(); got != defaultDrainTimeout {
		t.Fatalf("default: got %v", got)
	}
	t.Setenv("DRAIN_TIMEOUT", "90s")
	if got := drainTimeoutFromEnv(); got != 90*time.Second {
		t.Fatalf("override: got %v", got)
	}
	t.Setenv("DRAIN_TIMEOUT", "nonsense")
	if got := drainTimeoutFromEnv(); got != defaultDrainTimeout {
		t.Fatalf("invalid value should fall back: got %v", got)
	}
}
