require "rails_helper"
require "open3"

# Boots the app in production mode in a subprocess (config only, no DB access)
# so the real config/environments/production.rb is what's under test.
RSpec.describe "Production host authorization" do
  def production_config(rails_hosts)
    env = {
      "RAILS_ENV" => "production",
      "SECRET_KEY_BASE" => "dummy",
      "RAILS_HOSTS" => rails_hosts
    }
    script = <<~RUBY
      require "json"
      exclude = Rails.application.config.host_authorization[:exclude]
      health = ActionDispatch::Request.new(Rack::MockRequest.env_for("/up"))
      api = ActionDispatch::Request.new(Rack::MockRequest.env_for("/api/v1/filter_options"))
      puts JSON.dump(
        hosts: Rails.application.config.hosts.map(&:to_s),
        excludes_health: exclude.call(health),
        excludes_api: exclude.call(api)
      )
    RUBY
    stdout, stderr, status = Open3.capture3(env, "bin/rails", "runner", script, chdir: Rails.root.to_s)
    raise "production boot failed: #{stderr}" unless status.success?

    JSON.parse(stdout.lines.last)
  end

  it "allows only the hosts listed in RAILS_HOSTS" do
    config = production_config(" panaceia.gabrielcf.com, 192.168.68.210 ,")

    expect(config["hosts"]).to eq([ "panaceia.gabrielcf.com", "192.168.68.210" ])
  end

  it "skips host checks for the /up health endpoint only" do
    config = production_config("panaceia.gabrielcf.com")

    expect(config["excludes_health"]).to be(true)
    expect(config["excludes_api"]).to be(false)
  end

  it "allows any host when RAILS_HOSTS is unset" do
    config = production_config("")

    expect(config["hosts"]).to eq([])
  end
end
