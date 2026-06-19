import type { AcaoNR17 } from "@/lib/sheets.functions";
import { isEncerrada, severidadeLabel, statusGroup } from "./status";
import { diasParaPrazo, isAtrasada } from "./dates";
import { criticidadeNivel } from "./criticality";

export interface DashboardKpis {
  total: number;
  /** Realizado + Inviável (sai do backlog ativo). */
  concluidas: number;
  /** Apenas Realizado (rastreabilidade). */
  realizadas: number;
  inviaveis: number;
  emAnalise: number;
  emAndamento: number;
  naoIniciado: number;
  /** Alias legado: usa naoIniciado para preservar compatibilidade. */
  pendentes: number;
  atrasadas: number;
  vencem7: number;
  noPrazo: number;
  altoRisco: number;
  criticas: number;
  semResponsavel: number;
  semPrazo: number;
  percConcluidas: number;
}

export function computeKpis(acoes: AcaoNR17[]): DashboardKpis {
  const total = acoes.length;
  let realizadas = 0;
  let inviaveis = 0;
  let emAnalise = 0;
  let emAndamento = 0;
  let naoIniciado = 0;
  let atrasadas = 0;
  let vencem7 = 0;
  let noPrazo = 0;
  let altoRisco = 0;
  let criticas = 0;
  let semResponsavel = 0;
  let semPrazo = 0;

  acoes.forEach((a) => {
    const g = statusGroup(a.status);
    if (g === "Realizado") realizadas++;
    else if (g === "Inviável") inviaveis++;
    else if (g === "Em Análise") emAnalise++;
    else if (g === "Em Andamento") emAndamento++;
    else if (g === "Não Iniciado") naoIniciado++;

    const encerrada = isEncerrada(a.status);
    if (isAtrasada(a)) atrasadas++;
    const dias = diasParaPrazo(a);
    if (dias !== null && dias >= 0 && dias <= 7 && !encerrada) vencem7++;
    if (dias !== null && dias > 7 && !encerrada) noPrazo++;
    if (!a.dataPrevista.trim() && !encerrada) semPrazo++;

    const lbl = severidadeLabel(a.severidade);
    if (lbl === "Alto") altoRisco++;

    const niv = criticidadeNivel(a);
    if (niv === "Crítico" || niv === "Alto") criticas++;

    if (!encerrada && !(a.responsavel || a.responsavelTratativa).trim())
      semResponsavel++;
  });

  // Realizado + Inviável saem do backlog ativo.
  const concluidasTotais = realizadas + inviaveis;
  const percConcluidas =
    total > 0 ? Math.round((concluidasTotais / total) * 100) : 0;
  return {
    total,
    concluidas: concluidasTotais,
    realizadas,
    inviaveis,
    emAnalise,
    emAndamento,
    naoIniciado,
    pendentes: naoIniciado,
    atrasadas,
    vencem7,
    noPrazo,
    altoRisco,
    criticas,
    semResponsavel,
    semPrazo,
    percConcluidas,
  };
}
