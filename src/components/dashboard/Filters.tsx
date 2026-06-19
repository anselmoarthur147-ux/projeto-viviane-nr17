import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export interface FilterState {
  area: string;
  status: string;
  risco: string;
  local: string;
  prazo: string;
  busca: string;
}

interface FiltersProps {
  state: FilterState;
  onChange: (s: FilterState) => void;
  options: {
    areas: string[];
    statuses: string[];
    riscos: string[];
    locais: string[];
  };
}

const ALL = "__all__";

export function Filters({ state, onChange, options }: FiltersProps) {
  const update = (k: keyof FilterState, v: string) =>
    onChange({ ...state, [k]: v });

  const reset = () =>
    onChange({
      area: "",
      status: "",
      risco: "",
      local: "",
      prazo: "",
      busca: "",
    });

  const activeCount = Object.values(state).filter((v) => v).length;

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={state.busca}
              onChange={(e) => update("busca", e.target.value)}
              placeholder="Assunto, descrição, emissor..."
              className="pl-8"
            />
          </div>
        </div>

        <FilterSelect
          label="Área"
          value={state.area}
          onChange={(v) => update("area", v)}
          options={options.areas}
        />
        <FilterSelect
          label="Status"
          value={state.status}
          onChange={(v) => update("status", v)}
          options={options.statuses}
        />
        <FilterSelect
          label="Risco / Categoria"
          value={state.risco}
          onChange={(v) => update("risco", v)}
          options={options.riscos}
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Prazo
          </label>
          <Select
            value={state.prazo || ALL}
            onValueChange={(v) => update("prazo", v === ALL ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="atrasada">Atrasadas</SelectItem>
              <SelectItem value="7d">Vence em até 7 dias</SelectItem>
              <SelectItem value="30d">Vence em até 30 dias</SelectItem>
              <SelectItem value="sem-prazo">Sem prazo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeCount > 0 ? (
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
          <p className="text-xs text-muted-foreground">
            {activeCount} {activeCount === 1 ? "filtro ativo" : "filtros ativos"}
          </p>
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="mr-1 h-3.5 w-3.5" />
            Limpar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select
        value={value || ALL}
        onValueChange={(v) => onChange(v === ALL ? "" : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
