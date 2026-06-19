import { createServerFn } from "@tanstack/react-start";

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEET_ID || "1K3lQ_mu9zNUDH7FrlFVKX7UtgShp2H1tAiXmhVvQ7V8";
const SHEET_NAME = "HIRAC";
const RANGE = `${SHEET_NAME}!A1:U40`;
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

export type HiracMap = {
  Alto: number;
  Médio: number;
  Baixo: number;
};

const EMPTY_MAP: HiracMap = { Alto: 0, Médio: 0, Baixo: 0 };

let cache: { map: HiracMap; ts: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

function authHeaders() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");
  if (!GOOGLE_SHEETS_API_KEY)
    throw new Error("GOOGLE_SHEETS_API_KEY não configurado");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
    "Content-Type": "application/json",
  };
}

function parsePct(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.toString().trim().replace("%", "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n;
}

/**
 * Lê a aba HIRAC e devolve o CAPEX % por classificação de risco
 * (Alto / Médio / Baixo). Cache em memória por 5 min.
 */
export const fetchHiracCapex = createServerFn({ method: "GET" }).handler(
  async (): Promise<HiracMap> => {
    if (cache && Date.now() - cache.ts < TTL_MS) return cache.map;
    try {
      const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?valueRenderOption=FORMATTED_VALUE`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) return EMPTY_MAP;
      const data = (await res.json()) as { values?: string[][] };
      const rows = data.values ?? [];
      const map: HiracMap = { ...EMPTY_MAP };
      // Procurar linhas cuja coluna M (índice 12) contenha "Alto" / "Médio" / "Baixo"
      // e ler o CAPEX % na coluna Q (índice 16).
      for (const r of rows) {
        const tipo = (r[12] ?? "").toString().trim();
        const capex = parsePct(r[16]);
        if (tipo === "Alto") map.Alto = capex;
        else if (tipo === "Médio" || tipo === "Medio") map.Médio = capex;
        else if (tipo === "Baixo") map.Baixo = capex;
      }
      cache = { map, ts: Date.now() };
      return map;
    } catch {
      return EMPTY_MAP;
    }
  },
);
