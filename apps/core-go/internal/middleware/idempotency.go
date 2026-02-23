package middleware

import (
	"sync"
	"time"

	"github.com/courierx/core-go/internal/types"
)

// IdempotencyStore is a thread-safe in-memory cache for send responses,
// keyed by the caller-supplied idempotency key.
// Entries expire after the configured TTL (default 24h).
//
// For multi-instance deployments, replace this with a Redis-backed store.
type IdempotencyStore struct {
	store sync.Map
	ttl   time.Duration
}

type idempotencyEntry struct {
	response types.SendResponse
	expires  time.Time
}

// NewIdempotencyStore creates a store with the given TTL (seconds).
func NewIdempotencyStore(ttlSeconds int) *IdempotencyStore {
	if ttlSeconds <= 0 {
		ttlSeconds = 86400
	}
	s := &IdempotencyStore{ttl: time.Duration(ttlSeconds) * time.Second}
	// Background reaper — clears expired entries every 10 minutes
	go s.reap()
	return s
}

// Get returns the cached response for key, or (nil, false) if not found / expired.
func (s *IdempotencyStore) Get(key string) (*types.SendResponse, bool) {
	if key == "" {
		return nil, false
	}
	val, ok := s.store.Load(key)
	if !ok {
		return nil, false
	}
	entry := val.(*idempotencyEntry)
	if time.Now().After(entry.expires) {
		s.store.Delete(key)
		return nil, false
	}
	resp := entry.response
	resp.Idempotent = true
	return &resp, true
}

// Set stores the response under key for the configured TTL.
func (s *IdempotencyStore) Set(key string, resp types.SendResponse) {
	if key == "" {
		return
	}
	s.store.Store(key, &idempotencyEntry{
		response: resp,
		expires:  time.Now().Add(s.ttl),
	})
}

func (s *IdempotencyStore) reap() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		s.store.Range(func(k, v interface{}) bool {
			if now.After(v.(*idempotencyEntry).expires) {
				s.store.Delete(k)
			}
			return true
		})
	}
}
