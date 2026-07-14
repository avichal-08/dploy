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
		Status:        "cloning",
	}

	if err := db.DB.Create(&project).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to create project")
		return
	}

	go pipeline.InspectRepository(project)

	WriteJSON(w, http.StatusCreated, project)
}

func HandleGetProjects(w http.ResponseWriter, r *http.Request) {
	userId := r.PathValue("user_id")
	if userId == "" {
		WriteError(w, http.StatusBadRequest, "User ID is required")
		return
	}
	var projects []models.Project
	if err := db.DB.Find(&projects, "user_id = ?", userId).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to get projects")
		return
	}

	WriteJSON(w, http.StatusOK, projects)
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
