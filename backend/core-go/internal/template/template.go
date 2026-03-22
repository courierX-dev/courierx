// Package template wraps the raymond Handlebars engine with a compiled-template cache.
// Templates are parsed once and the compiled AST is reused on subsequent renders —
// especially valuable for bulk sends where the same template body is rendered
// thousands of times per minute.
package template

import (
	"fmt"
	"sync"

	"github.com/aymerick/raymond"
)

// Engine is a thread-safe Handlebars template renderer with an LRU-style sync.Map cache.
type Engine struct {
	cache sync.Map // source string → *raymond.Template
}

// NewEngine returns a ready Engine.
func NewEngine() *Engine {
	return &Engine{}
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
// Useful for health checks and metrics.
func (e *Engine) CacheSize() int {
	n := 0
	e.cache.Range(func(_, _ interface{}) bool {
		n++
		return true
	})
	return n
}

// — internal —

func (e *Engine) compile(source string) (*raymond.Template, error) {
	// Fast path: already compiled
	if val, ok := e.cache.Load(source); ok {
		return val.(*raymond.Template), nil
	}

	tmpl, err := raymond.Parse(source)
	if err != nil {
		return nil, err
	}

	// Store — if another goroutine stored first, use that copy
	actual, _ := e.cache.LoadOrStore(source, tmpl)
	return actual.(*raymond.Template), nil
}
