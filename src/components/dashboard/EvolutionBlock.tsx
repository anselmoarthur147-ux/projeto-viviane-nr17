import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Activity, AlertCircle } from "lucide-react";
import type { AcaoNR17 } from "@/lib/sheets.functions";
import { isEncerrada, criticidadeNivel } from "@/lib/nr17";
import { parseDateBR } from "@/lib/nr17/dates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function EvolutionBlock({ acoes }: { acoes: AcaoNR17[] }) {
  let concluidas = 0;
  let abertas = 0;
  let atencao = 0;
  acoes.forEach((a) => {
    if (isEncerrada(a.status)) concluidas++;
    else abertas++;
    const n = criticidadeNivel(a);
    if (n === "Crítico" || n === "Alto") atencao++;
  });
  const total = acoes.length;
  const perc = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  const meses = computeMensal(acoes);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Evolução do Plano</CardTitle>
        <p className="text-xs text-muted-foreground">
          Andamento global do plano de ação NR17
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Execução geral</span>
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {perc}%
            </span>
          </div>
          <Progress value={perc} className="h-2.5" />
          <p className="mt-2 text-xs text-muted-foreground">
            {concluidas} de {total} ações concluídas · {abertas} em aberto
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
          <EvolutionStat
            icon={CheckCircle2}
            tone="success"
            label="Concluídas"
            value={concluidas}
          />
          <EvolutionStat
            icon={Activity}
            tone="info"
            label="Em aberto"
            value={abertas}
          />
          <EvolutionStat
            icon={AlertCircle}
            tone="destructive"
            label="Em atenção"
            value={atencao}
          />
        </div>

        <div className="border-t border-border/60 pt-4">
          <p className="mb-2 text-sm font-medium text-foreground">
            Conclusão por mês
          </p>
          {meses.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Sem datas previstas para calcular evolução mensal.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Concluídas</TableHead>
                    <TableHead className="text-right">Pendentes</TableHead>
                    <TableHead className="min-w-[160px]">% Conclusão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meses.map((m) => (
                    <TableRow key={m.key}>
                      <TableCell className="font-medium tabular-nums">
                        {m.label}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.total}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-success">
                        {m.concluidas}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {m.pendentes}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={m.pct}
                            className="h-1.5 flex-1 [&>div]:bg-success"
                          />
                          <span className="w-10 text-right text-xs font-semibold tabular-nums text-success">
                            {m.pct}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MesAgg {
  key: string;
  label: string;
  total: number;
  concluidas: number;
  pendentes: number;
  pct: number;
}

const MESES_ABREV = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function computeMensal(acoes: AcaoNR17[]): MesAgg[] {
  const map = new Map<
    string,
    { total: number; concluidas: number; year: number; month: number }
  >();
  acoes.forEach((a) => {
    const d = parseDateBR(a.dataPrevista) ?? parseDateBR(a.data);
    if (!d) return;
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const cur = map.get(key) ?? { total: 0, concluidas: 0, year, month };
    cur.total++;
    if (isEncerrada(a.status)) cur.concluidas++;
    map.set(key, cur);
  });
  return Array.from(map.entries())
    .map(([key, v]) => {
      const pct = v.total > 0 ? Math.round((v.concluidas / v.total) * 100) : 0;
      return {
        key,
        label: `${MESES_ABREV[v.month]}/${String(v.year).slice(-2)}`,
        total: v.total,
        concluidas: v.concluidas,
        pendentes: v.total - v.concluidas,
        pct,
      };
    })
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}

function EvolutionStat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  tone: "success" | "info" | "destructive";
  label: string;
  value: number;
}) {
  const cls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "info"
        ? "bg-info/10 text-info"
        : "bg-destructive/10 text-destructive";
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${cls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
