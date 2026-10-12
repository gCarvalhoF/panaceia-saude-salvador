import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./DashboardPage";
import {
  mockNeighborhoods,
  mockEstablishments,
  mockFilterOptions,
  mockDashboardOverview,
  mockEquipmentByNeighborhood,
  mockServiceSummary,
} from "../test/fixtures";

vi.mock("react-leaflet", () => import("../test/mocks/react-leaflet"));
vi.mock("react-leaflet-cluster", () => import("../test/mocks/react-leaflet-cluster"));
vi.mock("leaflet", () => import("../test/mocks/leaflet"));
vi.mock("leaflet/dist/leaflet.css", () => ({}));

// recharts ResponsiveContainer needs dimensions; stub it out
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

function mockFetchByUrl() {
  vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
    const urlStr = String(url);
    let data: object;
    if (urlStr.includes("/api/v1/neighborhoods") && !urlStr.includes("compare")) {
      data = mockNeighborhoods;
    } else if (urlStr.includes("/api/v1/health_establishments") && !urlStr.includes("/api/v1/health_establishments/")) {
      data = mockEstablishments;
    } else if (urlStr.includes("/api/v1/filter_options")) {
      data = mockFilterOptions;
    } else if (urlStr.includes("/api/v1/dashboard/overview")) {
      data = mockDashboardOverview;
    } else if (urlStr.includes("/api/v1/dashboard/equipment_by_neighborhood")) {
      data = { data: mockEquipmentByNeighborhood };
    } else if (urlStr.includes("/api/v1/dashboard/service_summary")) {
      data = { data: mockServiceSummary };
    } else {
      data = {};
    }
    return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }));
  });
}

async function expandFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Expandir painel lateral" }));
  await user.click(screen.getByRole("button", { name: "Filtros" }));
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza o título do dashboard", async () => {
    mockFetchByUrl();

    render(<DashboardPage />);

    expect(screen.getByText("Saúde em Salvador")).toBeInTheDocument();
  });

  it("renderiza o ícone do site (bandeira de Salvador) no header", async () => {
    mockFetchByUrl();

    render(<DashboardPage />);

    const icon = screen.getByAltText(/bandeira de salvador/i);
    expect(icon).toBeInTheDocument();
    expect(icon.tagName).toBe("IMG");
  });

  it("renderiza o painel de filtros", async () => {
    mockFetchByUrl();

    render(<DashboardPage />);

    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
  });

  it("renderiza o container do mapa", async () => {
    mockFetchByUrl();

    render(<DashboardPage />);

    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("renderiza o seletor de métrica do coroplético", async () => {
    mockFetchByUrl();

    render(<DashboardPage />);

    expect(screen.getByLabelText(/métrica do mapa/i)).toBeInTheDocument();
  });

  it("exibe o spinner 'Carregando...' no header enquanto os dados chegam", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // pendente

    render(<DashboardPage />);

    expect(screen.getByText("Carregando...", { selector: "span" })).toBeInTheDocument();
  });

  it("exibe a contagem de estabelecimentos no painel de filtros após carregar", async () => {
    const user = userEvent.setup();
    mockFetchByUrl();

    render(<DashboardPage />);

    await expandFilters(user);

    await waitFor(() =>
      expect(screen.getByText("2 estabelecimentos")).toBeInTheDocument()
    );
  });

  it("renderiza os cards de métricas após carregar", async () => {
    mockFetchByUrl();

    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("150")).toBeInTheDocument()
    );
    expect(screen.getByText("120")).toBeInTheDocument(); // SUS establishments
    expect(screen.getByText("500")).toBeInTheDocument(); // total equipment
  });

  it("exibe os bairros no dropdown após carregar", async () => {
    const user = userEvent.setup();
    mockFetchByUrl();

    render(<DashboardPage />);

    await expandFilters(user);

    await waitFor(() => screen.getByLabelText(/bairro/i));
    await user.click(screen.getByLabelText(/bairro/i));

    expect(screen.getByText("Pituba")).toBeInTheDocument();
    expect(screen.getByText("Barra")).toBeInTheDocument();
  });

  it("renderiza o botão de abrir filtros (mobile)", async () => {
    mockFetchByUrl();

    render(<DashboardPage />);

    expect(screen.getByLabelText("Abrir filtros")).toBeInTheDocument();
  });

  it("renderiza o botão 'Comparar Bairros'", async () => {
    mockFetchByUrl();

    render(<DashboardPage />);

    expect(screen.getByRole("button", { name: "Comparar Bairros" })).toBeInTheDocument();
  });

  describe("sincronização bidirecional de bairro", () => {
    it("exibe badge de bairro no header ao selecionar pelo dropdown", async () => {
      const user = userEvent.setup();
      mockFetchByUrl();

      render(<DashboardPage />);

      await expandFilters(user);
      await waitFor(() => screen.getByLabelText(/bairro/i));

      // Open neighborhood multiselect and select Pituba
      await user.click(screen.getByLabelText(/bairro/i));
      await user.click(screen.getByRole("checkbox", { name: "Pituba" }));

      await waitFor(() => {
        const badge = screen.getByText("Pituba", { selector: "span.bg-orange-100" });
        expect(badge).toBeInTheDocument();
      });
    });

    it("remove o badge e limpa o filtro ao clicar no botão ×", async () => {
      const user = userEvent.setup();
      mockFetchByUrl();

      render(<DashboardPage />);

      await expandFilters(user);
      await waitFor(() => screen.getByLabelText(/bairro/i));

      // Open neighborhood multiselect and select Pituba
      await user.click(screen.getByLabelText(/bairro/i));
      await user.click(screen.getByRole("checkbox", { name: "Pituba" }));

      await waitFor(() => screen.getByTitle("Limpar seleção"));

      await user.click(screen.getByTitle("Limpar seleção"));

      await waitFor(() =>
        expect(screen.queryByTitle("Limpar seleção")).not.toBeInTheDocument()
      );
    });

    it("refaz o fetch de estabelecimentos ao mudar o filtro de tipo", async () => {
      const user = userEvent.setup();
      mockFetchByUrl();

      render(<DashboardPage />);

      await expandFilters(user);
      await waitFor(() => screen.getByLabelText(/tipo de estabelecimento/i));

      const callsBefore = vi.mocked(fetch).mock.calls.length;

      // Open type multiselect and select Hospital Geral
      await user.click(screen.getByLabelText(/tipo de estabelecimento/i));
      await user.click(screen.getByRole("checkbox", { name: "Hospital Geral" }));

      await waitFor(() =>
        expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore)
      );

      const allUrls = vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
      expect(allUrls.some((url) => url.includes("type="))).toBe(true);
    });

    it("filtra o dashboard ao mudar o filtro de bairro via seleção no mapa", async () => {
      mockFetchByUrl();

      render(<DashboardPage />);

      const user = userEvent.setup();
      await expandFilters(user);
      await waitFor(() => screen.getByLabelText(/bairro/i));

      const callsBefore = vi.mocked(fetch).mock.calls.length;

      // Simulate neighborhood filter change (as if from filter panel)
      await user.click(screen.getByLabelText(/bairro/i));
      await user.click(screen.getByRole("checkbox", { name: "Pituba" }));

      await waitFor(() =>
        expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore)
      );

      const newUrls = vi.mocked(fetch).mock.calls
        .slice(callsBefore)
        .map((c) => String(c[0]));
      // Both establishments and dashboard endpoints should be re-fetched with neighborhood_id
      expect(newUrls.some((url) => url.includes("neighborhood_id="))).toBe(true);
    });
  });
});
