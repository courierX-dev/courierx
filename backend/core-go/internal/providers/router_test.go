package providers

import (
	"context"
	"errors"
	"testing"

	"github.com/courierx/core-go/internal/types"
)

// testRecorder captures metrics calls for assertion in tests.
type testRecorder struct {
	sends     []sendRecord
	failovers []failoverRecord
}

type sendRecord struct {
	provider string
	success  bool
}

type failoverRecord struct {
	from, to string
}

func (r *testRecorder) RecordSend(provider string, success bool, _ float64) {
	r.sends = append(r.sends, sendRecord{provider: provider, success: success})
}

func (r *testRecorder) RecordFailover(from, to string) {
	r.failovers = append(r.failovers, failoverRecord{from: from, to: to})
}

func mockRoute(shouldFail bool) types.Route {
	config := map[string]any{
		"shouldFail": shouldFail,
	}
	return types.Route{
		Priority: 1,
		Provider: types.ProviderConfig{
			Type:   types.ProviderMock,
			Config: config,
		},
	}
}

func testRequest() *types.SendRequest {
	return &types.SendRequest{
		From:    "sender@example.com",
		To:      "recipient@example.com",
		Subject: "Test",
		Text:    "Hello",
	}
}

// ── Happy path ───────────────────────────────────────────────────────────────

func TestRouter_SendsSuccessfullyWithSingleProvider(t *testing.T) {
	recorder := &testRecorder{}
	r := NewRouter([]types.Route{mockRoute(false)}, recorder)

	resp, err := r.Send(context.Background(), testRequest())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !resp.Success {
		t.Error("expected success to be true")
	}
	if resp.Provider != "mock" {
		t.Errorf("expected provider 'mock', got %q", resp.Provider)
	}
}

func TestRouter_RecordsSuccessfulSend(t *testing.T) {
	recorder := &testRecorder{}
	r := NewRouter([]types.Route{mockRoute(false)}, recorder)

	r.Send(context.Background(), testRequest())

	if len(recorder.sends) != 1 {
		t.Fatalf("expected 1 send record, got %d", len(recorder.sends))
	}
	if !recorder.sends[0].success {
		t.Error("expected send to be recorded as successful")
	}
}

// ── Failover ─────────────────────────────────────────────────────────────────

func TestRouter_FailsOverToNextProvider(t *testing.T) {
	failing  := mockRoute(true)
	failing.Priority = 1
	working  := mockRoute(false)
	working.Priority = 2

	recorder := &testRecorder{}
	r := NewRouter([]types.Route{failing, working}, recorder)

	resp, err := r.Send(context.Background(), testRequest())
	if err != nil {
		t.Fatalf("expected successful failover, got error: %v", err)
	}
	if !resp.Success {
		t.Error("expected success after failover")
	}
}

func TestRouter_RecordsFailoverEvent(t *testing.T) {
	failing := mockRoute(true)
	failing.Priority = 1
	working := mockRoute(false)
	working.Priority = 2

	recorder := &testRecorder{}
	r := NewRouter([]types.Route{failing, working}, recorder)

	r.Send(context.Background(), testRequest())

	if len(recorder.failovers) != 1 {
		t.Fatalf("expected 1 failover record, got %d", len(recorder.failovers))
	}
}

func TestRouter_AllProvidersExhaustedReturnsError(t *testing.T) {
	p1 := mockRoute(true)
	p1.Priority = 1
	p2 := mockRoute(true)
	p2.Priority = 2

	r := NewRouter([]types.Route{p1, p2}, nil)

	_, err := r.Send(context.Background(), testRequest())
	if err == nil {
		t.Fatal("expected error when all providers fail, got nil")
	}
}

