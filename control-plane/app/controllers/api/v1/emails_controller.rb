# frozen_string_literal: true

module Api
  module V1
    class EmailsController < BaseController
      # GET /api/v1/emails
      def index
        emails = current_tenant.emails.recent

        # Filters
        emails = emails.by_status(params[:status]) if params[:status].present?
        emails = emails.where("to_email ILIKE ?", "%#{params[:recipient]}%") if params[:recipient].present?
        emails = emails.where("created_at >= ?", params[:from]) if params[:from].present?
        emails = emails.where("created_at <= ?", params[:to])   if params[:to].present?

        emails = emails.page(params[:page] || 1).per(params[:per_page] || 25) if emails.respond_to?(:page)
        emails = emails.limit(params[:per_page]&.to_i || 25) unless emails.respond_to?(:page)

        render json: emails.map { |e| email_json(e) }
      end

      # GET /api/v1/emails/:id
      def show
        email = current_tenant.emails.find(params[:id])
        render json: email_json(email).merge(
          events: email.email_events.order(occurred_at: :desc).map { |ev|
            {
              id: ev.id,
              event_type: ev.event_type,
              occurred_at: ev.occurred_at,
              provider: ev.provider,
              bounce_type: ev.bounce_type,
              bounce_code: ev.bounce_code,
              link_url: ev.link_url
            }
          }
        )
      end

      # POST /api/v1/emails
      def create
        result = EmailDispatchService.call(
          tenant: current_tenant,
          params: email_params
        )

        if result[:success]
          render json: { email: email_json(result[:email]) }, status: :accepted
        else
          render json: { error: result[:error] }, status: :unprocessable_entity
        end
      end

      private

      def email_params
        params.permit(:from_email, :from_name, :to_email, :to_name, :reply_to,
                       :subject, :html_body, :text_body, tags: [], metadata: {})
      end

      def email_json(email)
        {
          id: email.id,
          from_email: email.from_email,
          to_email: email.to_email,
          subject: email.subject,
          status: email.status,
          provider_message_id: email.provider_message_id,
          tags: email.tags,
          queued_at: email.queued_at,
          sent_at: email.sent_at,
          delivered_at: email.delivered_at,
          created_at: email.created_at
        }
      end
    end
  end
end
