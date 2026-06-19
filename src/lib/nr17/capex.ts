import type { AcaoNR17 } from "@/lib/sheets.functions";
import type { HiracMap } from "@/lib/hirac.functions";
import { statusGroup } from "./status";

function riscoKey(a: AcaoNR17): keyof HiracMap | null {
  const raw = (a.classificacaoRisco || a.classificacaoRiscoInicial || "")
    .toString()
    .toLowerCase()
    .trim();
  if (raw.startsWith("alto")) return "Alto";
  if (raw.startsWith("méd") || raw.startsWith("med")) return "Médio";
  if (raw.startsWith("baix")) return "Baixo";
  return null;
}

/**
 * CAPEX % de uma ação individual:
 *   - Realizado     → 100% do CAPEX da sua classificação de risco
 *   - Em Andamento  → 50%  do CAPEX da sua classificação de risco
 *   - demais        → 0
 */
export function capexAcao(a: AcaoNR17, hirac: HiracMap): number {
  const k = riscoKey(a);
  if (!k) return 0;
  const base = hirac[k] ?? 0;
  const g = statusGroup(a.status);
  if (g === "Realizado") return base;
  if (g === "Em Andamento") return base * 0.5;
  return 0;
}

/**
 * CAPEX agregado (média percentual) das ações filtradas por um predicado.
 * Devolve um número entre 0 e 1.
 */
export function capexAgregado(
  acoes: AcaoNR17[],
  hirac: HiracMap,
  predicate?: (a: AcaoNR17) => boolean,
): number {
  const subset = predicate ? acoes.filter(predicate) : acoes;
  if (subset.length === 0) return 0;
  const sum = subset.reduce((acc, a) => acc + capexAcao(a, hirac), 0);
  return sum / subset.length;
}
