class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  # All tables use UUID primary keys
  self.implicit_order_column = "created_at"
end
