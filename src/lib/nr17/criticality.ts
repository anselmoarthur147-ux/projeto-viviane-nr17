import type { AcaoNR17 } from "@/lib/sheets.functions";
import { isEncerrada, severidadeLabel, statusGroup, temResponsavel } from "./status";
import { diasParaPrazo, parseDateBR } from "./dates";

/**
 * Score de criticidade (0–100). Quanto maior, mais urgente.
 */
export function criticidadeScore(a: AcaoNR17): number {
  if (isEncerrada(a.status)) return 0;
  let score = 0;

  const dias = diasParaPrazo(a);
  if (dias === null) {
    score += 25;
  } else if (dias < 0) {
    score += 45 + Math.min(20, Math.abs(dias) / 3);
  } else if (dias <= 7) {
    score += 35;
  } else if (dias <= 30) {
    score += 18;
  } else {
    score += 5;
  }

  const sev = severidadeLabel(a.severidade);
  if (sev === "Alto") score += 30;
  else if (sev === "Significante") score += 18;
  else if (sev === "Médio") score += 8;

  if (!temResponsavel(a)) score += 15;
  if (statusGroup(a.status) === "Não Iniciado") score += 8;

  return Math.min(100, Math.round(score));
}

export type CriticidadeNivel = "Crítico" | "Alto" | "Atenção" | "Normal";

export function criticidadeNivel(a: AcaoNR17): CriticidadeNivel {
  const s = criticidadeScore(a);
  if (s >= 65) return "Crítico";
  if (s >= 45) return "Alto";
  if (s >= 25) return "Atenção";
  return "Normal";
}

export function ordenarPorCriticidade(acoes: AcaoNR17[]): AcaoNR17[] {
  return [...acoes].sort((a, b) => criticidadeScore(b) - criticidadeScore(a));
}

/**
 * Ordenação padrão inteligente para a tabela de ações:
 * 1. Críticas/Altas (não concluídas)
 * 2. Não concluídas atrasadas (mais antigas primeiro)
 * 3. Não concluídas com prazo futuro (mais próximas primeiro)
 * 4. Concluídas (mais recentes primeiro)
 */
export function ordenarPadraoAcoes(acoes: AcaoNR17[]): AcaoNR17[] {
  function bucket(a: AcaoNR17): number {
    const concluida = isEncerrada(a.status);
    if (concluida) return 4;
    const nivel = criticidadeNivel(a);
    if (nivel === "Crítico" || nivel === "Alto") return 1;
    const dias = diasParaPrazo(a);
    if (dias !== null && dias < 0) return 2;
    return 3;
  }
  return [...acoes].sort((a, b) => {
    const ba = bucket(a);
    const bb = bucket(b);
    if (ba !== bb) return ba - bb;
    if (ba === 4) {
      const da = parseDateBR(a.dataEncerramento)?.getTime() ?? 0;
      const db = parseDateBR(b.dataEncerramento)?.getTime() ?? 0;
      return db - da;
    }
    if (ba === 1) {
      return criticidadeScore(b) - criticidadeScore(a);
    }
    const da = parseDateBR(a.dataPrevista)?.getTime() ?? Number.POSITIVE_INFINITY;
    const db = parseDateBR(b.dataPrevista)?.getTime() ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
}
