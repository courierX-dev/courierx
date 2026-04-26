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
	providers []Provider // instantiated at construction, sorted by priority
	recorder  RouterRecorder
}

// NewRouter creates a Router with providers instantiated upfront from the given
// routes. Pre-instantiation reuses http.Client connection pools across sends
// instead of creating a new pool on every delivery attempt.
func NewRouter(routes []types.Route, recorder RouterRecorder) *Router {
	sorted := make([]types.Route, len(routes))
	copy(sorted, routes)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Priority < sorted[j].Priority
	})

	provs := make([]Provider, 0, len(sorted))
	for _, route := range sorted {
		p, err := NewProvider(route.Provider)
		if err != nil {
			slog.Error("failed to initialize provider",
				"provider", route.Provider.Type,
				"error", err)
			continue
		}
		provs = append(provs, p)
	}

	return &Router{providers: provs, recorder: recorder}
}

// Send attempts to deliver the email through the provider chain.
//
// Failover behaviour by error classification:
//   - RecipientPermanent — stop immediately; no provider can fix a bad recipient.
//   - ProviderPermanent  — skip this provider, try the next (this provider's
//                          auth or setup is broken, but others may still work).
//   - RateLimit          — try the next provider; the caller can also retry later.
//   - Transient          — try the next provider; the caller should retry later.
//
// When the entire chain is exhausted, the wrapped lastErr keeps its original
// classification so the handler can pick the right HTTP status (422 = no retry
// for permanent failures, 502/429 = retry for transient/rate-limit).
func (r *Router) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	if len(r.providers) == 0 {
		return nil, fmt.Errorf("no provider routes configured")
	}

	var lastErr error

	for i, provider := range r.providers {
		providerName := provider.Name()

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

		// Recipient-permanent: stop the chain. The recipient address itself
		// is unfixable, retrying via another provider would just re-fail.
		if classification == ErrorRecipientPermanent {
			return nil, fmt.Errorf("recipient permanent error from %s: %w", providerName, err)
		}

		// Everything else (provider-permanent, transient, rate-limit) → next
		// provider. Provider-permanent means *this* provider can't help — the
		// next one might.
		if i < len(r.providers)-1 {
			nextProvider := r.providers[i+1].Name()
			slog.Info("trying next provider",
				"from", providerName,
				"to", nextProvider,
				"reason", string(classification))
			if r.recorder != nil {
				r.recorder.RecordFailover(providerName, nextProvider)
			}
		}
	}

	// %w preserves the lastErr type so the handler / errors.As() at the API
	// boundary can still recover the original classification and pick a
	// status code that matches (permanent → 422, transient → 502, etc.).
	return nil, fmt.Errorf("all providers exhausted, last error: %w", lastErr)
}
