# frozen_string_literal: true

module Api
  module V1
    class EmailTemplatesController < BaseController
      # GET /api/v1/email_templates
      def index
        templates = current_tenant.email_templates.recent

        templates = templates.where(status: params[:status]) if params[:status].present?
        templates = templates.where(category: params[:category]) if params[:category].present?
        templates = templates.where("name ILIKE ?", "%#{params[:q]}%") if params[:q].present?

        render json: templates.map { |t| template_json(t) }
      end

      # GET /api/v1/email_templates/:id
      def show
        template = current_tenant.email_templates.find(params[:id])
        render json: template_json(template, full: true)
      end

      # POST /api/v1/email_templates
      def create
        template = current_tenant.email_templates.new(template_params)

        if template.save
          render json: template_json(template, full: true), status: :created
        else
          render json: { error: template.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/email_templates/:id
      def update
        template = current_tenant.email_templates.find(params[:id])

        if template.update(template_params)
          render json: template_json(template, full: true)
        else
          render json: { error: template.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/email_templates/:id
      def destroy
        template = current_tenant.email_templates.find(params[:id])
        template.destroy!
        head :no_content
      end

      # POST /api/v1/email_templates/:id/preview
      # Renders the template with sample variables
      def preview
        template = current_tenant.email_templates.find(params[:id])
        variables = params[:variables]&.to_unsafe_h || {}

        rendered = template.render_preview(variables)
        render json: rendered
      end

      # POST /api/v1/email_templates/:id/duplicate
      def duplicate
        original = current_tenant.email_templates.find(params[:id])

        copy = current_tenant.email_templates.new(
          name:        "#{original.name} (copy)",
          description: original.description,
          subject:     original.subject,
          html_body:   original.html_body,
          text_body:   original.text_body,
          category:    original.category,
          variables:   original.variables,
          status:      "draft"
        )

        if copy.save
          render json: template_json(copy, full: true), status: :created
        else
          render json: { error: copy.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/email_templates/generate
      # AI-powered template generation from a text prompt
      def generate
        prompt = params[:prompt]
        return render json: { error: "prompt is required" }, status: :unprocessable_entity if prompt.blank?

        generated = TemplateGeneratorService.call(
          prompt:   prompt,
          category: params[:category],
          tenant:   current_tenant
        )

        if generated[:success]
          render json: generated[:template]
        else
          render json: { error: generated[:error] }, status: :unprocessable_entity
        end
      end

      private

      def template_params
        params.permit(:name, :description, :subject, :html_body, :text_body,
                      :category, :status, variables: [:name, :default, :required])
      end

      def template_json(template, full: false)
        json = {
          id:          template.id,
          name:        template.name,
          description: template.description,
          subject:     template.subject,
          category:    template.category,
          status:      template.status,
          version:     template.version,
          variables:   template.variables,
          created_at:  template.created_at,
          updated_at:  template.updated_at
        }

        if full
          json[:html_body] = template.html_body
          json[:text_body] = template.text_body
          json[:metadata]  = template.metadata
        end

        json
      end
    end
  end
end
