import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  FileText,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Share2,
  Copy,
  Check,
  Download,
  FileDown,
} from "lucide-react";
import type { AcaoNR17 } from "@/lib/sheets.functions";
import type { EmpresaConfig } from "@/lib/empresas";
import {
  abrirEmail,
  abrirRelatorioHTML,
  abrirWhatsapp,
  copiarTexto,
  downloadFile,
  gerarCSV,
  gerarRelatorioHTML,
  resumoEmail,
  resumoWhatsapp,
} from "@/lib/export";

interface ExportPanelProps {
  acoes: AcaoNR17[];
  empresa: EmpresaConfig;
}

type DialogKind = null | "email" | "whatsapp";

export function ExportPanel({ acoes, empresa }: ExportPanelProps) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [emailContent, setEmailContent] = useState<{
    assunto: string;
    corpo: string;
  }>({ assunto: "", corpo: "" });
  const [whatsContent, setWhatsContent] = useState("");
  const [copied, setCopied] = useState(false);

  const slug = empresa.id;
  const today = new Date().toISOString().slice(0, 10);

  const onEmail = () => {
    setEmailContent(resumoEmail(acoes, empresa));
    setCopied(false);
    setDialog("email");
  };

  const onWhats = () => {
    setWhatsContent(resumoWhatsapp(acoes, empresa));
    setCopied(false);
    setDialog("whatsapp");
  };

  const onCSV = () => {
    downloadFile(gerarCSV(acoes), `nr17-${slug}-${today}.csv`, "text/csv");
  };

  const onPDFExec = () => {
    abrirRelatorioHTML(gerarRelatorioHTML(acoes, empresa, "executivo"));
  };

  const onPDFDet = () => {
    abrirRelatorioHTML(gerarRelatorioHTML(acoes, empresa, "detalhado"));
  };

  const onShare = async () => {
    const { corpo, assunto } = resumoEmail(acoes, empresa);
    const text = `${assunto}\n\n${corpo}`;
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({ title: assunto, text });
        return;
      } catch {
        /* usuário cancelou */
      }
    }
    const ok = await copiarTexto(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-primary" />
            Exportar e Compartilhar
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Relatórios e mensagens prontas a partir do escopo filtrado ·{" "}
            {acoes.length} {acoes.length === 1 ? "ação" : "ações"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            <ExportButton
              icon={FileText}
              label="PDF Executivo"
              hint="Resumo + prioridades"
              onClick={onPDFExec}
            />
            <ExportButton
              icon={FileDown}
              label="PDF Detalhado"
              hint="Inclui tabela completa"
              onClick={onPDFDet}
            />
            <ExportButton
              icon={FileSpreadsheet}
              label="CSV"
              hint="Para Excel / Sheets"
              onClick={onCSV}
            />
            <ExportButton
              icon={Mail}
              label="E-mail"
              hint="Texto pronto"
              onClick={onEmail}
            />
            <ExportButton
              icon={MessageCircle}
              label="WhatsApp"
              hint="Mensagem curta"
              onClick={onWhats}
              tone="success"
            />
            <ExportButton
              icon={copied ? Check : Share2}
              label={copied ? "Copiado!" : "Compartilhar"}
              hint={copied ? "Pronto para colar" : "Resumo no clipboard"}
              onClick={onShare}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={dialog === "email"}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Resumo para E-mail
            </DialogTitle>
            <DialogDescription>
              Edite se quiser, depois envie ou copie o texto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Assunto
              </label>
              <Input
                value={emailContent.assunto}
                onChange={(e) =>
                  setEmailContent((c) => ({ ...c, assunto: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Corpo
              </label>
              <Textarea
                value={emailContent.corpo}
                onChange={(e) =>
                  setEmailContent((c) => ({ ...c, corpo: e.target.value }))
                }
                rows={14}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const ok = await copiarTexto(
                    `${emailContent.assunto}\n\n${emailContent.corpo}`,
                  );
                  if (ok) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? (
                  <Check className="mr-1.5 h-4 w-4" />
                ) : (
                  <Copy className="mr-1.5 h-4 w-4" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  abrirEmail(emailContent.assunto, emailContent.corpo)
                }
              >
                <Mail className="mr-1.5 h-4 w-4" />
                Abrir no e-mail
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "whatsapp"}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-success" />
              Mensagem para WhatsApp
            </DialogTitle>
            <DialogDescription>
              Texto curto e direto para envio rápido.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={whatsContent}
            onChange={(e) => setWhatsContent(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const ok = await copiarTexto(whatsContent);
                if (ok) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
            >
              {copied ? (
                <Check className="mr-1.5 h-4 w-4" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" />
              )}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button
              size="sm"
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={() => abrirWhatsapp(whatsContent)}
            >
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Abrir no WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExportButton({
  icon: Icon,
  label,
  hint,
  onClick,
  tone = "default",
}: {
  icon: typeof FileText;
  label: string;
  hint: string;
  onClick: () => void;
  tone?: "default" | "success";
}) {
  const toneClasses =
    tone === "success"
      ? "hover:border-success/40 hover:bg-success/5 text-success"
      : "hover:border-primary/40 hover:bg-primary/5 text-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-start gap-1 rounded-lg border border-border/60 bg-card p-3 text-left transition-all hover:shadow-sm ${toneClasses}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-[10px] leading-tight text-muted-foreground">
        {hint}
      </span>
      <Download className="mt-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
    </button>
  );
}
