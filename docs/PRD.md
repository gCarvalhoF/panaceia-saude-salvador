# PRD - Dashboard Interativo de Acesso a Saude Publica em Salvador

## 1. Visao Geral

Dashboard com mapa interativo para visualizacao e analise da distribuicao de equipamentos, estabelecimentos e servicos de saude publica em Salvador, Bahia. O sistema cruza dados do CNES (Cadastro Nacional de Estabelecimentos de Saude), Censo IBGE e GeoJSON de bairros para oferecer uma visao espacial do acesso a saude no municipio.

**Stack:** Ruby on Rails 8 (API) + React + Vite (frontend standalone) + PostgreSQL/PostGIS + Leaflet.js

---

## Diagramas

### Casos de Uso

```mermaid
flowchart LR
    U((Usuário))

    subgraph Mapa Interativo
        A[Visualizar bairros no mapa]
        B[Visualizar estabelecimentos de saúde]
        C[Ver detalhes de um estabelecimento]
        D[Alternar métrica coroplética]
    end

    subgraph Filtros
        E[Filtrar por tipo de estabelecimento]
        F[Filtrar por natureza jurídica]
        G[Filtrar por disponibilidade SUS]
        H[Filtrar por tipo de gestão]
        I[Filtrar por equipamento específico]
        J[Filtrar por serviço especializado]
        K[Filtrar por bairro]
        L[Filtrar por categoria de referência]
    end

    subgraph Dashboard
        M[Consultar métricas resumo]
        N[Analisar gráficos de distribuição]
        O[Clicar em gráfico para filtrar]
    end

    subgraph Comparação
        P[Comparar bairros lado a lado]
    end

    U --> A & B & C & D
    U --> E & F & G & H & I & J & K & L
    U --> M & N & O
    U --> P
```

### Modelo de Dados (ER)

```mermaid
erDiagram
    Neighborhood ||--o{ HealthEstablishment : "contém"
    HealthEstablishment ||--o{ EstablishmentEquipment : "possui"
    HealthEstablishment ||--o{ EstablishmentService : "oferece"
    HealthEstablishment ||--o{ HospitalBed : "possui"
    EquipmentType ||--o{ EquipmentItem : "categoriza"
    EquipmentItem ||--o{ EstablishmentEquipment : "vinculado a"
    SpecializedService ||--o{ EstablishmentService : "vinculado a"

    Neighborhood {
        string name
        geometry geometry
        integer population_total
        float demographic_density
        integer income_0_2_wages
    }

    HealthEstablishment {
        string cnes_code UK
        string name
        string establishment_type_code
        string legal_nature_code
        string management_type
        geometry coordinates
        boolean is_sus
        boolean is_active
        boolean is_teaching_hospital
    }

    EquipmentType {
        string code UK
        string name
    }

    EquipmentItem {
        string code UK
        string name
    }

    EstablishmentEquipment {
        integer quantity_existing
        integer quantity_in_use
        boolean available_sus
    }

    SpecializedService {
        string code UK
        string name
    }

    EstablishmentService {
        string classification_code
        string service_characteristic
        boolean ambulatorial_sus
        boolean hospitalar_sus
    }

    HospitalBed {
        string bed_code
        string bed_type_code
        integer quantity_existing
        integer quantity_sus
    }
```

### Arquitetura do Sistema

