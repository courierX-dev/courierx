// Package config loads all configuration from environment variables.
// In production and CI/CD, inject these via Phase CLI:
//
//	phase run -- ./courierx-core
//
// In development, copy .env.example to .env and run:
//
//	phase run -- go run .
package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all runtime configuration for the service.
type Config struct {
	// Server
	Port        string
	Environment string

	// Database (shared with Rails Control Plane)
	DatabaseURL string

	// Redis (job queue — future)
	RedisURL string

	// Provider credentials (environment fallback; normally fetched from DB at runtime)
	SendGridAPIKey     string
	MailgunAPIKey      string
	MailgunDomain      string
	MailgunRegion      string // "us" (default) or "eu"
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	AWSRegion          string
	SMTPHost           string
	SMTPPort           int
	SMTPUser           string
	SMTPPass           string
	SMTPUseTLS         bool   // true = implicit TLS on port 465; false = STARTTLS on 587
	PostmarkAPIKey     string // Server API token (X-Postmark-Server-Token)
	ResendAPIKey       string // Bearer token for api.resend.com

	// Logging
	LogLevel  string
	LogFormat string

	// Performance
	MaxWorkers        int
	QueueBufferSize   int
	RateLimitProvider int // max sends/sec per provider (token bucket)

	// Security
	// InternalSecret is shared between the Rails Control Plane and this service.
	// Set X-Internal-Secret header on every request from the control plane.
	InternalSecret string

	// Control Plane (for pulling provider configs at boot)
	ControlPlaneURL string

	// Idempotency
	IdempotencyTTLSeconds int // seconds to retain idempotency keys (default 86400 = 24h)

	// Feature flags
	EnableMetrics   bool
	EnableTracing   bool
	EnableIPWarming bool
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("GO_ENV", "development"),

		DatabaseURL: getEnv("DATABASE_URL", ""),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379/0"),

		SendGridAPIKey:     getEnv("SENDGRID_API_KEY", ""),
		MailgunAPIKey:      getEnv("MAILGUN_API_KEY", ""),
		MailgunDomain:      getEnv("MAILGUN_DOMAIN", ""),
		MailgunRegion:      getEnv("MAILGUN_REGION", "us"),
		AWSAccessKeyID:     getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
		AWSRegion:          getEnv("AWS_REGION", "us-east-1"),
		SMTPHost:           getEnv("SMTP_HOST", ""),
		SMTPPort:           getEnvInt("SMTP_PORT", 587),
		SMTPUser:           getEnv("SMTP_USER", ""),
		SMTPPass:           getEnv("SMTP_PASS", ""),
		SMTPUseTLS:         getEnvBool("SMTP_USE_TLS", false),
		PostmarkAPIKey:     getEnv("POSTMARK_API_KEY", ""),
		ResendAPIKey:       getEnv("RESEND_API_KEY", ""),

		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "json"),

		MaxWorkers:        getEnvInt("MAX_WORKERS", 100),
		QueueBufferSize:   getEnvInt("QUEUE_BUFFER_SIZE", 1000),
		RateLimitProvider: getEnvInt("RATE_LIMIT_PER_PROVIDER", 1000),

		InternalSecret: getEnv("INTERNAL_SECRET", ""),

		ControlPlaneURL: getEnv("CONTROL_PLANE_URL", "http://localhost:4000"),

		IdempotencyTTLSeconds: getEnvInt("IDEMPOTENCY_TTL", 86400),

		EnableMetrics:   getEnvBool("ENABLE_METRICS", true),
		EnableTracing:   getEnvBool("ENABLE_TRACING", false),
		EnableIPWarming: getEnvBool("ENABLE_IP_WARMING", false),
	}
}

// IsDevelopment returns true when GO_ENV=development.
func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

// IsProduction returns true when GO_ENV=production.
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// Validate performs a basic sanity check on critical settings.
func (c *Config) Validate() error {
	if c.DatabaseURL == "" || c.DatabaseURL == "skip" {
		fmt.Println("Warning: running without database — message logging disabled")
	}
	if c.InternalSecret == "" && c.IsProduction() {
		return fmt.Errorf("INTERNAL_SECRET is required in production")
	}
	return nil
}

// HasAnyProvider returns true if at least one real provider is configured.
func (c *Config) HasAnyProvider() bool {
	return c.SendGridAPIKey != "" ||
		(c.MailgunAPIKey != "" && c.MailgunDomain != "") ||
		(c.AWSAccessKeyID != "" && c.AWSSecretAccessKey != "") ||
		c.SMTPHost != "" ||
		c.PostmarkAPIKey != "" ||
		c.ResendAPIKey != ""
}

// — helpers —

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}
