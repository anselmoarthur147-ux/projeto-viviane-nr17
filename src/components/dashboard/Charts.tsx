import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AcaoNR17 } from "@/lib/sheets.functions";
import { isEncerrada, statusGroup, severidadeLabel } from "@/lib/nr17";

const STATUS_COLORS: Record<string, string> = {
  Realizado: "oklch(0.62 0.16 150)",
  "Em Análise": "oklch(0.62 0.14 230)",
  "Em Andamento": "oklch(0.78 0.16 75)",
  "Não Iniciado": "oklch(0.7 0.02 250)",
  "Inviável": "oklch(0.58 0.21 25)",
  Outro: "oklch(0.55 0.06 250)",
};

const SEV_COLORS: Record<string, string> = {
  Alto: "oklch(0.58 0.21 25)",
  Significante: "oklch(0.78 0.16 75)",
  Médio: "oklch(0.62 0.14 230)",
  Baixo: "oklch(0.62 0.16 150)",
  "Sem risco": "oklch(0.7 0.02 250)",
};

export function StatusPie({ acoes }: { acoes: AcaoNR17[] }) {
  const counts: Record<string, number> = {};
  acoes.forEach((a) => {
    const g = statusGroup(a.status);
    counts[g] = (counts[g] ?? 0) + 1;
  });
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distribuição por Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((d) => (
                <Cell
                  key={d.name}
                  fill={STATUS_COLORS[d.name] ?? "oklch(0.6 0.05 250)"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [`${v} ações`, ""]}
              contentStyle={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PorAreaChart({ acoes }: { acoes: AcaoNR17[] }) {
  const map = new Map<string, { total: number; concluidas: number }>();
  acoes.forEach((a) => {
    const key = a.areaResponsavel || "Sem área";
    const cur = map.get(key) ?? { total: 0, concluidas: 0 };
    cur.total += 1;
    if (isEncerrada(a.status)) cur.concluidas += 1;
    map.set(key, cur);
  });
  const data = Array.from(map.entries())
    .map(([area, v]) => ({
      area,
      Concluídas: v.concluidas,
      Pendentes: v.total - v.concluidas,
    }))
    .sort((a, b) => b.Concluídas + b.Pendentes - (a.Concluídas + a.Pendentes))
    .slice(0, 10);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top 10 Áreas — Volume de Ações</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              dataKey="area"
              type="category"
              width={130}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Concluídas" stackId="a" fill="oklch(0.62 0.16 150)" />
            <Bar dataKey="Pendentes" stackId="a" fill="oklch(0.78 0.16 75)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PorRiscoChart({ acoes }: { acoes: AcaoNR17[] }) {
  const counts: Record<string, number> = {};
  acoes.forEach((a) => {
    const lbl = severidadeLabel(a.severidade);
    counts[lbl] = (counts[lbl] ?? 0) + 1;
  });
  const order = ["Alto", "Significante", "Médio", "Baixo", "Sem risco"];
  const data = order
    .filter((k) => counts[k])
    .map((k) => ({ nivel: k, total: counts[k] }));

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ações por Nível de Risco</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="nivel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.nivel} fill={SEV_COLORS[d.nivel] ?? "oklch(0.6 0.05 250)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
