# Serves the built React frontend (frontend/dist/index.html) so the SPA and the
# API share one origin in production. Hashed JS/CSS bundles are served from
# public/assets by the static file server; index.html is revalidated on every
# load so a deploy is picked up immediately.
class SpaController < ApplicationController
  def index
    index_path = Rails.configuration.x.spa_index_path
    return head :not_found unless File.file?(index_path.to_s)

    response.headers["Cache-Control"] = "no-cache"
    send_file index_path, type: "text/html", disposition: "inline"
  end
end