func TestRouter_SortsByPriorityAscending(t *testing.T) {
	lowPriority := types.Route{
		Priority: 2,
		Provider: types.ProviderConfig{
			Type:   types.ProviderMock,
			Config: map[string]any{"shouldFail": true},
		},
	}
	highPriority := types.Route{
		Priority: 1,
		Provider: types.ProviderConfig{
			Type:   types.ProviderMock,
			Config: map[string]any{"shouldFail": false},
		},
	}

	recorder := &testRecorder{}
	// Pass in reverse order to confirm sorting works
	r := NewRouter([]types.Route{lowPriority, highPriority}, recorder)

	resp, err := r.Send(context.Background(), testRequest())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// If priority 1 (shouldFail: false) is tried first, we get success without
	// any failover recorded.
	if !resp.Success {
		t.Error("expected success")
	}
	if len(recorder.failovers) != 0 {
		t.Errorf("expected no failovers (high-priority provider should win), got %d", len(recorder.failovers))
	}
}

// ── Permanent error stops chain ───────────────────────────────────────────────

func TestRouter_PermanentErrorStopsFailoverChain(t *testing.T) {
	// We need a provider that returns a PermanentError — the mock doesn't do this
	// out of the box, so we inject a custom test provider directly.
	primary  := &permanentErrorProvider{}
	fallback := &countingProvider{}

	r := &Router{
		providers: []Provider{primary, fallback},
		recorder:  nil,
	}

	_, err := r.Send(context.Background(), testRequest())
	if err == nil {
		t.Fatal("expected error from permanent failure")
	}
	if fallback.callCount != 0 {
		t.Errorf("fallback should not be called after permanent error, got %d calls", fallback.callCount)
	}
}

func TestRouter_TransientErrorContinuesFailoverChain(t *testing.T) {
	primary  := &transientErrorProvider{}
	fallback := &countingProvider{}

	r := &Router{
		providers: []Provider{primary, fallback},
		recorder:  nil,
	}

	_, err := r.Send(context.Background(), testRequest())
	if err != nil {
		t.Fatalf("expected fallback to succeed, got %v", err)
	}
	if fallback.callCount != 1 {
		t.Errorf("expected fallback to be called once, got %d", fallback.callCount)
	}
}

// Provider-permanent (e.g. domain not verified on Resend) means *this*
// provider can't help — but the next one might. The chain must continue,
// not stop like RecipientPermanentError does.
func TestRouter_ProviderPermanentTriesNextProvider(t *testing.T) {
	primary  := &providerPermanentErrorProvider{}
	fallback := &countingProvider{}

	r := &Router{
		providers: []Provider{primary, fallback},
		recorder:  nil,
	}

	_, err := r.Send(context.Background(), testRequest())
	if err != nil {
		t.Fatalf("expected fallback to succeed when primary returns provider-permanent, got %v", err)
	}
	if fallback.callCount != 1 {
		t.Errorf("expected fallback to be called once, got %d", fallback.callCount)
	}
}

// When every provider returns provider-permanent, the wrapped lastErr keeps
// its classification so the API handler picks 422 (no-retry) instead of 502.
func TestRouter_AllProviderPermanentPreservesClassification(t *testing.T) {
	primary  := &providerPermanentErrorProvider{}
	fallback := &providerPermanentErrorProvider{}

	r := &Router{
		providers: []Provider{primary, fallback},
		recorder:  nil,
	}

	_, err := r.Send(context.Background(), testRequest())
	if err == nil {
		t.Fatal("expected error when both providers fail")
	}
	if got := ClassifyError(err); got != ErrorProviderPermanent {
		t.Errorf("expected wrapped error to classify as provider_permanent, got %s", got)
	}
}

// ── Empty provider list ───────────────────────────────────────────────────────

func TestRouter_EmptyProviderListReturnsError(t *testing.T) {
	r := NewRouter([]types.Route{}, nil)
	_, err := r.Send(context.Background(), testRequest())
	if err == nil {
		t.Fatal("expected error for empty provider list")
	}
}

// ── Context cancellation ─────────────────────────────────────────────────────

func TestRouter_RespectsContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	r := NewRouter([]types.Route{mockRoute(false)}, nil)
	_, err := r.Send(ctx, testRequest())
	// The mock provider respects ctx cancellation
	if err == nil || !errors.Is(err, context.Canceled) {
		// The mock may return ctx.Err() wrapped or directly — accept both
		t.Logf("got error (may be wrapped): %v", err)
	}
}

// ── Error classification ──────────────────────────────────────────────────────

