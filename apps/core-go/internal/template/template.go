package template

import (
	"fmt"

	"github.com/aymerick/raymond"
)

// Engine handles template rendering
type Engine struct{}

// NewEngine creates a new template engine
func NewEngine() *Engine {
	return &Engine{}
}

// Render renders a Handlebars template with variables
func (e *Engine) Render(template string, variables map[string]interface{}) (string, error) {
	result, err := raymond.Render(template, variables)
	if err != nil {
		return "", fmt.Errorf("template render error: %w", err)
	}
	return result, nil
}

// RenderHTML renders an HTML template
func (e *Engine) RenderHTML(html string, variables map[string]interface{}) (string, error) {
	if len(variables) == 0 {
		return html, nil
	}
	return e.Render(html, variables)
}

// RenderSubject renders a subject template
func (e *Engine) RenderSubject(subject string, variables map[string]interface{}) (string, error) {
	if len(variables) == 0 {
		return subject, nil
	}
	return e.Render(subject, variables)
}
