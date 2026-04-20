package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/courierx/core-go/internal/types"
	"github.com/redis/go-redis/v9"
)

// IdempotencyStore is a thread-safe cache for send responses, keyed by the
// caller-supplied idempotency key.
//
// When a Redis URL is provided at construction the store is Redis-backed and
// safe for multi-replica deployments. Without Redis it falls back to a local
// sync.Map so single-instance deployments continue to work without Redis.
type IdempotencyStore struct {
	redis  *redis.Client
	local  sync.Map
	ttl    time.Duration
	useRed bool
}

type idempotencyEntry struct {
	response types.SendResponse
	expires  time.Time
}

// NewIdempotencyStore creates a store with the given TTL (seconds).
// If redisURL is non-empty the store uses Redis; otherwise it falls back to
// a local in-memory map that is NOT shared across process replicas.
func NewIdempotencyStore(ttlSeconds int, redisURL string) *IdempotencyStore {
	if ttlSeconds <= 0 {
		ttlSeconds = 86400
	}
	ttl := time.Duration(ttlSeconds) * time.Second
	s := &IdempotencyStore{ttl: ttl}

	if redisURL != "" {
		opts, err := redis.ParseURL(redisURL)
		if err != nil {
			slog.Warn("idempotency: invalid Redis URL, falling back to in-memory store", "error", err)
		} else {
			s.redis = redis.NewClient(opts)
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			if err := s.redis.Ping(ctx).Err(); err != nil {
				slog.Warn("idempotency: Redis unreachable, falling back to in-memory store", "error", err)
				_ = s.redis.Close()
				s.redis = nil
			} else {
				s.useRed = true
				slog.Info("idempotency: using Redis-backed store")
			}
		}
	}

	if !s.useRed {
		slog.Warn("idempotency: using in-memory store — not safe for multi-replica deployments; set REDIS_URL to enable Redis")
		go s.reap()
	}

	return s
}

const redisKeyPrefix = "idem:"

// Get returns the cached response for key, or (nil, false) if not found / expired.
func (s *IdempotencyStore) Get(key string) (*types.SendResponse, bool) {
	if key == "" {
		return nil, false
	}

	if s.useRed {
		return s.redisGet(key)
	}
	return s.localGet(key)
}

// Set stores the response under key for the configured TTL.
func (s *IdempotencyStore) Set(key string, resp types.SendResponse) {
	if key == "" {
		return
	}
	if s.useRed {
		s.redisSet(key, resp)
	} else {
		s.localSet(key, resp)
	}
}

// — Redis backend —

func (s *IdempotencyStore) redisGet(key string) (*types.SendResponse, bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	val, err := s.redis.Get(ctx, redisKeyPrefix+key).Bytes()
	if err != nil {
		if err != redis.Nil {
			slog.Warn("idempotency: Redis GET error", "key", key, "error", err)
		}
		return nil, false
	}

	var resp types.SendResponse
	if err := json.Unmarshal(val, &resp); err != nil {
		slog.Warn("idempotency: unmarshal error", "key", key, "error", err)
		return nil, false
	}
	resp.Idempotent = true
	return &resp, true
}

func (s *IdempotencyStore) redisSet(key string, resp types.SendResponse) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	b, err := json.Marshal(resp)
	if err != nil {
		slog.Warn("idempotency: marshal error", "key", key, "error", err)
		return
	}
	if err := s.redis.Set(ctx, redisKeyPrefix+key, b, s.ttl).Err(); err != nil {
		slog.Warn("idempotency: Redis SET error", "key", key, "error", err)
	}
}

// — Local in-memory fallback —

func (s *IdempotencyStore) localGet(key string) (*types.SendResponse, bool) {
	val, ok := s.local.Load(key)
	if !ok {
		return nil, false
	}
	entry := val.(*idempotencyEntry)
	if time.Now().After(entry.expires) {
		s.local.Delete(key)
		return nil, false
	}
	resp := entry.response
	resp.Idempotent = true
	return &resp, true
}

func (s *IdempotencyStore) localSet(key string, resp types.SendResponse) {
	s.local.Store(key, &idempotencyEntry{
		response: resp,
		expires:  time.Now().Add(s.ttl),
	})
}

func (s *IdempotencyStore) reap() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		s.local.Range(func(k, v interface{}) bool {
			if now.After(v.(*idempotencyEntry).expires) {
				s.local.Delete(k)
			}
			return true
		})
	}
}

// Close releases the Redis connection if one is held.
func (s *IdempotencyStore) Close() error {
	if s.redis != nil {
		return s.redis.Close()
	}
	return nil
}

// String returns a short description of the backend for diagnostics.
func (s *IdempotencyStore) String() string {
	if s.useRed {
		return fmt.Sprintf("redis (ttl=%s)", s.ttl)
	}
	return fmt.Sprintf("in-memory (ttl=%s)", s.ttl)
}
