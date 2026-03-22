// Package observability wires Prometheus metrics for the CourierX Core service.
//
// Registered metrics
//
//	courierx_sends_total{provider, status}        — Counter
//	courierx_send_duration_seconds{provider}      — Histogram (p50/p95/p99)
//	courierx_batches_total{status}                — Counter
//	courierx_batch_size_total                     — Histogram
//	courierx_idempotent_hits_total                — Counter
//	courierx_template_cache_ops_total{result}     — Counter (hit|miss)
//	courierx_template_cache_size                  — Gauge
//	courierx_failovers_total{from, to}            — Counter
//
// Plus default Go runtime and process collectors (goroutines, GC, memory, CPU).
package observability

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

// Prom holds all registered Prometheus metrics for the service.
type Prom struct {
	SendsTotal        *prometheus.CounterVec
	SendDuration      *prometheus.HistogramVec
	BatchesTotal      *prometheus.CounterVec
	BatchSize         prometheus.Histogram
	IdempotentHits    prometheus.Counter
	TemplateCacheOps  *prometheus.CounterVec
	TemplateCacheSize prometheus.Gauge
	Failovers         *prometheus.CounterVec

	registry *prometheus.Registry
}

// NewProm creates and registers all metrics, then returns the registry.
// Callers should expose the registry via promhttp.HandlerFor(p.Registry(), ...).
func NewProm() *Prom {
	reg := prometheus.NewRegistry()

	p := &Prom{
		SendsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "courierx_sends_total",
			Help: "Total number of email send attempts, partitioned by provider and status.",
		}, []string{"provider", "status"}),

		SendDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "courierx_send_duration_seconds",
			Help:    "End-to-end send latency per provider.",
			Buckets: []float64{.05, .1, .25, .5, 1, 2.5, 5, 10},
		}, []string{"provider"}),

		BatchesTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "courierx_batches_total",
			Help: "Total batch send requests, partitioned by final status.",
		}, []string{"status"}), // "success" | "partial" | "failed"

		BatchSize: prometheus.NewHistogram(prometheus.HistogramOpts{
			Name:    "courierx_batch_size",
			Help:    "Distribution of recipient counts per batch request.",
			Buckets: []float64{1, 5, 10, 25, 50, 100, 250, 500, 1000},
		}),

		IdempotentHits: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "courierx_idempotent_hits_total",
			Help: "Number of requests served from the idempotency cache.",
		}),

		TemplateCacheOps: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "courierx_template_cache_ops_total",
			Help: "Template cache lookups, partitioned by result.",
		}, []string{"result"}), // "hit" | "miss"

		TemplateCacheSize: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "courierx_template_cache_size",
			Help: "Current number of compiled templates in the cache.",
		}),

		Failovers: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "courierx_failovers_total",
			Help: "Provider failover events.",
		}, []string{"from", "to"}),

		registry: reg,
	}

	// Register custom metrics
	reg.MustRegister(
		p.SendsTotal,
		p.SendDuration,
		p.BatchesTotal,
		p.BatchSize,
		p.IdempotentHits,
		p.TemplateCacheOps,
		p.TemplateCacheSize,
		p.Failovers,
	)

	// Register default Go runtime + process collectors
	reg.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)

	return p
}

// Registry returns the underlying Prometheus registry (for promhttp.HandlerFor).
func (p *Prom) Registry() *prometheus.Registry {
	return p.registry
}

// RecordSend updates send counters and the latency histogram.
func (p *Prom) RecordSend(provider string, success bool, latencySeconds float64) {
	status := "success"
	if !success {
		status = "failed"
	}
	p.SendsTotal.WithLabelValues(provider, status).Inc()
	p.SendDuration.WithLabelValues(provider).Observe(latencySeconds)
}

// RecordBatch updates batch counters.
func (p *Prom) RecordBatch(total, successCount, failureCount int) {
	p.BatchSize.Observe(float64(total))
	switch {
	case failureCount == 0:
		p.BatchesTotal.WithLabelValues("success").Inc()
	case successCount == 0:
		p.BatchesTotal.WithLabelValues("failed").Inc()
	default:
		p.BatchesTotal.WithLabelValues("partial").Inc()
	}
}

// RecordIdempotentHit increments the idempotency counter.
func (p *Prom) RecordIdempotentHit() {
	p.IdempotentHits.Inc()
}

// RecordTemplateCache increments the cache hit or miss counter and updates the gauge.
func (p *Prom) RecordTemplateCache(hit bool, cacheSize int) {
	if hit {
		p.TemplateCacheOps.WithLabelValues("hit").Inc()
	} else {
		p.TemplateCacheOps.WithLabelValues("miss").Inc()
	}
	p.TemplateCacheSize.Set(float64(cacheSize))
}

// RecordFailover records a provider failover event.
func (p *Prom) RecordFailover(from, to string) {
	p.Failovers.WithLabelValues(from, to).Inc()
}
