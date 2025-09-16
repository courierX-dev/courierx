-- Atomic rate limit check and increment function
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
    p_product_id uuid,
    p_bucket_start timestamp,
    p_rate_limit integer
) RETURNS integer AS $$
DECLARE
    current_count integer;
BEGIN
    -- Atomic increment and return new count
    INSERT INTO "rate_usage_hourly"("productId", "bucketStart", "count")
    VALUES (p_product_id, p_bucket_start, 1)
    ON CONFLICT ("productId", "bucketStart")
    DO UPDATE SET "count" = "rate_usage_hourly"."count" + 1
    RETURNING "count" INTO current_count;

    RETURN current_count;
END;
$$ LANGUAGE plpgsql;
