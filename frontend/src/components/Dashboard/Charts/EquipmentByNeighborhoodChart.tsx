import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { EquipmentByNeighborhood } from "../../../types";

interface Props {
  data: EquipmentByNeighborhood[];
  onNeighborhoodClick?: (name: string) => void;
}

export default function EquipmentByNeighborhoodChart({ data, onNeighborhoodClick }: Props) {
  if (!data.length) return null;

  const top10 = data.slice(0, 10);

  return (
    <div>
      {onNeighborhoodClick && (
        <p className="text-xs text-gray-400 mb-1 text-center">Clique em um bairro para filtrar</p>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={top10} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="neighborhood"
            width={140}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => [
              Number(value).toLocaleString("pt-BR"),
              "Equipamentos",
            ]}
          />
          <Bar
            dataKey="total_equipments"
            fill="#2378b5"
            radius={[0, 4, 4, 0]}
            style={{ cursor: onNeighborhoodClick ? "pointer" : "default" }}
            onClick={
              onNeighborhoodClick
                ? (data) => onNeighborhoodClick(data.payload.neighborhood)
                : undefined
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
