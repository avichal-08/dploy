package pubsub

import (
	"context"

	"github.com/redis/go-redis/v9"
)

type RedisSubscriber struct {
	Client *redis.Client
}

func (r *RedisSubscriber) Subscribe(ctx context.Context, channelName string) (<-chan string, func() error, error) {
	pubsub := r.Client.Subscribe(ctx, channelName)

	msgChan := make(chan string)

	go func() {
		defer close(msgChan)
		for msg := range pubsub.Channel() {
			msgChan <- msg.Payload
		}
	}()

	closeFunc := func() error {
		return pubsub.Close()
	}

	return msgChan, closeFunc, nil
}
