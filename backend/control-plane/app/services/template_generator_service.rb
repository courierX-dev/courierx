# frozen_string_literal: true

# TemplateGeneratorService
#
# Generates email template HTML/text from a natural-language prompt.
# Uses the Anthropic Claude API when ANTHROPIC_API_KEY is configured,
# otherwise falls back to a built-in template library.
#
#   result = TemplateGeneratorService.call(
#     prompt:   "welcome email for new SaaS users",
#     category: "onboarding",
#     tenant:   tenant
#   )
#   result[:success]  # => true
#   result[:template] # => { name:, subject:, html_body:, text_body:, variables: [] }
#
class TemplateGeneratorService
  def self.call(prompt:, category: nil, tenant: nil)
    new(prompt:, category:, tenant:).call
  end

  def initialize(prompt:, category: nil, tenant: nil)
    @prompt   = prompt
    @category = category
    @tenant   = tenant
  end

  def call
    if anthropic_key.present?
      generate_with_ai
    else
      generate_fallback
    end
  rescue => e
    Rails.logger.error("[TemplateGenerator] Error: #{e.message}")
    { success: false, error: e.message }
  end

  private

  def anthropic_key
    ENV["ANTHROPIC_API_KEY"]
  end

  def generate_with_ai
    response = Net::HTTP.post(
      URI("https://api.anthropic.com/v1/messages"),
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: build_ai_prompt }]
      }.to_json,
      {
        "Content-Type"      => "application/json",
        "x-api-key"         => anthropic_key,
        "anthropic-version" => "2023-06-01"
      }
    )

    body = JSON.parse(response.body)

    if response.code.to_i != 200
      return { success: false, error: body.dig("error", "message") || "AI generation failed" }
    end

    text = body.dig("content", 0, "text") || ""
    parse_ai_response(text)
  end

  def build_ai_prompt
    <<~PROMPT
      Generate an email template based on this description: "#{@prompt}"

      #{"Category: #{@category}" if @category.present?}

      Return a JSON object with these fields:
      - name: short template name (e.g. "Welcome Email")
      - subject: email subject line, use {{variable}} for Handlebars placeholders
      - html_body: responsive HTML email body with inline CSS. Use {{variable}} for dynamic content. Keep it clean, professional, and mobile-friendly.
      - text_body: plain text version of the email
      - variables: array of objects with { "name": "variable_name", "default": "default_value", "required": true/false }

      Guidelines:
      - Use Handlebars syntax for variables: {{first_name}}, {{company_name}}, etc.
      - HTML should be table-based for email client compatibility
      - Include a preheader text
      - Use a max-width of 600px
      - Include unsubscribe link placeholder: {{unsubscribe_url}}
      - Keep the design clean with a single accent color

      Return ONLY the JSON object, no markdown fences or explanation.
    PROMPT
  end

  def parse_ai_response(text)
    # Strip markdown fences if present
    json_str = text.gsub(/\A```(?:json)?\s*/, "").gsub(/\s*```\z/, "").strip
    template = JSON.parse(json_str)

    {
      success: true,
      template: {
        name:      template["name"],
        subject:   template["subject"],
        html_body: template["html_body"],
        text_body: template["text_body"],
        variables: template["variables"] || []
      }
    }
  rescue JSON::ParserError => e
    { success: false, error: "Failed to parse AI response: #{e.message}" }
  end

  # Fallback templates when no AI API key is configured
  def generate_fallback
    template = find_matching_fallback
    { success: true, template: template }
  end

  def find_matching_fallback
    prompt_lower = @prompt.downcase

    if prompt_lower.match?(/welcome|onboard|signup|sign.up|getting.started/)
      welcome_template
    elsif prompt_lower.match?(/reset|password|forgot/)
      password_reset_template
    elsif prompt_lower.match?(/confirm|verify|activation/)
      confirmation_template
    elsif prompt_lower.match?(/invoice|receipt|payment|billing/)
      invoice_template
    elsif prompt_lower.match?(/newsletter|update|digest|weekly/)
      newsletter_template
    else
      generic_template
    end
  end

  def welcome_template
    {
      name: "Welcome Email",
      subject: "Welcome to {{company_name}}, {{first_name}}!",
      html_body: wrap_html(<<~HTML),
        <h1 style="color: #333; margin: 0 0 16px;">Welcome, {{first_name}}! 👋</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Thanks for joining {{company_name}}. We're excited to have you on board.
        </p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Here's what you can do next:
        </p>
        <ul style="color: #555; font-size: 16px; line-height: 1.8;">
          <li>Complete your profile</li>
          <li>Explore the dashboard</li>
          <li>Send your first email</li>
        </ul>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td style="background: #2563eb; border-radius: 6px;">
              <a href="{{dashboard_url}}" style="display: inline-block; padding: 12px 24px; color: #fff; text-decoration: none; font-weight: 600;">Get Started</a>
            </td>
          </tr>
        </table>
      HTML
      text_body: "Welcome, {{first_name}}!\n\nThanks for joining {{company_name}}. We're excited to have you on board.\n\nGet started: {{dashboard_url}}\n\nBest,\nThe {{company_name}} Team",
      variables: [
        { "name" => "first_name", "default" => "there", "required" => true },
        { "name" => "company_name", "default" => "CourierX", "required" => true },
        { "name" => "dashboard_url", "default" => "https://app.example.com", "required" => false }
      ]
    }
  end

  def password_reset_template
    {
      name: "Password Reset",
      subject: "Reset your {{company_name}} password",
      html_body: wrap_html(<<~HTML),
        <h1 style="color: #333; margin: 0 0 16px;">Password Reset</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          We received a request to reset the password for your account. Click the button below to set a new password.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td style="background: #2563eb; border-radius: 6px;">
              <a href="{{reset_url}}" style="display: inline-block; padding: 12px 24px; color: #fff; text-decoration: none; font-weight: 600;">Reset Password</a>
            </td>
          </tr>
        </table>
        <p style="color: #888; font-size: 14px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      HTML
      text_body: "Password Reset\n\nWe received a request to reset your password. Visit this link to set a new one:\n\n{{reset_url}}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.",
      variables: [
        { "name" => "company_name", "default" => "CourierX", "required" => true },
        { "name" => "reset_url", "default" => "https://app.example.com/reset", "required" => true }
      ]
    }
  end

  def confirmation_template
    {
      name: "Email Confirmation",
      subject: "Confirm your email address",
      html_body: wrap_html(<<~HTML),
        <h1 style="color: #333; margin: 0 0 16px;">Confirm Your Email</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Please confirm your email address by clicking the button below.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td style="background: #2563eb; border-radius: 6px;">
              <a href="{{confirmation_url}}" style="display: inline-block; padding: 12px 24px; color: #fff; text-decoration: none; font-weight: 600;">Confirm Email</a>
            </td>
          </tr>
        </table>
      HTML
      text_body: "Confirm your email address by visiting:\n\n{{confirmation_url}}",
      variables: [
        { "name" => "confirmation_url", "default" => "https://app.example.com/confirm", "required" => true }
      ]
    }
  end

  def invoice_template
    {
      name: "Invoice / Receipt",
      subject: "Your receipt from {{company_name}} — {{amount}}",
      html_body: wrap_html(<<~HTML),
        <h1 style="color: #333; margin: 0 0 16px;">Payment Receipt</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Hi {{first_name}}, here's your receipt for your recent payment.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #888;">Amount</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{amount}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #888;">Date</td>
            <td style="padding: 8px 0; text-align: right;">{{date}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Invoice #</td>
            <td style="padding: 8px 0; text-align: right;">{{invoice_number}}</td>
          </tr>
        </table>
      HTML
      text_body: "Payment Receipt\n\nAmount: {{amount}}\nDate: {{date}}\nInvoice #: {{invoice_number}}\n\nThank you for your payment!",
      variables: [
        { "name" => "first_name", "default" => "there", "required" => false },
        { "name" => "company_name", "default" => "CourierX", "required" => true },
        { "name" => "amount", "default" => "$0.00", "required" => true },
        { "name" => "date", "default" => "2026-01-01", "required" => true },
        { "name" => "invoice_number", "default" => "INV-001", "required" => true }
      ]
    }
  end

  def newsletter_template
    {
      name: "Newsletter",
      subject: "{{company_name}} — {{title}}",
      html_body: wrap_html(<<~HTML),
        <h1 style="color: #333; margin: 0 0 16px;">{{title}}</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          {{intro}}
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          {{content}}
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td style="background: #2563eb; border-radius: 6px;">
              <a href="{{cta_url}}" style="display: inline-block; padding: 12px 24px; color: #fff; text-decoration: none; font-weight: 600;">{{cta_text}}</a>
            </td>
          </tr>
        </table>
      HTML
      text_body: "{{title}}\n\n{{intro}}\n\n{{content}}\n\n{{cta_text}}: {{cta_url}}",
      variables: [
        { "name" => "company_name", "default" => "CourierX", "required" => true },
        { "name" => "title", "default" => "Weekly Update", "required" => true },
        { "name" => "intro", "default" => "Here's what's new this week.", "required" => false },
        { "name" => "content", "default" => "", "required" => false },
        { "name" => "cta_url", "default" => "https://example.com", "required" => false },
        { "name" => "cta_text", "default" => "Read More", "required" => false }
      ]
    }
  end

  def generic_template
    {
      name: "Custom Email",
      subject: "{{subject}}",
      html_body: wrap_html(<<~HTML),
        <h1 style="color: #333; margin: 0 0 16px;">{{heading}}</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          {{body}}
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
          <tr>
            <td style="background: #2563eb; border-radius: 6px;">
              <a href="{{cta_url}}" style="display: inline-block; padding: 12px 24px; color: #fff; text-decoration: none; font-weight: 600;">{{cta_text}}</a>
            </td>
          </tr>
        </table>
      HTML
      text_body: "{{heading}}\n\n{{body}}\n\n{{cta_text}}: {{cta_url}}",
      variables: [
        { "name" => "subject", "default" => "Hello", "required" => true },
        { "name" => "heading", "default" => "Hello", "required" => true },
        { "name" => "body", "default" => "", "required" => true },
        { "name" => "cta_url", "default" => "https://example.com", "required" => false },
        { "name" => "cta_text", "default" => "Learn More", "required" => false }
      ]
    }
  end

  def wrap_html(content)
    <<~HTML
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{subject}}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #f4f4f5;">
          <tr>
            <td align="center" style="padding: 40px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background: #fff; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 32px 40px;">
                    #{content.strip}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background: #fafafa; border-top: 1px solid #eee;">
                    <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                      You're receiving this because you signed up. <a href="{{unsubscribe_url}}" style="color: #999;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    HTML
  end
end
