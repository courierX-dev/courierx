# frozen_string_literal: true

module McpTools
  class SendEmail < Base
    def call
      missing = %i[to from subject].select { |k| args[k].to_s.strip.empty? }
      return error("Missing required fields: #{missing.join(', ')}") if missing.any?

      if args[:html].to_s.strip.empty? &&
         args[:text].to_s.strip.empty? &&
         args[:template_id].blank?
        return error("Provide html, text, or template_id")
      end

      from_email = args[:from].to_s
      if connection.allowed_from_emails.present? && !connection.allowed_from_emails.include?(from_email)
        return error("from '#{from_email}' is not in this connection's allowed_from_emails list")
      end

      tags = Array(args[:tags]).map(&:to_s)
      if connection.allowed_tags.present? && tags.any? && !(tags - connection.allowed_tags).empty?
        return error("One or more tags are not in this connection's allowed_tags list")
      end

      if connection.max_emails_per_run && connection.total_emails_sent >= connection.max_emails_per_run
        return error("Connection has hit its max_emails_per_run cap (#{connection.max_emails_per_run})")
      end

      if connection.require_approval
        return error("This connection requires human approval. Tool-level approval workflow not yet implemented.")
      end

      dispatch_params = {
        to_email:    args[:to],
        to_name:     args[:to_name],
        from_email:  from_email,
        from_name:   args[:from_name],
        reply_to:    args[:reply_to],
        subject:     args[:subject],
        html_body:   args[:html],
        text_body:   args[:text],
        template_id: args[:template_id],
        variables:   args[:variables],
        tags:        tags,
        metadata:    (args[:metadata] || {}).merge(mcp_connection_id: connection.id)
      }

      result = EmailDispatchService.call(tenant: tenant, params: dispatch_params)

      if result[:success]
        email = result[:email]
        email.update_column(:mcp_connection_id, connection.id) if email&.id
        connection.increment_sent! if email&.persisted?
        ok(
          "Email queued (id=#{email.id}, status=#{email.status})",
          { id: email.id, status: email.status, to: email.to_email, subject: email.subject }
        )
      else
        error(result[:error] || "Send failed")
      end
    end
  end
end
