# frozen_string_literal: true
require "redis"

module Api
  module V1
    class HealthController < ApplicationController
      # GET /api/v1/health
      # Public — no auth required
      def show
        checks = {
          status:    "ok",
          timestamp: Time.current.iso8601,
          version:   `git rev-parse --short HEAD 2>/dev/null`.strip.presence || "unknown",
          services:  {
            database: check_database,
            redis:    check_redis,
            sidekiq:  check_sidekiq
          }
        }

        healthy = checks[:services].values.all? { |s| s[:status] == "ok" }
        checks[:status] = healthy ? "ok" : "degraded"

        render json: checks, status: (healthy ? :ok : :service_unavailable)
      end

      private

      def check_database
        ActiveRecord::Base.connection.execute("SELECT 1")
        { status: "ok", adapter: ActiveRecord::Base.connection.adapter_name }
      rescue StandardError => e
        { status: "error", message: e.message.truncate(100) }
      end

      def check_redis
        redis = ::Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
        redis.ping
        { status: "ok" }
      rescue StandardError => e
        { status: "error", message: e.message.truncate(100) }
      ensure
        redis&.close
      end

      def check_sidekiq
        stats = Sidekiq::Stats.new
        {
          status:    "ok",
          queues:    stats.queues,
          enqueued:  stats.enqueued,
          processed: stats.processed,
          failed:    stats.failed,
          workers:   Sidekiq::Workers.new.size
        }
      rescue StandardError => e
        { status: "error", message: e.message.truncate(100) }
      end
    end
  end
end
