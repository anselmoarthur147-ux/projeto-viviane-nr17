import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { AcaoNR17 } from "@/lib/sheets.functions";
import { isEncerrada, isAtrasada, criticidadeNivel } from "@/lib/nr17";

interface AreaStat {
  area: string;
  total: number;
  concluidas: number;
  atrasadas: number;
  criticas: number;
  perc: number;
}

function buildStats(acoes: AcaoNR17[]): AreaStat[] {
  const map = new Map<string, AreaStat>();
  acoes.forEach((a) => {
    const k = a.areaResponsavel || "Sem área";
    const cur =
      map.get(k) ??
      ({ area: k, total: 0, concluidas: 0, atrasadas: 0, criticas: 0, perc: 0 } as AreaStat);
    cur.total += 1;
    if (isEncerrada(a.status)) cur.concluidas += 1;
    if (isAtrasada(a)) cur.atrasadas += 1;
    const n = criticidadeNivel(a);
    if (n === "Crítico" || n === "Alto") cur.criticas += 1;
    map.set(k, cur);
  });
  const arr = Array.from(map.values());
  arr.forEach((s) => (s.perc = s.total > 0 ? Math.round((s.concluidas / s.total) * 100) : 0));
  return arr;
}

export function AreaAnalysis({ acoes }: { acoes: AcaoNR17[] }) {
  const stats = buildStats(acoes);
  const porVolume = [...stats].sort((a, b) => b.total - a.total).slice(0, 6);
  const porRisco = [...stats]
    .filter((s) => s.criticas + s.atrasadas > 0)
    .sort((a, b) => b.criticas + b.atrasadas - (a.criticas + a.atrasadas))
    .slice(0, 6);
  const melhores = [...stats]
    .filter((s) => s.total >= 2)
    .sort((a, b) => b.perc - a.perc)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Áreas que Concentram Risco</CardTitle>
          <p className="text-xs text-muted-foreground">
            Onde está a maior pressão de atrasos e severidade
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {porRisco.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma área com concentração de risco no momento.
            </p>
          ) : (
            porRisco.map((s) => (
              <div key={s.area} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {s.area}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    {s.criticas > 0 ? (
                      <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-[10px]">
                        {s.criticas} críticas
                      </Badge>
                    ) : null}
                    {s.atrasadas > 0 ? (
                      <Badge variant="outline" className="border-warning/40 bg-warning/15 text-warning-foreground text-[10px]">
                        {s.atrasadas} atrasadas
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <Progress value={s.perc} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground">
                  {s.concluidas}/{s.total} concluídas · {s.perc}% executado
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Áreas com Melhor Desempenho</CardTitle>
          <p className="text-xs text-muted-foreground">
            Maior percentual de execução das ações
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {melhores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
          ) : (
            melhores.map((s) => (
              <div key={s.area} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {s.area}
                  </p>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-success">
                    {s.perc}%
                  </span>
                </div>
                <Progress value={s.perc} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground">
                  {s.concluidas}/{s.total} concluídas
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Volume por Área</CardTitle>
          <p className="text-xs text-muted-foreground">
            Quais áreas concentram mais ações no plano
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {porVolume.map((s) => (
              <div
                key={s.area}
                className="rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <p className="truncate text-sm font-semibold text-foreground">
                  {s.area}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {s.total}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="text-success">{s.concluidas} ok</span>
                  <span>·</span>
                  <span>{s.total - s.concluidas} aberto</span>
                  {s.atrasadas > 0 ? (
                    <>
                      <span>·</span>
                      <span className="text-destructive">{s.atrasadas} atraso</span>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
