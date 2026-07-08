package pipeline

import (
	"bytes"
	"context"
	"fmt"
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

	err := cmd.Run()
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return fmt.Errorf("clone timed out after %v", opts.Timeout)
		}
		return fmt.Errorf("failed to clone: %v | stderr: %s", err, stderr.String())
	}

	return nil
}
