import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  TrendingUp,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import type { AcaoNR17 } from "@/lib/sheets.functions";
import {
  mensagemExecutiva,
  isEncerrada,
  statusGroup,
  isAtrasada,
  diasParaPrazo,
  criticidadeNivel,
  criticidadeScore,
  ordenarPorCriticidade,
  concentracaoAreas,
  severidadeLabel,
  temResponsavel,
} from "@/lib/nr17";

interface PresentationModeProps {
  acoes: AcaoNR17[];
  open: boolean;
  onClose: () => void;
}

export function PresentationMode({ acoes, open, onClose }: PresentationModeProps) {
  const [slide, setSlide] = useState(0);
  const slides = 4;

  useEffect(() => {
    if (!open) {
      setSlide(0);
      return;
    }
    if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") setSlide((s) => Math.min(slides - 1, s + 1));
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold">Modo Apresentação</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            Slide {slide + 1} de {slides}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={slide === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSlide((s) => Math.min(slides - 1, s + 1))} disabled={slide === slides - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="mr-1 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto flex h-full max-w-6xl flex-col justify-center p-8 sm:p-12">
          {slide === 0 ? <SlideResumo acoes={acoes} /> : null}
          {slide === 1 ? <SlidePrioridades acoes={acoes} /> : null}
          {slide === 2 ? <SlideEvolucao acoes={acoes} /> : null}
          {slide === 3 ? <SlideAreas acoes={acoes} /> : null}
        </div>
      </div>

      <footer className="border-t border-border/60 px-6 py-2">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {Array.from({ length: slides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i === slide ? "bg-primary" : "bg-border"
              }`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

function SlideTitle({ icon: Icon, kicker, title }: { icon: typeof Sparkles; kicker: string; title: string }) {
  return (
    <div className="mb-8">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {kicker}
      </div>
      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function SlideResumo({ acoes }: { acoes: AcaoNR17[] }) {
  const total = acoes.length;
  let concluidas = 0,
    abertas = 0,
    atrasadas = 0,
    criticas = 0;
  acoes.forEach((a) => {
    if (isEncerrada(a.status)) concluidas++;
    else abertas++;
    if (isAtrasada(a)) atrasadas++;
    const n = criticidadeNivel(a);
    if (n === "Crítico") criticas++;
  });
  const perc = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  const msg = mensagemExecutiva(acoes);

  return (
    <div>
      <SlideTitle icon={Sparkles} kicker="Resumo Executivo" title="Onde estamos hoje" />
      <div
        className="mb-8 rounded-2xl p-8 text-primary-foreground shadow-[var(--shadow-premium)]"
        style={{ background: "var(--gradient-executive)" }}
      >
        <p className="text-xl font-medium leading-relaxed sm:text-2xl">{msg}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <BigStat label="Total" value={total} tone="text-foreground" />
        <BigStat label="Concluídas" value={concluidas} sub={`${perc}%`} tone="text-success" />
        <BigStat label="Atrasadas" value={atrasadas} tone="text-destructive" />
        <BigStat label="Críticas" value={criticas} tone="text-destructive" />
      </div>
      <div className="mt-8">
        <Progress value={perc} className="h-3" />
        <p className="mt-2 text-sm text-muted-foreground">
          Execução geral · {concluidas} de {total} ações concluídas
        </p>
      </div>
    </div>
  );
}

function BigStat({ label, value, sub, tone }: { label: string; value: number | string; sub?: string; tone: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-4xl font-bold tabular-nums sm:text-5xl ${tone}`}>{value}</p>
      {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function SlidePrioridades({ acoes }: { acoes: AcaoNR17[] }) {
  const top = ordenarPorCriticidade(acoes.filter((a) => criticidadeScore(a) >= 25)).slice(0, 5);
  return (
    <div>
      <SlideTitle icon={Flame} kicker="Prioridades" title="O que exige decisão agora" />
      {top.length === 0 ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-10 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
          <p className="text-2xl font-semibold text-success">Nenhuma ação crítica.</p>
          <p className="mt-2 text-muted-foreground">Plano sob controle no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {top.map((a) => {
            const dias = diasParaPrazo(a);
            const sev = severidadeLabel(a.severidade);
            const nivel = criticidadeNivel(a);
            return (
              <div
                key={a.numero}
                className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4"
              >
                <div
                  className={`flex h-12 w-16 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase ${
                    nivel === "Crítico"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {nivel}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground sm:text-lg">
                    {a.assunto || "Ação sem título"}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {a.areaResponsavel} ·{" "}
                    {temResponsavel(a)
                      ? a.responsavel || a.responsavelTratativa
                      : "responsável a definir"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  {dias === null ? (
                    <span className="text-sm font-medium text-muted-foreground">
                      Sem prazo
                    </span>
                  ) : dias < 0 ? (
                    <span className="text-sm font-bold text-destructive">
                      {Math.abs(dias)}d em atraso
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-warning-foreground">
                      Vence em {dias}d
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">Risco {sev}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SlideEvolucao({ acoes }: { acoes: AcaoNR17[] }) {
  let concluidas = 0,
    emand = 0,
    pendentes = 0,
    atrasadas = 0;
  acoes.forEach((a) => {
    const g = statusGroup(a.status);
    if (g === "Realizado" || g === "Inviável") concluidas++;
    else if (g === "Em Andamento" || g === "Em Análise") emand++;
    else pendentes++;
    if (isAtrasada(a)) atrasadas++;
  });
  const total = acoes.length;
  const perc = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <div>
      <SlideTitle icon={TrendingUp} kicker="Evolução" title="Como o plano está caminhando" />
      <div className="mb-8 rounded-2xl border border-border/60 bg-card p-8">
        <div className="flex items-baseline justify-between">
          <span className="text-base text-muted-foreground">Execução total</span>
          <span className="text-6xl font-bold tabular-nums text-foreground">
            {perc}%
          </span>
        </div>
        <Progress value={perc} className="mt-4 h-3" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <BigStat label="Concluídas" value={concluidas} tone="text-success" />
        <BigStat label="Em andamento" value={emand} tone="text-info" />
        <BigStat label="Pendentes" value={pendentes} tone="text-warning-foreground" />
        <BigStat label="Atrasadas" value={atrasadas} tone="text-destructive" />
      </div>
    </div>
  );
}

function SlideAreas({ acoes }: { acoes: AcaoNR17[] }) {
  const top = concentracaoAreas(acoes, 5);
  return (
    <div>
      <SlideTitle icon={Building2} kicker="Áreas" title="Onde está concentrado o risco" />
      <div className="space-y-3">
        {top.map((s) => (
          <div
            key={s.area}
            className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-foreground">{s.area}</p>
              <p className="text-sm text-muted-foreground">
                {s.abertas} ações em aberto · {s.criticas} críticas
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-foreground">{s.total}</p>
              <p className="text-xs text-muted-foreground">total</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// re-export to silence unused import warning if any
export const _icons = { AlertTriangle, Clock, ShieldAlert };
