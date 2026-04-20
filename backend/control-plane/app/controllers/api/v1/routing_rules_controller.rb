# frozen_string_literal: true

module Api
  module V1
    class RoutingRulesController < BaseController
      before_action :set_rule, only: [:show, :update, :destroy]

      def index
        rules = current_tenant.routing_rules.order(created_at: :desc)
        render json: rules.map { |r| rule_json(r) }
      end

      def show
        render json: rule_json(@rule)
      end

      def create
        rule = current_tenant.routing_rules.build(rule_params)
        if rule.save
          render json: rule_json(rule), status: :created
        else
          render json: { errors: rule.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @rule.update(rule_params)
          render json: rule_json(@rule)
        else
          render json: { errors: @rule.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @rule.destroy!
        head :no_content
      end

      private

      def set_rule
        @rule = current_tenant.routing_rules.find(params[:id])
      end

      def rule_params
        params.permit(:name, :strategy, :is_default, :is_active, :match_from_domain, :match_tag)
      end

      def rule_json(r)
        {
          id: r.id, name: r.name, strategy: r.strategy,
          is_default: r.is_default, is_active: r.is_active,
          match_from_domain: r.match_from_domain, match_tag: r.match_tag,
          created_at: r.created_at
        }
      end
    end
  end
end
