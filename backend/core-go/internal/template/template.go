// Package template wraps the raymond Handlebars engine with a compiled-template cache.
// Templates are parsed once and the compiled AST is reused on subsequent renders —
// especially valuable for bulk sends where the same template body is rendered
// thousands of times per minute.
package template

import (
	"crypto/sha256"
	"fmt"
	"sync"

	"github.com/aymerick/raymond"
)

const defaultMaxCacheSize = 1000

// Engine is a thread-safe Handlebars template renderer with a bounded cache.
// When the cache reaches maxSize all entries are evicted (simple flush strategy)
// to keep memory bounded without introducing an LRU dependency.
type Engine struct {
	mu      sync.RWMutex
	cache   map[string]*raymond.Template
	maxSize int
}

// NewEngine returns a ready Engine.
func NewEngine() *Engine {
	return &Engine{
		cache:   make(map[string]*raymond.Template, defaultMaxCacheSize),
		maxSize: defaultMaxCacheSize,
	}
}

// Render compiles (or retrieves from cache) the template source and executes it
// with the provided variables.
func (e *Engine) Render(source string, variables map[string]interface{}) (string, error) {
	tmpl, err := e.compile(source)
	if err != nil {
		return "", fmt.Errorf("template parse error: %w", err)
	}
	result, err := tmpl.Exec(variables)
	if err != nil {
		return "", fmt.Errorf("template render error: %w", err)
	}
	return result, nil
}

// RenderHTML renders the HTML body. Returns the original string unchanged when
// there are no variables (avoids a needless parse/compile cycle).
func (e *Engine) RenderHTML(html string, variables map[string]interface{}) (string, error) {
	if len(variables) == 0 {
		return html, nil
	}
	return e.Render(html, variables)
}

// RenderSubject renders the email subject line.
func (e *Engine) RenderSubject(subject string, variables map[string]interface{}) (string, error) {
	if len(variables) == 0 {
		return subject, nil
	}
	return e.Render(subject, variables)
}

// CacheSize returns the number of entries currently in the template cache.
func (e *Engine) CacheSize() int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return len(e.cache)
}

// — internal —

func (e *Engine) compile(source string) (*raymond.Template, error) {
	key := cacheKey(source)

	// Fast path: already compiled.
	e.mu.RLock()
	if tmpl, ok := e.cache[key]; ok {
		e.mu.RUnlock()
		return tmpl, nil
	}
	e.mu.RUnlock()

	tmpl, err := raymond.Parse(source)
	if err != nil {
		return nil, err
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	// Evict all entries when the cache is full to keep memory bounded.
	if len(e.cache) >= e.maxSize {
		e.cache = make(map[string]*raymond.Template, e.maxSize)
	}

	// Another goroutine may have inserted while we were compiling; prefer the
	// existing entry to avoid holding two compiled copies of the same template.
	if existing, ok := e.cache[key]; ok {
		return existing, nil
	}
	e.cache[key] = tmpl
	return tmpl, nil
}

// cacheKey returns a hex-encoded SHA-256 hash of the source string.
// Using a hash as the key keeps per-entry memory constant regardless of
// template length, which matters for bulk sends with large HTML bodies.
func cacheKey(source string) string {
	h := sha256.Sum256([]byte(source))
	return fmt.Sprintf("%x", h)
}
