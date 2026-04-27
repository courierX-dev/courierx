package tracking

import (
	"strings"
	"testing"
	"time"
)

func TestSignerRoundTrip(t *testing.T) {
	s := NewSigner("test-secret", time.Hour)
	tok, err := s.Sign(EventOpen, "email-123", "tenant-9")
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}
	kind, emailID, tenantID, err := s.Verify(tok)
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if kind != EventOpen || emailID != "email-123" || tenantID != "tenant-9" {
		t.Fatalf("roundtrip mismatch: %s/%s/%s", kind, emailID, tenantID)
	}
}

func TestSignerRejectsTamperedToken(t *testing.T) {
	s := NewSigner("test-secret", time.Hour)
	tok, _ := s.Sign(EventClick, "email-1", "")
	// Flip the last char of the body portion.
	parts := strings.SplitN(tok, ".", 2)
	if len(parts) != 2 {
		t.Fatal("expected two-part token")
	}
	tampered := parts[0][:len(parts[0])-1] + "X." + parts[1]
	if _, _, _, err := s.Verify(tampered); err == nil {
		t.Fatal("expected verification to fail on tampered token")
	}
}

func TestSignerRejectsWrongSecret(t *testing.T) {
	tok, _ := NewSigner("secret-a", time.Hour).Sign(EventOpen, "email-1", "")
	if _, _, _, err := NewSigner("secret-b", time.Hour).Verify(tok); err == nil {
		t.Fatal("expected verification to fail across signers")
	}
}

func TestSignerDisabledWhenSecretEmpty(t *testing.T) {
	s := NewSigner("", time.Hour)
	if s.Enabled() {
		t.Fatal("expected disabled signer when secret is empty")
	}
	if _, err := s.Sign(EventOpen, "x", ""); err == nil {
		t.Fatal("expected Sign to fail on disabled signer")
	}
}

func TestRewriterDisabledIsNoop(t *testing.T) {
	r := NewRewriter(NewSigner("", 0), "")
	in := `<html><body><a href="https://example.com">x</a></body></html>`
	out, err := r.Rewrite(in, "email-1", "", true, true)
	if err != nil {
		t.Fatalf("Rewrite: %v", err)
	}
	if out != in {
		t.Fatalf("disabled rewriter should be no-op; got %q", out)
	}
}

func TestRewriterInjectsPixelAndRewritesLinks(t *testing.T) {
	signer := NewSigner("secret", time.Hour)
	r := NewRewriter(signer, "https://t.example")
	in := `<html><body><p>Hi</p><a href="https://example.com/x">link</a></body></html>`

	out, err := r.Rewrite(in, "email-42", "tenant-1", true, true)
	if err != nil {
		t.Fatalf("Rewrite: %v", err)
	}

	if !strings.Contains(out, `https://t.example/t/o/`) {
		t.Errorf("expected open-tracking pixel; got %q", out)
	}
	if !strings.Contains(out, `https://t.example/t/c/`) {
		t.Errorf("expected click-tracking link; got %q", out)
	}
	// Original target should appear as a `u=` query param somewhere.
	if !strings.Contains(out, "u=https") {
		t.Errorf("expected original URL preserved as ?u= param; got %q", out)
	}
	// Original raw href should be replaced.
	if strings.Contains(out, `href="https://example.com/x"`) {
		t.Errorf("original href should have been rewritten; got %q", out)
	}
}

func TestRewriterSkipsMailtoTelAnchorsAndUnsubscribe(t *testing.T) {
	r := NewRewriter(NewSigner("secret", time.Hour), "https://t.example")
	in := `<html><body>` +
		`<a href="mailto:a@b.com">m</a>` +
		`<a href="tel:+1234">t</a>` +
		`<a href="#top">a</a>` +
		`<a href="https://example.com/unsubscribe">u</a>` +
		`</body></html>`

	out, err := r.Rewrite(in, "email-1", "", false, true)
	if err != nil {
		t.Fatalf("Rewrite: %v", err)
	}
	for _, want := range []string{`href="mailto:a@b.com"`, `href="tel:+1234"`, `href="#top"`, `href="https://example.com/unsubscribe"`} {
		if !strings.Contains(out, want) {
			t.Errorf("expected %s preserved; got %q", want, out)
		}
	}
	if strings.Contains(out, "/t/c/") {
		t.Errorf("expected no click rewrites for skip-list links; got %q", out)
	}
}

func TestRewriterRespectsFlags(t *testing.T) {
	r := NewRewriter(NewSigner("secret", time.Hour), "https://t.example")
	in := `<html><body><a href="https://example.com">x</a></body></html>`

	// Opens off, clicks on
	out, _ := r.Rewrite(in, "e1", "", false, true)
	if strings.Contains(out, "/t/o/") {
		t.Error("did not expect open pixel when opens=false")
	}
	if !strings.Contains(out, "/t/c/") {
		t.Error("expected click rewrite when clicks=true")
	}

	// Both off
	out, _ = r.Rewrite(in, "e1", "", false, false)
	if out != in {
		t.Errorf("both flags off should be no-op; got %q", out)
	}
}
