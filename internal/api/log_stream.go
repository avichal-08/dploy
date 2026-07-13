package api

import (
	"context"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
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
