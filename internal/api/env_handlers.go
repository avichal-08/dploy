package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

type EnvRequest struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func HandleGetEnvs(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")
	if projectID == "" {
		WriteError(w, http.StatusBadRequest, "Project ID is required")
		return
	}

	var envs []models.ProjectEnv
	if err := db.DB.Where("project_id = ?", projectID).Order("created_at asc").Find(&envs).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to fetch environment variables")
		return
	}

	if envs == nil {
		envs = []models.ProjectEnv{}
	}

	WriteJSON(w, http.StatusOK, envs)
}

func HandleCreateEnvs(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")
	if projectID == "" {
		WriteError(w, http.StatusBadRequest, "Project ID is required")
		return
	}

	var reqs []EnvRequest
	if err := json.NewDecoder(r.Body).Decode(&reqs); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload. Expected an array of environment variables.")
		return
	}

	var envsToInsert []models.ProjectEnv
	for _, req := range reqs {
		key := strings.TrimSpace(req.Key)
		if key != "" && req.Value != "" {
			envsToInsert = append(envsToInsert, models.ProjectEnv{
				ProjectID: projectID,
				Key:       key,
				Value:     req.Value,
			})
		}
	}

	if len(envsToInsert) == 0 {
		WriteError(w, http.StatusBadRequest, "No valid environment variables provided")
		return
	}

	if err := db.DB.Create(&envsToInsert).Error; err != nil {
		if strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			WriteError(w, http.StatusConflict, "One or more keys already exist for this project.")
			return
		}
		WriteError(w, http.StatusInternalServerError, "Failed to save environment variables")
		return
	}

	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Environment variables saved successfully"})
}

func HandleUpdateEnv(w http.ResponseWriter, r *http.Request) {
	envID := r.PathValue("envId")
	if envID == "" {
		WriteError(w, http.StatusBadRequest, "Environment Variable ID is required")
		return
	}

	var req EnvRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	req.Key = strings.TrimSpace(req.Key)
	if req.Key == "" {
		WriteError(w, http.StatusBadRequest, "Key cannot be empty")
		return
	}

	err := db.DB.Model(&models.ProjectEnv{ID: envID}).Updates(map[string]interface{}{
		"key":   req.Key,
		"value": req.Value,
	}).Error

	if err != nil {
		if strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "unique") {
			WriteError(w, http.StatusConflict, "Another environment variable with this key already exists.")
			return
		}
		WriteError(w, http.StatusInternalServerError, "Failed to update environment variable")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Environment variable updated successfully"})
}

func HandleDeleteEnv(w http.ResponseWriter, r *http.Request) {
	envID := r.PathValue("envId")
	if envID == "" {
		WriteError(w, http.StatusBadRequest, "Environment Variable ID is required")
		return
	}

	if err := db.DB.Delete(&models.ProjectEnv{ID: envID}).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to delete environment variable")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Environment variable deleted successfully"})
}
