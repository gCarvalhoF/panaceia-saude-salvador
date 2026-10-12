import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ServiceSummaryItem } from "../../../types";

interface Props {
  data: ServiceSummaryItem[];
  onServiceClick?: (code: string) => void;
}

export default function ServiceSummaryChart({ data, onServiceClick }: Props) {
  if (!data.length) return null;

  const top10 = data.slice(0, 10);

  return (
    <div>
      {onServiceClick && (
        <p className="text-xs text-gray-400 mb-1 text-center">Clique em um serviço para filtrar</p>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={top10}
          layout="vertical"
          margin={{ left: 20, right: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="name"
            width={180}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => [
              Number(value).toLocaleString("pt-BR"),
              "Estabelecimentos",
            ]}
          />
          <Bar
            dataKey="establishments_count"
            fill="#7c3aed"
            radius={[0, 4, 4, 0]}
            style={{ cursor: onServiceClick ? "pointer" : "default" }}
            onClick={
              onServiceClick
                ? (data) => onServiceClick(data.payload.code)
                : undefined
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
