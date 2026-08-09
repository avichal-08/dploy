package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type UserContextKey string

const ContextUserID UserContextKey = "userID"

type AuthPayload struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	InviteCode string `json:"invite_code,omitempty"`
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

	isProd := os.Getenv("ENV") == "production"

	http.SetCookie(w, &http.Cookie{
		Name:     "dploy_session",
		Value:    tokenString,
		Path:     "/",
		HttpOnly: true,
		Secure:   isProd,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   60 * 60 * 24 * 7,
	})

	return nil
}

func HandleRegister(w http.ResponseWriter, r *http.Request) {
	var payload AuthPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	payload.Email = strings.ToLower(strings.TrimSpace(payload.Email))

	if payload.Email == "" || payload.Password == "" {
		WriteError(w, http.StatusBadRequest, "Email and Password are required")
		return
	}

	requiredCode := os.Getenv("INVITE_CODE")
	if requiredCode != "" && payload.InviteCode != requiredCode {
		WriteError(w, http.StatusForbidden, "Invalid invite code. Registration is restricted.")
		return
	}

	var count int64
	db.DB.Model(&models.User{}).Where("email = ?", payload.Email).Count(&count)
	if count > 0 {
		WriteError(w, http.StatusConflict, "A user with this Email already exists")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to secure password")
		return
	}

	user := models.User{
		Email:    payload.Email,
		Password: string(hashedPassword),
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
			"id":    user.ID,
			"email": user.Email,
		},
	})
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	var payload AuthPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	payload.Email = strings.ToLower(strings.TrimSpace(payload.Email))

	if payload.Email == "" || payload.Password == "" {
		WriteError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	var user models.User
	if err := db.DB.Where("email = ?", payload.Email).First(&user).Error; err != nil {
		WriteError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(payload.Password)); err != nil {
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
			"id":    user.ID,
			"email": user.Email,
		},
	})
}

func HandleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "dploy_session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   os.Getenv("ENV") == "production",
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
