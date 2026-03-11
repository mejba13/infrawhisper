package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

type bucket struct {
	tokens   float64
	lastSeen time.Time
	mu       sync.Mutex
}

type RateLimiter struct {
	buckets  sync.Map
	rate     float64
	capacity float64
}

func NewRateLimiter(rps float64, capacity float64) *RateLimiter {
	return &RateLimiter{rate: rps, capacity: capacity}
}

func (rl *RateLimiter) Allow(key string) bool {
	v, _ := rl.buckets.LoadOrStore(key, &bucket{tokens: rl.capacity, lastSeen: time.Now()})
	b := v.(*bucket)
	b.mu.Lock()
	defer b.mu.Unlock()
	now := time.Now()
	elapsed := now.Sub(b.lastSeen).Seconds()
	b.tokens = minFloat(rl.capacity, b.tokens+elapsed*rl.rate)
	b.lastSeen = now
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

func RateLimit(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.RemoteAddr
			if claims, ok := auth.ClaimsFromCtx(r.Context()); ok {
				key = claims.TenantID
			}
			if !limiter.Allow(key) {
				http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
