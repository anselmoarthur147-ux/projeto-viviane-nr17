import type { AcaoNR17 } from "@/lib/sheets.functions";

export type StatusGroup =
  | "Realizado"
  | "Em Análise"
  | "Em Andamento"
  | "Não Iniciado"
  | "Inviável"
  | "Outro";

/**
 * Classifica o status textual da planilha em um dos 5 grupos canônicos.
 * É a ÚNICA fonte de verdade para classificação de status — nenhum
 * consumidor deve comparar strings de status diretamente.
 */
export function statusGroup(status: string): StatusGroup {
  const s = status.toLowerCase();
  if (!s) return "Não Iniciado";
  if (
    s.includes("inviável") ||
    s.includes("inviavel") ||
    s.includes("cancelad") ||
    s.includes("descartad")
  )
    return "Inviável";
  if (
    s.includes("realizad") ||
    s.includes("encerrad") ||
    s.includes("concluíd") ||
    s.includes("concluid")
  )
    return "Realizado";
  if (
    s.includes("análise") ||
    s.includes("analise")
  )
    return "Em Análise";
  if (
    s.includes("processo") ||
    s.includes("andamento") ||
    s.includes("aguardando")
  )
    return "Em Andamento";
  if (
    s.includes("não iniciado") ||
    s.includes("nao iniciado") ||
    s.includes("não inicia") ||
    s.includes("nao inicia") ||
    s.includes("pendente") ||
    s.includes("aberto")
  )
    return "Não Iniciado";
  return "Outro";
}

/**
 * Uma ação é considerada "encerrada" (saiu do backlog ativo) quando foi
 * realizada ou avaliada como inviável.
 */
export function isEncerrada(status: string): boolean {
  const g = statusGroup(status);
  return g === "Realizado" || g === "Inviável";
}

/** Ação concluída de fato (Realizado). */
export function isConcluida(status: string): boolean {
  return statusGroup(status) === "Realizado";
}

/** Ação ainda em backlog ativo (não realizada nem inviável). */
export function isAtiva(status: string): boolean {
  return !isEncerrada(status);
}

export function severidadeLabel(sev: string): string {
  const n = Number(sev);
  if (isNaN(n)) return sev || "—";
  if (n >= 40) return "Alto";
  if (n >= 30) return "Significante";
  if (n >= 20) return "Médio";
  if (n > 0) return "Baixo";
  return "Sem risco";
}

export function temResponsavel(a: AcaoNR17): boolean {
  return Boolean((a.responsavel || a.responsavelTratativa).trim());
}

export function uniqueSorted(values: (string | undefined)[]): string[] {
  const set = new Set<string>();
  values.forEach((v) => {
    if (v && v.trim()) set.add(v.trim());
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
