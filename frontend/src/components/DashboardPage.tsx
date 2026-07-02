import { useState } from "react";
import type { ChoroplethMetric, Filters } from "../types";
import { useNeighborhoods } from "../hooks/useNeighborhoods";
import { useEstablishments } from "../hooks/useEstablishments";
import { useFilterOptions } from "../hooks/useFilterOptions";
import { useDashboard } from "../hooks/useDashboard";
import InteractiveMap from "./Map/InteractiveMap";
import FilterPanel from "./Filters/FilterPanel";
import Spinner from "./ui/Spinner";
import MetricCards from "./Dashboard/MetricCards";
import ChartsPanel from "./Dashboard/ChartsPanel";
import NeighborhoodComparisonResult from "./Comparison/NeighborhoodComparisonResult";
import { METRIC_LABELS } from "./Map/NeighborhoodLayer";
import MapLegend from "./Map/MapLegend";

const DEFAULT_FILTERS: Filters = {
  type: "",
  legal_nature: "",
  management: "",
  sus_only: false,
  neighborhood_id: "",
  equipment: "",
  service: "",
  reference_category: "",
};

const CHOROPLETH_OPTIONS: ChoroplethMetric[] = [
  "establishments_count",
  "equipment_count",
  "sus_beds_count",
  "population_total",
  "demographic_density",
];

