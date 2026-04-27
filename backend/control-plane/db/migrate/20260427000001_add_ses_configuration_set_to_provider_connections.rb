class AddSesConfigurationSetToProviderConnections < ActiveRecord::Migration[8.1]
  # SES open/click tracking requires a Configuration Set with event publishing
  # to SNS/Firehose configured by the tenant on the AWS side. We store the
  # configuration set name and forward it on each /v1/send call so SES applies
  # the right tracking pipeline without per-message AWS configuration.
  def change
    add_column :provider_connections, :ses_configuration_set, :string
  end
end
