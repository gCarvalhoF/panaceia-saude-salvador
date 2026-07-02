import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterPanel from "./FilterPanel";
import { mockNeighborhoods } from "../../test/fixtures";
import { ESTABLISHMENT_TYPES, LEGAL_NATURES, MANAGEMENT_TYPES } from "../../types";
import type { FilterOptions, Filters } from "../../types";

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

const defaultFilterOptions: FilterOptions = {
  establishment_types: Object.entries(ESTABLISHMENT_TYPES).map(([value, label]) => ({ value, label })),
  legal_natures: Object.entries(LEGAL_NATURES).map(([value, label]) => ({ value, label })),
  management_types: Object.entries(MANAGEMENT_TYPES).map(([value, label]) => ({ value, label })),
  equipment_items: [
    { value: "", label: "Todos os equipamentos" },
    { value: "02", label: "Mamografo" },
  ],
  specialized_services: [
    { value: "", label: "Todos os serviços" },
    { value: "116", label: "Cardiologia" },
  ],
  reference_categories: [
    { value: "", label: "Todas as referências" },
    { value: "referencia_cardiovascular", label: "Referência Cardiovascular" },
  ],
};

function renderPanel(
  overrides: Partial<Filters> = {},
  onChange = vi.fn(),
  onClose = vi.fn(),
  extras: {
    filtersExpanded?: boolean;
    onFiltersToggle?: () => void;
    collapsed?: boolean;
    onCollapseToggle?: () => void;
    comparisonOpen?: boolean;
    comparisonIds?: number[];
    onComparisonIdsChange?: (ids: number[]) => void;
    onComparisonToggle?: () => void;
  } = {}
) {
  return render(
    <FilterPanel
      filters={{ ...defaultFilters, ...overrides }}
      filterOptions={defaultFilterOptions}
      onChange={onChange}
      neighborhoods={mockNeighborhoods}
      totalCount={42}
      loading={false}
      isOpen={true}
      onClose={onClose}
      collapsed={extras.collapsed ?? false}
      onCollapseToggle={extras.onCollapseToggle ?? vi.fn()}
      filtersExpanded={extras.filtersExpanded ?? true}
      onFiltersToggle={extras.onFiltersToggle ?? vi.fn()}
      comparisonOpen={extras.comparisonOpen ?? false}
      comparisonIds={extras.comparisonIds ?? []}
      onComparisonIdsChange={extras.onComparisonIdsChange ?? vi.fn()}
      onComparisonToggle={extras.onComparisonToggle ?? vi.fn()}
    />
  );
}

