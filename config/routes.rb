Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root "spa#index"

  namespace :api do
    namespace :v1 do
      resources :neighborhoods, only: [ :index, :show ] do
        collection do
          get :compare
        end
      end
      resources :health_establishments, only: [ :index, :show ]
      get :filter_options, to: "filter_options#index"

      namespace :dashboard do
        get :overview
        get :equipment_by_neighborhood
        get :service_summary
      end
    end
  end
end
