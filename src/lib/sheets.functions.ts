import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEET_ID || "1K3lQ_mu9zNUDH7FrlFVKX7UtgShp2H1tAiXmhVvQ7V8";
const SHEET_NAME = "BD QESHs com atributos";
const RANGE = `${SHEET_NAME}!A7:AS5000`;
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const FIRST_DATA_ROW = 7; // A7
const TOTAL_COLS = 45; // A..AS
const INTERNAL_ID_COL = 44; // AS = id interno do CRUD

/*
 * Mapeamento canônico das colunas (planilha "BD QESHs com atributos"):
 *   B (1)  -> numeroAcao / numero
 *   H (7)  -> setor
 *   I (8)  -> secao
 *   M (12) -> assunto / title
 *   N (13) -> descricao / description
 *   O (14) -> classificacaoRisco (Alto/Médio/Baixo)
 *   P (15) -> responsavel / responsible (tratativa)
 *   Q (16) -> investimento
 *   R (17) -> dataPrevista / dueDate
 *   T (19) -> status
 *   U (20) -> severidade
 *   AN(39) -> area / areaResponsavel
 * Demais colunas são preservadas em escrita; ver buildRow().
 */

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
): Promise<Response> {
  let attempt = 0;
  // 1 retry on 429 / 5xx with short backoff
  while (true) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    if ((res.status === 429 || res.status >= 500) && attempt < 1) {
      attempt++;
      const wait = 800 + Math.floor(Math.random() * 600);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const body = await res.text();
    console.error(`Sheets API error (${label})`, res.status, body);
    if (res.status === 429) {
      throw new Error(
        "Limite de requisições do Google Sheets atingido. Aguarde alguns segundos e tente novamente.",
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Sem permissão para acessar a planilha. Verifique a conexão Google Sheets.",
      );
    }
    throw new Error(`Erro ao comunicar com o Google Sheets [${res.status}].`);
  }
}

export type AcaoNR17 = {
  rowIndex: number; // absolute sheet row (>= FIRST_DATA_ROW)
  internalId: string;
  numero: string;
  /** Alias canônico de `numero` (Nº Ação — coluna B, nunca alterado). */
  numeroAcao: string;
  data: string;
  emissor: string;
  areaEmissor: string;
  responsavel: string;
  /** Área responsável final (coluna AN). */
  areaResponsavel: string;
  /** Setor (coluna H). */
  setor: string;
  /** Seção (coluna I). */
  secao: string;
  categoriaRisco: string;
  classificacao: string;
  riscoErgonomico: string;
  assunto: string;
  descricao: string;
  /** Classificação de Risco Ergonômico Inicial (coluna O — Alto/Médio/Baixo). */
  classificacaoRiscoInicial: string;
  /** Alias semântico de `classificacaoRiscoInicial`. */
  classificacaoRisco: string;
  responsavelTratativa: string;
  investimento: string;
  dataPrevista: string;
  dataEncerramento: string;
  status: string;
  severidade: string;
  dataAlteracao: string;
  local: string;
};

function parseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  // Format M/D/YYYY or M/D/YY HH:MM
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  let [, mo, d, y] = m;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const dt = new Date(year, Number(mo) - 1, Number(d));
  if (isNaN(dt.getTime())) return null;
  return dt;
}

function authHeaders() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");
  const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  if (!GOOGLE_SHEETS_API_KEY)
    throw new Error("GOOGLE_SHEETS_API_KEY não configurado");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
    "Content-Type": "application/json",
  };
}

