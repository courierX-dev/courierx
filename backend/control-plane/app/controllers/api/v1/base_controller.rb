# frozen_string_literal: true

module Api
  module V1
    class BaseController < ApplicationController
      include Authenticatable
      include Paginatable
      include RateLimitable
    end
  end
end
