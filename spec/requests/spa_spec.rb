require "rails_helper"

RSpec.describe "SPA", type: :request do
  it "defaults to the Vite build output" do
    expect(Rails.application.config.x.spa_index_path)
      .to eq(Rails.root.join("frontend", "dist", "index.html"))
  end

  describe "GET /" do
    let(:index_dir) { Dir.mktmpdir }
    let(:index_path) { Pathname.new(index_dir).join("index.html") }

    around do |example|
      original = Rails.configuration.x.spa_index_path
      Rails.configuration.x.spa_index_path = index_path
      example.run
    ensure
      Rails.configuration.x.spa_index_path = original
      FileUtils.remove_entry(index_dir)
    end

    context "when the frontend build exists" do
      before { File.write(index_path, "<!doctype html><div id=\"root\"></div>") }

      it "serves the built index.html as HTML" do
        get "/"

        expect(response).to have_http_status(:ok)
        expect(response.media_type).to eq("text/html")
        expect(response.body).to include('<div id="root"></div>')
      end

      it "tells browsers and Cloudflare to revalidate it on every load" do
        get "/"

        expect(response.headers["Cache-Control"]).to eq("no-cache")
      end
    end

    context "when the frontend has not been built" do
      it "returns 404" do
        get "/"

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  it "keeps the API routes intact" do
    get "/api/v1/filter_options"

    expect(response).to have_http_status(:ok)
  end
end
