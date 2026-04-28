# frozen_string_literal: true

module McpTools
  # Shared helpers for MCP tool handlers. Each subclass implements `call`
  # using `arguments:` and `context:` keyword args and returns a
  # McpToolDispatcher::Result.
  class Base
    def self.call(arguments:, context:)
      new(arguments, context).call
    end

    def initialize(arguments, context)
      @args    = (arguments || {}).with_indifferent_access
      @context = context
    end

    def call
      raise NotImplementedError
    end

    private

    attr_reader :args, :context

    def tenant
      context.tenant
    end

    def connection
      context.connection
    end

    def ok(text, data = nil)
      McpToolDispatcher::Result.ok(text, data)
    end

    def error(text)
      McpToolDispatcher::Result.error(text)
    end
  end
end
