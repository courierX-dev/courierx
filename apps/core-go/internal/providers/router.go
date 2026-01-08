package providers

import (
	"context"
	"fmt"
	"log"

	"github.com/courierx/core-go/internal/types"
)

// Router handles provider selection and failover
type Router struct {
	routes []types.Route
}

// NewRouter creates a new provider router
func NewRouter(routes []types.Route) *Router {
	return &Router{
		routes: routes,
	}
}

// Send attempts to send an email through available providers with failover
func (r *Router) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	if len(r.routes) == 0 {
		return nil, fmt.Errorf("no provider routes configured")
	}

	var lastErr error

	// Try each provider in priority order
	for i, route := range r.routes {
		provider, err := NewProvider(route.Provider)
		if err != nil {
			log.Printf("Failed to create provider %s: %v", route.Provider.Type, err)
			lastErr = err
			continue
		}

		// Attempt to send
		resp, err := provider.Send(ctx, req)
		if err == nil {
			// Success!
			if i > 0 {
				log.Printf("Successfully sent via fallback provider: %s", provider.Name())
			}
			return resp, nil
		}

		// Classify the error
		classification := ClassifyError(err)

		log.Printf("Provider %s failed: %v (classification: %s)", provider.Name(), err, classification)
		lastErr = err

		// If error is permanent, don't try other providers
		if classification == ErrorPermanent {
			return nil, fmt.Errorf("permanent error from %s: %w", provider.Name(), err)
		}

		// For transient errors, continue to next provider
		log.Printf("Attempting failover to next provider...")
	}

	// All providers failed
	return nil, fmt.Errorf("all providers failed, last error: %w", lastErr)
}
