# frozen_string_literal: true

module Api
  module V1
    # JSON-RPC 2.0 endpoint that speaks the Model Context Protocol over HTTP.
    # Authenticates via `Authorization: Bearer <client_id>:<client_secret>`
    # against an McpConnection (not the tenant JWT/API-key path).
    class McpController < ApplicationController
      PROTOCOL_VERSION = "2025-06-18"
      SERVER_INFO = { name: "courierx", version: "0.1.0" }.freeze

      before_action :authenticate_mcp!

      # Single JSON-RPC entry point. Accepts a single request object or a batch.
      def handle
        body = parse_body
        return render_parse_error if body.nil?

        if body.is_a?(Array)
          # Batch — discard pure-notification responses (id absent).
          responses = body.map { |req| handle_rpc(req) }.compact
          return head :no_content if responses.empty?
          render json: responses
        else
          response = handle_rpc(body)
          return head :no_content if response.nil?
          render json: response
        end
      end

      private

      # ── Auth ─────────────────────────────────────────────────────────────────

      def authenticate_mcp!
        header = request.headers["Authorization"].to_s
        token  = header.split(" ", 2).last
        return render_unauthorized unless token&.include?(":")

        client_id, client_secret = token.split(":", 2)
        connection = McpConnection.authenticate(client_id, client_secret)
        return render_unauthorized unless connection

        @current_mcp_connection = connection
        @current_tenant         = connection.tenant
      end

      def render_unauthorized
        render json: {
          jsonrpc: "2.0",
          id:      nil,
          error:   { code: -32_001, message: "Unauthorized" }
        }, status: :unauthorized
      end

      # ── JSON-RPC handle_rpc ────────────────────────────────────────────────────

      def parse_body
        raw = request.raw_post
        return nil if raw.blank?
        JSON.parse(raw)
      rescue JSON::ParserError
        nil
      end

      def render_parse_error
        render json: {
          jsonrpc: "2.0",
          id:      nil,
          error:   { code: -32_700, message: "Parse error" }
        }, status: :bad_request
      end

      def handle_rpc(req)
        return nil unless req.is_a?(Hash)
        id     = req["id"]
        method = req["method"]
        params = req["params"] || {}

        # Notifications (no id) get no response — only side effects.
        is_notification = !req.key?("id")

        result = route(method, params)

        return nil if is_notification

        if result.is_a?(Hash) && result[:_error]
          { jsonrpc: "2.0", id: id, error: result[:_error] }
        else
          { jsonrpc: "2.0", id: id, result: result }
        end
      rescue => e
        Rails.logger.error("[MCP] handle_rpc error: #{e.class}: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
        return nil if is_notification
        { jsonrpc: "2.0", id: id, error: { code: -32_603, message: "Internal error" } }
      end

      def route(method, params)
        case method
        when "initialize"     then handle_initialize(params)
        when "ping"           then {}
        when "tools/list"     then { tools: McpToolRegistry.descriptors }
        when "tools/call"     then handle_tools_call(params)
        when "notifications/initialized" then nil
        else
          { _error: { code: -32_601, message: "Method not found: #{method}" } }
        end
      end

      def handle_initialize(_params)
        {
          protocolVersion: PROTOCOL_VERSION,
          capabilities:    { tools: { listChanged: false } },
          serverInfo:      SERVER_INFO,
          instructions:    "CourierX MCP server. Use tools/list to discover available tools."
        }
      end

      def handle_tools_call(params)
        name      = params["name"]
        arguments = params["arguments"] || {}

        result = McpToolDispatcher.call(
          tool_name:  name,
          arguments:  arguments,
          tenant:     @current_tenant,
          connection: @current_mcp_connection,
          ip_address: request.remote_ip
        )

        if result.success?
          {
            content: [{ type: "text", text: result.text }],
            structuredContent: result.data,
            isError: false
          }
        else
          {
            content: [{ type: "text", text: result.text }],
            isError: true
          }
        end
      end
    end
  end
end
