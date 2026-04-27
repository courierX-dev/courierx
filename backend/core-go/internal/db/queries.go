package db

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/courierx/core-go/internal/types"
)

// LogMessage inserts a delivery record into the messages table.
// The insert is fire-and-forget — a failed write is logged but never returned as an error
// to the caller (message delivery already succeeded at this point).
func LogMessage(ctx context.Context, pool *pgxpool.Pool, msg *types.Message) error {
	if pool == nil {
		return nil
	}

	tagsJSON, _ := json.Marshal(msg.Tags)
	metaJSON, _ := json.Marshal(msg.Metadata)

	_, err := pool.Exec(ctx, `
		INSERT INTO messages (
			id, tenant_id, project_id, to_email, from_email, subject,
			body_html, body_text,
			provider_used, status, tags, metadata, idempotency_key,
			duration_ms, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8,
			$9, $10, $11, $12, $13,
			$14, $15
		) ON CONFLICT (id) DO NOTHING`,
		msg.ID,
		msg.TenantID,
		msg.ProjectID,
		msg.ToEmail,
		msg.FromEmail,
		msg.Subject,
		nullString(msg.BodyHTML),
		nullString(msg.BodyText),
		msg.ProviderUsed,
		msg.Status,
		tagsJSON,
		metaJSON,
		nullString(msg.IdempotencyKey),
		msg.DurationMs,
		msg.CreatedAt,
	)
	return err
}

// GetProviderStats returns aggregate delivery stats per provider for a project.
func GetProviderStats(ctx context.Context, pool *pgxpool.Pool, projectID string, since time.Time) ([]types.ProviderStats, error) {
	if pool == nil {
		return nil, nil
	}

	rows, err := pool.Query(ctx, `
		SELECT
			provider_used,
			COUNT(*) FILTER (WHERE status = 'sent')   AS sent,
			COUNT(*) FILTER (WHERE status = 'failed') AS failed,
			COALESCE(AVG(duration_ms), 0)              AS avg_latency_ms
		FROM messages
		WHERE project_id = $1 AND created_at >= $2
		GROUP BY provider_used
		ORDER BY sent DESC`,
		projectID, since,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []types.ProviderStats
	for rows.Next() {
		var s types.ProviderStats
		if err := rows.Scan(&s.Provider, &s.Sent, &s.Failed, &s.AvgLatencyMs); err != nil {
			return nil, err
		}
		stats = append(stats, s)
	}
	return stats, rows.Err()
}

func nullString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// EmailEventInput is the payload for InsertEmailEvent. We only model the
// columns first-party tracking fills in — bounce_* and raw_payload come from
// provider webhook ingestion in Rails.
type EmailEventInput struct {
	EmailID   string
	EventType string // "opened" | "clicked"
	Provider  string // "courierx" for first-party events
	LinkURL   string // populated for clicked events
	IPAddress string
	UserAgent string
}

// InsertEmailEvent records a first-party open/click event. Times are set to
// now() — we don't trust client clocks. raw_payload defaults to {} per the
// schema's NOT NULL default.
func InsertEmailEvent(ctx context.Context, pool *pgxpool.Pool, in EmailEventInput) error {
	if pool == nil {
		return nil
	}
	_, err := pool.Exec(ctx, `
		INSERT INTO email_events (
			email_id, event_type, provider, link_url, ip_address, user_agent,
			occurred_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			now(), now(), now()
		)`,
		in.EmailID,
		in.EventType,
		in.Provider,
		nullString(in.LinkURL),
		nullString(in.IPAddress),
		nullString(in.UserAgent),
	)
	return err
}
