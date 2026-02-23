// Package ratelimit provides a per-provider token-bucket rate limiter.
// Each provider gets its own bucket filled at the configured rate (tokens/sec).
// Usage:
//
//	rl := ratelimit.New(1000) // 1000 sends/sec per provider
//	if !rl.Allow("sendgrid") { ... }
package ratelimit

import (
	"sync"
	"time"
)

// Limiter manages a token-bucket per provider name.
type Limiter struct {
	rate    float64 // tokens added per second
	buckets sync.Map
}

// New returns a Limiter that allows up to ratePerSec sends/sec per provider.
// Pass 0 to disable rate limiting.
func New(ratePerSec int) *Limiter {
	return &Limiter{rate: float64(ratePerSec)}
}

// Allow returns true if a send for the given provider is within the rate limit.
// It always returns true when the configured rate is 0.
func (l *Limiter) Allow(provider string) bool {
	if l.rate <= 0 {
		return true
	}
	b := l.bucket(provider)
	return b.consume()
}

// — internal —

type bucket struct {
	mu       sync.Mutex
	tokens   float64
	max      float64
	rate     float64 // tokens per second
	lastFill time.Time
}

func (b *bucket) consume() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(b.lastFill).Seconds()
	b.tokens += elapsed * b.rate
	if b.tokens > b.max {
		b.tokens = b.max
	}
	b.lastFill = now

	if b.tokens >= 1.0 {
		b.tokens--
		return true
	}
	return false
}

func (l *Limiter) bucket(name string) *bucket {
	val, loaded := l.buckets.Load(name)
	if loaded {
		return val.(*bucket)
	}
	b := &bucket{
		tokens:   l.rate, // start full
		max:      l.rate,
		rate:     l.rate,
		lastFill: time.Now(),
	}
	actual, _ := l.buckets.LoadOrStore(name, b)
	return actual.(*bucket)
}
