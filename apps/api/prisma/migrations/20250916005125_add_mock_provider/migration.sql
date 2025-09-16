-- AlterEnum
ALTER TYPE "ProviderType" ADD VALUE 'mock';

-- DropIndex
DROP INDEX "idx_api_keys_product_active";

-- DropIndex
DROP INDEX "idx_events_event_created";

-- DropIndex
DROP INDEX "idx_events_product_created";

-- DropIndex
DROP INDEX "idx_messages_product_created";

-- DropIndex
DROP INDEX "idx_routes_product";

-- DropIndex
DROP INDEX "idx_suppression_email_hash";
