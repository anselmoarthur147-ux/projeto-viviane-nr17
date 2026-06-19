import { Badge } from "@/components/ui/badge";
import { statusGroup } from "@/lib/nr17";

export function StatusBadge({
  status,
  atrasada = false,
}: {
  status: string;
  atrasada?: boolean;
}) {
  const g = statusGroup(status);
  if (atrasada && g !== "Realizado" && g !== "Inviável") {
    return (
      <Badge
        variant="outline"
        className="bg-destructive/15 text-destructive border-destructive/30 font-medium"
      >
        Atrasado
      </Badge>
    );
  }
  const cls =
    g === "Realizado"
      ? "bg-success/15 text-success border-success/30"
      : g === "Inviável"
        ? "bg-destructive/10 text-destructive border-destructive/30"
        : g === "Em Análise"
          ? "bg-info/15 text-info border-info/30"
          : g === "Em Andamento"
            ? "bg-warning/20 text-warning-foreground border-warning/40"
            : g === "Não Iniciado"
              ? "bg-muted text-muted-foreground border-border/60"
              : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={`${cls} font-medium`}>
      {status || "—"}
    </Badge>
  );
}
