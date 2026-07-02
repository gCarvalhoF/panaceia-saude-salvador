module DataImport
  class NeighborhoodImporter < BaseImporter
    def call
      log "Importing neighborhoods..."
      path = ibge_geo_data_path("BA_bairros_CD2022.geojson")
      geojson = JSON.parse(File.read(path))
      count = 0
      skipped = 0

      geojson["features"].each do |feature|
        props = feature["properties"]

        unless salvador_neighborhood?(props)
          skipped += 1
          next
        end

        name = props["NM_BAIRRO"]&.strip
        neighborhood_ibge_code = props["CD_BAIRRO"]
        next if neighborhood_ibge_code.blank?

        wkt_geometry = build_geometry_wkt(feature["geometry"])

        neighborhood_attrs = build_neighborhood_attributes(props)

        neighborhood = Neighborhood.find_or_initialize_by(neighborhood_ibge_code: neighborhood_ibge_code)
        neighborhood.geometry = wkt_geometry if wkt_geometry
        neighborhood.assign_attributes(neighborhood_attrs)

        neighborhood.save!
        count += 1
      rescue => e
        Rails.logger.warn "Could not import neighborhood '#{name}': #{e.message}"
      end

      log "Imported #{count} neighborhoods (skipped #{skipped} outside Salvador)"
      count
    end

    private

    def salvador_neighborhood?(props)
      props["CD_MUN"]&.start_with?(SALVADOR_MUNICIPALITY_CODE)
    end

    def ibge_neighborhood_data_mapping
      {
        "CD_REGIAO": :region_ibge_code,
        "NM_REGIAO": :region_name,
        "CD_UF": :state_ibge_code,
        "NM_UF": :state_name,
        "CD_MUN": :city_ibge_code,
        "NM_MUN": :city_name,
        "CD_DIST": :district_ibge_code,
        "NM_DIST": :district_name,
        "CD_SUBDIST": :subdistrict_ibge_code,
        "NM_SUBDIST": :subdistrict_name,
        "CD_BAIRRO": :neighborhood_ibge_code,
        "NM_BAIRRO": :name,
        "AREA_KM2": :area_km2,
        "v0001": :population_total
      }
    end

    def build_neighborhood_attributes(props)
      attributes = {}

      props.each do |key, value|
        mapped_key = ibge_neighborhood_data_mapping[key.to_sym]

        attributes[mapped_key] = value if mapped_key
      end

      attributes
    end

    def build_geometry_wkt(geometry)
      return nil if geometry.nil?

      coords = geometry["coordinates"]
      type = geometry["type"]

      case type
      when "Polygon"
        rings = coords.map { |ring| ring.map { |pt| "#{pt[0]} #{pt[1]}" }.join(", ") }
        "SRID=4326;POLYGON((#{rings.join('), (')}))"
      when "MultiPolygon"
        polygons = coords.map do |poly|
          rings = poly.map { |ring| ring.map { |pt| "#{pt[0]} #{pt[1]}" }.join(", ") }
          "((#{rings.join('), (')}))"
        end
        "SRID=4326;MULTIPOLYGON(#{polygons.join(', ')})"
      end
    end
  end
end
