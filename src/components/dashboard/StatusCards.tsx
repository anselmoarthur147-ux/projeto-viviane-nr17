import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ListChecks,
  CheckCircle2,
  Search,
  PlayCircle,
  CircleDashed,
  Ban,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardKpis } from "@/lib/nr17";
import { capexAgregado } from "@/lib/nr17/capex";
import { statusGroup } from "@/lib/nr17";
import type { AcaoNR17 } from "@/lib/sheets.functions";
import type { HiracMap } from "@/lib/hirac.functions";

type Tone = "primary" | "success" | "warning" | "destructive" | "info" | "muted";

interface CardDef {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: Tone;
  capex: number | null;
}

const toneStyles: Record<Tone, { bg: string; text: string; bar: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", bar: "[&>div]:bg-primary" },
  success: { bg: "bg-success/10", text: "text-success", bar: "[&>div]:bg-success" },
  warning: { bg: "bg-warning/15", text: "text-warning-foreground", bar: "[&>div]:bg-warning" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive", bar: "[&>div]:bg-destructive" },
  info: { bg: "bg-info/10", text: "text-info", bar: "[&>div]:bg-info" },
  muted: { bg: "bg-muted", text: "text-muted-foreground", bar: "[&>div]:bg-muted-foreground" },
};

export function StatusCards({
  kpis,
  acoes,
  hirac,
}: {
  kpis: DashboardKpis;
  acoes: AcaoNR17[];
  hirac: HiracMap;
}) {
  const total = kpis.total || 1;
  const capexFor = (group: string) =>
    capexAgregado(acoes, hirac, (a) => statusGroup(a.status) === group);

  const cards: CardDef[] = [
    { label: "Total de Ações", value: kpis.total, icon: ListChecks, tone: "primary", capex: null },
    { label: "Realizado", value: kpis.realizadas, icon: CheckCircle2, tone: "success", capex: capexFor("Realizado") },
    { label: "Em Análise", value: kpis.emAnalise, icon: Search, tone: "info", capex: capexFor("Em Análise") },
    { label: "Em Andamento", value: kpis.emAndamento, icon: PlayCircle, tone: "warning", capex: capexFor("Em Andamento") },
    { label: "Não Iniciado", value: kpis.naoIniciado, icon: CircleDashed, tone: "muted", capex: capexFor("Não Iniciado") },
    { label: "Inviável", value: kpis.inviaveis, icon: Ban, tone: "destructive", capex: capexFor("Inviável") },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => {
        const pct = c.label === "Total de Ações"
          ? 100
          : Math.round((c.value / total) * 100);
        const tone = toneStyles[c.tone];
        return (
          <Card key={c.label} className="border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    tone.bg,
                    tone.text,
                  )}
                >
                  <c.icon className="h-4 w-4" />
                </div>
                <span className={cn("text-lg font-bold tabular-nums", tone.text)}>
                  {pct}%
                </span>
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">
                {c.value}
              </p>
              <Progress value={pct} className={cn("mt-2 h-1.5", tone.bar)} />
              {c.capex !== null && (
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  CAPEX:{" "}
                  <span className="text-foreground tabular-nums">
                    {Math.round(c.capex * 100)}%
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