```mermaid
flowchart TB
    subgraph Docker Compose
        subgraph db ["PostgreSQL 16 + PostGIS 3.5 (:5433)"]
            PG[(Banco de Dados)]
        end

        subgraph web ["Rails 8 API (:3001)"]
            Controllers["Controllers API v1"]
            Concern["EstablishmentFiltering\n(Concern)"]
            Models["Models + Scopes"]
            Importers["Data Import Services\n(CNES / Census / Neighborhoods)"]

            Controllers --> Concern
            Controllers --> Models
            Importers --> Models
        end

        subgraph frontend ["React 18 + Vite (:5173)"]
            direction TB
            DashboardPage["DashboardPage\n(estado global + filtros)"]
            Hooks["Hooks\n(useEstablishments, useNeighborhoods,\nuseDashboard, useFilterOptions,\nuseNeighborhoodComparison)"]
            MapLayer["Map\n(Leaflet + coroplético)"]
            FiltersUI["FilterPanel\n(drawer mobile)"]
            Dashboard["Dashboard\n(MetricCards + ChartsPanel)"]
            Comparison["Comparison\n(tabela lado a lado)"]

            DashboardPage --> Hooks
            DashboardPage --> MapLayer
            DashboardPage --> FiltersUI
            DashboardPage --> Dashboard
            DashboardPage --> Comparison
        end
    end

    subgraph Dados Externos
        CNES["CNES DataSUS\n(15+ CSVs)"]
        IBGE["IBGE Censo 2022\n(GeoJSON)"]
        Prefeitura["Prefeitura Salvador\n(GeoJSON bairros)"]
    end

    CNES & IBGE & Prefeitura --> Importers
    Models --> PG
    Hooks -- "/api/v1/*" --> Controllers
```

---

## 2. Objetivos

1. Mapear a distribuicao geografica de equipamentos de saude (mamografos, tomografos, etc.) por estabelecimento e bairro
2. Classificar e diferenciar tipos de estabelecimentos (UBS vs USF, Hospital Geral vs Especializado, Pronto Socorro, etc.)
3. Identificar servicos especializados oferecidos por cada unidade (referencia em infeccao, peconha, cardiologia, etc.)
4. Cruzar dados de equipamentos e servicos com dados sociodemograficos (populacao, renda, raca) por bairro
5. Permitir filtragem por natureza juridica (publica, privada, sem fins lucrativos, pessoa fisica) e disponibilidade SUS

---

## 3. Fontes de Dados

### 3.1 Dados ja disponveis (aux-data/)

| Fonte | Arquivo | Uso |
|-------|---------|-----|
| IBGE Censo 2022 - Bairros | `ibge/data/geo-data/BA_bairros_CD2022.geojson` | Poligonos dos bairros + hierarquia administrativa (regiao/UF/municipio/distrito/subdistrito) + area_km2 + populacao total |
| IBGE Censo 2022 - Cor/Raca | `ibge/data/agregados_por_bairros_cor_ou_raca_BR.csv` | Microdata V01317-V01331: populacao por cor/raca e por cor/raca x sexo |
| IBGE Censo 2022 - Demografia | `ibge/data/agregados_por_bairros_demografia_BR.csv` | Microdata V01006-V01041: populacao total/por sexo/por faixa etaria |
| CNES Estabelecimentos | `cnes-database/tbEstabelecimento202508.csv` | Cadastro de estabelecimentos |
| CNES Equipamentos (relacao) | `cnes-database/rlEstabEquipamento202508.csv` | Vinculo equipamento-estabelecimento |
| CNES Equipamentos (lookup) | `cnes-database/tbEquipamento202508.csv` | Nomes dos equipamentos |
| CNES Tipos Equipamento | `cnes-database/tbTipoEquipamento202508.csv` | Categorias de equipamento |
| CNES Servicos Especializados | `cnes-database/tbServicoEspecializado202508.csv` | Tipos de servico |
| CNES Servico x Estabelecimento | `cnes-database/rlEstabServClass202508.csv` | Vinculo servico-estabelecimento |
| CNES Leitos | `cnes-database/rlEstabComplementar202508.csv` | Leitos hospitalares |
| CNES Tipo Unidade | `cnes-database/tbTipoUnidade202508.csv` | Classificacao do tipo de unidade |
| CNES Natureza Juridica | `cnes-database/tbNaturezaJuridica202508.csv` | Natureza juridica (publico/privado) |
| CNES Municipio | `cnes-database/tbMunicipio202508.csv` | Codigo do municipio de Salvador |

### 3.2 Filtro base para Salvador

- Codigo do municipio de Salvador na tabela `tbMunicipio`
- Naturezas juridicas publicas (administracao publica federal, estadual, municipal) via `tbNaturezaJuridica`
- Estabelecimentos ativos (sem data de desativacao)

---

## 4. Modelagem de Dados (Rails)

### 4.1 Models

