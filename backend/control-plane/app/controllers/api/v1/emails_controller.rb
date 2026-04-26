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

        per = params[:per_page].present? ? params[:per_page].to_i.clamp(1, 100) : 25
        emails = emails.page(params[:page] || 1).per(per) if emails.respond_to?(:page)
        emails = emails.limit(per) unless emails.respond_to?(:page)

        render json: emails.map { |e| email_json(e) }
      end

      # GET /api/v1/emails/:id
      def show
        email = current_tenant.emails.find(params[:id])
        render json: email_json(email).merge(
          html_body: email.html_body,
          text_body: email.text_body,
          reply_to:  email.reply_to,
          metadata:  email.metadata,
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
        dispatch_params = normalized_email_params

        missing = %i[to_email from_email subject].select { |k| dispatch_params[k].to_s.strip.empty? }
        if missing.any?
          return render json: { error: "Missing required fields: #{missing.join(', ')}" },
                        status: :unprocessable_entity
        end

        if dispatch_params[:html_body].to_s.strip.empty? &&
           dispatch_params[:text_body].to_s.strip.empty? &&
           dispatch_params[:template_id].blank?
          return render json: { error: "Provide html_body, text_body, or template_id" },
                        status: :unprocessable_entity
        end

        result = EmailDispatchService.call(tenant: current_tenant, params: dispatch_params)

        if result[:success]
          render json: { email: email_json(result[:email]) }, status: :accepted
        else
          render json: { error: result[:error] }, status: :unprocessable_entity
        end
      end

      private

      def email_params
        params.permit(:from_email, :from, :from_name, :to_email, :to, :to_name, :reply_to,
                       :subject, :html_body, :html, :text_body, :text, :template_id,
                       tags: [], metadata: {}, variables: {})
      end

      # Accept the widely-used short field names (to, from, html, text) as aliases
      # for the canonical ones so the API matches what developers expect from
      # SendGrid/Resend/Postmark/Mailgun.
      def normalized_email_params
        p = email_params.to_h.symbolize_keys
        p[:to_email]  ||= p.delete(:to)
        p[:from_email] ||= p.delete(:from)
        p[:html_body]  ||= p.delete(:html)
        p[:text_body]  ||= p.delete(:text)
        p
      end

      def email_json(email)
        {
          id: email.id,
          from_email: email.from_email,
          to_email: email.to_email,
          subject: email.subject,
          status: email.status,
          # Display layer — see Email#display_status / EmailErrorTranslator.
          # Frontend should render display_status + display_message instead
          # of computing these from status/last_error itself.
          display_status:  email.display_status,
          display_message: email.display_message,
          display_cta:     email.display_cta,
          last_error:      email.last_error,
          provider:               email.provider_connection&.provider,
          provider_display_name:  email.provider_connection&.display_name,
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
