package api

import (
	"net/http"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

func HandleGetUser(w http.ResponseWriter, r *http.Request) {
	userId := r.PathValue("user_id")
	if userId == "" {
		WriteError(w, http.StatusBadRequest, "User ID is required")
		return
	}
	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to get user")
		return
	}

	WriteJSON(w, http.StatusOK, user)
}
