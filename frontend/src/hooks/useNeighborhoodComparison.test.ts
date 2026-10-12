import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNeighborhoodComparison } from "./useNeighborhoodComparison";
import { mockNeighborhoods } from "../test/fixtures";

const mockResponse = {
  neighborhoods: mockNeighborhoods.features.map((f) => f.properties),
};

describe("useNeighborhoodComparison", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não faz fetch quando menos de 2 ids", () => {
    renderHook(() => useNeighborhoodComparison([1]));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("não faz fetch com array vazio", () => {
    renderHook(() => useNeighborhoodComparison([]));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("data é null quando menos de 2 ids", () => {
    const { result } = renderHook(() => useNeighborhoodComparison([1]));
    expect(result.current.data).toBeNull();
  });

  it("busca /api/v1/neighborhoods/compare com ids", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    renderHook(() => useNeighborhoodComparison([1, 2]));

    expect(fetch).toHaveBeenCalledWith("/api/v1/neighborhoods/compare?ids=1,2");
  });

  it("retorna dados após sucesso", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const { result } = renderHook(() => useNeighborhoodComparison([1, 2]));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe("Pituba");
    expect(result.current.error).toBeNull();
  });

  it("expõe error quando o servidor retorna erro HTTP", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    const { result } = renderHook(() => useNeighborhoodComparison([1, 2]));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Erro ao buscar comparativo");
    expect(result.current.data).toBeNull();
  });

  it("refaz o fetch quando os ids mudam", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

    const { rerender } = renderHook(
      ({ ids }) => useNeighborhoodComparison(ids),
      { initialProps: { ids: [1, 2] } }
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    rerender({ ids: [1, 2, 3] });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("ids=1,2,3");
  });
});
