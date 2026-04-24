# frozen_string_literal: true

module Api
  module V1
    class SuppressionsController < BaseController
      def index
        suppressions = current_tenant.suppressions.order(created_at: :desc)
        suppressions = suppressions.where(reason: params[:reason]) if params[:reason].present?
        render json: suppressions.limit(100).map { |s|
          { id: s.id, email: s.email, reason: s.reason, note: s.note,
            source_email_id: s.source_email_id, created_at: s.created_at }
        }
      end

      def create
        suppression = current_tenant.suppressions.build(suppression_params)
        if suppression.save
          render json: { id: suppression.id, email: suppression.email, reason: suppression.reason }, status: :created
        else
          render json: { errors: suppression.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        suppression = current_tenant.suppressions.find(params[:id])
        suppression.destroy!
        head :no_content
      end

      private

      def suppression_params
        params.permit(:email, :reason, :note)
      end
    end
  end
end
