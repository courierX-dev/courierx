package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	// Server
	Port        string
	Environment string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// Provider Credentials (fallback if not in DB)
	SendGridAPIKey     string
	MailgunAPIKey      string
	MailgunDomain      string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	AWSRegion          string
	SMTPHost           string
	SMTPPort           int
	SMTPUser           string
	SMTPPass           string

	// Logging
	LogLevel  string
	LogFormat string

	// Performance
	MaxWorkers        int
	QueueBufferSize   int
	RateLimitProvider int

	// Security
	WebhookSecret string

	// Control Plane Integration
	ControlPlaneURL    string
	ControlPlaneSecret string

	// Feature Flags
	EnableMetrics   bool
	EnableTracing   bool
	EnableIPWarming bool
}

func Load() *Config {
	return &Config{
		// Server
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("GO_ENV", "development"),

		// Database
		DatabaseURL: getEnv("DATABASE_URL", "postgresql://localhost:5432/courierx"),

		// Redis
		RedisURL: getEnv("REDIS_URL", "redis://localhost:6379/0"),

		// Provider Credentials
		SendGridAPIKey:     getEnv("SENDGRID_API_KEY", ""),
		MailgunAPIKey:      getEnv("MAILGUN_API_KEY", ""),
		MailgunDomain:      getEnv("MAILGUN_DOMAIN", ""),
		AWSAccessKeyID:     getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
		AWSRegion:          getEnv("AWS_REGION", "us-east-1"),
		SMTPHost:           getEnv("SMTP_HOST", ""),
		SMTPPort:           getEnvInt("SMTP_PORT", 587),
		SMTPUser:           getEnv("SMTP_USER", ""),
		SMTPPass:           getEnv("SMTP_PASS", ""),

		// Logging
		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "json"),

		// Performance
		MaxWorkers:        getEnvInt("MAX_WORKERS", 100),
		QueueBufferSize:   getEnvInt("QUEUE_BUFFER_SIZE", 1000),
		RateLimitProvider: getEnvInt("RATE_LIMIT_PER_PROVIDER", 1000),

		// Security
		WebhookSecret: getEnv("WEBHOOK_SECRET", ""),

		// Control Plane Integration
		ControlPlaneURL:    getEnv("CONTROL_PLANE_URL", "http://localhost:4000"),
		ControlPlaneSecret: getEnv("CONTROL_PLANE_SECRET", ""),

		// Feature Flags
		EnableMetrics:   getEnvBool("ENABLE_METRICS", true),
		EnableTracing:   getEnvBool("ENABLE_TRACING", false),
		EnableIPWarming: getEnvBool("ENABLE_IP_WARMING", false),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return fallback
}

// IsDevelopment checks if we're in development mode
func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

// IsProduction checks if we're in production mode
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// Validate checks if required configuration is present
func (c *Config) Validate() error {
	if c.DatabaseURL == "" || c.DatabaseURL == "skip" {
		// Database is optional for benchmark mode
		fmt.Println("Warning: Running without database")
	}

	if c.ControlPlaneSecret == "" && c.IsProduction() {
		return fmt.Errorf("CONTROL_PLANE_SECRET is required in production")
	}

	return nil
}