export default function DashboardPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<number | null>(null);
  const [selectedNeighborhoodName, setSelectedNeighborhoodName] = useState<string>("");
  const [choroplethMetric, setChoroplethMetric] = useState<ChoroplethMetric>("establishments_count");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [comparisonIds, setComparisonIds] = useState<number[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [visibleCharts, setVisibleCharts] = useState<Set<string>>(new Set());

  const chartsVisible = visibleCharts.size > 0;

  function handleFiltersToggle() {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setFiltersExpanded(true);
    } else {
      setFiltersExpanded((e) => !e);
    }
  }

  function handleChartToggle(chartId: string) {
    setVisibleCharts((prev) => {
      const next = new Set(prev);
      if (next.has(chartId)) next.delete(chartId);
      else next.add(chartId);
      return next;
    });
  }

  const { data: neighborhoods, loading: loadingNeighborhoods } = useNeighborhoods();
  const { data: establishments, loading: loadingEstablishments } = useEstablishments(filters);
  const filterOptions = useFilterOptions();
  const {
    overview,
    equipmentByNeighborhood,
    serviceSummary,
    loading: loadingDashboard,
  } = useDashboard(filters);

  function handleFilterChange(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
    if (partial.neighborhood_id !== undefined) {
      if (!partial.neighborhood_id) {
        setSelectedNeighborhood(null);
        setSelectedNeighborhoodName("");
      } else {
        const ids = partial.neighborhood_id.split(",").map(Number);
        setSelectedNeighborhood(ids[0]);
        const names = ids
          .map((nid) => neighborhoods?.features.find((f) => f.properties.id === nid)?.properties.name ?? "")
          .filter(Boolean);
        setSelectedNeighborhoodName(names.join(", "));
      }
    }
  }

  function handleNeighborhoodSelect(id: number | null, name: string) {
    setSelectedNeighborhood(id);
    setSelectedNeighborhoodName(id ? name : "");
    setFilters((prev) => ({ ...prev, neighborhood_id: id ? String(id) : "" }));
  }

  function handleClearNeighborhood() {
    setSelectedNeighborhood(null);
    setSelectedNeighborhoodName("");
    setComparisonIds([]);
    setFilters((prev) => ({ ...prev, neighborhood_id: "" }));
  }

  function handleComparisonIdsChange(ids: number[]) {
    setComparisonIds(ids);
    if (ids.length === 0) {
      setSelectedNeighborhood(null);
      setSelectedNeighborhoodName("");
      setFilters((prev) => ({ ...prev, neighborhood_id: "" }));
    } else {
      const names = ids
        .map((nid) => neighborhoods?.features.find((f) => f.properties.id === nid)?.properties.name ?? "")
        .filter(Boolean);
      setSelectedNeighborhood(ids[0]);
      setSelectedNeighborhoodName(names.join(", "));
      setFilters((prev) => ({ ...prev, neighborhood_id: ids.join(",") }));
    }
  }

  const totalCount = establishments?.features.length ?? 0;

  // Left offset accounting for sidebar width; right stays at r-4
  const sidebarOffset = sidebarCollapsed ? "left-4 md:left-16" : "left-4 md:left-[296px]";

  return (
    <div className="h-screen flex flex-col">
      {/* Header — in flow, full width, natural height */}
      <header className="flex-shrink-0 z-30 bg-white border-b border-gray-200 px-5 md:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="md:hidden p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
            aria-label="Abrir filtros"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>
          <img
            src="/images/bandeira_de_salvador.png"
            alt="Bandeira de Salvador"
            className="w-8 h-8 object-contain flex-shrink-0"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Saúde em Salvador</h1>
            <p className="text-xs text-gray-500">Distribuição de equipamentos e estabelecimentos de saúde</p>
          </div>
        </div>

        {selectedNeighborhoodName && (
          <div className="flex items-center gap-2">
            <span className="bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full font-medium">
              {selectedNeighborhoodName}
            </span>
            <button
              onClick={handleClearNeighborhood}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              title="Limpar seleção"
            >
              ×
            </button>
          </div>
        )}

        {(loadingNeighborhoods || loadingEstablishments) && (
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <Spinner className="w-3 h-3" />
            <span>Carregando...</span>
          </span>
        )}
      </header>

      {/* Content area — fills remaining height, anchors all absolute children */}
      <div className="flex-1 relative overflow-hidden">
        {/* Map — fills entire content area */}
        <div className="absolute inset-0 z-0">
          <InteractiveMap
            neighborhoods={neighborhoods}
            establishments={establishments}
            selectedNeighborhood={selectedNeighborhood}
            onNeighborhoodSelect={handleNeighborhoodSelect}
            filters={filters}
            onFilterChange={handleFilterChange}
            choroplethMetric={choroplethMetric}
          />
        </div>

      {/* Left floating panel — choropleth selector + metric cards + comparison */}
      <div
        className={`absolute top-4 right-4 z-20 flex flex-col gap-2 transition-all duration-200 ${sidebarOffset} max-h-[calc(100%-2rem)] overflow-y-auto`}
      >
        {/* Choropleth metric selector */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100/80 px-3 py-2 flex items-center gap-2 flex-wrap">
          <label htmlFor="choropleth-metric" className="text-xs font-medium text-gray-600 whitespace-nowrap">
            Métrica do mapa:
          </label>
          <select
            id="choropleth-metric"
            value={choroplethMetric}
            onChange={(e) => setChoroplethMetric(e.target.value as ChoroplethMetric)}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {CHOROPLETH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {METRIC_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        {/* Metric Cards — no wrapper background */}
        <MetricCards overview={overview} loading={loadingDashboard} />

        {/* Comparison Result */}
        {comparisonOpen && comparisonIds.length >= 2 && (
          <div className="max-h-72 overflow-y-auto rounded-xl bg-white/90 backdrop-blur-sm border border-gray-100/80 shadow-sm">
            <NeighborhoodComparisonResult selectedIds={comparisonIds} />
          </div>
        )}
      </div>

      {/* Charts — bottom floating panel, animated slide-up */}
      <div
        className={`
          absolute bottom-4 right-4 z-20 transition-all duration-300 ease-out
          ${sidebarOffset}
          ${chartsVisible ? "translate-y-0 opacity-100" : "translate-y-[150%] opacity-0 pointer-events-none"}
        `}
      >
        <div className="max-h-[50vh] overflow-y-auto rounded-xl">
          <ChartsPanel
            overview={overview}
            equipmentByNeighborhood={equipmentByNeighborhood}
            serviceSummary={serviceSummary}
            neighborhoods={neighborhoods}
            loading={loadingDashboard}
            onFilterChange={handleFilterChange}
            visibleCharts={visibleCharts}
          />
        </div>
      </div>

      {/* Map legend — lives here so it's above charts (z-20) in the page stacking context */}
      <div className="absolute bottom-7 right-2 z-[19]">
        <MapLegend metric={choroplethMetric} neighborhoods={neighborhoods} />
      </div>

      {/* Left sidebar */}
      <FilterPanel
        filters={filters}
        filterOptions={filterOptions}
        onChange={handleFilterChange}
        neighborhoods={neighborhoods}
        totalCount={totalCount}
        loading={loadingEstablishments}
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        collapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed((c) => !c)}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={handleFiltersToggle}
        comparisonOpen={comparisonOpen}
        comparisonIds={comparisonIds}
        onComparisonIdsChange={handleComparisonIdsChange}
        onComparisonToggle={() => setComparisonOpen((o) => !o)}
        visibleCharts={visibleCharts}
        onChartToggle={handleChartToggle}
      />
      </div>{/* end content area */}
    </div>
  );
}
