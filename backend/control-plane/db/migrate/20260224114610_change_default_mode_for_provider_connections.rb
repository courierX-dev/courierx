class ChangeDefaultModeForProviderConnections < ActiveRecord::Migration[8.1]
  def change
    change_column_default :provider_connections, :mode, from: nil, to: 'byok'
  end
end

