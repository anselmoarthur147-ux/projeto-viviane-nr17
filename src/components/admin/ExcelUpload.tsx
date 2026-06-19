import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  autoMap,
  buildAcoesFromSheet,
  DOMAIN_FIELDS,
  parseWorkbook,
  type DomainField,
  type Mapping,
  type ParsedWorkbook,
} from "@/lib/nr17/excel-import";
import { importActionsBatch } from "@/lib/sheets.functions";

const NONE = "__none__";

interface Props {
  onImported?: () => void;
}

export function ExcelUpload({ onImported }: Props) {
  const importFn = useServerFn(importActionsBatch);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [wb, setWb] = useState<ParsedWorkbook | null>(null);
  const [sheetName, setSheetName] = useState<string>("");
  const [mapping, setMapping] = useState<Mapping>({});
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<{
    inserted: number;
    failed: { line: number; reason: string }[];
  } | null>(null);

  const sheet = wb && sheetName ? wb.sheets[sheetName] : null;

  const built = useMemo(() => {
    if (!sheet) return null;
    return buildAcoesFromSheet(sheet.headers, sheet.rows, mapping);
  }, [sheet, mapping]);

  async function handleFile(f: File) {
    setReport(null);
    setFile(f);
    try {
      const parsed = await parseWorkbook(f);
      setWb(parsed);
      const first = parsed.sheetNames[0] ?? "";
      setSheetName(first);
      const headers = parsed.sheets[first]?.headers ?? [];
      setMapping(autoMap(headers));
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível ler o arquivo. Verifique se é um Excel válido.");
      reset();
    }
  }

  function reset() {
    setFile(null);
    setWb(null);
    setSheetName("");
    setMapping({});
    setReport(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onSheetChange(name: string) {
    setSheetName(name);
    const headers = wb?.sheets[name]?.headers ?? [];
    setMapping(autoMap(headers));
  }

  async function handleImport() {
    if (!built || built.valid.length === 0) {
      toast.error("Nenhuma linha válida para importar.");
      return;
    }
    setImporting(true);
    try {
      const res = await importFn({ data: { acoes: built.valid } });
      const failed = built.errors;
      setReport({ inserted: res.inserted, failed });
      if (failed.length === 0) {
        toast.success(`${res.inserted} ações importadas com sucesso!`);
      } else {
        toast.success(
          `${res.inserted} importadas, ${failed.length} falha${failed.length > 1 ? "s" : ""}.`,
        );
      }
      onImported?.();
    } catch (e) {
      toast.error((e as Error).message ?? "Erro ao importar planilha.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload de Planilha</CardTitle>
        <CardDescription>
          Arraste um arquivo Excel (.xlsx ou .xls) para importar múltiplas ações
          de uma só vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors",
              dragOver && "border-primary bg-primary/5",
            )}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Arraste o arquivo aqui</p>
              <p className="text-sm text-muted-foreground">
                ou clique para selecionar (.xlsx, .xls)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              Selecionar arquivo
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 truncate">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="truncate text-sm font-medium">{file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={importing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {wb && wb.sheetNames.length > 1 ? (
              <div className="space-y-1">
                <label className="text-sm font-medium">Aba</label>
                <Select value={sheetName} onValueChange={onSheetChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wb.sheetNames.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {sheet ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Mapeamento de colunas</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {DOMAIN_FIELDS.map((f) => (
                      <div key={f.key} className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {f.label}
                          {f.required ? " *" : ""}
                        </label>
                        <Select
                          value={mapping[f.key] ?? NONE}
                          onValueChange={(v) =>
                            setMapping((m) => ({
                              ...m,
                              [f.key]: v === NONE ? undefined : v,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>—</SelectItem>
                            {sheet.headers
                              .filter((h) => h.trim() !== "")
                              .map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Prévia (primeiras 5 linhas)
                  </p>
                  <div className="overflow-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {sheet.headers.map((h, i) => (
                            <TableHead key={i} className="whitespace-nowrap">
                              {h || `(col ${i + 1})`}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheet.rows.slice(0, 5).map((r, i) => (
                          <TableRow key={i}>
                            {sheet.headers.map((_, j) => (
                              <TableCell key={j} className="whitespace-nowrap text-sm">
                                {String(r[j] ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {built ? (
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                    <p className="font-medium">
                      Serão importadas {built.valid.length} ação
                      {built.valid.length === 1 ? "" : "es"}.
                    </p>
                    {built.errors.length > 0 ? (
                      <p className="text-muted-foreground">
                        {built.errors.length} linha
                        {built.errors.length === 1 ? "" : "s"} serão ignoradas
                        por erro de formato.
                      </p>
                    ) : null}
                    {!mapping.assunto ? (
                      <p className="mt-1 text-destructive">
                        Selecione a coluna correspondente ao Título.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={reset}
                    disabled={importing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleImport}
                    disabled={
                      importing ||
                      !mapping.assunto ||
                      !built ||
                      built.valid.length === 0
                    }
                  >
                    {importing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Importar Ações
                  </Button>
                </div>
              </>
            ) : null}

            {report ? (
              <div className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">
                  {report.inserted} importada{report.inserted === 1 ? "" : "s"},{" "}
                  {report.failed.length} falha
                  {report.failed.length === 1 ? "" : "s"}.
                </p>
                {report.failed.length > 0 ? (
                  <ul className="mt-2 list-inside list-disc text-muted-foreground">
                    {report.failed.slice(0, 10).map((e, i) => (
                      <li key={i}>
                        Linha {e.line}: {e.reason}
                      </li>
                    ))}
                    {report.failed.length > 10 ? (
                      <li>… e mais {report.failed.length - 10}.</li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
