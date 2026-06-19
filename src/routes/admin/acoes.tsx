import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  fetchAcoesNR17,
  addActionToSheet,
  updateActionInSheet,
  deleteActionFromSheet,
  type AcaoNR17,
} from "@/lib/sheets.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, ArrowUpDown, ChevronDown, ChevronUp, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AcaoForm, type AcaoFormValues } from "@/components/admin/AcaoForm";
import { ExcelUpload } from "@/components/admin/ExcelUpload";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { SeveridadeBadge } from "@/components/dashboard/SeveridadeBadge";
import {
  severidadeLabel,
  uniqueSorted,
  formatDateBR,
  isAtrasada,
  ordenarPadraoAcoes,
  parseDateBR,
  statusGroup,
} from "@/lib/nr17";

type Search = { edit?: string };

type SortCol =
  | "titulo"
  | "area"
  | "responsavel"
  | "status"
  | "severidade"
  | "data";
type SortState = { col: SortCol; dir: "asc" | "desc" } | null;

export const Route = createFileRoute("/admin/acoes")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
  }),
  component: AdminAcoesPage,
});

function SortableHead({
  col,
  sort,
  onToggle,
  className,
  children,
}: {
  col: SortCol;
  sort: SortState;
  onToggle: (c: SortCol) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const active = sort?.col === col;
  const Icon = !active
    ? ArrowUpDown
    : sort!.dir === "asc"
      ? ChevronUp
      : ChevronDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onToggle(col)}
        className="inline-flex items-center gap-1 text-left font-medium hover:text-foreground"
      >
        {children}
        <Icon
          className={`h-3.5 w-3.5 ${active ? "text-foreground" : "text-muted-foreground/60"}`}
        />
      </button>
    </TableHead>
  );
}

