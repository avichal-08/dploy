package pipeline

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"os/exec"
	"time"
)

type CloneOptions struct {
	RepoURL   string
	TargetDir string
	Timeout   time.Duration
}

func CloneRepo(opts CloneOptions) error {
	if opts.Timeout == 0 {
		opts.Timeout = 5 * time.Minute
	}

	ctx, cancel := context.WithTimeout(context.Background(), opts.Timeout)
	defer cancel()

	var stdout, stderr bytes.Buffer

	cmd := exec.CommandContext(ctx, "git", "clone", opts.RepoURL, opts.TargetDir)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	cmd.Env = []string{"GIT_TERMINAL_PROMPT=0"}

	slog.Info("starting git clone",
		"repo_url", opts.RepoURL,
		"target_dir", opts.TargetDir,
		"timeout", opts.Timeout,
	)

	start := time.Now()

	err := cmd.Run()

	duration := time.Since(start)

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			slog.Error("git clone timed out",
				"repo_url", opts.RepoURL,
				"duration", duration.String(),
			)
			return fmt.Errorf("clone timed out after %v", opts.Timeout)
		}

		slog.Error("git clone failed",
			"repo_url", opts.RepoURL,
			"error", err,
			"stderr", stderr.String(),
		)
		return fmt.Errorf("failed to clone: %v | stderr: %s", err, stderr.String())
	}

	slog.Info("git clone completed successfully",
		"repo_url", opts.RepoURL,
		"duration", duration.String(),
	)

	return nil
}
