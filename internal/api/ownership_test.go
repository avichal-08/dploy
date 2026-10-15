package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/avichal-08/dploy/internal/api"
	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/testutils"
	"github.com/stretchr/testify/require"
)

func TestOwnershipIsEnforced(t *testing.T) {
	testDB := testutils.SetupTestDB()
	defer testutils.TeardownTestDB()

	owner := models.User{ID: "00000000-0000-0000-0000-0000000000a1", Email: "owner@dploy.io", Password: "x"}
	intruder := models.User{ID: "00000000-0000-0000-0000-0000000000b2", Email: "intruder@dploy.io", Password: "x"}
	require.NoError(t, testDB.Create(&owner).Error)
	require.NoError(t, testDB.Create(&intruder).Error)

	project := models.Project{
		UserID:        owner.ID,
		Name:          "owned-app",
		RepositoryURL: "https://github.com/acme/owned-app",
		Status:        "deployed",
		WebhookSecret: "owner-secret",
	}
	require.NoError(t, testDB.Create(&project).Error)

	env := models.ProjectEnv{ProjectID: project.ID, Key: "API_KEY", Value: "owner-value"}
	require.NoError(t, testDB.Create(&env).Error)

	deployment := models.Deployment{ProjectID: project.ID, CommitSHA: "abc123", Status: "success"}
	require.NoError(t, testDB.Create(&deployment).Error)

	call := func(user models.User, method, url string, body any, handler http.HandlerFunc, path map[string]string) *httptest.ResponseRecorder {
		req, rr := testutils.MakeJSONRequest(method, url, body)
		for k, v := range path {
			req.SetPathValue(k, v)
		}
		req.AddCookie(testutils.GenerateTestToken(user.ID, user.Email))
		api.AuthMiddleware(handler).ServeHTTP(rr, req)
		return rr
	}

	byProject := map[string]string{"id": project.ID}
	byDeployment := map[string]string{"id": deployment.ID}
	byEnv := map[string]string{"envId": env.ID}

	intruderCases := []struct {
		name    string
		method  string
		url     string
		body    any
		handler http.HandlerFunc
		path    map[string]string
	}{
		{"get project", "GET", "/api/project/x", nil, api.HandleGetProject, byProject},
		{"delete project", "DELETE", "/api/project/x", nil, api.HandleDeleteProject, byProject},
		{"rename project", "PATCH", "/api/projects/x/name", map[string]string{"name": "stolen-name"}, api.HandleDomainNameUpdate, byProject},
		{"set custom domain", "PATCH", "/api/projects/x/custom-domain", map[string]string{"custom_domain": "evil.example.com"}, api.HandleUpdateCustomDomain, byProject},
		{"list envs", "GET", "/api/projects/x/envs", nil, api.HandleGetEnvs, byProject},
		{"create envs", "POST", "/api/projects/x/envs", []map[string]string{{"key": "INJECTED", "value": "1"}}, api.HandleCreateEnvs, byProject},
		{"update env", "PUT", "/api/envs/x", map[string]string{"key": "API_KEY", "value": "stolen"}, api.HandleUpdateEnv, byEnv},
		{"delete env", "DELETE", "/api/envs/x", nil, api.HandleDeleteEnv, byEnv},
		{"metrics", "GET", "/api/projects/x/metrics", nil, api.HandleGetProjectMetrics, byProject},
		{"webhook secret", "GET", "/api/projects/x/webhook", nil, api.HandleGetWebhook, byProject},
		{"rotate webhook secret", "POST", "/api/projects/x/webhook/rotate", nil, api.HandleRotateWebhookSecret, byProject},
		{"create deployment", "POST", "/api/deployments", map[string]string{"project_id": project.ID}, api.HandleCreateDeployment(nil), nil},
		{"get deployment", "GET", "/api/deployments/x", nil, api.HandleGetDeployment, byDeployment},
		{"rollback", "POST", "/api/deployments/x/rollback", nil, api.HandleRollback, byDeployment},
		{"runtime logs", "GET", "/api/deployments/x/logs/runtime", nil, api.HandleGetRuntimeLogs, byDeployment},
		{"build log stream", "GET", "/api/deployments/x/logs", nil, api.HandleLogStream(nil), byDeployment},
	}

	for _, tc := range intruderCases {
		t.Run("intruder cannot "+tc.name, func(t *testing.T) {
			rr := call(intruder, tc.method, tc.url, tc.body, tc.handler, tc.path)
			require.Equal(t, http.StatusNotFound, rr.Code, rr.Body.String())
			require.NotContains(t, rr.Body.String(), "owner-secret")
			require.NotContains(t, rr.Body.String(), "owner-value")
		})
	}

	t.Run("owner data is untouched", func(t *testing.T) {
		var p models.Project
		require.NoError(t, db.DB.First(&p, "id = ?", project.ID).Error)
		require.Equal(t, "owned-app", p.Name)
		require.Nil(t, p.CustomDomain)
		require.Equal(t, "owner-secret", p.WebhookSecret)

		var envs []models.ProjectEnv
		require.NoError(t, db.DB.Where("project_id = ?", project.ID).Find(&envs).Error)
		require.Len(t, envs, 1)
		require.Equal(t, "owner-value", envs[0].Value)

		var deployments int64
		db.DB.Model(&models.Deployment{}).Where("project_id = ?", project.ID).Count(&deployments)
		require.EqualValues(t, 1, deployments)
	})

	ownerCases := []struct {
		name    string
		url     string
		handler http.HandlerFunc
		path    map[string]string
	}{
		{"get project", "/api/project/x", api.HandleGetProject, byProject},
		{"list envs", "/api/projects/x/envs", api.HandleGetEnvs, byProject},
		{"metrics", "/api/projects/x/metrics", api.HandleGetProjectMetrics, byProject},
		{"webhook secret", "/api/projects/x/webhook", api.HandleGetWebhook, byProject},
		{"get deployment", "/api/deployments/x", api.HandleGetDeployment, byDeployment},
	}

	for _, tc := range ownerCases {
		t.Run("owner can "+tc.name, func(t *testing.T) {
			rr := call(owner, "GET", tc.url, nil, tc.handler, tc.path)
			require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
		})
	}

	t.Run("owner can update own env", func(t *testing.T) {
		rr := call(owner, "PUT", "/api/envs/x", map[string]string{"key": "API_KEY", "value": "rotated"}, api.HandleUpdateEnv, byEnv)
		require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	})
}
