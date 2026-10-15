package api

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/tasks"
	"github.com/hibiken/asynq"
)

const maxWebhookBody = 5 << 20

type githubPushEvent struct {
	Ref     string `json:"ref"`
	After   string `json:"after"`
	Deleted bool   `json:"deleted"`
	Repo    struct {
		HTMLURL       string `json:"html_url"`
		CloneURL      string `json:"clone_url"`
		SSHURL        string `json:"ssh_url"`
		DefaultBranch string `json:"default_branch"`
	} `json:"repository"`
	HeadCommit *struct {
		Message string `json:"message"`
	} `json:"head_commit"`
}

func newWebhookSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func validGitHubSignature(secret string, body []byte, header string) bool {
	if secret == "" {
		return false
	}
	sigHex, ok := strings.CutPrefix(header, "sha256=")
	if !ok {
		return false
	}
	got, err := hex.DecodeString(sigHex)
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hmac.Equal(got, mac.Sum(nil))
}

func normalizeRepoURL(raw string) string {
	u := strings.ToLower(strings.TrimSpace(raw))
	u = strings.TrimSuffix(u, "/")
	u = strings.TrimSuffix(u, ".git")
	if rest, ok := strings.CutPrefix(u, "git@"); ok {
		u = strings.Replace(rest, ":", "/", 1)
	}
	for _, p := range []string{"https://", "http://", "ssh://", "git://"} {
		u = strings.TrimPrefix(u, p)
	}
	u = strings.TrimPrefix(u, "www.")
	if at := strings.Index(u, "@"); at != -1 && at < strings.Index(u+"/", "/") {
		u = u[at+1:]
	}
	return u
}

func (e githubPushEvent) matchesRepo(projectRepoURL string) bool {
	want := normalizeRepoURL(projectRepoURL)
	for _, candidate := range []string{e.Repo.HTMLURL, e.Repo.CloneURL, e.Repo.SSHURL} {
		if candidate != "" && normalizeRepoURL(candidate) == want {
			return true
		}
	}
	return false
}

func (e githubPushEvent) deployDecision() (bool, string) {
	if e.Deleted {
		return false, "branch deletion"
	}
	branch, ok := strings.CutPrefix(e.Ref, "refs/heads/")
	if !ok {
		return false, "not a branch push"
	}
	if e.Repo.DefaultBranch == "" || branch != e.Repo.DefaultBranch {
		return false, "push to " + branch + ", deploys only follow " + e.Repo.DefaultBranch
	}
	return true, ""
}

func enqueueDeployment(asynqClient *asynq.Client, project models.Project, commitSHA, commitMessage string) (models.Deployment, error) {
	if commitSHA == "" {
		commitSHA = "HEAD"
	}
	if len(commitSHA) > 40 {
		commitSHA = commitSHA[:40]
	}
	deployment := models.Deployment{
		ProjectID:     project.ID,
		CommitSHA:     commitSHA,
		CommitMessage: commitMessage,
		Status:        "pending",
	}
	if err := db.DB.Create(&deployment).Error; err != nil {
		return deployment, err
	}
	task, err := tasks.NewDeployTask(project.ID, deployment.ID)
	if err != nil {
		return deployment, err
	}
	info, err := asynqClient.Enqueue(task)
	if err != nil {
		db.DB.Model(&deployment).Update("status", "failed")
		return deployment, err
	}
	slog.Info("Enqueued Deployment Task", "task_id", info.ID, "queue", info.Queue, "project", project.Name)
	return deployment, nil
}

func HandleGitHubWebhook(asynqClient *asynq.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var project models.Project
		if err := db.DB.First(&project, "id = ?", r.PathValue("projectId")).Error; err != nil {
			WriteError(w, http.StatusNotFound, "Unknown webhook")
			return
		}

		body, err := io.ReadAll(io.LimitReader(r.Body, maxWebhookBody+1))
		if err != nil || len(body) > maxWebhookBody {
			WriteError(w, http.StatusRequestEntityTooLarge, "Payload too large")
			return
		}

		if !validGitHubSignature(project.WebhookSecret, body, r.Header.Get("X-Hub-Signature-256")) {
			slog.Warn("rejected webhook with bad signature", "project", project.Name, "delivery", r.Header.Get("X-GitHub-Delivery"))
			WriteError(w, http.StatusUnauthorized, "Invalid signature")
			return
		}

		switch r.Header.Get("X-GitHub-Event") {
		case "ping":
			WriteJSON(w, http.StatusOK, map[string]string{"status": "pong"})
			return
		case "push":
		default:
			WriteJSON(w, http.StatusOK, map[string]string{"status": "ignored", "reason": "unsupported event"})
			return
		}

		var event githubPushEvent
		if err := json.Unmarshal(body, &event); err != nil {
			WriteError(w, http.StatusBadRequest, "Invalid push payload")
			return
		}

		if !event.matchesRepo(project.RepositoryURL) {
			WriteError(w, http.StatusBadRequest, "Push is for a different repository than this project")
			return
		}

		if ok, reason := event.deployDecision(); !ok {
			WriteJSON(w, http.StatusOK, map[string]string{"status": "ignored", "reason": reason})
			return
		}

		message := ""
		if event.HeadCommit != nil {
			message = strings.TrimSpace(event.HeadCommit.Message)
		}

		deployment, err := enqueueDeployment(asynqClient, project, event.After, message)
		if err != nil {
			slog.Error("failed to start webhook deployment", "project", project.Name, "error", err)
			WriteError(w, http.StatusInternalServerError, "Failed to start deployment")
			return
		}

		WriteJSON(w, http.StatusAccepted, map[string]string{"status": "deploying", "deployment_id": deployment.ID})
	}
}

func loadOwnedProject(r *http.Request) (models.Project, bool) {
	var project models.Project
	err := db.DB.First(&project, "id = ? AND user_id = ?", r.PathValue("id"), GetUserID(r)).Error
	return project, err == nil
}

func HandleGetWebhook(w http.ResponseWriter, r *http.Request) {
	project, ok := loadOwnedProject(r)
	if !ok {
		WriteError(w, http.StatusNotFound, "Project not found")
		return
	}

	if project.WebhookSecret == "" {
		secret, err := newWebhookSecret()
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to create webhook secret")
			return
		}
		if err := db.DB.Model(&project).Update("webhook_secret", secret).Error; err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to create webhook secret")
			return
		}
		project.WebhookSecret = secret
	}

	WriteJSON(w, http.StatusOK, map[string]string{
		"path":   "/webhooks/github/" + project.ID,
		"secret": project.WebhookSecret,
	})
}

func HandleRotateWebhookSecret(w http.ResponseWriter, r *http.Request) {
	project, ok := loadOwnedProject(r)
	if !ok {
		WriteError(w, http.StatusNotFound, "Project not found")
		return
	}

	secret, err := newWebhookSecret()
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to create webhook secret")
		return
	}
	if err := db.DB.Model(&project).Update("webhook_secret", secret).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to rotate webhook secret")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{
		"path":   "/webhooks/github/" + project.ID,
		"secret": secret,
	})
}
