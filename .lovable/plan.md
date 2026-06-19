# Reestruturação Completa do Dashboard NR17

## 1. Fonte de dados — nova planilha

- **Nova planilha oficial:** `1nVmnfBSdHPntiYcIcdp91BMoEWoB3-cK`
- **Aba primária:** `BD QESHs com atributos` (ações)
- **Aba de referência:** `HIRAC` (classificação de risco + CAPEX %)
- Substituir o ID atual `1m33bPAD9Hiyk3Fq9r9rtM7m_Sz421MghvUD13gVF9Qg` em `src/server/sheets.ts`. Como o ID está hardcoded como constante e o usuário pediu variável de ambiente, vamos mover para `process.env.GOOGLE_SHEET_ID` (com fallback para o novo ID). Adicionar secret `GOOGLE_SHEET_ID` via `add_secret`.

> **Validação prévia necessária:** preciso ler a nova planilha (via gateway Google Sheets) para confirmar a linha do cabeçalho, o range exato e o conteúdo da aba HIRAC. Faço isso logo no início da implementação, antes de alterar o mapeamento.

## 2. Mapeamento de colunas (`src/server/sheets.ts`)

Reescrever `AcaoNR17` e `fetchAcoesNR17` para ler apenas as colunas pedidas:

| Coluna | Campo |
|---|---|
| B | `numeroAcao` (fixo, nunca alterado pelo sistema) |
| H | `setor` |
| I | `secao` |
| M | `title` (Assunto) |
| N | `description` |
| O | `classificacaoRisco` ("Alto" / "Médio" / "Baixo") |
| P | `responsible` |
| Q | `investimento` |
| R | `dueDate` (converter para ISO) |
| T | `status` |
| U | `severity` |
| AN | `area` |

- Demais colunas: ignoradas na leitura (mas preservadas em escrita para não destruir dados existentes).
- Filtro: descartar linhas com `title` vazio/whitespace (regra já existente, mantida).
- Mantém `rowIndex` e `internalId` (coluna AS) para CRUD.
- Atualizar `buildRow()` para escrever nas novas posições corretas (H, I, M, N, O, P, Q, R, T, U, AN) sem corromper as colunas ignoradas (lê a linha antes de gravar, ou usa `values:batchUpdate` apenas nas células alteradas).

**Compatibilidade:** o restante do código (KPIs, charts, tabela, admin) hoje usa `assunto`, `areaResponsavel`, `responsavel`, `status`, `severidade`, `dataPrevista`, `descricao`. Em vez de renomear em toda a base — alto risco — vou:
- Manter os nomes atuais do tipo `AcaoNR17` (`assunto`, `areaResponsavel`, etc.) como aliases internos
- Adicionar os novos campos pedidos (`setor`, `secao`, `classificacaoRisco`, `investimento`, `numeroAcao`) como campos extras
- Documentar o mapeamento canônico no topo do arquivo

Isso satisfaz o requisito sem reescrever 15+ arquivos.

## 3. Aba HIRAC (CAPEX %)

Criar `src/server/hirac.ts` com server function `fetchHiracCapex` que:
- Lê a aba `HIRAC` uma vez e devolve `{ Alto: number, Médio: number, Baixo: number }` (em decimal, ex: 0.7143).
- Cache em memória por 5 min para evitar duplicar chamadas.

## 4. Cards de status (visão geral)

Substituir `src/components/dashboard/StatusCards.tsx` por 6 cards exatos:

1. **Total de Ações** — 100%, sem CAPEX
2. **Concluídas** — status = "Realizado"
3. **Em Análise** — "Em Análise pela Área Responsável"
4. **Em Andamento** — "Em Andamento"
5. **Não Iniciado** — "Não Iniciado"
6. **Inviável** — "Avaliado como inviável"

Cada card exibe: número absoluto, `XX%` do total, e linha `CAPEX: YY%` calculada conforme §6.

Cores via tokens semânticos:
- Realizado → `success`
- Em Análise → `info`
- Em Andamento → `warning`
- Não Iniciado → `muted`
- Inviável → `destructive`

Atualizar `StatusBadge.tsx` e o mapa `STATUS_COLORS` em `Charts.tsx` com os mesmos rótulos canônicos.

## 5. Lógica de status (`src/lib/nr17/status.ts`)

Refatorar `statusGroup()` para devolver os 5 grupos exatos da planilha (e não mais os agregados antigos):
`"Realizado" | "Em Análise" | "Em Andamento" | "Não Iniciado" | "Inviável" | "Outro"`.

Atualizar todos os consumidores (`kpis.ts`, `Charts.tsx`, `AcoesTable.tsx`, `PriorityList.tsx`, `EvolutionBlock.tsx`, `AreaAnalysis.tsx`, `PresentationMode.tsx`, `criticality.ts`, `narrative.ts`, `health.ts`, `dates.ts`, `export.ts`, `admin/acoes.tsx`) para usar os novos grupos via helpers (`isConcluida`, `isAtiva`, `isEncerrada`). Sem comparações por string fora de `status.ts`.

`computeKpis` recalculado: `total`, `concluidas` (Realizado), `emAnalise`, `emAndamento`, `naoIniciado`, `inviavel`, `atrasadas`, `vencem7`, `percConcluidas`.

## 6. CAPEX por card

Em `src/lib/nr17/capex.ts` (novo):
- `capexAcao(acao, hiracMap)` → percentual de CAPEX da ação individual conforme regra:
  - `Realizado` → 100% × `hiracMap[risco]`
  - `Em Andamento` → 50% × `hiracMap[risco]` (fator de progresso fixo, conforme exemplo do brief)
  - demais → 0
- `capexAgregadoPorStatus(acoes, hiracMap)` → percentual médio exibido em cada card.

