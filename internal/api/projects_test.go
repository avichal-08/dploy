package api_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/avichal-08/dploy/internal/api"
	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/testutils"
	"github.com/stretchr/testify/require"
)

func TestHandleCreateProject(t *testing.T) {
	testDB := testutils.SetupTestDB()
	defer testutils.TeardownTestDB()

	user := models.User{
		ID:       "00000000-0000-0000-0000-000000000001",
		Email:    "owner@dploy.io",
		Password: "hashedpassword",
	}
	testDB.Create(&user)

	t.Run("Creates Project Successfully", func(t *testing.T) {
		payload := map[string]string{
			"name":           "my-api",
			"repository_url": "https://github.com/dev/my-api",
		}
		req, rr := testutils.MakeJSONRequest("POST", "/api/projects", payload)
		req.AddCookie(testutils.GenerateTestToken(user.ID, user.Email))

		handler := api.AuthMiddleware(http.HandlerFunc(api.HandleCreateProject))
		handler.ServeHTTP(rr, req)

		require.Equal(t, http.StatusCreated, rr.Code)

		var resp map[string]interface{}
		_ = json.NewDecoder(rr.Body).Decode(&resp)
		require.Equal(t, "my-api", resp["Name"])

		var proj models.Project
		require.NoError(t, db.DB.Where("name = ?", "my-api").First(&proj).Error)
		require.Equal(t, user.ID, proj.UserID)
	})
}

func TestHandleGetProjects(t *testing.T) {
	testDB := testutils.SetupTestDB()
	defer testutils.TeardownTestDB()

	user := models.User{
		ID:       "11111111-1111-1111-1111-111111111111",
		Email:    "readonly@dploy.io",
		Password: "hashedpassword",
	}
	testDB.Create(&user)

	testDB.Create(&models.Project{
		ID:            "22222222-2222-2222-2222-222222222222",
		UserID:        user.ID,
		Name:          "frontend-app",
		RepositoryURL: "https://github.com/dev/frontend",
		Status:        "deployed",
	})
	testDB.Create(&models.Project{
		ID:            "33333333-3333-3333-3333-333333333333",
		UserID:        user.ID,
		Name:          "backend-api",
		RepositoryURL: "https://github.com/dev/backend",
		Status:        "deployed",
	})

	t.Run("Successfully Fetches User Projects", func(t *testing.T) {
		req, rr := testutils.MakeJSONRequest("GET", "/api/projects", nil)
		req.AddCookie(testutils.GenerateTestToken(user.ID, user.Email))

		handler := api.AuthMiddleware(http.HandlerFunc(api.HandleGetProjects))
		handler.ServeHTTP(rr, req)

		require.Equal(t, http.StatusOK, rr.Code)

		var resp []map[string]interface{}
		_ = json.NewDecoder(rr.Body).Decode(&resp)

		require.Len(t, resp, 2)

		var projectNames []string
		for _, p := range resp {
			projectNames = append(projectNames, p["Name"].(string))
		}

		require.ElementsMatch(t, []string{"frontend-app", "backend-api"}, projectNames)
	})
}