let cachedSheetId: number | null = null;
async function getSheetId(): Promise<number> {
  if (cachedSheetId !== null) return cachedSheetId;
  const res = await fetch(
    `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,
    { headers: authHeaders() },
  );
  if (!res.ok)
    throw new Error(`Erro ao obter metadados da planilha [${res.status}]`);
  const meta = (await res.json()) as {
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  };
  const sheet = meta.sheets.find((s) => s.properties.title === SHEET_NAME);
  if (!sheet) throw new Error(`Aba ${SHEET_NAME} não encontrada`);
  cachedSheetId = sheet.properties.sheetId;
  return cachedSheetId;
}

function severidadeToNumber(s: string): string {
  const map: Record<string, string> = {
    Alto: "40",
    Significante: "30",
    Médio: "20",
    Medio: "20",
    Baixo: "10",
  };
  return map[s] ?? s;
}

/**
 * Monta um array de 44 colunas (A..AR) a partir dos campos do form,
 * respeitando os índices usados em fetchAcoesNR17.
 */
function buildRow(input: {
  numero?: string;
  internalId?: string;
  assunto: string;
  areaResponsavel: string;
  responsavel: string;
  status: string;
  severidade: string;
  dataPrevista: string;
  descricao: string;
}): string[] {
  const row = new Array<string>(TOTAL_COLS).fill("");
  if (input.numero) row[1] = input.numero;     // B
  row[12] = input.assunto;                     // M
  row[13] = input.descricao;                   // N
  row[15] = input.responsavel;                 // P
  row[17] = input.dataPrevista;                // R
  row[19] = input.status;                      // T
  row[20] = severidadeToNumber(input.severidade); // U
  row[39] = input.areaResponsavel;             // AN
  if (input.internalId) row[INTERNAL_ID_COL] = input.internalId;
  return row;
}

function genInternalId(): string {
  try {
    return (globalThis.crypto as Crypto).randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const fetchAcoesNR17 = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ acoes: AcaoNR17[]; atualizadoEm: string }> => {
    const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=${encodeURIComponent(RANGE)}&valueRenderOption=FORMATTED_VALUE`;
    const res = await fetchWithRetry(url, { headers: authHeaders() }, "fetch");
    const data = (await res.json()) as {
      valueRanges: Array<{ values?: string[][] }>;
    };
    const rows = data.valueRanges?.[0]?.values ?? [];

    const mapped: AcaoNR17[] = rows.map((r, idx) => {
      const cell = (i: number) => (r[i] ?? "").toString().trim();
      const numero = cell(1);
      const setor = cell(7);
      const classificacaoRiscoInicial = cell(14); // O
      const area = cell(39);
      return {
        rowIndex: FIRST_DATA_ROW + idx,
        internalId: cell(INTERNAL_ID_COL),
        numero,
        numeroAcao: numero,
        data: cell(2),           // C
        emissor: cell(3),        // D
        areaEmissor: cell(5),    // F
        responsavel: cell(6),    // G
        areaResponsavel: area || setor,
        setor,                   // H
        secao: cell(8),          // I
        categoriaRisco: cell(9), // J
        classificacao: cell(10), // K
        riscoErgonomico: cell(11), // L
        assunto: cell(12),       // M
        descricao: cell(13),     // N
        classificacaoRiscoInicial,
        classificacaoRisco: classificacaoRiscoInicial,
        responsavelTratativa: cell(15), // P
        investimento: cell(16),  // Q
        dataPrevista: cell(17),  // R
        dataEncerramento: cell(18), // S
        status: cell(19),        // T
        severidade: cell(20),    // U
        dataAlteracao: cell(21), // V
        local: setor,
      };
    });

    const acoes: AcaoNR17[] = mapped.filter((a) => {
      const titulo = a.assunto.toLowerCase();
      // Cabeçalho repetido na primeira linha de dados
      if (titulo === "assunto" || titulo === "título" || titulo === "titulo") {
        return false;
      }
      if (a.assunto.length === 0) {
        return false;
      }
      return true;
    });

    return { acoes, atualizadoEm: new Date().toISOString() };
  },
);

const acaoInputSchema = z.object({
  assunto: z.string().trim().min(1).max(500),
  areaResponsavel: z.string().trim().max(200).default(""),
  responsavel: z.string().trim().max(200).default(""),
  status: z.string().trim().min(1).max(100),
  severidade: z.string().trim().min(1).max(50),
  dataPrevista: z.string().trim().max(20).default(""),
  descricao: z.string().trim().max(2000).default(""),
});

export type AcaoInput = z.infer<typeof acaoInputSchema>;

