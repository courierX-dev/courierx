package testhelpers

import (
	"context"
	"database/sql"
	"testing"
)

// TestDB provides a test database connection
type TestDB struct {
	DB *sql.DB
}

// NewTestDB creates a new test database connection
func NewTestDB(t *testing.T) *TestDB {
	// This would connect to your test database
	// For now, it's a placeholder
	return &TestDB{}
}

// Cleanup cleans up test data
func (db *TestDB) Cleanup() {
	// Truncate tables or rollback transaction
}

// AssertNoError fails the test if error is not nil
func AssertNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}
}

// AssertError fails the test if error is nil
func AssertError(t *testing.T, err error) {
	t.Helper()
	if err == nil {
		t.Fatal("Expected error, got nil")
	}
}

// AssertEqual fails if values are not equal
func AssertEqual(t *testing.T, expected, actual interface{}) {
	t.Helper()
	if expected != actual {
		t.Fatalf("Expected %v, got %v", expected, actual)
	}
}

// WithTimeout creates a context with timeout for tests
func WithTimeout() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 5)
}
