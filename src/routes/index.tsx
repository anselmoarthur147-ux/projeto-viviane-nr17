import { createFileRoute } from "@tanstack/react-router";
import { useQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Presentation,
  Printer,
  Settings,
  Flame,
  TrendingUp,
  Building2,
  Table as TableIcon,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { fetchAcoesNR17, type AcaoNR17 } from "@/lib/sheets.functions";
import { fetchHiracCapex } from "@/lib/hirac.functions";
import { StatusCards } from "@/components/dashboard/StatusCards";
import {
  Filters,
  type FilterState,
} from "@/components/dashboard/Filters";
import { AcoesTable } from "@/components/dashboard/AcoesTable";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import { PriorityList } from "@/components/dashboard/PriorityList";
import { EvolutionBlock } from "@/components/dashboard/EvolutionBlock";
import { AreaAnalysis } from "@/components/dashboard/AreaAnalysis";
import { DataConfidence } from "@/components/dashboard/DataConfidence";
import { PresentationMode } from "@/components/dashboard/PresentationMode";
import { StatusPie, PorRiscoChart } from "@/components/dashboard/Charts";
import { ExportPanel } from "@/components/dashboard/ExportPanel";
import { EmpresaSelector } from "@/components/dashboard/EmpresaSelector";
import { EMPRESAS, getEmpresaAtiva } from "@/lib/empresas";
import laborHealthLogo from "@/assets/labor-health-logo.png";
import {
  isAtrasada,
  diasParaPrazo,
  uniqueSorted,
  ordenarPorCriticidade,
  computeKpis,
} from "@/lib/nr17";

const acoesQueryOptions = queryOptions({
  queryKey: ["acoes-nr17"],
  queryFn: () => fetchAcoesNR17(),
  staleTime: 30_000,
});

const hiracQueryOptions = queryOptions({
  queryKey: ["hirac-capex"],
  queryFn: () => fetchHiracCapex(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(acoesQueryOptions),
      queryClient.ensureQueryData(hiracQueryOptions),
    ]),
  component: DashboardPage,
});

const INITIAL_FILTERS: FilterState = {
  area: "",
  status: "",
  risco: "",
  local: "",
  prazo: "",
  busca: "",
};