`StatusCards` recebe `hiracMap` via loader/server-function e renderiza a linha CAPEX.

## 7. Tabela de administração (`/admin/acoes`)

Em `src/routes/admin/acoes.tsx` + `src/components/admin/AcaoForm.tsx`:
- Cabeçalhos exatos: `N das Ações` / `Título` / `Área` / `Setor` / `Seção` / `Responsável` / `Status` / `Severidade` / `Data` / `Ações`.
- `N das Ações` = `numeroAcao` (somente leitura).
- Nova ação → próximo `max(numeroAcao) + 1`, gravada como última linha da planilha (lógica `getNextRowAndNumero` já existe — adaptar).
- Form ganha campos `Setor`, `Seção`, `Classificação de Risco` (Alto/Médio/Baixo).
- Filtros: adicionar selects de **Setor** e **Seção** ao lado dos já existentes (busca, status, área).
- Status no select usa os 5 valores oficiais.

## 8. Supabase

Verificação: o projeto tem Lovable Cloud ativo mas **sem tabelas** (schema vazio no `<supabase-configuration>`). Hoje os dados vêm 100% da Google Sheets — não há CRUD em Supabase.

Conforme item 3 do brief: "A leitura inicial será feita da Google Sheets. Operações de CRUD devem gravar no Supabase e sincronizar de volta com a Google Sheets."

**Proposta:** criar migration com tabela `public.acoes` espelhando os campos mapeados (numero_acao, title, area, setor, secao, responsible, status, severity, due_date, description, classificacao_risco, investimento, internal_id, row_index, created_at, updated_at), com RLS pública para leitura autenticada e escrita autenticada (já há `DASHBOARD_PASSWORD` mas não há `auth.users`; **preciso confirmar** se a tabela deve ser pública (sem RLS de usuário) ou se vamos adicionar auth Supabase de verdade).

> **Pergunta de bloqueio:** o app hoje protege admin com `DASHBOARD_PASSWORD` simples, sem Supabase Auth. Para o Supabase fazer sentido como camada de gravação, ou (a) abrimos a tabela com RLS permissiva e o servidor (`supabaseAdmin`) faz tudo, ou (b) introduzimos Supabase Auth real. Vou assumir **(a)** e usar `supabaseAdmin` dentro das server functions de CRUD (write-through: Supabase + Sheets). Se preferir auth completa, me avise antes da aprovação.

## 9. Sincronização / cache

- Remover qualquer `staleTime` longo ou cache que segure dados.
- Após CRUD/upload Excel, invalidar a query `["acoes"]` (já invalidamos em `admin/acoes.tsx` — verificar e estender).
- Forçar refetch da aba HIRAC junto.

## 10. Limpeza geral

- Remover imports/funções não usadas após refator.
- Remover quaisquer logs `console.log` de auditoria.
- Padronizar textos em PT-BR.

## Arquivos a criar/modificar

**Criar:**
- `src/server/hirac.ts` — fetch da aba HIRAC com cache.
- `src/lib/nr17/capex.ts` — cálculo de CAPEX por ação/status.
- Migration Supabase `create_acoes_table` (se aprovado item §8).

**Modificar:**
- `src/server/sheets.ts` — novo ID via env, novo mapeamento de colunas (B/H/I/M/N/O/P/Q/R/T/U/AN), `buildRow` preservando colunas ignoradas, novos campos no tipo.
- `src/lib/nr17/status.ts` — 5 grupos canônicos + helpers.
- `src/lib/nr17/kpis.ts` — novos KPIs (emAnalise, naoIniciado, inviavel separados).
- `src/lib/nr17/dates.ts`, `criticality.ts`, `narrative.ts`, `health.ts` — usar novos helpers.
- `src/components/dashboard/StatusCards.tsx` — 6 cards com CAPEX.
- `src/components/dashboard/StatusBadge.tsx` — 5 cores conforme brief.
- `src/components/dashboard/Charts.tsx` — paleta atualizada, usa helpers.
- `src/components/dashboard/AcoesTable.tsx`, `PriorityList.tsx`, `AreaAnalysis.tsx`, `EvolutionBlock.tsx`, `PresentationMode.tsx`, `ExecutiveSummary.tsx` — adaptar aos novos grupos/campos.
- `src/routes/index.tsx` — passar `hiracMap` para `StatusCards`; refetch HIRAC.
- `src/routes/admin/acoes.tsx` — colunas exatas, filtros Setor/Seção, novos campos do form.
- `src/components/admin/AcaoForm.tsx` — campos Setor, Seção, Classificação de Risco; status com 5 valores.
- `src/components/admin/ExcelUpload.tsx` + `src/lib/nr17/excel-import.ts` — mapeamento de colunas atualizado.
- `src/lib/export.ts` — colunas exportadas atualizadas.
- `.lovable/plan.md` — registrar nova arquitetura.

**Secrets a adicionar:**
- `GOOGLE_SHEET_ID` = `1nVmnfBSdHPntiYcIcdp91BMoEWoB3-cK`

## Pontos que precisam da sua decisão antes de eu começar

1. **Supabase como camada de escrita** — confirmo abordagem (a) (tabela aberta + `supabaseAdmin` server-side, sem auth Supabase real)? Ou prefere que eu implemente Supabase Auth completo agora?
2. **Fator de progresso "Em Andamento"** — uso 50% fixo (como sugere o exemplo do brief), ou existe outra regra na aba HIRAC que devo extrair?
3. **Compatibilidade do tipo `AcaoNR17`** — confirmo manter aliases internos (`assunto` = `title`, `areaResponsavel` = `area`, etc.) para evitar refactor massivo, ou prefere renomear tudo de uma vez?

Aguardo aprovação (e respostas às 3 perguntas) antes de implementar.
