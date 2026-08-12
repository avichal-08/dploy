package testutils

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"time"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func SetupTestDB() *gorm.DB {
	os.Setenv("JWT_SECRET", "test-jwt-secret-key-12345")
	os.Setenv("INVITE_CODE", "dploy-test-invite")

	if err := godotenv.Load("../../.env.local"); err != nil {
		panic("no .env file found")
	}

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		panic("no db test url")
	}

	testDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to Neon test branch: " + err.Error())
	}

	db.DB = testDB
	return testDB
}

func TeardownTestDB() {
	if db.DB != nil {
		db.DB.Exec("TRUNCATE TABLE replicas, deployments, project_envs, projects, users CASCADE")
	}
}

func GenerateTestToken(userID string, email string) *http.Cookie {
	secret := []byte(os.Getenv("JWT_SECRET"))
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString(secret)

	return &http.Cookie{
		Name:  "dploy_session",
		Value: tokenStr,
	}
}

func MakeJSONRequest(method, url string, body interface{}) (*http.Request, *httptest.ResponseRecorder) {
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}

	req := httptest.NewRequest(method, url, &buf)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	return req, rr
}
