package orchestrator

import (
	"context"
	"log/slog"
	"time"

)

func StartOrchestrator(ctx context.Context) {
	slog.Info("starting orchestrator reconciliation loop")
	ticker := time.NewTicker(5 * time.Second)
	go func() {
		for {
			select {
			case <-ctx.Done():
				slog.Info("stopping orchestrator")
				return
			case <-ticker.C:
				Reconcile()
				Autoscale()
			}
		}
	}()
}
