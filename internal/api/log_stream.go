package api

import (
	"context"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: allowedWebSocketOrigin,
}

func allowedWebSocketOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins == "" {
		origins = "http://localhost:3000"
	}
	for _, allowed := range strings.Split(origins, ",") {
		if allowed = strings.TrimSpace(allowed); allowed != "" && strings.EqualFold(allowed, origin) {
			return true
		}
	}
	return false
}

type LogSubscriber interface {
	Subscribe(ctx context.Context, channelName string) (<-chan string, func() error, error)
}

func HandleLogStream(subscriber LogSubscriber) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		deploymentID := r.PathValue("id")
		if deploymentID == "" {
			WriteError(w, http.StatusBadRequest, "Deployment ID is required")
			return
		}

		if _, _, ok := findOwnedDeployment(deploymentID, GetUserID(r)); !ok {
			WriteError(w, http.StatusNotFound, "Deployment not found")
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		ctx := context.Background()
		channelName := "logs:" + deploymentID

		msgChan, closeSub, err := subscriber.Subscribe(ctx, channelName)
		if err != nil {
			conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "Failed to connect to log stream"))
			return
		}
		defer closeSub()

		for msg := range msgChan {
			if msg == "EOF_BUILD_COMPLETE" {
				conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Deployment Complete"))
				break
			}

			err := conn.WriteMessage(websocket.TextMessage, []byte(msg))
			if err != nil {
				break
			}
		}
	}
}
