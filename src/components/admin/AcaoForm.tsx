import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export interface AcaoFormValues {
  assunto: string;
  areaResponsavel: string;
  responsavel: string;
  status: string;
  severidade: string;
  dataPrevista: string;
  descricao: string;
}

interface Props {
  initial?: Partial<AcaoFormValues>;
  areas?: string[];
  submitting?: boolean;
  onSubmit: (v: AcaoFormValues) => void;
  onCancel?: () => void;
}

const STATUS = [
  "Não Iniciado",
  "Em Análise pela Área Responsável",
  "Em Andamento",
  "Realizado",
  "Avaliado como inviável",
];
const SEVERIDADE = ["Alto", "Significante", "Médio", "Baixo"];

export function AcaoForm({
  initial,
  areas = [],
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const [v, setV] = useState<AcaoFormValues>({
    assunto: initial?.assunto ?? "",
    areaResponsavel: initial?.areaResponsavel ?? "",
    responsavel: initial?.responsavel ?? "",
    status: initial?.status ?? "Não Iniciado",
    severidade: initial?.severidade ?? "Médio",
    dataPrevista: initial?.dataPrevista ?? "",
    descricao: initial?.descricao ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setV((prev) => ({ ...prev, ...initial }));
    }
  }, [initial]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.assunto.trim()) {
          setError("Título é obrigatório.");
          return;
        }
        if (v.dataPrevista && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v.dataPrevista)) {
          setError("Data deve estar no formato dd/mm/aaaa.");
          return;
        }
        setError(null);
        onSubmit(v);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="assunto">Título *</Label>
        <Input
          id="assunto"
          value={v.assunto}
          onChange={(e) => setV({ ...v, assunto: e.target.value })}
          maxLength={500}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="area">Área</Label>
          <Input
            id="area"
            list="area-options"
            value={v.areaResponsavel}
            onChange={(e) => setV({ ...v, areaResponsavel: e.target.value })}
            maxLength={200}
          />
          <datalist id="area-options">
            {areas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="responsavel">Responsável</Label>
          <Input
            id="responsavel"
            value={v.responsavel}
            onChange={(e) => setV({ ...v, responsavel: e.target.value })}
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={v.status} onValueChange={(s) => setV({ ...v, status: s })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Severidade</Label>
          <Select
            value={v.severidade}
            onValueChange={(s) => setV({ ...v, severidade: s })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERIDADE.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="data">Data de entrega (dd/mm/aaaa)</Label>
          <Input
            id="data"
            placeholder="31/12/2026"
            value={v.dataPrevista}
            onChange={(e) => setV({ ...v, dataPrevista: e.target.value })}
            maxLength={10}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          rows={4}
          value={v.descricao}
          onChange={(e) => setV({ ...v, descricao: e.target.value })}
          maxLength={2000}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar
        </Button>
      </div>
    </form>
  );
}
