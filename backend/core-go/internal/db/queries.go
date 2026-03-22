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
			provider_used, status, tags, metadata, idempotency_key,
			duration_ms, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11,
			$12, $13
		) ON CONFLICT (id) DO NOTHING`,
		msg.ID,
		msg.TenantID,
		msg.ProjectID,
		msg.ToEmail,
		msg.FromEmail,
		msg.Subject,
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
