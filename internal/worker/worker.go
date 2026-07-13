package worker

import (
	"context"
	"os"

	"github.com/redis/go-redis/v9"
)

type RedisLogWriter struct {
	Ctx     context.Context
	Client  *redis.Client
	Channel string
}

func (w *RedisLogWriter) Write(p []byte) (n int, err error) {
	w.Client.Publish(w.Ctx, w.Channel, string(p))
	os.Stdout.Write(p)
	return len(p), nil
}
