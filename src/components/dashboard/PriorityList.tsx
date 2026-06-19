import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Flame,
  Clock,
  UserX,
  CalendarX,
  ArrowRight,
} from "lucide-react";
import type { AcaoNR17 } from "@/lib/sheets.functions";
import {
  criticidadeNivel,
  criticidadeScore,
  diasParaPrazo,
  isAtrasada,
  ordenarPorCriticidade,
  severidadeLabel,
  temResponsavel,
} from "@/lib/nr17";

interface PriorityListProps {
  acoes: AcaoNR17[];
  limit?: number;
  onSelect?: (a: AcaoNR17) => void;
}

export function PriorityList({ acoes, limit = 6, onSelect }: PriorityListProps) {
  const criticas = ordenarPorCriticidade(
    acoes.filter((a) => criticidadeScore(a) >= 25),
  ).slice(0, limit);

  return (
    <Card className="border-destructive/30 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-destructive" />
            Ações Críticas Agora
          </CardTitle>
          <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive">
            {criticas.length} {criticas.length === 1 ? "item" : "itens"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Priorizadas por atraso, severidade, prazo e ausência de responsável.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {criticas.length === 0 ? (
          <div className="rounded-md border border-success/30 bg-success/5 p-4 text-center text-sm text-success">
            Nenhuma ação crítica no momento. Plano sob controle.
          </div>
        ) : (
          criticas.map((a) => (
            <PriorityRow key={a.rowIndex} acao={a} onClick={onSelect ? () => onSelect(a) : undefined} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PriorityRow({
  acao,
  onClick,
}: {
  acao: AcaoNR17;
  onClick?: () => void;
}) {
  const dias = diasParaPrazo(acao);
  const nivel = criticidadeNivel(acao);
  const sev = severidadeLabel(acao.severidade);
  const semResp = !temResponsavel(acao);
  const atrasada = isAtrasada(acao);

  const tags: { icon: typeof Clock; label: string; tone: string }[] = [];
  if (atrasada && dias !== null) {
    tags.push({
      icon: CalendarX,
      label: `${Math.abs(dias)}d em atraso`,
      tone: "text-destructive bg-destructive/10 border-destructive/30",
    });
  } else if (dias !== null && dias <= 7) {
    tags.push({
      icon: Clock,
      label: `Vence em ${dias}d`,
      tone: "text-warning-foreground bg-warning/20 border-warning/40",
    });
  } else if (dias === null) {
    tags.push({
      icon: CalendarX,
      label: "Sem prazo",
      tone: "text-muted-foreground bg-muted border-border",
    });
  }
  if (sev === "Alto") {
    tags.push({
      icon: AlertTriangle,
      label: "Risco Alto",
      tone: "text-destructive bg-destructive/10 border-destructive/30",
    });
  } else if (sev === "Significante") {
    tags.push({
      icon: AlertTriangle,
      label: "Significante",
      tone: "text-warning-foreground bg-warning/20 border-warning/40",
    });
  }
  if (semResp) {
    tags.push({
      icon: UserX,
      label: "Sem responsável",
      tone: "text-destructive bg-destructive/10 border-destructive/30",
    });
  }

  const nivelTone =
    nivel === "Crítico"
      ? "bg-destructive text-destructive-foreground"
      : nivel === "Alto"
        ? "bg-destructive/15 text-destructive border border-destructive/30"
        : "bg-warning/20 text-warning-foreground border border-warning/40";

  const content = (
    <>
      <div className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${nivelTone}`}>
        {nivel}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            #{acao.numero}
          </span>
          <p className="truncate text-sm font-semibold text-foreground">
            {acao.assunto || "Ação sem título"}
          </p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {acao.areaResponsavel || "Sem área"} ·{" "}
          {temResponsavel(acao)
            ? acao.responsavel || acao.responsavelTratativa
            : "responsável a definir"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t.label}
              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${t.tone}`}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </>
  );
  const className =
    "group flex w-full items-start gap-3 rounded-lg border border-border/60 bg-card p-3 text-left transition-all hover:border-destructive/40 hover:shadow-sm";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return (
    <Link to="/acao/$id" params={{ id: String(acao.rowIndex) }} className={className}>
      {content}
    </Link>
  );
}

export function PriorityListCompact({ acoes, limit = 4 }: PriorityListProps) {
  const criticas = ordenarPorCriticidade(
    acoes.filter((a) => criticidadeScore(a) >= 25),
  ).slice(0, limit);
  if (criticas.length === 0) return null;
  return (
    <div className="space-y-2">
      {criticas.map((a) => (
        <PriorityRow key={a.rowIndex} acao={a} />
      ))}
    </div>
  );
}

export { PriorityRow };