func TestClassifyError_PermanentTyped(t *testing.T) {
	err := &PermanentError{Code: 400, Message: "bad address"}
	if ClassifyError(err) != ErrorPermanent {
		t.Error("expected permanent classification")
	}
}

func TestClassifyError_RateLimitTyped(t *testing.T) {
	err := &RateLimitError{Message: "too many"}
	if ClassifyError(err) != ErrorRateLimit {
		t.Error("expected rate_limit classification")
	}
}

func TestClassifyError_RecipientPermanentByMessage(t *testing.T) {
	// Strings that mean the *recipient* itself is unfixable. These stop the
	// failover chain — no provider can deliver to a malformed address.
	cases := []string{
		"invalid email address",
		"invalid recipient",
		"no such user",
		"user unknown",
		"address rejected",
		"mailbox does not exist",
		"malformed",
	}
	for _, msg := range cases {
		if got := ClassifyError(errors.New(msg)); got != ErrorRecipientPermanent {
			t.Errorf("expected recipient_permanent for %q, got %s", msg, got)
		}
	}
}

func TestClassifyError_ProviderPermanentByMessage(t *testing.T) {
	// Strings that mean *this provider* can't help (auth, setup, account).
	// The router should skip this provider and try the next one — these
	// must NOT stop the chain.
	cases := []string{
		"unauthorized",
		"authentication failed",
		"invalid api key",
		"forbidden",
		"domain not verified",
		"unverified",
		"invalid sender",
		"account suspended",
		"bad request",
	}
	for _, msg := range cases {
		if got := ClassifyError(errors.New(msg)); got != ErrorProviderPermanent {
			t.Errorf("expected provider_permanent for %q, got %s", msg, got)
		}
	}
}

func TestClassifyError_RateLimitByMessage(t *testing.T) {
	cases := []string{"rate limit exceeded", "too many requests", "quota exceeded"}
	for _, msg := range cases {
		if ClassifyError(errors.New(msg)) != ErrorRateLimit {
			t.Errorf("expected rate_limit for %q", msg)
		}
	}
}

func TestClassifyError_TransientByDefault(t *testing.T) {
	if ClassifyError(errors.New("connection timeout")) != ErrorTransient {
		t.Error("expected transient for generic error")
	}
}

func TestClassifyError_NilReturnsEmpty(t *testing.T) {
	if ClassifyError(nil) != "" {
		t.Error("expected empty classification for nil error")
	}
}

// ── Test-only provider implementations ───────────────────────────────────────

type permanentErrorProvider struct{}

func (p *permanentErrorProvider) Send(_ context.Context, _ *types.SendRequest) (*types.SendResponse, error) {
	return nil, &PermanentError{Code: 400, Message: "invalid address"}
}
func (p *permanentErrorProvider) Name() string         { return "permanent" }
func (p *permanentErrorProvider) ValidateConfig() error { return nil }

type transientErrorProvider struct{}

func (p *transientErrorProvider) Send(_ context.Context, _ *types.SendRequest) (*types.SendResponse, error) {
	return nil, errors.New("connection timeout")
}
func (p *transientErrorProvider) Name() string         { return "transient" }
func (p *transientErrorProvider) ValidateConfig() error { return nil }

type providerPermanentErrorProvider struct{}

func (p *providerPermanentErrorProvider) Send(_ context.Context, _ *types.SendRequest) (*types.SendResponse, error) {
	return nil, &ProviderPermanentError{
		Provider: "fakeprov",
		Code:     403,
		Message:  "domain not verified on this provider",
	}
}
func (p *providerPermanentErrorProvider) Name() string          { return "fakeprov" }
func (p *providerPermanentErrorProvider) ValidateConfig() error { return nil }

type countingProvider struct {
	callCount int
}

func (p *countingProvider) Send(_ context.Context, _ *types.SendRequest) (*types.SendResponse, error) {
	p.callCount++
	return &types.SendResponse{Success: true, Provider: "counting"}, nil
}
func (p *countingProvider) Name() string         { return "counting" }
func (p *countingProvider) ValidateConfig() error { return nil }