describe("FilterPanel", () => {
  describe("renderização inicial", () => {
    it("exibe o título 'Filtros'", () => {
      renderPanel();
      expect(screen.getByText("Filtros")).toBeInTheDocument();
    });

    it("exibe a contagem de estabelecimentos", () => {
      renderPanel();
      expect(screen.getByText("42 estabelecimentos")).toBeInTheDocument();
    });

    it("exibe 'Carregando...' quando loading é true", () => {
      render(
        <FilterPanel
          filters={defaultFilters}
          filterOptions={defaultFilterOptions}
          onChange={vi.fn()}
          neighborhoods={null}
          totalCount={0}
          loading={true}
          isOpen={true}
          onClose={vi.fn()}
          collapsed={false}
          onCollapseToggle={vi.fn()}
          filtersExpanded={true}
          onFiltersToggle={vi.fn()}
          comparisonOpen={false}
          comparisonIds={[]}
          onComparisonIdsChange={vi.fn()}
          onComparisonToggle={vi.fn()}
        />
      );
      expect(screen.getByText("Carregando...")).toBeInTheDocument();
    });

    it("renderiza o multiselect de tipo de estabelecimento", () => {
      renderPanel();
      expect(screen.getByLabelText(/tipo de estabelecimento/i)).toBeInTheDocument();
    });

    it("renderiza os radio buttons de natureza jurídica", () => {
      renderPanel();
      expect(screen.getByLabelText("Todas")).toBeInTheDocument();
      expect(screen.getByLabelText("Pública")).toBeInTheDocument();
      expect(screen.getByLabelText("Privada")).toBeInTheDocument();
      expect(screen.getByLabelText("Sem Fins Lucrativos")).toBeInTheDocument();
    });

    it("renderiza o checkbox 'Apenas SUS'", () => {
      renderPanel();
      expect(screen.getByLabelText(/apenas sus/i)).toBeInTheDocument();
    });

    it("renderiza o multiselect de bairro", () => {
      renderPanel();
      expect(screen.getByLabelText(/bairro/i)).toBeInTheDocument();
    });

    it("renderiza o multiselect de equipamento", () => {
      renderPanel();
      expect(screen.getByLabelText(/equipamento/i)).toBeInTheDocument();
    });

    it("renderiza o multiselect de serviço especializado", () => {
      renderPanel();
      expect(screen.getByLabelText(/serviço especializado/i)).toBeInTheDocument();
    });

    it("renderiza o multiselect de referência hospitalar", () => {
      renderPanel();
      expect(screen.getByLabelText(/referência hospitalar/i)).toBeInTheDocument();
    });

    it("renderiza o botão 'Redefinir Filtros'", () => {
      renderPanel();
      expect(screen.getByRole("button", { name: /redefinir filtros/i })).toBeInTheDocument();
    });

    it("renderiza o botão de toggle 'Filtros' no topo", () => {
      renderPanel();
      const toggle = screen.getByRole("button", { name: "Filtros" });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("renderiza o botão CTA 'Comparar Bairros' no topo", () => {
      renderPanel();
      expect(screen.getByRole("button", { name: /comparar bairros/i })).toBeInTheDocument();
    });
  });

  describe("collapse de filtros", () => {
    it("oculta os inputs de filtro quando filtersExpanded=false", () => {
      renderPanel({}, vi.fn(), vi.fn(), { filtersExpanded: false });
      expect(screen.queryByLabelText(/tipo de estabelecimento/i)).not.toBeInTheDocument();
      expect(screen.queryByText("42 estabelecimentos")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /redefinir filtros/i })).not.toBeInTheDocument();
    });

    it("o botão 'Filtros' reflete aria-expanded=false quando recolhido", () => {
      renderPanel({}, vi.fn(), vi.fn(), { filtersExpanded: false });
      expect(screen.getByRole("button", { name: "Filtros" })).toHaveAttribute("aria-expanded", "false");
    });

    it("chama onFiltersToggle ao clicar no botão 'Filtros'", async () => {
      const user = userEvent.setup();
      const onFiltersToggle = vi.fn();
      renderPanel({}, vi.fn(), vi.fn(), { onFiltersToggle });
      await user.click(screen.getByRole("button", { name: "Filtros" }));
      expect(onFiltersToggle).toHaveBeenCalledTimes(1);
    });

    it("o botão 'Comparar Bairros' continua visível quando filtros estão recolhidos", () => {
      renderPanel({}, vi.fn(), vi.fn(), { filtersExpanded: false });
      expect(screen.getByRole("button", { name: /comparar bairros/i })).toBeInTheDocument();
    });

    it("os filtros aparecem entre os botões 'Filtros' e 'Comparar Bairros' (empurram comparar para baixo)", () => {
      renderPanel({}, vi.fn(), vi.fn(), { filtersExpanded: true });
      const filtrosBtn = screen.getByRole("button", { name: "Filtros" });
      const compararBtn = screen.getByRole("button", { name: /comparar bairros/i });
      const filtersSection = document.getElementById("filters-section");

      expect(filtersSection).not.toBeNull();
      // DOCUMENT_POSITION_FOLLOWING = 4 → second arg comes after first
      expect(filtrosBtn.compareDocumentPosition(filtersSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(filtersSection!.compareDocumentPosition(compararBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe("sidebar collapse (rail mode)", () => {
    it("aplica largura reduzida quando collapsed=true", () => {
      renderPanel({}, vi.fn(), vi.fn(), { collapsed: true });
      const sidebar = screen.getByTestId("sidebar");
      expect(sidebar.className).toMatch(/w-14\b/);
      expect(sidebar.className).not.toMatch(/w-72\b/);
    });

    it("aplica largura completa quando collapsed=false", () => {
      renderPanel({}, vi.fn(), vi.fn(), { collapsed: false });
      const sidebar = screen.getByTestId("sidebar");
      expect(sidebar.className).toMatch(/w-72\b/);
    });

    it("oculta o texto 'Filtros' quando collapsed (mantém ícone via aria-label)", () => {
      renderPanel({}, vi.fn(), vi.fn(), { collapsed: true });
      // Texto visível some
      expect(screen.queryByText("Filtros")).not.toBeInTheDocument();
      // Botão continua acessível pelo aria-label
      expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
    });

    it("oculta o texto 'Comparar Bairros' quando collapsed", () => {
      renderPanel({}, vi.fn(), vi.fn(), { collapsed: true });
      expect(screen.queryByText("Comparar Bairros")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Comparar Bairros" })).toBeInTheDocument();
    });

    it("oculta os inputs de filtro mesmo com filtersExpanded=true quando collapsed", () => {
      renderPanel({}, vi.fn(), vi.fn(), { collapsed: true, filtersExpanded: true });
      expect(screen.queryByLabelText(/tipo de estabelecimento/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/estabelecimentos$/)).not.toBeInTheDocument();
    });

    it("oculta o badge de selecionados quando collapsed", () => {
      renderPanel({}, vi.fn(), vi.fn(), { collapsed: true, comparisonIds: [1, 2, 3] });
      expect(screen.queryByText(/selecionados/i)).not.toBeInTheDocument();
    });

    it("renderiza o botão de toggle do collapse com aria-pressed", () => {
      const onCollapseToggle = vi.fn();
      renderPanel({}, vi.fn(), vi.fn(), { collapsed: false, onCollapseToggle });
      const toggle = screen.getByRole("button", { name: /recolher painel/i });
      expect(toggle).toHaveAttribute("aria-pressed", "false");
    });

    it("o aria-label do toggle do collapse muda conforme o estado", () => {
      renderPanel({}, vi.fn(), vi.fn(), { collapsed: true });
      expect(screen.getByRole("button", { name: /expandir painel/i })).toBeInTheDocument();
    });

    it("chama onCollapseToggle ao clicar no botão de toggle do collapse", async () => {
      const user = userEvent.setup();
      const onCollapseToggle = vi.fn();
      renderPanel({}, vi.fn(), vi.fn(), { onCollapseToggle });
      await user.click(screen.getByRole("button", { name: /recolher painel/i }));
      expect(onCollapseToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("input de comparação na sidebar", () => {
    it("não renderiza o input quando comparisonOpen=false", () => {
      renderPanel({}, vi.fn(), vi.fn(), { comparisonOpen: false });
      expect(screen.queryByLabelText(/selecione bairros para comparar/i)).not.toBeInTheDocument();
    });

    it("renderiza o input abaixo do botão de comparar quando comparisonOpen=true", () => {
      renderPanel({}, vi.fn(), vi.fn(), { comparisonOpen: true });
      const compararBtn = screen.getByRole("button", { name: /comparar bairros/i });
      const input = screen.getByLabelText(/selecione bairros para comparar/i);

      expect(input).toBeInTheDocument();
      expect(
        compararBtn.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it("não renderiza o input quando collapsed mesmo se comparisonOpen=true", () => {
      renderPanel({}, vi.fn(), vi.fn(), { comparisonOpen: true, collapsed: true });
      expect(screen.queryByLabelText(/selecione bairros para comparar/i)).not.toBeInTheDocument();
    });

    it("propaga seleções do input via onComparisonIdsChange", async () => {
      const user = userEvent.setup();
      const onComparisonIdsChange = vi.fn();
      renderPanel({}, vi.fn(), vi.fn(), {
        comparisonOpen: true,
        onComparisonIdsChange,
      });

      await user.click(screen.getByLabelText(/selecione bairros para comparar/i));
      await user.click(screen.getByRole("checkbox", { name: "Pituba" }));

      expect(onComparisonIdsChange).toHaveBeenCalled();
    });
  });

  describe("interações com multiselect", () => {
    it("chama onChange com o tipo selecionado ao clicar na opção", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({}, onChange);

      // Open the type multiselect dropdown
      await user.click(screen.getByLabelText(/tipo de estabelecimento/i));
      // Click a checkbox option
      await user.click(screen.getByRole("checkbox", { name: "Hospital Geral" }));

      expect(onChange).toHaveBeenCalledWith({ type: "01" });
    });

    it("chama onChange com múltiplos tipos selecionados", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({ type: "01" }, onChange);

      await user.click(screen.getByLabelText(/tipo de estabelecimento/i));
      // Select a second type
      await user.click(screen.getByRole("checkbox", { name: "Policlinica" }));

      expect(onChange).toHaveBeenCalledWith({ type: "01,04" });
    });

    it("chama onChange com legal_nature ao selecionar radio 'Pública'", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({}, onChange);

      await user.click(screen.getByLabelText("Pública"));

      expect(onChange).toHaveBeenCalledWith({ legal_nature: "publica" });
    });

    it("chama onChange com management ao clicar na opção de gestão", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({}, onChange);

      await user.click(screen.getByLabelText(/tipo de gestão/i));
      await user.click(screen.getByRole("checkbox", { name: "Municipal" }));

      expect(onChange).toHaveBeenCalledWith({ management: "M" });
    });

    it("chama onChange com equipment ao clicar na opção de equipamento", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({}, onChange);

      await user.click(screen.getByLabelText(/equipamento/i));
      await user.click(screen.getByRole("checkbox", { name: "Mamografo" }));

      expect(onChange).toHaveBeenCalledWith({ equipment: "02" });
    });

    it("chama onChange com service ao clicar na opção de serviço", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({}, onChange);

      await user.click(screen.getByLabelText(/serviço especializado/i));
      await user.click(screen.getByRole("checkbox", { name: "Cardiologia" }));

      expect(onChange).toHaveBeenCalledWith({ service: "116" });
    });

    it("chama onChange com reference_category ao clicar na opção de referência", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({}, onChange);

      await user.click(screen.getByLabelText(/referência hospitalar/i));
      await user.click(screen.getByRole("checkbox", { name: "Referência Cardiovascular" }));

      expect(onChange).toHaveBeenCalledWith({ reference_category: "referencia_cardiovascular" });
    });

    it("chama onChange com neighborhood_id ao clicar na opção de bairro", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({}, onChange);

      await user.click(screen.getByLabelText(/bairro/i));
      await user.click(screen.getByRole("checkbox", { name: "Pituba" }));

      expect(onChange).toHaveBeenCalledWith({ neighborhood_id: "1" });
    });

    it("exibe o nome da cidade ao lado do bairro nas opções", async () => {
      const user = userEvent.setup();
      renderPanel();

      await user.click(screen.getByLabelText(/bairro/i));

      const pitubaRow = screen.getByRole("checkbox", { name: "Pituba" }).closest("label");
      expect(pitubaRow?.textContent).toContain("Pituba");
      expect(pitubaRow?.textContent).toContain("Salvador");
    });

    it("chama onChange com sus_only: true ao marcar o checkbox", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({}, onChange);

      await user.click(screen.getByLabelText(/apenas sus/i));

      expect(onChange).toHaveBeenCalledWith({ sus_only: true });
    });

    it("chama onChange com sus_only: false ao desmarcar o checkbox", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({ sus_only: true }, onChange);

      await user.click(screen.getByLabelText(/apenas sus/i));

      expect(onChange).toHaveBeenCalledWith({ sus_only: false });
    });

    it("remove seleção ao clicar no botão remover da tag", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({ type: "01,04" }, onChange);

      // Click the remove button on the "Hospital Geral" tag
      const removeBtn = screen.getByRole("button", { name: /remover hospital geral/i });
      await user.click(removeBtn);

      expect(onChange).toHaveBeenCalledWith({ type: "04" });
    });

    it("chama onChange com todos os campos resetados ao clicar em 'Redefinir Filtros'", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderPanel({ type: "02", sus_only: true }, onChange);

      await user.click(screen.getByRole("button", { name: /Redefinir filtros/i }));

      expect(onChange).toHaveBeenCalledWith({
        type: "",
        legal_nature: "",
        management: "",
        sus_only: false,
        neighborhood_id: "",
        equipment: "",
        service: "",
        reference_category: "",
      });
    });
  });

  describe("estado dos controles", () => {
    it("o checkbox SUS reflete o valor do filtro", () => {
      renderPanel({ sus_only: true });
      expect(screen.getByLabelText(/apenas sus/i)).toBeChecked();
    });

    it("o radio 'Privada' fica marcado quando legal_nature='privada'", () => {
      renderPanel({ legal_nature: "privada" });
      expect(screen.getByLabelText("Privada")).toBeChecked();
    });

    it("o radio 'Todas' fica marcado com filtro vazio", () => {
      renderPanel({ legal_nature: "" });
      expect(screen.getByLabelText("Todas")).toBeChecked();
    });

    it("mostra tags para valores selecionados no multiselect de tipo", () => {
      renderPanel({ type: "01" });
      expect(screen.getByText("Hospital Geral")).toBeInTheDocument();
    });

    it("mostra placeholder quando nenhum tipo está selecionado", () => {
      renderPanel({ type: "" });
      expect(screen.getByText("Todos os tipos")).toBeInTheDocument();
    });

    it("mostra contagem de selecionados no botão do multiselect", () => {
      renderPanel({ type: "01,02" });
      expect(screen.getByText("2 selecionados")).toBeInTheDocument();
    });
  });
});