```
Neighborhood (bairros)
  - name: string (NM_BAIRRO)
  - geometry: geometry (MultiPolygon, SRID 4326)
  - region_ibge_code / region_name: string (CD_REGIAO / NM_REGIAO)
  - state_ibge_code / state_name: string (CD_UF / NM_UF)
  - city_ibge_code / city_name: string (CD_MUN / NM_MUN)
  - district_ibge_code / district_name: string (CD_DIST / NM_DIST)
  - subdistrict_ibge_code / subdistrict_name: string (CD_SUBDIST / NM_SUBDIST)
  - neighborhood_ibge_code: string (CD_BAIRRO)
  - area_km2: float (AREA_KM2)
  - population_total: integer (v0001)
  - population_male: float
  - population_female: float
  - population_white / black / asian / brown / indigenous: float
  - population_0_to_4 / 5_to_9 / 10_to_14 / 15_to_19 / 20_to_24 / 25_to_29 / 30_to_39 / 40_to_49 / 50_to_59 / 60_to_69 / 70_or_more: float
  - population_male_white / male_black / male_asian / male_brown / male_indigenous: float
  - population_female_white / female_black / female_asian / female_brown / female_indigenous: float
  - demographic_density: float

HealthEstablishment (estabelecimentos)
  - cnes_code: string (CO_UNIDADE, unique)
  - name: string
  - fantasy_name: string
  - establishment_type_code: string (CO_TIPO_ESTABELECIMENTO)
  - establishment_type_name: string
  - legal_nature_code: string (CO_NATUREZA_JUR)
  - legal_nature_name: string
  - management_type: string (TP_GESTAO: M/E/D/S)
  - address: string
  - coordinates: geometry (Point, SRID 4326)
  - phone: string
  - is_sus: boolean
  - is_active: boolean
  - neighborhood: references Neighborhood (via spatial join ou campo)

EquipmentType (tipos de equipamento)
  - code: string (CO_TIPO_EQUIPAMENTO)
  - name: string

Equipment (equipamentos - tabela de lookup)
  - code: string (CO_EQUIPAMENTO)
  - equipment_type: references EquipmentType
  - name: string

EstablishmentEquipment (vinculo equipamento-estabelecimento)
  - health_establishment: references HealthEstablishment
  - equipment: references Equipment
  - quantity_existing: integer
  - quantity_in_use: integer
  - available_sus: boolean

SpecializedService (servicos especializados - lookup)
  - code: string (CO_SERVICO_ESPECIALIZADO)
  - name: string

EstablishmentService (vinculo servico-estabelecimento)
  - health_establishment: references HealthEstablishment
  - specialized_service: references SpecializedService
  - classification_code: string
  - service_characteristic: string (proprio/terceirizado/ambos)
  - ambulatorial_sus: boolean
  - hospitalar_sus: boolean

HospitalBed (leitos)
  - health_establishment: references HealthEstablishment
  - bed_code: string
  - bed_type_code: string
  - quantity_existing: integer
  - quantity_sus: integer
```

### 4.2 Associacoes principais

```ruby
Neighborhood has_many :health_establishments (via spatial containment)
HealthEstablishment has_many :establishment_equipments
HealthEstablishment has_many :equipments, through: :establishment_equipments
HealthEstablishment has_many :establishment_services
HealthEstablishment has_many :specialized_services, through: :establishment_services
HealthEstablishment has_many :hospital_beds
```

---

## 5. Arquitetura

### 5.1 Backend (Rails 8 API)

```
app/
  controllers/
    api/
      v1/
        neighborhoods_controller.rb      # GeoJSON dos bairros + dados demograficos
        health_establishments_controller.rb  # Estabelecimentos com filtros
        equipments_controller.rb         # Equipamentos e agregacoes
        services_controller.rb           # Servicos especializados
        dashboard_controller.rb          # Dados agregados para cards/graficos
  models/
    neighborhood.rb
    health_establishment.rb
    equipment.rb
    equipment_type.rb
    establishment_equipment.rb
    specialized_service.rb
    establishment_service.rb
    hospital_bed.rb
  services/
    data_import/
      base_importer.rb          # Helpers compartilhados (paths IBGE/CNES, parser CSV)
      cnes_importer.rb          # Importa CSVs do CNES para o banco
      ibge_census_importer.rb   # Importa microdata IBGE 2022 (cor/raca + demografia)
      neighborhood_importer.rb  # Importa GeoJSON IBGE 2022 (poligonos + hierarquia administrativa)
```

