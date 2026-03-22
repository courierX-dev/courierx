package providers

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"time"

	"github.com/courierx/core-go/internal/types"
)

// RouterRecorder is implemented by observability.Prom. Keeping it as an
// interface lets the router stay decoupled from the Prometheus package.
type RouterRecorder interface {
	RecordSend(provider string, success bool, latencySeconds float64)
	RecordFailover(from, to string)
}

// Router selects providers and performs automatic failover.
type Router struct {
	routes   []types.Route // sorted by Priority ascending
	recorder RouterRecorder
}

// NewRouter creates a Router with the given provider routes and optional recorder.
func NewRouter(routes []types.Route, recorder RouterRecorder) *Router {
	sorted := make([]types.Route, len(routes))
	copy(sorted, routes)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Priority < sorted[j].Priority
	})
	return &Router{routes: sorted, recorder: recorder}
}

// Send attempts to deliver the email through the route chain.
// On transient / rate-limit errors it advances to the next provider.
// On permanent errors it stops immediately.
func (r *Router) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	if len(r.routes) == 0 {
		return nil, fmt.Errorf("no provider routes configured")
	}

	var lastErr error

	for i, route := range r.routes {
		providerName := string(route.Provider.Type)

		provider, err := NewProvider(route.Provider)
		if err != nil {
			slog.Error("failed to create provider", "provider", providerName, "error", err)
			lastErr = err
			continue
		}

		start := time.Now()
		resp, err := provider.Send(ctx, req)
		latencySec := time.Since(start).Seconds()

		if err == nil {
			if r.recorder != nil {
				r.recorder.RecordSend(providerName, true, latencySec)
			}
			resp.DurationMs = int64(latencySec * 1000)
			if i > 0 {
				slog.Info("sent via fallback provider",
					"provider", providerName,
					"latency_ms", resp.DurationMs)
			}
			return resp, nil
		}

		// Record failure
		if r.recorder != nil {
			r.recorder.RecordSend(providerName, false, latencySec)
		}

		classification := ClassifyError(err)
		slog.Warn("provider send failed",
			"provider", providerName,
			"classification", string(classification),
			"error", err)
		lastErr = err

		// Permanent errors — stop immediately
		if classification == ErrorPermanent {
			return nil, fmt.Errorf("permanent error from %s: %w", providerName, err)
		}

		// Transient / rate-limit — try next provider
		if i < len(r.routes)-1 {
			nextProvider := string(r.routes[i+1].Provider.Type)
			slog.Info("failing over to next provider",
				"from", providerName,
				"to", nextProvider)
			if r.recorder != nil {
				r.recorder.RecordFailover(providerName, nextProvider)
			}
		}
	}

	return nil, fmt.Errorf("all providers failed, last error: %w", lastErr)
}
