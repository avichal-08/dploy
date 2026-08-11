package api_test

import (
	"net/http"
	"testing"

	"github.com/avichal-08/dploy/internal/api"
	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
	"github.com/avichal-08/dploy/internal/testutils"
	"github.com/stretchr/testify/require"
)

func TestHandleRegister(t *testing.T) {
	testutils.SetupTestDB()
	defer testutils.TeardownTestDB()

	t.Run("Successfully Registers User", func(t *testing.T) {
		payload := map[string]string{
			"email":       "newdev@dploy.io",
			"password":    "securepass123",
			"invite_code": "dploy-test-invite",
		}
		req, rr := testutils.MakeJSONRequest("POST", "/api/auth/register", payload)

		api.HandleRegister(rr, req)

		require.Equal(t, http.StatusCreated, rr.Code)

		var user models.User
		err := db.DB.Where("email = ?", "newdev@dploy.io").First(&user).Error
		require.NoError(t, err)
		require.NotEmpty(t, user.ID)

		cookies := rr.Result().Cookies()
		require.NotEmpty(t, cookies)
		require.Equal(t, "dploy_session", cookies[0].Name)
	})

	t.Run("Rejects Incorrect Invite Code", func(t *testing.T) {
		payload := map[string]string{
			"email":       "hacker@dploy.io",
			"password":    "securepass123",
			"invite_code": "wrong-code",
		}
		req, rr := testutils.MakeJSONRequest("POST", "/api/auth/register", payload)

		api.HandleRegister(rr, req)

		require.Equal(t, http.StatusForbidden, rr.Code)
	})
}