### 5.2 API Endpoints

```
GET /api/v1/neighborhoods
  ?include=demographics,equipment_summary
  Retorna GeoJSON dos bairros com dados opcionais

GET /api/v1/health_establishments
  ?type=<codigo_tipo>
  ?legal_nature=publica|privada|sem_fins_lucrativos|pessoa_fisica
  ?management=M|E|D|S
  ?service=<codigo_servico>
  ?equipment=<codigo_equipamento>
  ?sus_only=true
  ?neighborhood_id=<id>
  Retorna GeoJSON dos estabelecimentos filtrados

GET /api/v1/health_establishments/:id
  Detalhes completos: equipamentos, servicos, leitos

GET /api/v1/filter_options
  Retorna as opcoes dinamicas para os filtros do painel:
  { establishment_types, legal_natures, management_types }
  Cada lista contem { value, label }. Sempre retorna todos os valores
  independente de existirem registros no banco.

GET /api/v1/equipments/summary
  ?group_by=neighborhood|establishment_type|equipment_type
  Contagens agregadas para graficos

GET /api/v1/dashboard/overview
  ?type=&legal_nature=&management=&sus_only=&neighborhood_id=&equipment=&service=&reference_category=
  Cards resumo: total estabelecimentos, equipamentos, leitos SUS, etc. (filtrados)

GET /api/v1/dashboard/equipment_by_neighborhood
  ?type=&legal_nature=&management=&sus_only=&neighborhood_id=&equipment=&service=&reference_category=
  Equipamentos por bairro (top 10, filtrados)

GET /api/v1/dashboard/service_summary
  ?type=&legal_nature=&management=&sus_only=&neighborhood_id=&equipment=&service=&reference_category=
  Servicos especializados mais oferecidos (top 20, filtrados)
```

### 5.3 Frontend (React + Vite standalone)

O PRD original especificava `react_on_rails`. Como o backend e configurado como API-only (`config.api_only = true`), integrar `react_on_rails` exigiria remover esse modo e adicionar `shakapacker`. Um app Vite standalone em `frontend/` e mais simples, com HMR nativo e proxy de desenvolvimento embutido (`/api -> web:3000`). Para producao, o build em `frontend/dist/` pode ser servido por qualquer host estatico.

**Dependencias principais:**
- `vite` + `@vitejs/plugin-react` (build + dev server)
- `leaflet` + `react-leaflet` (mapa interativo)
- `recharts` (graficos de distribuicao)
- `tailwindcss` (estilizacao)
- `vitest` + `@testing-library/react` (testes)

**Estrutura de componentes:**

```
frontend/src/
  types/index.ts                # Interfaces TypeScript + constantes de filtros
  hooks/
    useNeighborhoods.ts         # Busca bairros da API
    useEstablishments.ts        # Busca estabelecimentos com filtros
    useFilterOptions.ts         # Busca opcoes de filtro da API (com fallback hardcoded)
    useDashboard.ts             # Busca dados agregados com filtros (overview, equip. por bairro, servicos)
  components/
    DashboardPage.tsx           # Layout principal + estado global
    Map/
      InteractiveMap.tsx        # MapContainer Leaflet
      NeighborhoodLayer.tsx     # Camada coropletica dos bairros (metrica selecionavel)
      EstablishmentMarkers.tsx  # Marcadores SVG por tipo (hover abre popup)
      EstablishmentPopup.tsx    # Popup com detalhe lazy-loaded
      MapLegend.tsx             # Legenda dinamica sobreposta ao mapa
    Dashboard/
      MetricCards.tsx           # Cards resumo (estabelecimentos, equipamentos, leitos)
      ChartsPanel.tsx           # Container dos graficos em grid 2x2
      Charts/
        EstablishmentTypeChart.tsx       # Pie chart de tipos de estabelecimento
        EquipmentByNeighborhoodChart.tsx # Bar chart horizontal por bairro
        EquipmentPer10kChart.tsx         # Bar chart por 10 mil habitantes
        ServiceSummaryChart.tsx          # Bar chart de servicos especializados
    Filters/
      FilterPanel.tsx           # Sidebar com todos os filtros (incl. equipamento e servico)
    ui/
      FilterSelect.tsx          # Componente generico de select para filtros
      FilterRadioGroup.tsx      # Componente generico de radio group para filtros
      FilterCheckbox.tsx        # Componente generico de checkbox para filtros
```

