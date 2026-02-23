package observability

import (
	"log"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
)

// InitSentry initializes the Sentry SDK if SENTRY_GO_DSN is set.
func InitSentry() {
	dsn := os.Getenv("SENTRY_GO_DSN")
	if dsn == "" {
		log.Println("[Sentry] SENTRY_GO_DSN not set. Error tracking disabled.")
		return
	}

	env := os.Getenv("GO_ENV")
	if env == "" {
		env = "development"
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		Environment:      env,
		TracesSampleRate: 0.1, // Sample 10% of transactions for performance monitoring
		EnableTracing:    true,
	})

	if err != nil {
		log.Printf("[Sentry] Initialization failed: %v\n", err)
		return
	}

	log.Println("[Sentry] Initialized successfully")
}

// FlushSentry ensures all pending events are sent before the program exits.
func FlushSentry() {
	if os.Getenv("SENTRY_GO_DSN") != "" {
		sentry.Flush(2 * time.Second)
	}
}
