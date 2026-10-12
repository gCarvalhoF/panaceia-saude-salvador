import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDashboard } from "./useDashboard";
import {
  mockDashboardOverview,
  mockEquipmentByNeighborhood,
  mockServiceSummary,
} from "../test/fixtures";
import type { Filters } from "../types";

const emptyFilters: Filters = {
  type: "",
  legal_nature: "",
  management: "",
  sus_only: false,
  neighborhood_id: "",
  equipment: "",
  service: "",
  reference_category: "",
};

describe("useDashboard", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("começa em estado de loading", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDashboard(emptyFilters));

    expect(result.current.loading).toBe(true);
    expect(result.current.overview).toBeNull();
    expect(result.current.equipmentByNeighborhood).toEqual([]);
    expect(result.current.serviceSummary).toEqual([]);
  });

  it("busca os três endpoints do dashboard", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockDashboardOverview), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: mockEquipmentByNeighborhood }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: mockServiceSummary }), { status: 200 }));

    renderHook(() => useDashboard(emptyFilters));

    expect(fetch).toHaveBeenCalledWith("/api/v1/dashboard/overview");
    expect(fetch).toHaveBeenCalledWith("/api/v1/dashboard/equipment_by_neighborhood");
    expect(fetch).toHaveBeenCalledWith("/api/v1/dashboard/service_summary");
  });

  it("inclui filtros na query string quando presentes", async () => {
    vi.mocked(fetch)
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    const filters: Filters = { ...emptyFilters, neighborhood_id: "42", sus_only: true };
    renderHook(() => useDashboard(filters));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("neighborhood_id=42")
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("sus_only=true")
    );
  });

  it("retorna dados após sucesso", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockDashboardOverview), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: mockEquipmentByNeighborhood }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: mockServiceSummary }), { status: 200 }));

    const { result } = renderHook(() => useDashboard(emptyFilters));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.overview).toEqual(mockDashboardOverview);
    expect(result.current.equipmentByNeighborhood).toEqual(mockEquipmentByNeighborhood);
    expect(result.current.serviceSummary).toEqual(mockServiceSummary);
    expect(result.current.error).toBeNull();
  });

  it("expõe error quando um endpoint falha", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    const { result } = renderHook(() => useDashboard(emptyFilters));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Erro ao buscar resumo");
    expect(result.current.overview).toBeNull();
  });
});