---

## 6. Funcionalidades

### 6.1 Mapa Interativo (MVP)

- **Camada de bairros:** poligonos coloridos por metrica selecionavel (populacao, renda, densidade, quantidade de equipamentos per capita)
- **Marcadores de estabelecimentos:** icones diferenciados por tipo:
  - UBS (circulo azul)
  - USF (circulo verde) - identificada pelo servico 101 vinculado
  - Hospital Geral (cruz vermelha)
  - Hospital Especializado (cruz laranja)
  - Pronto Socorro (triangulo vermelho)
  - Pronto Atendimento (triangulo amarelo)
  - Outros (circulo cinza)
- **Popup ao hover:** card com nome, tipo, endereco, equipamentos disponiveis, servicos, leitos SUS — aparece ao passar o mouse sobre o marcador (detail lazy-loaded sob demanda)
- **Cluster de marcadores:** agrupamento automatico em zoom baixo (fase futura)

### 6.2 Painel de Filtros

- Tipo de estabelecimento (multi-select)
- Tipo de equipamento especifico (ex: "Mamografo", "Tomografo")
- Servico especializado (ex: "Cardiologia", "Oncologia", "Urgencia")
- Natureza juridica (publica / privada / sem fins lucrativos / pessoa fisica) — mapeado por prefixo do codigo CNES (1xxx/2xxx/3xxx/4xxx)
- Disponibilidade SUS (sim/nao)
- Bairro especifico — cada opcao do dropdown exibe o nome do municipio como anotacao secundaria (texto menor e cinza claro), facilitando a identificacao quando ha bairros de cidades diferentes

### 6.3 Dashboard de Metricas

**Cards resumo:**
- Total de estabelecimentos publicos ativos
- Total de mamografos / tomografos / ressonancias
- Total de leitos SUS
- Total de equipos odontologicos

**Graficos:**
- Distribuicao de equipamentos de imagem por bairro (bar chart)
- Proporcao de tipos de estabelecimento (pie chart)
- Equipamentos por 10.000 habitantes por bairro (bar chart horizontal)
- Servicos especializados mais oferecidos (bar chart)

### 6.4 Identificacao de Hospitais de Referencia

Logica de classificacao baseada nos servicos vinculados:
- **Hospital de infeccao:** servicos 106 (DST/HIV/AIDS), 111 (Tuberculose)
- **Referencia cardiovascular:** servico 116
- **Referencia oncologica:** servico 132
- **Referencia trauma/ortopedia:** servico 155
- **Hospital de ensino:** via tabela `rlEstabSipac` (LFCES049)

---

## 7. Importacao de Dados

### 7.1 Rake Tasks

```
rails data:import:neighborhoods    # Importa BA_bairros_CD2022.geojson (IBGE 2022)
rails data:import:ibge_census      # Importa microdata IBGE 2022 (cor/raca + demografia)
rails data:import:cnes             # Importa todos os CSVs do CNES filtrados por Salvador
rails data:import:all              # Executa todos acima em sequencia
```

### 7.2 Pipeline de importacao CNES

