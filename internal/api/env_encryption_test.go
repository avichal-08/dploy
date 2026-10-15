package api_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/avichal-08/dploy/internal/api"
	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/secrets"
	"github.com/avichal-08/dploy/internal/testutils"
	"github.com/stretchr/testify/require"
)

func TestEnvValuesAreEncryptedAtRest(t *testing.T) {
	testDB := testutils.SetupTestDB()
	defer testutils.TeardownTestDB()

	t.Setenv("ENV_ENCRYPTION_KEY", "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
	require.NoError(t, secrets.Init())
	t.Cleanup(func() {
		t.Setenv("ENV_ENCRYPTION_KEY", "")
		_ = secrets.Init()
	})

	user := models.User{ID: "00000000-0000-0000-0000-0000000000c3", Email: "crypto@dploy.io", Password: "x"}
	require.NoError(t, testDB.Create(&user).Error)
	project := models.Project{UserID: user.ID, Name: "crypto-app", RepositoryURL: "https://github.com/acme/crypto-app", WebhookSecret: "s"}
	require.NoError(t, testDB.Create(&project).Error)

	call := func(method string, body any, handler http.HandlerFunc, path map[string]string) (int, string) {
		req, rr := testutils.MakeJSONRequest(method, "/api/x", body)
		for k, v := range path {
			req.SetPathValue(k, v)
		}
		req.AddCookie(testutils.GenerateTestToken(user.ID, user.Email))
		api.AuthMiddleware(handler).ServeHTTP(rr, req)
		return rr.Code, rr.Body.String()
	}

	rawValue := func(key string) string {
		var v string
		require.NoError(t, db.DB.Raw("SELECT value FROM project_envs WHERE project_id = ? AND key = ?", project.ID, key).Row().Scan(&v))
		return v
	}

	code, body := call("POST", []map[string]string{{"key": "DATABASE_URL", "value": "postgres://user:hunter2@db/app"}}, api.HandleCreateEnvs, map[string]string{"id": project.ID})
	require.Equal(t, http.StatusCreated, code, body)

	stored := rawValue("DATABASE_URL")
	require.True(t, strings.HasPrefix(stored, secrets.Prefix), stored)
	require.NotContains(t, stored, "hunter2")

	code, body = call("GET", nil, api.HandleGetEnvs, map[string]string{"id": project.ID})
	require.Equal(t, http.StatusOK, code, body)
	var envs []map[string]any
	require.NoError(t, json.Unmarshal([]byte(body), &envs))
	require.Len(t, envs, 1)
	require.Equal(t, "postgres://user:hunter2@db/app", envs[0]["Value"])

	code, body = call("PUT", map[string]string{"key": "DATABASE_URL", "value": "rotated-secret"}, api.HandleUpdateEnv, map[string]string{"envId": envs[0]["ID"].(string)})
	require.Equal(t, http.StatusOK, code, body)
	require.NotContains(t, rawValue("DATABASE_URL"), "rotated-secret")

	require.NoError(t, db.DB.Exec("INSERT INTO project_envs (project_id, key, value) VALUES (?, 'LEGACY', 'plain-old-value')", project.ID).Error)
	n, err := db.EncryptPlaintextEnvs()
	require.NoError(t, err)
	require.Equal(t, 1, n)
	require.True(t, strings.HasPrefix(rawValue("LEGACY"), secrets.Prefix))

	var loaded []models.ProjectEnv
	require.NoError(t, db.DB.Where("project_id = ?", project.ID).Order("key").Find(&loaded).Error)
	require.Equal(t, "rotated-secret", loaded[0].Value)
	require.Equal(t, "plain-old-value", loaded[1].Value)
}
