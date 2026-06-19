import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { AcaoNR17 } from "@/lib/sheets.functions";
import { StatusBadge } from "./StatusBadge";
import { SeveridadeBadge } from "./SeveridadeBadge";
import { formatDateBR, isAtrasada, diasParaPrazo } from "@/lib/nr17";
import { AlertTriangle } from "lucide-react";

export function AcoesTable({ acoes }: { acoes: AcaoNR17[] }) {
  const [selected, setSelected] = useState<AcaoNR17 | null>(null);

  return (
    <>
      <div className="rounded-lg border border-border/60 bg-card shadow-sm">
        <div className="max-h-[640px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="border-b border-border">
                <TableHead className="w-16">Nº</TableHead>
                <TableHead className="min-w-[180px]">Área</TableHead>
                <TableHead className="min-w-[200px]">Assunto</TableHead>
                <TableHead className="min-w-[140px]">Categoria</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead className="min-w-[180px]">Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead className="min-w-[160px]">Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    Nenhuma ação encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                acoes.map((a) => {
                  const atrasada = isAtrasada(a);
                  const dias = diasParaPrazo(a);
                  return (
                    <TableRow
                      key={a.numero}
                      onClick={() => setSelected(a)}
                      className="cursor-pointer hover:bg-accent/40"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {a.numero}
                      </TableCell>
                      <TableCell className="font-medium">{a.areaResponsavel || "—"}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{a.assunto || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.categoriaRisco || "—"}
                      </TableCell>
                      <TableCell>
                        <SeveridadeBadge severidade={a.severidade} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1.5">
                          {atrasada ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          ) : null}
                          <span className={atrasada ? "text-destructive font-medium" : ""}>
                            {formatDateBR(a.dataPrevista)}
                          </span>
                          {dias !== null && !atrasada && dias <= 30 ? (
                            <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px]">
                              {dias}d
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.responsavel || a.responsavelTratativa || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    #{selected.numero}
                  </span>
                  {selected.assunto || "Ação NR17"}
                </DialogTitle>
                <DialogDescription>{selected.areaResponsavel}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Status">
                  <StatusBadge status={selected.status} />
                </Field>
                <Field label="Severidade">
                  <SeveridadeBadge severidade={selected.severidade} />
                </Field>
                <Field label="Categoria de Risco" value={selected.categoriaRisco} />
                <Field label="Classificação" value={selected.classificacao} />
                <Field label="Risco Ergonômico" value={selected.riscoErgonomico} />
                <Field label="Risco Inicial" value={selected.classificacaoRiscoInicial} />
                <Field label="Emissor" value={selected.emissor} />
                <Field label="Responsável" value={selected.responsavel} />
                <Field label="Data Abertura" value={formatDateBR(selected.data)} />
                <Field label="Data Prevista" value={formatDateBR(selected.dataPrevista)} />
                <Field label="Data Encerramento" value={formatDateBR(selected.dataEncerramento)} />
                <Field label="Investimento" value={selected.investimento} />
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Descrição
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {selected.descricao || "—"}
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children ?? (value || "—")}</div>
    </div>
  );
}