1. Ler `tbMunicipio202508.csv` -> extrair codigo de Salvador
2. Ler `tbNaturezaJuridica202508.csv` -> carregar lookup
3. Ler `tbTipoUnidade202508.csv` -> carregar lookup
4. Ler `tbEquipamento202508.csv` + `tbTipoEquipamento202508.csv` -> carregar lookups
5. Ler `tbServicoEspecializado202508.csv` -> carregar lookup
6. Ler `tbEstabelecimento202508.csv` -> filtrar por municipio de Salvador -> criar registros
7. Ler `rlEstabEquipamento202508.csv` -> filtrar por estabelecimentos de Salvador -> criar vinculos
8. Ler `rlEstabServClass202508.csv` -> filtrar por estabelecimentos de Salvador -> criar vinculos
9. Ler `rlEstabComplementar202508.csv` -> filtrar por estabelecimentos de Salvador -> criar leitos
10. Associar estabelecimentos a bairros via ST_Contains (PostGIS spatial query)

---

## 8. Distincao UBS vs USF

A base do CNES nao diferencia explicitamente UBS de USF pelo tipo de unidade (ambas sao tipo `02` - "Centro de Saude/Unidade Basica"). A distincao e feita por:

1. **Servico vinculado:** se `rlEstabServClass` contem servico `101` ("Estrategia de Saude da Familia") -> **USF**
2. **Equipe vinculada:** se `tbEquipe` contem equipe do tipo ESF vinculada ao estabelecimento -> confirma **USF**
3. **Ausencia de ambos:** -> **UBS tradicional**

Implementar como um metodo no model:
```ruby
class HealthEstablishment < ApplicationRecord
  def usf?
    establishment_type_code == '02' &&
      establishment_services.exists?(specialized_service: { code: '101' })
  end

  def display_type
    return 'USF' if usf?
    ESTABLISHMENT_TYPE_MAP[establishment_type_code] || 'Outro'
  end
end
```

---

## 9. Fases de Implementacao

SEMPRE USANDO TESTES PROGRAMÁTICOS

### Fase 1 - Fundacao (backend + importacao)
- [x] Criar migrations para todos os models
- [x] Implementar models com associacoes e scopes
- [x] Implementar rake tasks de importacao (CNES + GeoJSON + Censo)
- [x] Seed do banco com dados de Salvador (seeds.rb chama importadores diretamente)
- [x] Endpoints da API retornando GeoJSON
- [x] CORS habilitado para frontend (rack-cors)

### Fase 2 - Frontend base (mapa + filtros)
- [x] Configurar React+Vite + Tailwind + Leaflet (frontend/ standalone, proxy para API)
- [x] Mapa interativo com camada de bairros (coropletica por qtd. estabelecimentos)
- [x] Marcadores de estabelecimentos com popup (icones diferenciados por tipo)
- [x] Popup abre ao hover sobre o marcador (lazy-load do detalhe)
- [x] Painel de filtros basico (tipo, SUS, natureza juridica, gestao, bairro)
- [x] Correcao do filtro de natureza juridica (valores mapeados para prefixos dos codigos CNES)
- [x] Configuracao Docker: proxy Vite aponta para servico interno `web:3000`; `config.hosts` permite hostname Docker
- [x] Componentes UI genericos para filtros (FilterSelect, FilterRadioGroup, FilterCheckbox)
- [x] Endpoint GET /api/v1/filter_options retorna opcoes dinamicas com fallback hardcoded no frontend
- [x] CI migrado para Docker Compose (scan, lint, test do backend + lint e test do frontend)
- [x] Icone da aba configurado com a bandeira de Salvador (public/images/bandeira_de_salvador.png)

### Fase 3 - Dashboard completo
- [x] Cards de metricas resumo (6 cards: estabelecimentos, equipamentos, leitos — total e SUS)
- [x] Graficos de distribuicao (recharts): tipo de estabelecimento (pie), equipamentos por bairro (bar), equipamentos por 10k hab. (bar), servicos especializados (bar)
- [x] Filtros avancados (equipamento especifico, servico especializado) via endpoint filter_options expandido
- [x] Camada coropletica por metrica selecionavel (estabelecimentos, equipamentos, leitos SUS, populacao, densidade demografica) com binning por quantis dinamico
- [x] Hook useDashboard busca 3 endpoints do dashboard em paralelo (overview, equipment_by_neighborhood, service_summary)
- [x] Layout reestruturado: area principal com scroll vertical (cards → mapa → graficos)
- [x] equipment_count incluido no index de bairros (com fix de N+1 via query agregada)
- [x] Testes unitarios: 91 exemplos frontend (9 arquivos) + 109 exemplos backend (0 falhas)

