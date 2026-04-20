package template

import (
	"fmt"
	"strings"
	"sync"
	"testing"
)

// ── Render ────────────────────────────────────────────────────────────────────

func TestRender_BasicInterpolation(t *testing.T) {
	e := NewEngine()
	result, err := e.Render("Hello {{name}}!", map[string]any{"name": "World"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "Hello World!" {
		t.Errorf("expected 'Hello World!', got %q", result)
	}
}

func TestRender_MultipleVariables(t *testing.T) {
	e := NewEngine()
	result, err := e.Render("{{greeting}}, {{name}}!", map[string]any{
		"greeting": "Hi",
		"name":     "Alice",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "Hi, Alice!" {
		t.Errorf("unexpected result: %q", result)
	}
}

func TestRender_MissingVariableRendersEmpty(t *testing.T) {
	e := NewEngine()
	result, err := e.Render("Hello {{name}}!", map[string]any{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// raymond renders missing variables as empty string
	if result != "Hello !" {
		t.Errorf("expected 'Hello !', got %q", result)
	}
}

func TestRender_StaticTemplateNoVariables(t *testing.T) {
	e := NewEngine()
	result, err := e.Render("Hello World", map[string]any{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "Hello World" {
		t.Errorf("expected 'Hello World', got %q", result)
	}
}

func TestRender_InvalidTemplateSyntaxReturnsError(t *testing.T) {
	e := NewEngine()
	_, err := e.Render("{{#if}}", map[string]any{})
	if err == nil {
		t.Error("expected parse error for invalid template, got nil")
	}
}

// ── RenderHTML ────────────────────────────────────────────────────────────────

func TestRenderHTML_SkipsParsingWhenNoVariables(t *testing.T) {
	e := NewEngine()
	const html = "<p>Hello World</p>"
	result, err := e.RenderHTML(html, map[string]any{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != html {
		t.Errorf("expected original string unchanged, got %q", result)
	}
	// Cache should be empty — no compilation happened
	if e.CacheSize() != 0 {
		t.Errorf("expected empty cache for no-variable call, got %d", e.CacheSize())
	}
}

func TestRenderHTML_InterpolatesVariables(t *testing.T) {
	e := NewEngine()
	result, err := e.RenderHTML("<p>Hi {{name}}</p>", map[string]any{"name": "Bob"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "<p>Hi Bob</p>" {
		t.Errorf("unexpected result: %q", result)
	}
}

// ── RenderSubject ─────────────────────────────────────────────────────────────

func TestRenderSubject_SkipsParsingWhenNoVariables(t *testing.T) {
	e := NewEngine()
	subject := "Your order confirmation"
	result, err := e.RenderSubject(subject, map[string]any{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != subject {
		t.Errorf("expected original subject, got %q", result)
	}
}

func TestRenderSubject_InterpolatesVariables(t *testing.T) {
	e := NewEngine()
	result, err := e.RenderSubject("Order {{id}} confirmed", map[string]any{"id": "12345"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "Order 12345 confirmed" {
		t.Errorf("unexpected result: %q", result)
	}
}

// ── Cache ──────────────────────────────────────────────────────────────────────

func TestCache_SameTemplateCompiledOnce(t *testing.T) {
	e := NewEngine()
	tmpl := "Hello {{name}}"
	vars := map[string]any{"name": "Test"}

	e.Render(tmpl, vars)
	e.Render(tmpl, vars)

	if e.CacheSize() != 1 {
		t.Errorf("expected cache size 1, got %d", e.CacheSize())
	}
}

func TestCache_DifferentTemplatesCachedSeparately(t *testing.T) {
	e := NewEngine()
	e.Render("Hello {{name}}", map[string]any{"name": "A"})
	e.Render("Goodbye {{name}}", map[string]any{"name": "B"})

	if e.CacheSize() != 2 {
		t.Errorf("expected cache size 2, got %d", e.CacheSize())
	}
}

func TestCache_EvictsWhenFull(t *testing.T) {
	e := NewEngine()
	// Fill cache beyond maxSize
	for i := range e.maxSize + 1 {
		template := fmt.Sprintf("Template %d: {{val}}", i)
		e.Render(template, map[string]any{"val": i})
	}
	// After eviction the cache should be smaller than maxSize+1
	if e.CacheSize() > e.maxSize {
		t.Errorf("cache grew beyond maxSize (%d), got %d", e.maxSize, e.CacheSize())
	}
}

func TestCache_ThreadSafe(t *testing.T) {
	e := NewEngine()
	var wg sync.WaitGroup
	const goroutines = 50

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			template := fmt.Sprintf("Template {{val%d}}", i%10) // intentional collisions
			_, err := e.Render(template, map[string]any{fmt.Sprintf("val%d", i%10): i})
			if err != nil && !strings.Contains(err.Error(), "template") {
				t.Errorf("unexpected error in goroutine %d: %v", i, err)
			}
		}(i)
	}
	wg.Wait()
}
