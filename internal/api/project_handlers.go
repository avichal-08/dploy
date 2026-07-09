package api

import (
	"net/http"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/pipeline"
)

type CreateProjectPayload struct {
	UserId        string `json:"user_id"`
	Name          string `json:"name"`
	RepositoryURL string `json:"repository_url"`
	// Framework     string `json:"framework"`
}

func HandleCreateProject(w http.ResponseWriter, r *http.Request) {
	var payload CreateProjectPayload

	if err := ReadJSON(r, &payload); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	project := models.Project{
		UserID:        payload.UserId,
		Name:          payload.Name,
		RepositoryURL: payload.RepositoryURL,
		// Framework:     payload.Framework,
	}

	if err := db.DB.Create(&project).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to create project")
		return
	}

	deployment := models.Deployment{
		ProjectID: project.ID,
		CommitSHA: "HEAD",
		Status:    "pending",
	}
	db.DB.Create(&deployment)

	go pipeline.Start(project, deployment)

	WriteJSON(w, http.StatusCreated, project)
}

func HandleGetProject(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")
	if projectID == "" {
		WriteError(w, http.StatusBadRequest, "Project ID is required")
		return
	}

	var project models.Project
	if err := db.DB.First(&project, "id = ?", projectID).Error; err != nil {
		WriteError(w, http.StatusNotFound, "Project not found")
		return
	}

	WriteJSON(w, http.StatusOK, project)
}
