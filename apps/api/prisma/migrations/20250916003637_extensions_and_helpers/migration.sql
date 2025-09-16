-- CreateExtensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateFunction: bump_hourly_usage
CREATE OR REPLACE FUNCTION bump_hourly_usage(p_product uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO "rate_usage_hourly"("productId", "bucketStart", "count")
  VALUES (p_product, date_trunc('hour', now()), 1)
  ON CONFLICT ("productId", "bucketStart")
  DO UPDATE SET "count" = "rate_usage_hourly"."count" + 1;
END;
$$ LANGUAGE plpgsql;

-- CreateView: v_product_stats
CREATE OR REPLACE VIEW v_product_stats AS
SELECT
  p.id as product_id,
  p.name as product_name,
  COUNT(*) FILTER (WHERE e.event = 'sent') as sent_24h,
  COUNT(*) FILTER (WHERE e.event = 'bounce') as bounces_24h,
  COUNT(*) FILTER (WHERE e.event = 'complaint') as complaints_24h
FROM "products" p
LEFT JOIN "events" e ON e."productId" = p.id AND e."createdAt" >= now() - interval '24 hours'
GROUP BY p.id, p.name;

-- CreateIndexes for performance
CREATE INDEX IF NOT EXISTS "idx_messages_product_created" ON "messages"("productId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_events_event_created" ON "events"("event", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_events_product_created" ON "events"("productId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_suppression_email_hash" ON "suppression"("emailHash");
CREATE INDEX IF NOT EXISTS "idx_routes_product" ON "routes"("productId");
CREATE INDEX IF NOT EXISTS "idx_api_keys_product_active" ON "api_keys"("productId", "active");
