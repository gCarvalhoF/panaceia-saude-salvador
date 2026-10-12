import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNeighborhoods } from "./useNeighborhoods";
import { mockNeighborhoods } from "../test/fixtures";

describe("useNeighborhoods", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("começa em estado de loading", () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockNeighborhoods), { status: 200 })
    );

    const { result } = renderHook(() => useNeighborhoods());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("busca /api/v1/neighborhoods", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockNeighborhoods), { status: 200 })
    );

    renderHook(() => useNeighborhoods());

    expect(fetch).toHaveBeenCalledWith("/api/v1/neighborhoods");
  });

  it("retorna dados após sucesso", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockNeighborhoods), { status: 200 })
    );

    const { result } = renderHook(() => useNeighborhoods());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(mockNeighborhoods);
    expect(result.current.error).toBeNull();
  });

  it("expõe error e data nulo quando o servidor retorna erro HTTP", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    const { result } = renderHook(() => useNeighborhoods());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Erro ao buscar bairros");
  });

  it("expõe error quando fetch lança exceção de rede", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useNeighborhoods());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Network error");
  });
});
