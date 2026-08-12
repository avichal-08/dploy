package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/avichal-08/dploy/internal/api"
	"github.com/avichal-08/dploy/internal/testutils"
)

func BenchmarkAuthMiddleware(b *testing.B) {
	testutils.SetupTestDB()
	defer testutils.TeardownTestDB()

	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	protectedHandler := api.AuthMiddleware(dummyHandler)

	req, _ := testutils.MakeJSONRequest("GET", "/api/projects", nil)
	req.AddCookie(testutils.GenerateTestToken("user-123", "bench@dploy.io"))

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		protectedHandler.ServeHTTP(rr, req)
	}
}
