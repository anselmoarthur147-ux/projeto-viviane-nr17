import type { AcaoNR17 } from "@/lib/sheets.functions";
import { isEncerrada, temResponsavel } from "./status";
import { criticidadeNivel } from "./criticality";

export function dataHealth(acoes: AcaoNR17[]) {
  let semPrazo = 0;
  let semResponsavel = 0;
  let semStatus = 0;
  let semSeveridade = 0;
  acoes.forEach((a) => {
    if (!a.dataPrevista.trim()) semPrazo++;
    if (!temResponsavel(a)) semResponsavel++;
    if (!a.status.trim()) semStatus++;
    if (!a.severidade.trim()) semSeveridade++;
  });
  const totalCampos = acoes.length * 4;
  const incompletos = semPrazo + semResponsavel + semStatus + semSeveridade;
  const integridade =
    totalCampos > 0
      ? Math.round(((totalCampos - incompletos) / totalCampos) * 100)
      : 100;
  return {
    total: acoes.length,
    semPrazo,
    semResponsavel,
    semStatus,
    semSeveridade,
    integridade,
  };
}

export function concentracaoAreas(acoes: AcaoNR17[], topN = 3) {
  const map = new Map<
    string,
    { abertas: number; total: number; criticas: number }
  >();
  acoes.forEach((a) => {
    const k = a.areaResponsavel || "Sem área";
    const cur = map.get(k) ?? { abertas: 0, total: 0, criticas: 0 };
    cur.total += 1;
    if (!isEncerrada(a.status)) cur.abertas += 1;
    const niv = criticidadeNivel(a);
    if (niv === "Crítico" || niv === "Alto") cur.criticas += 1;
    map.set(k, cur);
  });
  return Array.from(map.entries())
    .map(([area, v]) => ({ area, ...v }))
    .sort((a, b) => b.abertas - a.abertas)
    .slice(0, topN);
}