export const addActionToSheet = createServerFn({ method: "POST" })
  .inputValidator((input: AcaoInput) => acaoInputSchema.parse(input))
  .handler(async ({ data }) => {
    // Lê a coluna L (assunto, sempre preenchida) para localizar a próxima
    // linha vazia e o próximo número sequencial. Evita o `:append`, cuja
    // detecção automática de tabela grava em colunas erradas (AQ:CI).
    const { numero, nextRow } = await getNextRowAndNumero();
    const internalId = genInternalId();
    const row = buildRow({ ...data, numero, internalId });
    const range = `${SHEET_NAME}!A${nextRow}:AS${nextRow}`;
    const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
    await fetchWithRetry(
      url,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ values: [row] }),
      },
      "add",
    );
    return { ok: true, numero, internalId };
  });

const updateSchema = acaoInputSchema.extend({
  rowIndex: z.number().int().min(FIRST_DATA_ROW),
  numero: z.string().trim().max(20).default(""),
  internalId: z.string().trim().max(64).default(""),
});

export const updateActionInSheet = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof updateSchema>) => updateSchema.parse(input))
  .handler(async ({ data }) => {
    const internalId = data.internalId || genInternalId();
    const row = buildRow({ ...data, internalId });
    const range = `${SHEET_NAME}!A${data.rowIndex}:AS${data.rowIndex}`;
    const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
    await fetchWithRetry(
      url,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ values: [row] }),
      },
      "update",
    );
    return { ok: true, internalId };
  });

const deleteSchema = z.object({
  rowIndex: z.number().int().min(FIRST_DATA_ROW),
});

export const deleteActionFromSheet = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof deleteSchema>) => deleteSchema.parse(input))
  .handler(async ({ data }) => {
    const sheetId = await getSheetId();
    const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;
    await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: data.rowIndex - 1,
                  endIndex: data.rowIndex,
                },
              },
            },
          ],
        }),
      },
      "delete",
    );
    return { ok: true };
  });

const importSchema = z.object({
  acoes: z.array(acaoInputSchema).min(1).max(500),
});

export const importActionsBatch = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof importSchema>) => importSchema.parse(input))
  .handler(async ({ data }) => {
    const { numero: firstNumero, nextRow } = await getNextRowAndNumero();
    const next = Number(firstNumero);
    const values = data.acoes.map((a, i) =>
      buildRow({ ...a, numero: String(next + i), internalId: genInternalId() }),
    );
    const lastRow = nextRow + values.length - 1;
    const range = `${SHEET_NAME}!A${nextRow}:AS${lastRow}`;
    const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;
    await fetchWithRetry(
      url,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ values }),
      },
      "import",
    );
    return { inserted: values.length };
  });

/**
 * Retorna o próximo número sequencial (max(B) + 1) e o índice absoluto da
 * próxima linha vazia (com base na coluna L = assunto, sempre preenchida).
 */
async function getNextRowAndNumero(): Promise<{ numero: string; nextRow: number }> {
  // Coluna B = Nº Ação; Coluna M = Assunto (sempre preenchida)
  const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=${encodeURIComponent(`${SHEET_NAME}!B${FIRST_DATA_ROW}:B`)}&ranges=${encodeURIComponent(`${SHEET_NAME}!M${FIRST_DATA_ROW}:M`)}&valueRenderOption=UNFORMATTED_VALUE`;
  let nextRow = FIRST_DATA_ROW + 1;
  let numero = "1";
  try {
    const res = await fetch(url, { headers: authHeaders() });
    const json = (await res.json()) as {
      valueRanges: Array<{ values?: string[][] }>;
    };
    const numCol = json.valueRanges?.[0]?.values ?? [];
    const assuntoCol = json.valueRanges?.[1]?.values ?? [];
    const nums = numCol
      .map((r) => Number(r[0]))
      .filter((n) => Number.isFinite(n));
    numero = String(nums.length ? Math.max(...nums) + 1 : 1);
    let lastFilled = FIRST_DATA_ROW;
    assuntoCol.forEach((r, idx) => {
      if ((r[0] ?? "").toString().trim().length > 0) {
        lastFilled = FIRST_DATA_ROW + idx;
      }
    });
    nextRow = lastFilled + 1;
  } catch {
    numero = String(Date.now());
  }
  return { numero, nextRow };
}
