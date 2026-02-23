# frozen_string_literal: true

# Paginatable
#
# Include in controllers to get `paginate(scope)` helper.
# Sets X-Total-Count, X-Page, X-Per-Page, X-Total-Pages headers.
#
module Paginatable
  extend ActiveSupport::Concern

  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE     = 100

  private

  def paginate(scope)
    page     = [params.fetch(:page, 1).to_i, 1].max
    per_page = [params.fetch(:per_page, DEFAULT_PER_PAGE).to_i, MAX_PER_PAGE].min
    per_page = [per_page, 1].max

    total = scope.count
    total_pages = (total.to_f / per_page).ceil

    records = scope.offset((page - 1) * per_page).limit(per_page)

    response.set_header("X-Total-Count", total.to_s)
    response.set_header("X-Page",        page.to_s)
    response.set_header("X-Per-Page",    per_page.to_s)
    response.set_header("X-Total-Pages", total_pages.to_s)

    records
  end
end
