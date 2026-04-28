# frozen_string_literal: true

require "rails_helper"

RSpec.describe "MCP Server", type: :request do
  let(:tenant)     { create(:tenant) }
  let!(:domain)    { create(:domain, tenant: tenant, domain: "example.com", status: "verified") }
  let(:connection) { create(:mcp_connection, tenant: tenant, permissions: %w[full_access]) }
  let(:headers) do
    { "Authorization" => "Bearer #{connection.client_id}:#{connection.raw_secret}",
      "Content-Type"  => "application/json" }
  end

  before { allow(OutboxProcessorJob).to receive(:perform_async) }

  def jsonrpc(method, params: {}, id: 1)
    { jsonrpc: "2.0", id: id, method: method, params: params }
  end

  def post_rpc(body, hdrs: headers)
    post "/api/v1/mcp", params: body.to_json, headers: hdrs
    JSON.parse(response.body) unless response.body.empty?
  end

  describe "auth" do
    it "rejects requests without an Authorization header" do
      post "/api/v1/mcp", params: jsonrpc("initialize").to_json,
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "rejects malformed credentials" do
      post "/api/v1/mcp", params: jsonrpc("initialize").to_json,
           headers: { "Authorization" => "Bearer wrong:wrong",
                      "Content-Type"  => "application/json" }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "initialize" do
    it "returns server info and protocol version" do
      body = post_rpc(jsonrpc("initialize"))
      expect(body["result"]["protocolVersion"]).to be_present
      expect(body["result"]["serverInfo"]["name"]).to eq("courierx")
    end
  end

  describe "tools/list" do
    it "returns all registered tools" do
      body = post_rpc(jsonrpc("tools/list"))
      names = body["result"]["tools"].map { |t| t["name"] }
      expect(names).to include("send_email", "list_emails", "list_domains", "add_suppression")
    end
  end

  describe "tools/call send_email" do
    let(:args) do
      {
        to:      "user@example.com",
        from:    "noreply@example.com",
        subject: "Hello from MCP",
        text:    "Body"
      }
    end

    it "queues an email and writes an audit log" do
      expect {
        post_rpc(jsonrpc("tools/call", params: { name: "send_email", arguments: args }))
      }.to change(Email, :count).by(1).and change(McpAuditLog, :count).by(1)

      log = McpAuditLog.last
      expect(log.tool_name).to eq("send_email")
      expect(log.success).to be(true)
    end

    it "returns the queued email in structuredContent" do
      body = post_rpc(jsonrpc("tools/call", params: { name: "send_email", arguments: args }))
      result = body["result"]
      expect(result["isError"]).to be(false)
      expect(result["structuredContent"]["status"]).to eq("queued")
    end

    it "denies when the connection lacks send_email permission" do
      connection.update!(permissions: %w[read_only])
      body = post_rpc(jsonrpc("tools/call", params: { name: "send_email", arguments: args }))
      expect(body["result"]["isError"]).to be(true)
      expect(body["result"]["content"][0]["text"]).to match(/Permission denied/)
    end

    it "rejects from_email outside allowed_from_emails" do
      connection.update!(allowed_from_emails: %w[only@allowed.com])
      body = post_rpc(jsonrpc("tools/call", params: { name: "send_email", arguments: args }))
      expect(body["result"]["isError"]).to be(true)
    end
  end

  describe "tools/call list_emails" do
    before { create_list(:email, 3, tenant: tenant) }

    it "returns the tenant's emails" do
      body = post_rpc(jsonrpc("tools/call", params: { name: "list_emails", arguments: {} }))
      expect(body["result"]["structuredContent"]["emails"].size).to eq(3)
    end
  end

  describe "tools/call add_suppression" do
    it "creates a suppression record" do
      body = post_rpc(jsonrpc("tools/call",
                              params: { name: "add_suppression",
                                        arguments: { email: "blocked@example.com" } }))
      expect(body["result"]["isError"]).to be(false)
      expect(tenant.suppressions.where(email: "blocked@example.com")).to exist
    end
  end

  describe "unknown method" do
    it "returns -32601" do
      body = post_rpc(jsonrpc("nope/nope"))
      expect(body["error"]["code"]).to eq(-32_601)
    end
  end
end
