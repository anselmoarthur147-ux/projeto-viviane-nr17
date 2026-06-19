import type { AcaoNR17 } from "@/lib/sheets.functions";
import { isEncerrada } from "./status";

export function parseDateBR(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const [, mo, d, y] = m;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const dt = new Date(year, Number(mo) - 1, Number(d));
  return isNaN(dt.getTime()) ? null : dt;
}

export function formatDateBR(s: string): string {
  const d = parseDateBR(s);
  if (!d) return s || "—";
  return d.toLocaleDateString("pt-BR");
}

export function isAtrasada(a: AcaoNR17): boolean {
  if (isEncerrada(a.status)) return false;
  const prevista = parseDateBR(a.dataPrevista);
  if (!prevista) return false;
  return prevista.getTime() < Date.now();
}

export function diasParaPrazo(a: AcaoNR17): number | null {
  const prevista = parseDateBR(a.dataPrevista);
  if (!prevista) return null;
  const diff = prevista.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export type PrazoBucket =
  | "vencido"
  | "ate-7"
  | "ate-30"
  | "futuro"
  | "concluido"
  | "sem-prazo";

export function prazoBucket(a: AcaoNR17): PrazoBucket {
  if (isEncerrada(a.status)) return "concluido";
  if (!a.dataPrevista.trim()) return "sem-prazo";
  const dias = diasParaPrazo(a);
  if (dias === null) return "sem-prazo";
  if (dias < 0) return "vencido";
  if (dias <= 7) return "ate-7";
  if (dias <= 30) return "ate-30";
  return "futuro";
}
