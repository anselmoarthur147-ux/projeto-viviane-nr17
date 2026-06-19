import { Badge } from "@/components/ui/badge";
import { severidadeLabel } from "@/lib/nr17";

export function SeveridadeBadge({ severidade }: { severidade: string }) {
  const label = severidadeLabel(severidade);
  const cls =
    label === "Alto"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : label === "Significante"
        ? "bg-warning/20 text-warning-foreground border-warning/40"
        : label === "Médio"
          ? "bg-info/15 text-info border-info/30"
          : label === "Baixo"
            ? "bg-success/15 text-success border-success/30"
            : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={`${cls} font-medium`}>
      {label}
    </Badge>
  );
}
