import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { EMPRESAS, type EmpresaConfig } from "@/lib/empresas";

interface EmpresaSelectorProps {
  value: string;
  onChange: (id: string) => void;
  empresa: EmpresaConfig;
}

export function EmpresaSelector({ value, onChange, empresa }: EmpresaSelectorProps) {
  const single = EMPRESAS.length === 1;
  return (
    <div className="flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5 text-primary-foreground backdrop-blur">
      <Building2 className="h-3.5 w-3.5 opacity-80" />
      {single ? (
        <div className="text-left leading-tight">
          <p className="text-[10px] uppercase tracking-wider opacity-70">
            Empresa
          </p>
          <p className="text-xs font-semibold">{empresa.nome}</p>
        </div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-7 w-[180px] border-0 bg-transparent px-1 text-xs font-semibold text-primary-foreground hover:bg-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMPRESAS.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome} — {e.contrato}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
