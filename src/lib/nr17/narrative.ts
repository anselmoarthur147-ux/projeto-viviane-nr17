import type { AcaoNR17 } from "@/lib/sheets.functions";
import { isEncerrada, statusGroup, temResponsavel } from "./status";
import { isAtrasada } from "./dates";
import { criticidadeNivel } from "./criticality";
import { concentracaoAreas } from "./health";

/**
 * Mensagem executiva automática baseada nos dados do momento.
 */
export function mensagemExecutiva(acoes: AcaoNR17[]): string {
  if (acoes.length === 0) return "Sem ações registradas no escopo atual.";
  let concluidas = 0;
  let abertas = 0;
  let atrasadas = 0;
  let criticas = 0;
  let semResp = 0;
  acoes.forEach((a) => {
    const g = statusGroup(a.status);
    const encerrada = isEncerrada(a.status);
    if (encerrada) concluidas++;
    else abertas++;
    if (isAtrasada(a)) atrasadas++;
    const n = criticidadeNivel(a);
    if (n === "Crítico") criticas++;
    if (!temResponsavel(a) && !encerrada) semResp++;
  });
  const total = acoes.length;
  const perc = Math.round((concluidas / total) * 100);
  const top = concentracaoAreas(acoes, 3).map((c) => c.area);

  const partes: string[] = [];
  if (perc >= 80)
    partes.push(`O plano está em fase final, com ${perc}% das ações concluídas.`);
  else if (perc >= 50)
    partes.push(
      `O plano está em fase intermediária, com ${perc}% das ações concluídas.`,
    );
  else if (perc >= 20)
    partes.push(
      `O plano está em execução inicial, com ${perc}% das ações concluídas.`,
    );
  else
    partes.push(
      `O plano está em estágio inicial — apenas ${perc}% das ações foram concluídas.`,
    );

  if (criticas > 0) {
    partes.push(
      `${criticas} ${criticas === 1 ? "ação exige" : "ações exigem"} tratativa imediata.`,
    );
  } else if (atrasadas > 0) {
    partes.push(
      `${atrasadas} ${atrasadas === 1 ? "ação está atrasada" : "ações estão atrasadas"} e demandam atenção.`,
    );
  }

  if (top.length > 0 && abertas > 0) {
    partes.push(`Concentração de risco em ${top.slice(0, 3).join(", ")}.`);
  }

  if (semResp >= 3) {
    partes.push(`${semResp} ações abertas estão sem responsável definido.`);
  }

  return partes.join(" ");
}
