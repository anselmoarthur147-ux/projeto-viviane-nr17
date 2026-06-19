import type { AcaoNR17 } from "@/lib/sheets.functions";
import type { EmpresaConfig } from "./empresas";
import {
  computeKpis,
  criticidadeNivel,
  diasParaPrazo,
  formatDateBR,
  isAtrasada,
  mensagemExecutiva,
  ordenarPorCriticidade,
  severidadeLabel,
  isEncerrada,
  statusGroup,
  temResponsavel,
  concentracaoAreas,
} from "./nr17";

/* ----------------------------- CSV ----------------------------- */

function csvEscape(v: string): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function gerarCSV(acoes: AcaoNR17[]): string {
  const headers = [
    "Nº",
    "Área Responsável",
    "Assunto",
    "Categoria",
    "Severidade",
    "Status",
    "Criticidade",
    "Data Abertura",
    "Data Prevista",
    "Dias para Prazo",
    "Responsável",
    "Local",
    "Descrição",
  ];
  const lines = [headers.join(",")];
  ordenarPorCriticidade(acoes).forEach((a) => {
    const dias = diasParaPrazo(a);
    lines.push(
      [
        a.numero,
        a.areaResponsavel,
        a.assunto,
        a.categoriaRisco,
        severidadeLabel(a.severidade),
        a.status,
        criticidadeNivel(a),
        formatDateBR(a.data),
        formatDateBR(a.dataPrevista),
        dias === null ? "" : String(dias),
        a.responsavel || a.responsavelTratativa,
        a.areaEmissor,
        a.descricao,
      ]
        .map(csvEscape)
        .join(","),
    );
  });
  return lines.join("\n");
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* --------------------------- Resumos ---------------------------- */

export function resumoEmail(
  acoes: AcaoNR17[],
  empresa: EmpresaConfig,
): { assunto: string; corpo: string } {
  const k = computeKpis(acoes);
  const top = ordenarPorCriticidade(acoes)
    .filter((a) => !isEncerrada(a.status))
    .slice(0, 5);
  const areas = concentracaoAreas(acoes, 3);
  const hoje = new Date().toLocaleDateString("pt-BR");

  const linhas: string[] = [];
  linhas.push(`Resumo Executivo — ${empresa.contrato}`);
  linhas.push(`Empresa: ${empresa.nome}`);
  linhas.push(`Data: ${hoje}`);
  linhas.push("");
  linhas.push(mensagemExecutiva(acoes));
  linhas.push("");
  linhas.push("Indicadores principais:");
  linhas.push(`• Total de ações: ${k.total}`);
  linhas.push(`• Concluídas: ${k.concluidas} (${k.percConcluidas}%)`);
  linhas.push(`• Em andamento: ${k.emAndamento}`);
  linhas.push(`• Atrasadas: ${k.atrasadas}`);
  linhas.push(`• Em atenção (críticas + alto risco): ${k.criticas}`);
  linhas.push(`• Vencendo em até 7 dias: ${k.vencem7}`);
  if (k.semResponsavel > 0)
    linhas.push(`• Sem responsável definido: ${k.semResponsavel}`);

  if (areas.length > 0) {
    linhas.push("");
    linhas.push("Áreas com maior concentração:");
    areas.forEach((a) => {
      linhas.push(`• ${a.area} — ${a.abertas} em aberto, ${a.criticas} críticas`);
    });
  }

  if (top.length > 0) {
    linhas.push("");
    linhas.push("Top ações para tratar agora:");
    top.forEach((a) => {
      const dias = diasParaPrazo(a);
      const prazoTxt =
        dias === null
          ? "sem prazo"
          : dias < 0
            ? `${Math.abs(dias)}d em atraso`
            : `vence em ${dias}d`;
      linhas.push(
        `• #${a.numero} — ${a.assunto || "Ação NR17"} (${a.areaResponsavel || "sem área"}, ${prazoTxt})`,
      );
    });
  }

  linhas.push("");
  linhas.push(
    "Relatório gerado pelo Painel Executivo NR17. Ficamos à disposição.",
  );

  return {
    assunto: `[${empresa.nome}] Resumo Executivo NR17 — ${hoje}`,
    corpo: linhas.join("\n"),
  };
}

export function resumoWhatsapp(
  acoes: AcaoNR17[],
  empresa: EmpresaConfig,
): string {
  const k = computeKpis(acoes);
  const linhas: string[] = [];
  linhas.push(`*Plano NR17 — ${empresa.nome}*`);
  linhas.push(`_${new Date().toLocaleDateString("pt-BR")}_`);
  linhas.push("");
  linhas.push(mensagemExecutiva(acoes));
  linhas.push("");
  linhas.push(`✅ Concluídas: *${k.concluidas}* (${k.percConcluidas}%)`);
  linhas.push(`🔵 Em andamento: *${k.emAndamento}*`);
  linhas.push(`🟡 Vencendo em 7d: *${k.vencem7}*`);
  linhas.push(`🔴 Atrasadas: *${k.atrasadas}*`);
  linhas.push(`⚠️ Em atenção: *${k.criticas}*`);
  if (k.semResponsavel > 0)
    linhas.push(`👤 Sem responsável: *${k.semResponsavel}*`);
  return linhas.join("\n");
}

export function abrirEmail(assunto: string, corpo: string) {
  const url = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  window.location.href = url;
}

export function abrirWhatsapp(texto: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* fallthrough */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/* ----------------- HTML executivo (PDF via print) ---------------- */

export function gerarRelatorioHTML(
  acoes: AcaoNR17[],
  empresa: EmpresaConfig,
  modo: "executivo" | "detalhado" = "executivo",
): string {
  const k = computeKpis(acoes);
  const top = ordenarPorCriticidade(acoes)
    .filter((a) => !isEncerrada(a.status))
    .slice(0, modo === "executivo" ? 10 : 50);
  const areas = concentracaoAreas(acoes, 5);
  const hoje = new Date().toLocaleDateString("pt-BR");
  const msg = mensagemExecutiva(acoes);

  const detalhadoRows =
    modo === "detalhado"
      ? ordenarPorCriticidade(acoes)
          .map((a) => {
            const dias = diasParaPrazo(a);
            const atraso = isAtrasada(a);
            return `<tr class="${atraso ? "row-atraso" : ""}">
              <td>${a.numero}</td>
              <td>${escape(a.areaResponsavel)}</td>
              <td>${escape(a.assunto)}</td>
              <td>${escape(severidadeLabel(a.severidade))}</td>
              <td>${escape(criticidadeNivel(a))}</td>
              <td>${escape(a.status)}</td>
              <td>${formatDateBR(a.dataPrevista)}${dias !== null && dias < 0 ? ` <span class="tag-atraso">(${Math.abs(dias)}d)</span>` : ""}</td>
              <td>${escape(a.responsavel || a.responsavelTratativa) || "<em>—</em>"}</td>
            </tr>`;
          })
          .join("")
      : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório ${modo === "executivo" ? "Executivo" : "Detalhado"} — ${escape(empresa.nome)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif;
    color: #1c2540; margin: 0; padding: 32px 40px; background: #fff; }
  header { border-bottom: 2px solid #2a3f7a; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #1c2540; }
  .kicker { text-transform: uppercase; letter-spacing: 1.5px; font-size: 11px;
    color: #5b6da3; font-weight: 600; }
  .meta { color: #5b6da3; font-size: 12px; margin-top: 4px; }
  .summary { background: linear-gradient(135deg, #1f2d5e, #3754a8); color: #fff;
    padding: 20px 24px; border-radius: 10px; margin-bottom: 24px; font-size: 14px;
    line-height: 1.55; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
    margin-bottom: 24px; }
  .kpi { border: 1px solid #e3e7f1; border-radius: 8px; padding: 12px 14px;
    background: #f8faff; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
    color: #5b6da3; font-weight: 600; }
  .kpi-value { font-size: 24px; font-weight: 700; margin-top: 4px;
    font-variant-numeric: tabular-nums; }
  .kpi.danger .kpi-value { color: #c8203a; }
  .kpi.warning .kpi-value { color: #b06800; }
  .kpi.success .kpi-value { color: #1f7a4d; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px;
    color: #2a3f7a; margin: 28px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f0f3fb; text-align: left; padding: 8px; font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.5px; color: #2a3f7a;
    border-bottom: 1px solid #d6def0; }
  td { padding: 8px; border-bottom: 1px solid #eef1f9; vertical-align: top; }
  .row-atraso td { background: #fff5f6; }
  .tag-atraso { color: #c8203a; font-weight: 600; }
  .area-row { display: flex; justify-content: space-between; padding: 6px 0;
    border-bottom: 1px solid #eef1f9; font-size: 12px; }
  footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e3e7f1;
    color: #5b6da3; font-size: 10px; text-align: center; }
  @media print { body { padding: 18mm; } .no-print { display: none; } }
  .actions { text-align: right; margin-bottom: 16px; }
  button { background: #2a3f7a; color: #fff; border: 0; padding: 8px 14px;
    border-radius: 6px; font-size: 12px; cursor: pointer; }
</style>
</head>
<body>
<div class="actions no-print">
  <button onclick="window.print()">Imprimir / Salvar PDF</button>
</div>
<header>
  <p class="kicker">${escape(empresa.contrato)}</p>
  <h1>Relatório ${modo === "executivo" ? "Executivo" : "Detalhado"} — ${escape(empresa.nome)}</h1>
  <p class="meta">Escopo: ${escape(empresa.escopo)} · Gerado em ${hoje}</p>
</header>

<div class="summary">${escape(msg)}</div>

<div class="grid">
  <div class="kpi"><div class="kpi-label">Total de Ações</div><div class="kpi-value">${k.total}</div></div>
  <div class="kpi success"><div class="kpi-label">Concluídas</div><div class="kpi-value">${k.concluidas}</div></div>
  <div class="kpi"><div class="kpi-label">Em Andamento</div><div class="kpi-value">${k.emAndamento}</div></div>
  <div class="kpi danger"><div class="kpi-label">Atrasadas</div><div class="kpi-value">${k.atrasadas}</div></div>
  <div class="kpi warning"><div class="kpi-label">Vence em 7d</div><div class="kpi-value">${k.vencem7}</div></div>
  <div class="kpi danger"><div class="kpi-label">Em Atenção</div><div class="kpi-value">${k.criticas}</div></div>
  <div class="kpi"><div class="kpi-label">No Prazo</div><div class="kpi-value">${k.noPrazo}</div></div>
  <div class="kpi success"><div class="kpi-label">% Execução</div><div class="kpi-value">${k.percConcluidas}%</div></div>
</div>

<h2>Áreas com maior concentração</h2>
<div>
${areas.length === 0 ? "<p>Sem dados.</p>" : areas
  .map(
    (a) => `<div class="area-row"><span>${escape(a.area)}</span>
    <span><strong>${a.abertas}</strong> em aberto · ${a.criticas} críticas · ${a.total} no total</span></div>`,
  )
  .join("")}
</div>

<h2>Ações Críticas Agora</h2>
<table>
  <thead><tr>
    <th>Nº</th><th>Área</th><th>Assunto</th><th>Risco</th>
    <th>Criticidade</th><th>Status</th><th>Prazo</th><th>Responsável</th>
  </tr></thead>
  <tbody>
    ${
      top.length === 0
        ? `<tr><td colspan="8" style="text-align:center;padding:16px;color:#5b6da3;">Nenhuma ação crítica no momento.</td></tr>`
        : top
            .map((a) => {
              const dias = diasParaPrazo(a);
              const atraso = isAtrasada(a);
              return `<tr class="${atraso ? "row-atraso" : ""}">
                <td>${a.numero}</td>
                <td>${escape(a.areaResponsavel)}</td>
                <td>${escape(a.assunto)}</td>
                <td>${escape(severidadeLabel(a.severidade))}</td>
                <td>${escape(criticidadeNivel(a))}</td>
                <td>${escape(a.status)}</td>
                <td>${formatDateBR(a.dataPrevista)}${dias !== null && dias < 0 ? ` <span class="tag-atraso">(${Math.abs(dias)}d)</span>` : ""}</td>
                <td>${escape(temResponsavel(a) ? a.responsavel || a.responsavelTratativa : "—")}</td>
              </tr>`;
            })
            .join("")
    }
  </tbody>
</table>

${
  modo === "detalhado"
    ? `<h2>Detalhamento completo</h2>
<table>
  <thead><tr>
    <th>Nº</th><th>Área</th><th>Assunto</th><th>Risco</th>
    <th>Criticidade</th><th>Status</th><th>Prazo</th><th>Responsável</th>
  </tr></thead>
  <tbody>${detalhadoRows}</tbody>
</table>`
    : ""
}

<footer>
  Painel Executivo NR17 · ${escape(empresa.nome)} · ${hoje}<br/>
  Dados sincronizados via Lovable Cloud
</footer>
</body>
</html>`;
}

function escape(s: string | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function abrirRelatorioHTML(html: string) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    // popup bloqueado — fallback: download
    downloadFile(html, "relatorio-nr17.html", "text/html");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
