# frozen_string_literal: true

class EmailTemplate < ApplicationRecord
  STATUSES   = %w[draft active archived].freeze
  CATEGORIES = %w[transactional marketing notification onboarding].freeze

  belongs_to :tenant
  has_many   :emails, dependent: :nullify

  validates :name,    presence: true, uniqueness: { scope: :tenant_id }
  validates :status,  presence: true, inclusion: { in: STATUSES }
  validates :category, inclusion: { in: CATEGORIES }, allow_blank: true

  scope :active,   -> { where(status: "active") }
  scope :draft,    -> { where(status: "draft") }
  scope :archived, -> { where(status: "archived") }
  scope :recent,   -> { order(updated_at: :desc) }

  # Render the template with provided variables using Handlebars syntax.
  # This uses a simple Ruby-side renderer for preview; the Go engine
  # handles rendering at send time for production performance.
  def render_preview(vars = {})
    {
      subject:   render_handlebars(subject, vars),
      html_body: render_handlebars(html_body, vars),
      text_body: render_handlebars(text_body, vars)
    }
  end

  def activate!
    update!(status: "active")
  end

  def archive!
    update!(status: "archived")
  end

  private

  def render_handlebars(source, vars)
    return source if source.blank? || vars.blank?

    result = source.dup
    vars.each do |key, value|
      result.gsub!(/\{\{\s*#{Regexp.escape(key.to_s)}\s*\}\}/, value.to_s)
    end
    result
  end
end
