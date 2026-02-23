// Package metrics provides lightweight, lock-free counters for the Core service.
// Counters are exposed at GET /metrics as JSON.
// To wire Prometheus: drop these values into a Gauge/Counter collector in main.go.
package metrics

import (
	"sync"
	"sync/atomic"
	"time"
)

// Metrics holds all service-level counters and per-provider stats.
type Metrics struct {
	// Global send counters
	SendsTotal   atomic.Int64
	SendsSuccess atomic.Int64
	SendsFailed  atomic.Int64

	// Batch counters
	BatchTotal   atomic.Int64
	BatchSuccess atomic.Int64
	BatchFailed  atomic.Int64

	// Template cache
	TemplateCacheHits   atomic.Int64
	TemplateCacheMisses atomic.Int64

	// Idempotency
	IdempotentHits atomic.Int64

	// Per-provider stats (provider name → *providerStat)
	providers sync.Map
}

type providerStat struct {
	mu         sync.Mutex
	success    int64
	failed     int64
	latencySum int64 // sum of latency in ms
	latencyN   int64 // sample count
}

// New returns an initialised Metrics instance.
func New() *Metrics {
	return &Metrics{}
}

// RecordSend updates global and per-provider counters after each send attempt.
func (m *Metrics) RecordSend(provider string, success bool, latencyMs int64) {
	m.SendsTotal.Add(1)

	stat := m.providerStat(provider)
	stat.mu.Lock()
	defer stat.mu.Unlock()

	if success {
		m.SendsSuccess.Add(1)
		stat.success++
	} else {
		m.SendsFailed.Add(1)
		stat.failed++
	}

	stat.latencySum += latencyMs
	stat.latencyN++
}

// RecordBatch updates batch-level counters.
func (m *Metrics) RecordBatch(successCount, failureCount int) {
	m.BatchTotal.Add(1)
	if failureCount == 0 {
		m.BatchSuccess.Add(1)
	} else if successCount == 0 {
		m.BatchFailed.Add(1)
	}
}

// RecordTemplateCache increments hit or miss counters.
func (m *Metrics) RecordTemplateCache(hit bool) {
	if hit {
		m.TemplateCacheHits.Add(1)
	} else {
		m.TemplateCacheMisses.Add(1)
	}
}

// RecordIdempotentHit increments the idempotency cache counter.
func (m *Metrics) RecordIdempotentHit() {
	m.IdempotentHits.Add(1)
}

// Snapshot returns a JSON-serialisable snapshot of all metrics.
func (m *Metrics) Snapshot() map[string]interface{} {
	snap := map[string]interface{}{
		"sends": map[string]int64{
			"total":   m.SendsTotal.Load(),
			"success": m.SendsSuccess.Load(),
			"failed":  m.SendsFailed.Load(),
		},
		"batch": map[string]int64{
			"total":   m.BatchTotal.Load(),
			"success": m.BatchSuccess.Load(),
			"failed":  m.BatchFailed.Load(),
		},
		"template_cache": map[string]int64{
			"hits":   m.TemplateCacheHits.Load(),
			"misses": m.TemplateCacheMisses.Load(),
		},
		"idempotent_hits": m.IdempotentHits.Load(),
		"timestamp":       time.Now().UTC().Format(time.RFC3339),
	}

	providers := map[string]interface{}{}
	m.providers.Range(func(k, v interface{}) bool {
		name := k.(string)
		stat := v.(*providerStat)
		stat.mu.Lock()
		defer stat.mu.Unlock()

		var avgLatency float64
		if stat.latencyN > 0 {
			avgLatency = float64(stat.latencySum) / float64(stat.latencyN)
		}
		providers[name] = map[string]interface{}{
			"success":       stat.success,
			"failed":        stat.failed,
			"avg_latency_ms": avgLatency,
		}
		return true
	})
	snap["providers"] = providers

	return snap
}

func (m *Metrics) providerStat(name string) *providerStat {
	val, _ := m.providers.LoadOrStore(name, &providerStat{})
	return val.(*providerStat)
}
