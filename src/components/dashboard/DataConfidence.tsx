import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, Database, Clock3 } from "lucide-react";
import type { AcaoNR17 } from "@/lib/sheets.functions";
import { dataHealth } from "@/lib/nr17";

interface DataConfidenceProps {
  acoes: AcaoNR17[];
  atualizadoEm: string;
}

export function DataConfidence({ acoes, atualizadoEm }: DataConfidenceProps) {
  const h = dataHealth(acoes);
  const ok = h.integridade >= 90;
  const warn = h.integridade >= 70 && h.integridade < 90;
  const Icon = ok ? ShieldCheck : ShieldAlert;
  const tone = ok
    ? "text-success bg-success/10"
    : warn
      ? "text-warning-foreground bg-warning/15"
      : "text-destructive bg-destructive/10";

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <Stat
          icon={Database}
          label="Registros analisados"
          value={String(h.total)}
          tone="text-info bg-info/10"
        />
        <Stat
          icon={Icon}
          label="Integridade da base"
          value={`${h.integridade}%`}
          tone={tone}
        />
        <Stat
          icon={ShieldAlert}
          label="Campos incompletos"
          value={String(h.semPrazo + h.semResponsavel + h.semStatus + h.semSeveridade)}
          hint={`${h.semPrazo} sem prazo · ${h.semResponsavel} sem resp.`}
          tone="text-warning-foreground bg-warning/15"
        />
        <Stat
          icon={Clock3}
          label="Última atualização"
          value={atualizadoEm}
          tone="text-muted-foreground bg-muted"
        />
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="text-[10px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
