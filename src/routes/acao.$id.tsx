import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  AlertTriangle,
  Building2,
  User,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAcoesNR17 } from "@/lib/sheets.functions";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  criticidadeNivel,
  diasParaPrazo,
  formatDateBR,
  severidadeLabel,
} from "@/lib/nr17";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/acao/$id")({
  component: AcaoDetalhePage,
});

function AcaoDetalhePage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["acoes-nr17"],
    queryFn: () => fetchAcoesNR17(),
    staleTime: 60_000,
  });

  const acao =
    data?.acoes.find((a) => a.internalId && a.internalId === id) ||
    data?.acoes.find((a) => String(a.rowIndex) === id);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!acao) {
    return (
      <div className="mx-auto max-w-2xl p-10 text-center">
        <h1 className="text-2xl font-bold">Ação não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A ação solicitada não existe ou foi removida.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const dias = diasParaPrazo(acao);
  const nivel = criticidadeNivel(acao);
  const atrasada = dias !== null && dias < 0;

  const nivelColor =
    nivel === "Crítico"
      ? "text-destructive"
      : nivel === "Alto"
        ? "text-destructive"
        : nivel === "Atenção"
          ? "text-warning-foreground"
          : "text-success";

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div
        className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card p-6 sm:p-8"
        style={{ boxShadow: "var(--shadow-elevated)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              to="/admin/acoes"
              search={{ edit: acao.internalId || String(acao.rowIndex) }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>

        <div className="mt-6">
          <p className="font-mono text-xs text-muted-foreground">
            Ação #{acao.numero}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {acao.assunto || "Ação sem título"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={acao.status} />
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
                nivelColor,
              )}
            >
              <Flame className="h-3 w-3" />
              {nivel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-xs">
              <AlertTriangle className="h-3 w-3" />
              {severidadeLabel(acao.severidade)}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field icon={Building2} label="Área">
            {acao.areaResponsavel || "—"}
          </Field>
          <Field icon={User} label="Responsável">
            {acao.responsavel || acao.responsavelTratativa || "Sem responsável"}
          </Field>
          <Field icon={Calendar} label="Data de entrega">
            <span className="tabular-nums">{formatDateBR(acao.dataPrevista)}</span>
          </Field>
          <Field icon={Calendar} label="Prazo">
            {dias === null ? (
              <span className="text-muted-foreground">Sem prazo definido</span>
            ) : atrasada ? (
              <span className="font-semibold text-destructive">
                {Math.abs(dias)} dias em atraso
              </span>
            ) : (
              <span>Faltam {dias} dias</span>
            )}
          </Field>
        </div>

        {acao.descricao ? (
          <div className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Descrição
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
              {acao.descricao}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1.5 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}
