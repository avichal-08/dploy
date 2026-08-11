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
