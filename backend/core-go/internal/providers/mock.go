package providers

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"github.com/courierx/core-go/internal/types"
	"github.com/google/uuid"
)

// MockProvider simulates email sending with configurable behavior
type MockProvider struct {
	latency     time.Duration
	failureRate float64
	shouldFail  bool
}

// NewMockProvider creates a new mock provider
func NewMockProvider(config map[string]interface{}) *MockProvider {
	provider := &MockProvider{
		latency:     5 * time.Millisecond,
		failureRate: 0.0,
		shouldFail:  false,
	}

	if latency, ok := config["latency"].(float64); ok {
		provider.latency = time.Duration(latency) * time.Millisecond
	}

	if failureRate, ok := config["failureRate"].(float64); ok {
		provider.failureRate = failureRate
	}

	if shouldFail, ok := config["shouldFail"].(bool); ok {
		provider.shouldFail = shouldFail
	}

	return provider
}

func (p *MockProvider) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	// Simulate network latency
	if p.latency > 0 {
		select {
		case <-time.After(p.latency):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	// Simulate random failures based on failure rate
	if p.failureRate > 0 {
		// Use crypto/rand for security compliance (even though this is just a mock)
		n, err := rand.Int(rand.Reader, big.NewInt(100))
		if err == nil && float64(n.Int64())/100.0 < p.failureRate {
			return nil, fmt.Errorf("mock provider: simulated transient failure")
		}
	}

	// Simulate configured failure
	if p.shouldFail {
		return nil, fmt.Errorf("mock provider: configured to fail")
	}

	// Success response
	messageID := uuid.New().String()
	return &types.SendResponse{
		Success:   true,
		MessageID: messageID,
		Provider:  "mock",
	}, nil
}

func (p *MockProvider) Name() string {
	return "mock"
}

func (p *MockProvider) ValidateConfig() error {
	return nil
}