### Fase 4 - Refinamentos
- [x] Classificacao de hospitais de referencia (5 categorias: infeccao, cardiovascular, oncologia, trauma, ensino)
- [x] Comparativo entre bairros (selecao de ate 5 bairros, tabela lado a lado com metricas e indicadores derivados)
- [ ] Exportacao de dados filtrados (CSV) — adiado
- [x] Responsividade mobile (FilterPanel como drawer, layout adaptativo para telas < 768px)

### Fase 5 - Filtros Globais e Interatividade
- [x] Filtros aplicados em toda a pagina: cards de metricas e graficos respondem aos filtros (backend + frontend)
- [x] Concern `EstablishmentFiltering` extrai logica de filtros para reutilizacao entre controllers
- [x] Comparacao de bairros sincronizada com filtro global `neighborhood_id` (selecionar bairros na comparacao filtra o dashboard inteiro)
- [x] Click nos graficos para filtrar: tipo de estabelecimento (pie), bairros (barras de equipamentos), servico especializado (barras de servicos)

### Fase 6 - IBGE como fonte unica de bairros e censo
- [x] Migracao do schema: removidas colunas de renda (income_*) e faixas etarias antigas; adicionados codigos IBGE (regiao/UF/municipio/distrito/subdistrito/bairro), area_km2, faixas etarias finas (0-4, 5-9, 10-14, ..., 70+) e cor/raca x sexo
- [x] NeighborhoodImporter le `ibge/data/geo-data/BA_bairros_CD2022.geojson` (455 bairros), upsert por `neighborhood_ibge_code`
- [x] IbgeCensusImporter le os CSVs de cor/raca e demografia, joina por `CD_BAIRRO` (sem fuzzy matching por nome)
- [x] CensusImporter legado e a rake `data:import:census` removidos; nova rake `data:import:ibge_census` no lugar
- [x] CnesImporter passa a setar `is_active` a partir de `CO_MOTIVO_DESAB` (vazio = ativo) em vez de hardcoded true
- [x] API: payload de `index` ganha codigos IBGE + area_km2; `compare` adiciona o detalhamento por faixa etaria, cor/raca e cor/raca x sexo
- [x] Frontend: ComparisonTable substitui o grupo "Renda" por "Localizacao (IBGE)", "Cor/Raca", "Faixa Etaria", "Cor x Sexo"; tooltip do mapa mostra distrito e area_km2
- [x] Selectors de bairro (filtro e comparacao) exibem o municipio como anotacao secundaria, util quando o dataset cobre mais de uma cidade
- [x] Validacao de unicidade do nome do bairro removida do model — IBGE permite nomes repetidos em distritos/subdistritos diferentes; identidade passa a ser o `neighborhood_ibge_code`

### Fase 8 - Deploy de producao no homelab
- [x] Imagem Docker unica: estagio Node compila o React; Rails serve a SPA em `/` (SpaController, `index.html` com `no-cache`) e a API na mesma origem
- [x] `config.hosts` em producao via `RAILS_HOSTS`; `/up` fora da verificacao de host
- [x] Removido `app/services/cidacs/api.rb` (nao usado; quebrava o eager load de producao)
- [x] Corrigidos 12 erros de TypeScript que impediam `npm run build`; `typecheck` adicionado ao CI
- [x] LXC `panaceia.homelab` (VMID 108, 192.168.68.210) + role Ansible `panaceia` + tunel Cloudflare em `panaceia.gabrielcf.com` (repositorio `homelab-iac`)
- [x] Primeiro boot cria os bancos e importa CNES/IBGE a partir de `aux-data` copiado para o LXC; sem backups (dados reproduziveis)

---

## 10. Configuracao Tecnica

### Gems
```ruby
gem 'rgeo'          # Tipos geometricos
gem 'rgeo-geojson'  # Encode/decode GeoJSON
gem 'rack-cors'     # CORS para o frontend standalone
```

