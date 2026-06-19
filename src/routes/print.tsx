import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchAcoesNR17 } from "@/lib/sheets.functions";
import {
  computeKpis,
  criticidadeNivel,
  formatDateBR,
  mensagemExecutiva,
  ordenarPorCriticidade,
  severidadeLabel,
} from "@/lib/nr17";
import laborHealthLogo from "@/assets/labor-health-logo.png";

export const Route = createFileRoute("/print")({
  component: PrintPage,
});

function PrintPage() {
  const { data } = useQuery({
    queryKey: ["acoes-nr17"],
    queryFn: () => fetchAcoesNR17(),
  });

  const acoes = data?.acoes ?? [];
  const kpis = computeKpis(acoes);
  const criticas = ordenarPorCriticidade(
    acoes.filter((a) => {
      const n = criticidadeNivel(a);
      return n === "Crítico" || n === "Alto";
    }),
  );
  const msg = mensagemExecutiva(acoes);

  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [data]);

  if (!data) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Carregando dados…
      </div>
    );
  }

  const cards = [
    { label: "Total de Ações", value: kpis.total, pct: 100 },
    {
      label: "Concluídas",
      value: kpis.concluidas,
      pct: kpis.percConcluidas,
    },
    {
      label: "Em Atenção",
      value: kpis.criticas,
      pct: kpis.total ? Math.round((kpis.criticas / kpis.total) * 100) : 0,
    },
    {
      label: "Atrasadas",
      value: kpis.atrasadas,
      pct: kpis.total ? Math.round((kpis.atrasadas / kpis.total) * 100) : 0,
    },
    {
      label: "No Prazo",
      value: kpis.noPrazo,
      pct: kpis.total ? Math.round((kpis.noPrazo / kpis.total) * 100) : 0,
    },
  ];

  return (
    <div className="print-page mx-auto max-w-4xl bg-white p-10 text-black">
      <header className="flex items-center justify-between border-b border-black/20 pb-4">
        <div className="flex items-center gap-3">
          <img src={laborHealthLogo} alt="Labor Health" style={{ maxWidth: 120 }} />
          <div>
            <h1 className="text-xl font-bold">
              GESTÃO DE AÇÕES ERGONÔMICAS - NR 17
            </h1>
            <p className="text-xs text-gray-600">
              Gerado em {new Date().toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
          Leitura Executiva
        </h2>
        <p className="mt-2 text-base leading-relaxed">{msg}</p>
      </section>

      <section className="mt-6 grid grid-cols-5 gap-3 print-cards">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded border border-black/30 p-3"
          >
            <p className="text-[10px] font-semibold uppercase text-gray-700">
              {c.label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs text-gray-700">{c.pct}%</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
          Ações Críticas ({criticas.length})
        </h2>
        {criticas.length === 0 ? (
          <p className="mt-2 text-sm text-gray-700">
            Nenhuma ação crítica no momento.
          </p>
        ) : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/40 text-left">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Título</th>
                <th className="py-2 pr-2">Área</th>
                <th className="py-2 pr-2">Severidade</th>
                <th className="py-2 pr-2">Data</th>
                <th className="py-2 pr-2">Nível</th>
              </tr>
            </thead>
            <tbody>
              {criticas.map((a) => (
                <tr key={a.rowIndex} className="border-b border-black/10">
                  <td className="py-2 pr-2 font-mono text-xs">{a.numero}</td>
                  <td className="py-2 pr-2">{a.assunto || "—"}</td>
                  <td className="py-2 pr-2">{a.areaResponsavel || "—"}</td>
                  <td className="py-2 pr-2">{severidadeLabel(a.severidade)}</td>
                  <td className="py-2 pr-2 tabular-nums">
                    {formatDateBR(a.dataPrevista)}
                  </td>
                  <td className="py-2 pr-2 font-semibold">
                    {criticidadeNivel(a)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="mt-10 border-t border-black/20 pt-3 text-center text-[10px] text-gray-600">
        Labor Health — Ergonomia & Treinamento · Painel Executivo - SUMITOMO
      </footer>
    </div>
  );
}
