# frozen_string_literal: true

module Api
  module V1
    class InvitationsController < BaseController
      # Public endpoints that don't require tenant auth
      skip_before_action :authenticate_request!, only: [:show, :accept]

      # GET /api/v1/invitations
      def index
        invitations = current_tenant.invitations.recent

        invitations = invitations.where(status: params[:status]) if params[:status].present?

        render json: invitations.map { |i| invitation_json(i) }
      end

      # POST /api/v1/invitations
      def create
        # Can only be done by an admin/owner (in the future — check membership role)
        email = params[:email].to_s.downcase.strip
        role  = params[:role] || "developer"

        # Check if already a member
        existing_user = User.find_by(email: email)
        if existing_user && current_tenant.memberships.exists?(user_id: existing_user.id)
          return render json: { error: "User is already a member of this workspace" }, status: :unprocessable_entity
        end

        # Check for existing pending invitation
        if current_tenant.invitations.pending.where(email: email).exists?
          return render json: { error: "A pending invitation already exists for this email" }, status: :unprocessable_entity
        end

        invited_by = find_inviting_user
        unless invited_by
          return render json: { error: "Could not identify inviter" }, status: :unprocessable_entity
        end

        invitation = current_tenant.invitations.new(
          email:       email,
          role:        role,
          invited_by:  invited_by
        )

        if invitation.save
          InvitationMailerJob.perform_async(invitation.id) if defined?(InvitationMailerJob)
          render json: invitation_json(invitation, include_token: true), status: :created
        else
          render json: { error: invitation.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/invitations/:token (public — look up invitation by token)
      def show
        invitation = Invitation.find_by(token: params[:id])
        return render json: { error: "Invitation not found" }, status: :not_found unless invitation

        if invitation.expired? && invitation.status == "pending"
          invitation.update!(status: "expired")
        end

        render json: {
          email:       invitation.email,
          role:        invitation.role,
          tenant_name: invitation.tenant.name,
          status:      invitation.status,
          expires_at:  invitation.expires_at
        }
      end

      # POST /api/v1/invitations/:token/accept (public — accept with user credentials)
      def accept
        invitation = Invitation.find_by(token: params[:id])
        return render json: { error: "Invitation not found" }, status: :not_found unless invitation

        unless invitation.can_accept?
          return render json: { error: "Invitation is no longer valid" }, status: :unprocessable_entity
        end

        # Find or create user with the invited email
        user = User.find_by(email: invitation.email)
        if user.nil?
          user = User.new(
            email:      invitation.email,
            first_name: params[:first_name],
            last_name:  params[:last_name]
          )
          # Set password if password_digest column exists (it might not)
          if user.respond_to?(:password=) && params[:password].present?
            user.password = params[:password]
          end
          return render json: { error: user.errors.full_messages.join(", ") }, status: :unprocessable_entity unless user.save
        end

        if invitation.accept!(user)
          render json: {
            user: { id: user.id, email: user.email },
            tenant: { id: invitation.tenant.id, name: invitation.tenant.name },
            membership: { role: invitation.role }
          }
        else
          render json: { error: "Could not accept invitation" }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/invitations/:id/revoke
      def revoke
        invitation = current_tenant.invitations.find(params[:id])
        invitation.revoke!
        render json: invitation_json(invitation)
      end

      # POST /api/v1/invitations/:id/resend
      def resend
        invitation = current_tenant.invitations.find(params[:id])

        unless invitation.status == "pending" || invitation.status == "expired"
          return render json: { error: "Can only resend pending or expired invitations" }, status: :unprocessable_entity
        end

        invitation.update!(
          token:      SecureRandom.urlsafe_base64(32),
          expires_at: 7.days.from_now,
          status:     "pending"
        )

        InvitationMailerJob.perform_async(invitation.id) if defined?(InvitationMailerJob)

        render json: invitation_json(invitation, include_token: true)
      end

      private

      def find_inviting_user
        # In the current auth model, we authenticate the tenant directly.
        # When user-level auth lands, switch to @current_user.
        # For now, find the first owner/admin user of the tenant, or fall back to any user.
        current_tenant.memberships.where(role: %w[owner admin]).first&.user ||
          current_tenant.memberships.first&.user
      end

      def invitation_json(inv, include_token: false)
        json = {
          id:         inv.id,
          email:      inv.email,
          role:       inv.role,
          status:     inv.status,
          expires_at: inv.expires_at,
          accepted_at: inv.accepted_at,
          created_at: inv.created_at
        }
        json[:invite_url] = invite_url(inv.token) if include_token
        json
      end

      def invite_url(token)
        base = ENV["DASHBOARD_URL"] || "http://localhost:3033"
        "#{base}/invite/#{token}"
      end
    end
  end
end
