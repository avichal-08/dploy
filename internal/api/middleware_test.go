package api_test

import (
	"net/http"
	"testing"

	"github.com/avichal-08/dploy/internal/api"
	"github.com/avichal-08/dploy/internal/testutils"
	"github.com/stretchr/testify/require"
)

func TestAuthMiddleware(t *testing.T) {
	testutils.SetupTestDB()
	defer testutils.TeardownTestDB()

	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := api.GetUserID(r)
		require.Equal(t, "user-uuid-123", userID)
		w.WriteHeader(http.StatusOK)
	})

	protectedHandler := api.AuthMiddleware(dummyHandler)

	t.Run("Rejects missing authentication cookie", func(t *testing.T) {
		req, rr := testutils.MakeJSONRequest("GET", "/api/projects", nil)
		protectedHandler.ServeHTTP(rr, req)

		require.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("Accepts valid JWT cookie and injects context", func(t *testing.T) {
		req, rr := testutils.MakeJSONRequest("GET", "/api/projects", nil)
		cookie := testutils.GenerateTestToken("user-uuid-123", "dev@dploy.io")
		req.AddCookie(cookie)

		protectedHandler.ServeHTTP(rr, req)

		require.Equal(t, http.StatusOK, rr.Code)
	})
}