function AdminAcoesPage() {
  const { edit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["acoes-nr17"],
    queryFn: () => fetchAcoesNR17(),
    staleTime: 30_000,
  });
  const acoes = data?.acoes ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AcaoNR17 | null>(null);
  const [deleting, setDeleting] = useState<AcaoNR17 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortState>(null);
  // IDs de ações criadas nesta sessão — exibidas no topo sem alterar a ordem real.
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const addFn = useServerFn(addActionToSheet);
  const updateFn = useServerFn(updateActionInSheet);
  const deleteFn = useServerFn(deleteActionFromSheet);

  // Suporta ?edit=<internalId|rowIndex> via URL
  useEffect(() => {
    if (!edit) return;
    const found =
      acoes.find((a) => a.internalId && a.internalId === edit) ||
      acoes.find((a) => String(a.rowIndex) === edit);
    if (found) setEditing(found);
  }, [edit, acoes]);

  const areas = useMemo(
    () => uniqueSorted(acoes.map((a) => a.areaResponsavel)),
    [acoes],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = acoes.filter((a) => {
      if (q) {
        const hay = [a.assunto, a.areaResponsavel, a.responsavel, a.numero, a.status]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "Atrasado") {
          if (!isAtrasada(a)) return false;
        } else if (statusGroup(a.status) !== statusFilter) {
          return false;
        }
      }
      if (areaFilter !== "all" && a.areaResponsavel !== areaFilter) return false;
      return true;
    });
    if (!sort) {
      const ordenadas = ordenarPadraoAcoes(base);
      if (recentIds.length === 0) return ordenadas;
      const recentSet = new Set(recentIds);
      const recentes = recentIds
        .map((id) => ordenadas.find((a) => a.internalId === id))
        .filter((a): a is AcaoNR17 => Boolean(a));
      const resto = ordenadas.filter(
        (a) => !a.internalId || !recentSet.has(a.internalId),
      );
      return [...recentes, ...resto];
    }
    const dir = sort.dir === "asc" ? 1 : -1;
    const get = (a: AcaoNR17): string | number => {
      switch (sort.col) {
        case "titulo":
          return (a.assunto || "").toLowerCase();
        case "area":
          return (a.areaResponsavel || "").toLowerCase();
        case "responsavel":
          return (a.responsavel || a.responsavelTratativa || "").toLowerCase();
        case "status":
          return (a.status || "").toLowerCase();
        case "severidade": {
          const order: Record<string, number> = {
            Alto: 4,
            Significante: 3,
            "Médio": 2,
            Baixo: 1,
          };
          return order[severidadeLabel(a.severidade)] ?? 0;
        }
        case "data": {
          const d = parseDateBR(a.dataPrevista);
          return d ? d.getTime() : 0;
        }
      }
    };
    return [...base].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [acoes, search, statusFilter, areaFilter, sort, recentIds]);

  function toggleSort(col: SortCol) {
    setSort((s) => {
      if (!s || s.col !== col) return { col, dir: "asc" };
      if (s.dir === "asc") return { col, dir: "desc" };
      return null;
    });
  }

  async function handleCreate(v: AcaoFormValues) {
    setSubmitting(true);
    try {
      const res = await addFn({ data: v });
      toast.success("Ação criada com sucesso.");
      setCreateOpen(false);
      if (res?.internalId) {
        setRecentIds((ids) => [res.internalId, ...ids.filter((x) => x !== res.internalId)]);
      }
      await queryClient.invalidateQueries({ queryKey: ["acoes-nr17"] });
    } catch (e) {
      toast.error((e as Error).message ?? "Erro ao criar ação.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(v: AcaoFormValues) {
    if (!editing) return;
    setSubmitting(true);
    try {
      await updateFn({
        data: {
          ...v,
          rowIndex: editing.rowIndex,
          numero: editing.numero,
          internalId: editing.internalId,
        },
      });
      toast.success("Ação atualizada.");
      setEditing(null);
      if (edit) navigate({ to: "/admin/acoes", search: {} });
      await queryClient.invalidateQueries({ queryKey: ["acoes-nr17"] });
    } catch (e) {
      toast.error((e as Error).message ?? "Erro ao atualizar ação.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSubmitting(true);
    try {
      await deleteFn({ data: { rowIndex: deleting.rowIndex } });
      toast.success("Ação excluída.");
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: ["acoes-nr17"] });
    } catch (e) {
      toast.error((e as Error).message ?? "Erro ao excluir ação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Administração de Ações
              </h1>
              <p className="text-xs text-muted-foreground">
                Adicione, edite ou remova ações do plano NR17.
              </p>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Ação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Ação</DialogTitle>
              </DialogHeader>
              <AcaoForm
                areas={areas}
                submitting={submitting}
                onSubmit={handleCreate}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <ExcelUpload
          onImported={() =>
            queryClient.invalidateQueries({ queryKey: ["acoes-nr17"] })
          }
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Buscar por título, área, responsável…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Realizado">Realizado</SelectItem>
                <SelectItem value="Em Análise">Em Análise</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Não Iniciado">Não Iniciado</SelectItem>
                <SelectItem value="Inviável">Inviável</SelectItem>
                <SelectItem value="Atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Mostrando <span className="text-foreground">{filtered.length}</span> de{" "}
            <span className="text-foreground">{acoes.length}</span> ações
          </p>
        </div>

        <div className="rounded-md border border-border/60 bg-card">
          <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <SortableHead col="titulo" sort={sort} onToggle={toggleSort}>Título</SortableHead>
                <SortableHead col="area" sort={sort} onToggle={toggleSort} className="hidden md:table-cell">Área</SortableHead>
                <SortableHead col="responsavel" sort={sort} onToggle={toggleSort} className="hidden md:table-cell">Responsável</SortableHead>
                <SortableHead col="status" sort={sort} onToggle={toggleSort}>Status</SortableHead>
                <SortableHead col="severidade" sort={sort} onToggle={toggleSort} className="hidden sm:table-cell">Severidade</SortableHead>
                <SortableHead col="data" sort={sort} onToggle={toggleSort} className="hidden lg:table-cell">Data</SortableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                    Nenhuma ação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a, i) => (
                  <TableRow key={a.internalId || a.rowIndex}>
                    <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                      {i + 1}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate font-medium">
                      <Link
                        to="/acao/$id"
                        params={{ id: a.internalId || String(a.rowIndex) }}
                        className="text-primary hover:underline"
                      >
                        {a.assunto || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {a.areaResponsavel || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {a.responsavel || a.responsavelTratativa || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} atrasada={isAtrasada(a)} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      <span className="inline-flex items-center gap-1">
                        <SeveridadeBadge severidade={a.severidade} />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Severidade: {severidadeLabel(a.severidade)}
                            {a.severidade ? ` (peso ${a.severidade})` : ""}
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm tabular-nums">
                      {formatDateBR(a.dataPrevista)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(a)}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(a)}
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </TooltipProvider>
        </div>
      </main>

      <Dialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            if (edit) navigate({ to: "/admin/acoes", search: {} });
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Ação #{editing?.numero}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <AcaoForm
              areas={areas}
              submitting={submitting}
              initial={{
                assunto: editing.assunto,
                areaResponsavel: editing.areaResponsavel,
                responsavel: editing.responsavel,
                status: editing.status,
                severidade: severidadeLabel(editing.severidade),
                dataPrevista: editing.dataPrevista,
                descricao: editing.descricao,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta ação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta operação remove permanentemente a ação "{deleting?.assunto || deleting?.numero}"
              {" "}da planilha. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
