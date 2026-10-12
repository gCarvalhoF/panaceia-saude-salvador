import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { code: string; name: string; count: number }[];
  onTypeClick?: (code: string) => void;
}

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ea580c", "#7c3aed",
  "#ca8a04", "#0891b2", "#b91c1c", "#6b7280", "#d946ef",
];

export default function EstablishmentTypeChart({ data, onTypeClick }: Props) {
  if (!data.length) return null;

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const above = sorted.filter((d) => total > 0 && d.count / total >= 0.05);
  const below = sorted.filter((d) => total > 0 && d.count / total < 0.05);
  const othersTotal = below.reduce((sum, d) => sum + d.count, 0);
  const chartData =
    total > 0 && othersTotal / total >= 0.05
      ? [...above, { code: "outros", name: "Outros", count: othersTotal }]
      : above;

  if (!chartData.length) return null;

  return (
    <div>
      {onTypeClick && (
        <p className="text-xs text-gray-400 mb-1 text-center">Clique em um tipo para filtrar</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${(name ?? "").length > 20 ? (name ?? "").slice(0, 20) + "…" : name} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
            labelLine={false}
            onClick={
              onTypeClick
                ? (data) => {
                    if (data.payload.code !== "outros") onTypeClick(data.payload.code);
                  }
                : undefined
            }
            style={{ cursor: onTypeClick ? "pointer" : "default" }}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => Number(value).toLocaleString("pt-BR")} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
