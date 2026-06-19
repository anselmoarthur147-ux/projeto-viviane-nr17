import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import type { AcaoNR17 } from "@/lib/sheets.functions";
import { mensagemExecutiva } from "@/lib/nr17";

export function ExecutiveSummary({ acoes }: { acoes: AcaoNR17[] }) {
  const msg = mensagemExecutiva(acoes);
  return (
    <Card
      className="border-0 text-primary-foreground shadow-[var(--shadow-premium)]"
      style={{ background: "var(--gradient-executive)" }}
    >
      <div className="flex items-start gap-4 p-6 sm:p-7">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
            Leitura Executiva · Hoje
          </p>
          <p className="mt-2 text-base font-medium leading-relaxed sm:text-lg">
            {msg}
          </p>
        </div>
      </div>
    </Card>
  );
}