function DashboardPage() {
  const { data, isFetching } = useQuery(acoesQueryOptions);
  const { data: hirac } = useQuery(hiracQueryOptions);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [presenting, setPresenting] = useState(false);
  const [empresaId, setEmpresaId] = useState<string>(EMPRESAS[0]?.id ?? "");
  const empresa = getEmpresaAtiva(empresaId);

  const acoes = data?.acoes ?? [];

  // Format date only on client to avoid SSR/CSR hydration mismatch
  const [atualizadoEm, setAtualizadoEm] = useState("—");
  useEffect(() => {
    if (data?.atualizadoEm) {
      setAtualizadoEm(new Date(data.atualizadoEm).toLocaleString("pt-BR"));
    }
  }, [data?.atualizadoEm]);

  const options = useMemo(
    () => ({
      areas: uniqueSorted(acoes.map((a) => a.areaResponsavel)),
      statuses: uniqueSorted(acoes.map((a) => a.status)),
      riscos: uniqueSorted(acoes.map((a) => a.categoriaRisco)),
      locais: uniqueSorted(acoes.map((a) => a.areaEmissor)),
    }),
    [acoes],
  );

  const filtered = useMemo(() => applyFilters(acoes, filters), [acoes, filters]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header
        className="border-b border-border/60 text-primary-foreground"
        style={{ background: "var(--gradient-header)" }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-lg bg-[oklch(0.92_0.04_160)] p-2 shadow-md">
              <img
                src={laborHealthLogo}
                alt="Labor Health — Ergonomia & Treinamento"
                className="h-12 w-auto object-contain sm:h-14"
                style={{ maxWidth: 160 }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/80">
                {empresa.contrato} · {empresa.escopo}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Painel Executivo — {empresa.nome}
              </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <EmpresaSelector
                value={empresaId}
                onChange={setEmpresaId}
                empresa={empresa}
              />
              <span className="text-xs text-primary-foreground/70">
                Consultoria · {empresa.consultora}
              </span>
            </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right text-xs text-primary-foreground/80 sm:block">
              <p>Atualizado em</p>
              <p className="font-medium tabular-nums">{atualizadoEm}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["acoes-nr17"] })
              }
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => setPresenting(true)}
              className="bg-white text-primary hover:bg-white/90"
            >
              <Presentation className="mr-2 h-4 w-4" />
              Modo apresentação
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open("/print", "_blank")}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Resumo
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/admin/acoes">
                <Settings className="mr-2 h-4 w-4" />
                Administrar
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* 1. RESUMO EXECUTIVO */}
        <ExecutiveSummary acoes={filtered} />

        <StatusCards
          kpis={kpis}
          acoes={filtered}
          hirac={hirac ?? { Alto: 0, Médio: 0, Baixo: 0 }}
        />

        {/* Faixa de destaque — Ações Críticas Agora (sempre visível na primeira tela) */}
        <PriorityList acoes={filtered} limit={5} />

        <Filters state={filters} onChange={setFilters} options={options} />

        <Tabs defaultValue="prioridades" className="w-full">
          <TabsList className="bg-card border border-border/60 flex-wrap h-auto">
            <TabsTrigger value="prioridades" className="gap-1.5">
              <Flame className="h-3.5 w-3.5" />
              Prioridades
            </TabsTrigger>
            <TabsTrigger value="evolucao" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Evolução
            </TabsTrigger>
            <TabsTrigger value="areas" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Análise por Área
            </TabsTrigger>
            <TabsTrigger value="detalhes" className="gap-1.5">
              <TableIcon className="h-3.5 w-3.5" />
              Detalhamento
            </TabsTrigger>
            <TabsTrigger value="exportar" className="gap-1.5">
              <Share2 className="h-3.5 w-3.5" />
              Exportar
            </TabsTrigger>
            <TabsTrigger value="confianca" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Dados
            </TabsTrigger>
          </TabsList>

          {/* 2. PRIORIDADES */}
          <TabsContent value="prioridades" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PriorityList acoes={filtered} limit={12} />
              </div>
              <div className="space-y-4">
                <StatusPie acoes={filtered} />
              </div>
            </div>
          </TabsContent>

          {/* 3. EVOLUÇÃO */}
          <TabsContent value="evolucao" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <EvolutionBlock acoes={filtered} />
              <PorRiscoChart acoes={filtered} />
            </div>
          </TabsContent>

          {/* 4. ÁREAS */}
          <TabsContent value="areas" className="space-y-4">
            <AreaAnalysis acoes={filtered} />
          </TabsContent>

          {/* 5. DETALHAMENTO */}
          <TabsContent value="detalhes" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "ação" : "ações"}{" "}
              ordenadas por criticidade
              {filtered.length !== acoes.length
                ? ` (de ${acoes.length} no total)`
                : ""}
              . Clique para ver detalhes.
            </p>
            <AcoesTable acoes={ordenarPorCriticidade(filtered)} />
          </TabsContent>

          {/* 6. EXPORTAR */}
          <TabsContent value="exportar" className="space-y-4">
            <ExportPanel acoes={filtered} empresa={empresa} />
          </TabsContent>

          {/* 7. CONFIANÇA */}
          <TabsContent value="confianca" className="space-y-4">
            <DataConfidence acoes={acoes} atualizadoEm={atualizadoEm} />
          </TabsContent>
        </Tabs>

        <footer className="pt-2 text-center text-xs text-muted-foreground">
          {empresa.contrato} · {empresa.escopo} · Sincronização automática
        </footer>
      </main>

      <PresentationMode
        acoes={filtered}
        open={presenting}
        onClose={() => setPresenting(false)}
      />
    </div>
  );
}

function applyFilters(acoes: AcaoNR17[], f: FilterState): AcaoNR17[] {
  const busca = f.busca.toLowerCase().trim();
  return acoes.filter((a) => {
    if (f.area && a.areaResponsavel !== f.area) return false;
    if (f.status && a.status !== f.status) return false;
    if (f.risco && a.categoriaRisco !== f.risco) return false;
    if (f.local && a.areaEmissor !== f.local) return false;
    if (f.prazo) {
      const dias = diasParaPrazo(a);
      if (f.prazo === "atrasada" && !isAtrasada(a)) return false;
      if (f.prazo === "7d" && (dias === null || dias < 0 || dias > 7)) return false;
      if (f.prazo === "30d" && (dias === null || dias < 0 || dias > 30)) return false;
      if (f.prazo === "sem-prazo" && a.dataPrevista) return false;
    }
    if (busca) {
      const hay = [
        a.assunto,
        a.descricao,
        a.emissor,
        a.responsavel,
        a.areaResponsavel,
        a.categoriaRisco,
        a.classificacao,
        a.numero,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(busca)) return false;
    }
    return true;
  });
}

