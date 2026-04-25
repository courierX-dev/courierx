class BackfillDemoTenantsToByok < ActiveRecord::Migration[8.1]
  # The default tenant.mode flipped from "demo" to "byok" on 2026-04-23, but
  # tenants created before that migration kept "demo". OutboxProcessorJob skips
  # BYOK injection for demo tenants and falls back to global ENV provider keys
  # — keys we are removing from prod. This backfill upgrades any leftover demo
  # tenants that already have an active provider connection, creating a default
  # routing rule pointed at their first connection so sends keep working.
  #
  # Idempotent: tenants without an active connection are skipped (and logged);
  # tenants that already have a default routing rule keep theirs.

  disable_ddl_transaction!

  def up
    say_with_time "Backfilling demo tenants to byok" do
      Tenant.reset_column_information
      tenants = Tenant.where(mode: "demo").to_a
      say "Found #{tenants.size} demo tenant(s)"

      tenants.each do |tenant|
        conn = ProviderConnection.where(tenant_id: tenant.id, status: "active")
                                 .order(priority: :asc)
                                 .first
        unless conn
          say "  SKIP tenant=#{tenant.id} — no active provider connection"
          next
        end

        ApplicationRecord.transaction do
          rule = RoutingRule.where(tenant_id: tenant.id, is_default: true).first
          rule ||= RoutingRule.create!(
            tenant_id:  tenant.id,
            name:       "default",
            strategy:   "priority",
            is_default: true,
            is_active:  true
          )

          unless RoutingRuleProvider.exists?(routing_rule_id: rule.id, provider_connection_id: conn.id)
            RoutingRuleProvider.create!(
              routing_rule_id:        rule.id,
              provider_connection_id: conn.id,
              priority:               1,
              weight:                 100
            )
          end

          tenant.update!(mode: "byok")
        end

        say "  OK   tenant=#{tenant.id} provider=#{conn.provider} connection=#{conn.id}"
      end
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
