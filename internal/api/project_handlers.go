package api

import (
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strings"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/pipeline"
	"github.com/avichal-08/dploy/internal/proxy"
)

type CreateProjectPayload struct {
	Name          string `json:"name"`
	RepositoryURL string `json:"repository_url"`
}

func HandleCreateProject(w http.ResponseWriter, r *http.Request) {
	var payload CreateProjectPayload

	if err := ReadJSON(r, &payload); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	userId := GetUserID(r)

	project := models.Project{
		UserID:        userId,
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
	userId := GetUserID(r)
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
	if err := db.DB.Preload("Deployments").First(&project, "id = ?", projectID).Error; err != nil {
		WriteError(w, http.StatusNotFound, "Project not found")
		return
	}

	WriteJSON(w, http.StatusOK, project)
}

func HandleDeleteProject(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")
	if projectID == "" {
		WriteError(w, http.StatusBadRequest, "Project ID is required")
		return
	}

	if err := db.DB.Delete(&models.Project{}, "id = ?", projectID).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to delete project")
		return
	}

	WriteJSON(w, http.StatusOK, nil)
}

type UpdateDomainPayload struct {
	Name string `json:"name"`
}

var validNameRegex = regexp.MustCompile(`^[a-z0-9-]+$`)

func HandleDomainNameUpdate(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")
	if projectID == "" {
		WriteError(w, http.StatusBadRequest, "Project ID is required")
		return
	}

	var payload UpdateDomainPayload
	if err := ReadJSON(r, &payload); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	newName := strings.ToLower(strings.TrimSpace(payload.Name))

	if !validNameRegex.MatchString(newName) {
		WriteError(w, http.StatusBadRequest, "Project name can only contain lowercase letters, numbers, and hyphens")
		return
	}

	var count int64
	db.DB.Model(&models.Project{}).Where("name = ?", newName).Count(&count)
	if count > 0 {
		WriteError(w, http.StatusConflict, "Project name is already taken")
		return
	}

	var project models.Project
	if err := db.DB.First(&project, "id = ?", projectID).Error; err != nil {
		WriteError(w, http.StatusNotFound, "Project not found")
		return
	}

	oldName := project.Name

	baseDomain := os.Getenv("BASE_DOMAIN")
	var newProductionURL string
	if baseDomain != "" {
		newProductionURL = fmt.Sprintf("https://%s.%s", newName, baseDomain)
	}

	if err := db.DB.Model(&project).Updates(map[string]interface{}{
		"name":           newName,
		"production_url": newProductionURL,
	}).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to update project name")
		return
	}

	proxy.CacheManager.Invalidate(oldName)

	if project.ActiveDeploymentID != nil && *project.ActiveDeploymentID != "" {
		activeDepID := *project.ActiveDeploymentID
		var storagePrefix string
		var replicas []models.Replica

		if project.ProjectType == "static" {
			storagePrefix = fmt.Sprintf("projects/%s/%s", project.ID, activeDepID)
		} else if project.ProjectType == "docker" {

			db.DB.Where("deployment_id = ? AND status = ?", activeDepID, "healthy").Find(&replicas)
		}

		proxy.CacheManager.WarmCache(newName, activeDepID, project.ProjectType, storagePrefix, replicas)
	}

	response := map[string]string{
		"message":        "Project name updated successfully",
		"production_url": newProductionURL,
	}
	WriteJSON(w, http.StatusOK, response)
}
