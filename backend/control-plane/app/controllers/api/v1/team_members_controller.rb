# frozen_string_literal: true

module Api
  module V1
    class TeamMembersController < BaseController
      # GET /api/v1/team_members
      def index
        memberships = current_tenant.memberships.includes(:user)

        render json: memberships.map { |m| member_json(m) }
      end

      # PATCH /api/v1/team_members/:id
      def update
        membership = current_tenant.memberships.find(params[:id])

        if membership.update(role: params[:role])
          render json: member_json(membership)
        else
          render json: { error: membership.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/team_members/:id
      def destroy
        membership = current_tenant.memberships.find(params[:id])

        # Prevent removing the last owner
        if membership.role == "owner" && current_tenant.memberships.where(role: "owner").count <= 1
          return render json: { error: "Cannot remove the last owner" }, status: :unprocessable_entity
        end

        membership.destroy!
        head :no_content
      end

      private

      def member_json(m)
        {
          id:         m.id,
          user_id:    m.user_id,
          email:      m.user.email,
          full_name:  m.user.full_name,
          role:       m.role,
          joined_at:  m.created_at
        }
      end
    end
  end
end
