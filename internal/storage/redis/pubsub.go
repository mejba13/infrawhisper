package redis

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

func (c *Client) Publish(ctx context.Context, channel string, payload any) error {
	if err := c.rdb.Publish(ctx, channel, payload).Err(); err != nil {
		return fmt.Errorf("redis publish %s: %w", channel, err)
	}
	return nil
}

func (c *Client) Subscribe(ctx context.Context, channels ...string) *redis.PubSub {
	return c.rdb.Subscribe(ctx, channels...)
}