### Pacotes npm (frontend/)
```json
{
  "react": "^18",
  "react-dom": "^18",
  "vite": "^6",
  "@vitejs/plugin-react": "^4",
  "leaflet": "^1.9",
  "react-leaflet": "^4",
  "recharts": "^2",
  "tailwindcss": "^3",
  "vitest": "^3",
  "@testing-library/react": "^16",
  "@types/leaflet": "^1.9"
}
```

### Docker Compose
Tres servicos: `db` (PostgreSQL/PostGIS), `web` (Rails API na porta 3001), `frontend` (Node 20 Alpine na porta 5173).

O frontend usa `VITE_API_URL=http://web:3000` para que o proxy Vite alcance o container Rails pelo hostname interno Docker, sem depender do mapeamento de porta do host (`localhost:3001`). O Rails permite o hostname `web` via `config.hosts << "web"` em `development.rb`.

### Decisoes de infraestrutura tomadas durante implementacao

| Decisao | Justificativa |
|---------|--------------|
| Frontend standalone (Vite) em vez de react_on_rails | Rails configurado como API-only; react_on_rails exigiria remover esse modo e adicionar shakapacker, aumentando a complexidade sem beneficio |
| seeds.rb chama importadores diretamente | Usar `Rails.application.load_tasks` + `Rake::Task.invoke` dentro de um contexto rake ja ativo re-registrava callbacks e causava multiplas execucoes dos importadores |
| HospitalBed usa find_or_create_by! | O importer original usava create!, gerando duplicatas ao re-executar seeds |
| Filtro legal_nature por prefixo de codigo | Os codigos CNES sao numericos (ex: 1031, 2046); os valores anteriores (federal/estadual/municipal) nunca correspondiam a nenhum registro |
| Popup abre no hover via eventHandlers | Melhora a descoberta de informacoes sem exigir clique; cada marcador tem sua propria ref para controlar o popup independentemente |
| equipment_count no index de bairros com query agregada | O metodo `equipment_count` do model faz N+1 queries. O controller precomputa os totais com uma unica query `EstablishmentEquipment.joins(...).group(...).sum(...)` |
| Binning por quantis na coropletica | Bins fixos (0, 1-2, 3-7...) so funcionam para contagem de estabelecimentos. Quantis dinamicos (P20/P40/P60/P80) adaptam-se a qualquer metrica automaticamente |
| recharts com ResponsiveContainer | Graficos precisam de dimensoes explicitas; ResponsiveContainer preenche o container pai. Em testes, e substituido por um stub com dimensoes fixas |
| filter_options expandido com equipamentos e servicos | Reutiliza o endpoint existente em vez de criar novos endpoints, mantendo a consistencia do padrao `{ value, label }` |
| IBGE 2022 substitui Prefeitura + censo customizado como fonte unica | Join exato por `CD_BAIRRO` em vez de string match por nome; hierarquia administrativa completa; area_km2 e populacao total ja vem inline no GeoJSON |
| Identidade do bairro passa a ser `neighborhood_ibge_code` (nao `name`) | IBGE permite nomes repetidos em distritos diferentes (ex: varios "Centro"); upsert por codigo evita colisoes e quebra de string match |
| Detalhamento demografico so no payload do endpoint `compare` | 23 colunas extras (faixas etarias finas + cor/raca x sexo) sao caras no `index` (455 bairros); o `compare` carrega no maximo 5 bairros e e o unico consumidor desses campos |
| `is_active` derivado de `CO_MOTIVO_DESAB` no CNES | O dataset CNES inclui estabelecimentos desativados; antes todos eram marcados como ativos, distorcendo metricas. Vazio = ativo, preenchido = motivo da desativacao |
| Rails serve a SPA compilada em producao (imagem unica) | Mesma origem para SPA e API: sem CORS e sem URL de API em tempo de build; o frontend ja usa URLs relativas (`/api/v1/...`) |
| Plataforma `linux/amd64` explicita no docker-compose | Em hosts ARM (Apple Silicon) o PostGIS-Alpine nao tem build nativo; forcar amd64 (com emulacao) garante paridade entre dev local e CI |
