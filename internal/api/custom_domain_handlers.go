package api

import (
	"net/http"
	"os"
	"strings"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

type CustomDomainPayload struct {
	CustomDomain string `json:"custom_domain"`
}

func HandleUpdateCustomDomain(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")
	var payload CustomDomainPayload
	if err := ReadJSON(r, &payload); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	domain := strings.ToLower(strings.TrimSpace(payload.CustomDomain))

	var project models.Project
	if err := db.DB.First(&project, "id = ?", projectID).Error; err != nil {
		WriteError(w, http.StatusNotFound, "Project not found")
		return
	}

	if err := db.DB.Model(&project.CustomDomain).Update("custom_domain", domain).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to update custom domain")
		return
	}

	response := map[string]string{
		"message":           "Project name updated successfully",
		"new_custom_domain": domain,
	}

	WriteJSON(w, http.StatusOK, response)
}

func HandleVerifyDomain(w http.ResponseWriter, r *http.Request) {
	domain := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("domain")))
	if domain == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	baseDomain := os.Getenv("BASE_DOMAIN")

	if baseDomain != "" && strings.HasSuffix(domain, "."+baseDomain) {
		hostParts := strings.Split(domain, ".")
		if len(hostParts) < 2 {
			w.WriteHeader(http.StatusForbidden)
			return
		}

		projectName := hostParts[0]

		var count int64
		db.DB.Model(&models.Project{}).Where("name = ?", projectName).Count(&count)
		if count > 0 {
			w.WriteHeader(http.StatusOK)
			return
		}

		w.WriteHeader(http.StatusForbidden)
		return
	}

	var count int64
	db.DB.Model(&models.Project{}).Where("custom_domain = ?", domain).Count(&count)
	if count > 0 {
		w.WriteHeader(http.StatusOK)
		return
	}

	w.WriteHeader(http.StatusForbidden)
}
