# frozen_string_literal: true

module Api
  module V1
    class WaitlistController < ApplicationController
      # No auth required — public endpoints

      # POST /api/v1/waitlist
      def create
        entry = WaitlistEntry.new(waitlist_params)

        # Track referral
        if params[:referral_code].present?
          referrer = WaitlistEntry.find_by(referral_code: params[:referral_code])
          entry.referred_by = referrer&.referral_code
        end

        if entry.save
          render json: {
            message: "You're on the waitlist!",
            position: entry.position,
            referral_code: entry.referral_code,
            referral_link: "https://courierx.dev/waitlist?ref=#{entry.referral_code}"
          }, status: :created
        else
          render json: { errors: entry.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/waitlist/status?email=user@example.com
      def status
        entry = WaitlistEntry.find_by(email: params[:email]&.downcase&.strip)

        unless entry
          return render json: { error: "Email not found on waitlist" }, status: :not_found
        end

        ahead = WaitlistEntry.pending.where("position < ?", entry.position).count

        render json: {
          email: entry.email,
          position: entry.position,
          people_ahead: ahead,
          status: entry.status,
          referral_code: entry.referral_code,
          referral_count: entry.referral_count,
          joined_at: entry.created_at
        }
      end

      private

      def waitlist_params
        params.permit(:email, :name, :company, :use_case)
      end
    end
  end
end
