import * as XLSX from "xlsx";

export type DomainField =
  | "assunto"
  | "areaResponsavel"
  | "responsavel"
  | "status"
  | "severidade"
  | "dataPrevista"
  | "descricao";

export const DOMAIN_FIELDS: { key: DomainField; label: string; required?: boolean }[] = [
  { key: "assunto", label: "Título", required: true },
  { key: "areaResponsavel", label: "Área" },
  { key: "responsavel", label: "Responsável" },
  { key: "status", label: "Status" },
  { key: "severidade", label: "Severidade" },
  { key: "dataPrevista", label: "Data de entrega" },
  { key: "descricao", label: "Descrição" },
];

export type Mapping = Partial<Record<DomainField, string>>;

export interface ParsedSheet {
  headers: string[];
  rows: unknown[][];
}

export interface ParsedWorkbook {
  sheetNames: string[];
  sheets: Record<string, ParsedSheet>;
}

function norm(s: string): string {
  return s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const SYNONYMS: Record<DomainField, string[]> = {
  assunto: ["titulo", "title", "acao", "ação", "assunto", "nome"],
  areaResponsavel: ["area", "área", "setor", "departamento", "depto"],
  responsavel: ["responsavel", "responsável", "encarregado", "owner"],
  status: ["status", "situacao", "situação", "estado"],
  severidade: ["severidade", "criticidade", "nivel", "nível", "risco"],
  dataPrevista: [
    "data",
    "prazo",
    "vencimento",
    "entrega",
    "data prevista",
    "data de entrega",
    "duedate",
  ],
  descricao: ["descricao", "descrição", "detalhe", "detalhes", "observacao", "observação"],
};

export function autoMap(headers: string[]): Mapping {
  const map: Mapping = {};
  const used = new Set<string>();
  for (const field of DOMAIN_FIELDS.map((d) => d.key)) {
    const syns = SYNONYMS[field];
    const found = headers.find((h) => {
      if (used.has(h)) return false;
      const n = norm(h);
      return syns.some((s) => n === s || n.includes(s));
    });
    if (found) {
      map[field] = found;
      used.add(found);
    }
  }
  return map;
}

export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheets: Record<string, ParsedSheet> = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: true,
    });
    const headers = (aoa[0] ?? []).map((c) => (c ?? "").toString().trim());
    const rows = aoa.slice(1);
    sheets[name] = { headers, rows };
  }
  return { sheetNames: wb.SheetNames, sheets };
}

export function normalizeStatus(v: unknown): string {
  const s = norm(String(v ?? ""));
  if (!s) return "Não Iniciado";
  if (/inviavel|cancelad|descartad/.test(s)) return "Avaliado como inviável";
  if (/realizad|encerrad|conclui|finaliz|done|complete/.test(s))
    return "Realizado";
  if (/analise/.test(s)) return "Em Análise pela Área Responsável";
  if (/andamento|processo|aguardand|progress|wip/.test(s))
    return "Em Andamento";
  return "Não Iniciado";
}

export function normalizeSeveridade(v: unknown): string {
  const s = norm(String(v ?? ""));
  if (!s) return "Médio";
  if (/alto|alta|high|critic|grave|40/.test(s)) return "Alto";
  if (/signif|relevant|30/.test(s)) return "Significante";
  if (/baix|low|10/.test(s)) return "Baixo";
  if (/medi|moderad|mid|20/.test(s)) return "Médio";
  return "Médio";
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function dateToStr(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function normalizeDate(v: unknown): { value: string; ok: boolean } {
  if (v == null || v === "") return { value: "", ok: true };
  if (v instanceof Date && !isNaN(v.getTime()))
    return { value: dateToStr(v), ok: true };
  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    if (!isNaN(d.getTime())) return { value: dateToStr(d), ok: true };
  }
  const s = String(v).trim();
  // dd/mm/yyyy or dd-mm-yyyy
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    const d = new Date(year, Number(mm) - 1, Number(dd));
    if (!isNaN(d.getTime())) return { value: dateToStr(d), ok: true };
  }
  // ISO yyyy-mm-dd
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const [, yy, mm, dd] = m;
    const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
    if (!isNaN(d.getTime())) return { value: dateToStr(d), ok: true };
  }
  return { value: s, ok: false };
}

export interface AcaoImport {
  assunto: string;
  areaResponsavel: string;
  responsavel: string;
  status: string;
  severidade: string;
  dataPrevista: string;
  descricao: string;
}

export interface BuildResult {
  valid: AcaoImport[];
  errors: { line: number; reason: string }[];
}

export function buildAcoesFromSheet(
  headers: string[],
  rows: unknown[][],
  mapping: Mapping,
): BuildResult {
  const valid: AcaoImport[] = [];
  const errors: { line: number; reason: string }[] = [];

  const idx: Partial<Record<DomainField, number>> = {};
  for (const f of DOMAIN_FIELDS.map((d) => d.key)) {
    const col = mapping[f];
    if (col) idx[f] = headers.indexOf(col);
  }

  rows.forEach((row, i) => {
    const lineNo = i + 2; // +1 header, +1 1-based
    const get = (f: DomainField) => {
      const j = idx[f];
      if (j === undefined || j < 0) return "";
      return row[j] ?? "";
    };

    const assunto = String(get("assunto")).trim();
    if (!assunto) {
      // Linha vazia? ignora silenciosamente se todas as células-alvo estão vazias
      const allEmpty = DOMAIN_FIELDS.every((d) => String(get(d.key)).trim() === "");
      if (allEmpty) return;
      errors.push({ line: lineNo, reason: "título obrigatório ausente" });
      return;
    }

    const dateRaw = get("dataPrevista");
    const dt = normalizeDate(dateRaw);
    if (!dt.ok && String(dateRaw).trim() !== "") {
      errors.push({ line: lineNo, reason: "data não reconhecida" });
      return;
    }

    valid.push({
      assunto: assunto.slice(0, 500),
      areaResponsavel: String(get("areaResponsavel")).trim().slice(0, 200),
      responsavel: String(get("responsavel")).trim().slice(0, 200),
      status: normalizeStatus(get("status")),
      severidade: normalizeSeveridade(get("severidade")),
      dataPrevista: dt.value,
      descricao: String(get("descricao")).trim().slice(0, 2000),
    });
  });

  return { valid, errors };
}
