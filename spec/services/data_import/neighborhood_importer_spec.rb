require "rails_helper"

RSpec.describe DataImport::NeighborhoodImporter do
  describe ".call" do
    it "imports neighborhoods from GeoJSON file" do
      expect { described_class.call }
        .to change(Neighborhood, :count).by_at_least(1)
    end

    it "is idempotent (does not duplicate on re-run)" do
      described_class.call
      count_after_first = Neighborhood.count

      described_class.call
      expect(Neighborhood.count).to eq(count_after_first)
    end

    it "creates neighborhoods with names" do
      described_class.call
      expect(Neighborhood.where.not(name: nil).count).to eq(Neighborhood.count)
    end

    it "imports only Salvador neighborhoods" do
      described_class.call
      expect(Neighborhood.where.not(city_ibge_code: "2927408")).to be_empty
    end

    it "imports every Salvador neighborhood from the GeoJSON file" do
      described_class.call
      expect(Neighborhood.count).to eq(170)
    end
  end
end
