# frozen_string_literal: true

require "rails_helper"

RSpec.describe RoutingRule do
  describe "default-rule uniqueness" do
    let(:tenant) { create(:tenant, :byok) }

    it "allows the first default rule" do
      rule = tenant.routing_rules.build(name: "First", strategy: "priority", is_default: true)
      expect(rule.valid?).to be true
    end

    it "blocks a second default rule for the same tenant" do
      tenant.routing_rules.create!(name: "First",  strategy: "priority", is_default: true)
      dup = tenant.routing_rules.build(name: "Second", strategy: "priority", is_default: true)
      expect(dup.valid?).to be false
      expect(dup.errors[:is_default].join).to include("another default")
    end

    it "allows a non-default rule alongside an existing default" do
      tenant.routing_rules.create!(name: "Default",  strategy: "priority", is_default: true)
      other = tenant.routing_rules.build(name: "Per-domain", strategy: "priority", is_default: false)
      expect(other.valid?).to be true
    end

    it "allows another tenant to have its own default" do
      tenant.routing_rules.create!(name: "First", strategy: "priority", is_default: true)
      other_tenant = create(:tenant, :byok)
      mine = other_tenant.routing_rules.build(name: "Mine", strategy: "priority", is_default: true)
      expect(mine.valid?).to be true
    end

    it "does not flag a rule against itself when re-saved" do
      rule = tenant.routing_rules.create!(name: "First", strategy: "priority", is_default: true)
      rule.name = "Renamed"
      expect(rule.valid?).to be true
    end
  end
end
