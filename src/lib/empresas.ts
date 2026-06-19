/**
 * Cadastro de empresas atendidas.
 *
 * Hoje a aplicação opera com uma única empresa (Viviane / NR17), mas a
 * arquitetura é desenhada para suportar múltiplos contratos sem reescrita.
 * Cada empresa carrega seus próprios metadados (planilha, escopo, marca) e
 * pode ser ativada via seletor sem alterar o restante do app.
 */

export interface EmpresaConfig {
  id: string;
  nome: string;
  contrato: string;
  escopo: string;
  consultora: string;
  ativo: boolean;
}

export const EMPRESAS: EmpresaConfig[] = [
  {
    id: "viviane-nr17",
    nome: "SUMITOMO",
    contrato: "GESTÃO DE AÇÕES ERGONÔMICAS",
    escopo: "NR 17",
    consultora: "Viviane",
    ativo: true,
  },
];

export function getEmpresaAtiva(id?: string): EmpresaConfig {
  if (id) {
    const found = EMPRESAS.find((e) => e.id === id);
    if (found) return found;
  }
  return EMPRESAS.find((e) => e.ativo) ?? EMPRESAS[0];
}
