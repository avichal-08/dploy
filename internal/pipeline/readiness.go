package pipeline

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/proxy"
)

const (
	DefaultReadyTimeout = 60 * time.Second
	readyPollInterval   = 500 * time.Millisecond
	readyAliveEvery     = 4
)

var (
	ErrNotReady        = errors.New("replica did not answer HTTP before the readiness timeout")
	ErrContainerExited = errors.New("replica container exited before it became ready")
)

type readinessProbe struct {
	url      string
	interval time.Duration
	timeout  time.Duration
	client   *http.Client
	alive    func() (bool, error)
}

func (p readinessProbe) wait(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	var lastErr error
	for attempt := 1; ; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.url, nil)
		if err != nil {
			return err
		}
		resp, err := p.client.Do(req)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode < 500 {
				return nil
			}
			lastErr = fmt.Errorf("responded %d", resp.StatusCode)
		} else {
			lastErr = err
		}

		if p.alive != nil && attempt%readyAliveEvery == 0 {
			if running, aliveErr := p.alive(); aliveErr == nil && !running {
				return ErrContainerExited
			}
		}

		select {
		case <-ctx.Done():
			if lastErr != nil {
				return fmt.Errorf("%w (last attempt: %v)", ErrNotReady, lastErr)
			}
			return ErrNotReady
		case <-ticker.C:
		}
	}
}

func WaitForReplicaReady(containerID string, hostPort int, timeout time.Duration) error {
	p := readinessProbe{
		url:      proxy.ReplicaBaseURL(hostPort) + "/",
		interval: readyPollInterval,
		timeout:  timeout,
		client: &http.Client{
			Timeout:       3 * time.Second,
			CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		},
		alive: func() (bool, error) { return isContainerRunning(containerID) },
	}
	return p.wait(context.Background())
}

func ReadyTimeoutFromEnv() time.Duration {
	if d, err := time.ParseDuration(os.Getenv("READY_TIMEOUT")); err == nil && d > 0 {
		return d
	}
	return DefaultReadyTimeout
}

func isContainerRunning(containerID string) (bool, error) {
	out, err := exec.Command("docker", "inspect", "-f", "{{.State.Running}}", containerID).Output()
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(string(out)) == "true", nil
}

func ContainerLogsTail(containerID string, n int) string {
	out, err := exec.Command("docker", "logs", "--tail", fmt.Sprint(n), containerID).CombinedOutput()
	if err != nil && len(out) == 0 {
		return fmt.Sprintf("(could not read container logs: %v)", err)
	}
	return string(out)
}

func MarkDeploymentDraining(deploymentID string) error {
	return db.DB.Model(&models.Replica{}).
		Where("deployment_id = ? AND status IN ?", deploymentID, []string{"starting", "healthy", "crashed"}).
		Update("status", "draining").Error
}
