package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"
	"context"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/golang-jwt/jwt/v5"
)

type UserContextKey string

const ContextUserID UserContextKey = "userID"

type RegisterRequest struct {
	Email    string `json:"email"`
	GithubID string `json:"github_id"`
}

type LoginRequest struct {
	Identifier string `json:"identifier"` // can be email || github-id
}

func setAuthCookie(w http.ResponseWriter, user models.User) error {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		slog.Error("JWT_SECRET not set")
		return errors.New("JWT_SECRET not set")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"exp":   time.Now().Add(time.Hour * 24 * 7).Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "dploy_session",
		Value:    tokenString,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, //set true when deploy on a vps
		SameSite: http.SameSiteLaxMode,
		MaxAge:   60 * 60 * 24 * 7,
	})

	return nil
}

func HandleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	if req.Email == "" || req.GithubID == "" {
		WriteError(w, http.StatusBadRequest, "Email and Github ID are required to register")
		return
	}

	var existingUser models.User
	if err := db.DB.Where("email = ? OR github_id = ?", req.Email, req.GithubID).First(&existingUser).Error; err == nil {
		WriteError(w, http.StatusConflict, "A user with this Email or Github ID already exists")
		return
	}

	user := models.User{
		Email:     req.Email,
		GithubID:  req.GithubID,
		CreatedAt: time.Now(),
	}

	if err := db.DB.Create(&user).Error; err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to create user account")
		return
	}

	if err := setAuthCookie(w, user); err != nil {
		WriteError(w, http.StatusInternalServerError, "Account created, but failed to log in")
		return
	}

	WriteJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Registration successful",
		"user": map[string]string{
			"id":        user.ID,
			"email":     user.Email,
			"github_id": user.GithubID,
		},
	})
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	if req.Identifier == "" {
		WriteError(w, http.StatusBadRequest, "Email or Github ID is required to login")
		return
	}

	var user models.User
	if err := db.DB.Where("email = ? OR github_id = ?", req.Identifier, req.Identifier).First(&user).Error; err != nil {
		WriteError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if err := setAuthCookie(w, user); err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to generate session token")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Login successful",
		"user": map[string]string{
			"id":        user.ID,
			"email":     user.Email,
			"github_id": user.GithubID,
		},
	})
}

func HandleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "dploy_session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("dploy_session")
		if err != nil {
			WriteError(w, http.StatusUnauthorized, "Missing session cookie")
			return
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			WriteError(w, http.StatusInternalServerError, "JWT_SECRET not set")
			return
		}

		token, err := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, http.ErrNotSupported
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			WriteError(w, http.StatusUnauthorized, "Invalid or expired session")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			WriteError(w, http.StatusUnauthorized, "Invalid token payload")
			return
		}

		userID, _ := claims["sub"].(string)
		if userID == "" {
			WriteError(w, http.StatusUnauthorized, "User ID not found in token")
			return
		}

		ctx := context.WithValue(r.Context(), ContextUserID, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func GetUserID(r *http.Request) string {
	if id, ok := r.Context().Value(ContextUserID).(string); ok {
		return id
	}
	return ""
}
