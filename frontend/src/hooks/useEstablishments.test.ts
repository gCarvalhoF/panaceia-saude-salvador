import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEstablishments, useEstablishmentDetail } from "./useEstablishments";
import { mockEstablishments, mockEstablishmentDetail } from "../test/fixtures";
import type { Filters } from "../types";

const defaultFilters: Filters = {
  type: "",
  legal_nature: "",
  management: "",
  sus_only: false,
  neighborhood_id: "",
  equipment: "",
  service: "",
  reference_category: "",
};

describe("useEstablishments", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("busca /api/v1/health_establishments sem parâmetros quando filtros estão vazios", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockEstablishments), { status: 200 })
    );

    renderHook(() => useEstablishments(defaultFilters));

    expect(fetch).toHaveBeenCalledWith("/api/v1/health_establishments?");
  });

  it("inclui parâmetro type quando definido", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockEstablishments), { status: 200 })
    );

    renderHook(() => useEstablishments({ ...defaultFilters, type: "02" }));

    expect(fetch).toHaveBeenCalledWith("/api/v1/health_establishments?type=02");
  });

  it("inclui sus_only=true quando ativo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockEstablishments), { status: 200 })
    );

    renderHook(() => useEstablishments({ ...defaultFilters, sus_only: true }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/health_establishments?sus_only=true"
    );
  });

  it("inclui múltiplos parâmetros quando vários filtros estão ativos", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockEstablishments), { status: 200 })
    );

    renderHook(() =>
      useEstablishments({
        type: "01",
        legal_nature: "municipal",
        management: "M",
        sus_only: true,
        neighborhood_id: "3",
        equipment: "02",
        service: "116",
        reference_category: "referencia_cardiovascular",
      })
    );

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    const params = new URLSearchParams(calledUrl.split("?")[1]);

    expect(params.get("type")).toBe("01");
    expect(params.get("legal_nature")).toBe("municipal");
    expect(params.get("management")).toBe("M");
    expect(params.get("sus_only")).toBe("true");
    expect(params.get("neighborhood_id")).toBe("3");
    expect(params.get("equipment")).toBe("02");
    expect(params.get("service")).toBe("116");
    expect(params.get("reference_category")).toBe("referencia_cardiovascular");
  });

  it("não inclui sus_only quando false", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockEstablishments), { status: 200 })
    );

    renderHook(() => useEstablishments({ ...defaultFilters, sus_only: false }));

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("sus_only");
  });

  it("retorna dados após sucesso", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockEstablishments), { status: 200 })
    );

    const { result } = renderHook(() => useEstablishments(defaultFilters));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(mockEstablishments);
    expect(result.current.error).toBeNull();
  });

  it("refaz o fetch quando os filtros mudam", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockEstablishments), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockEstablishments), { status: 200 }));

    const { rerender } = renderHook(
      ({ filters }) => useEstablishments(filters),
      { initialProps: { filters: defaultFilters } }
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    rerender({ filters: { ...defaultFilters, type: "01" } });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("type=01");
  });

  it("expõe error quando o servidor retorna erro HTTP", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    const { result } = renderHook(() => useEstablishments(defaultFilters));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Erro ao buscar estabelecimentos");
  });
});

describe("useEstablishmentDetail", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não faz fetch quando id é null", () => {
    renderHook(() => useEstablishmentDetail(null));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("busca /api/v1/health_establishments/:id quando id é fornecido", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ type: "Feature", properties: mockEstablishmentDetail }),
        { status: 200 }
      )
    );

    renderHook(() => useEstablishmentDetail(10));

    expect(fetch).toHaveBeenCalledWith("/api/v1/health_establishments/10");
  });

  it("retorna as properties do feature após sucesso", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ type: "Feature", properties: mockEstablishmentDetail }),
        { status: 200 }
      )
    );

    const { result } = renderHook(() => useEstablishmentDetail(10));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.name).toBe("UBS Pituba");
    expect(result.current.data?.equipments).toHaveLength(2);
    expect(result.current.data?.services).toHaveLength(1);
  });

  it("define data como null quando o fetch falha", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("fail"));

    const { result } = renderHook(() => useEstablishmentDetail(10));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
  });

  it("limpa data e não busca quando id muda para null", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ type: "Feature", properties: mockEstablishmentDetail }),
        { status: 200 }
      )
    );

    const { result, rerender } = renderHook(
      ({ id }) => useEstablishmentDetail(id),
      { initialProps: { id: 10 as number | null } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();

    rerender({ id: null });

    expect(result.current.data).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
