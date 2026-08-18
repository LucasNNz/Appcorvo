# Corvo Roteiro — MVP V0.2

Reescrita enxuta do Roteiro usando a arquitetura do Valorização: um Core persistente, MCP direto, histórico recuperável e uma fila simples para execução externa.

## Objetivo do MVP

O fluxo principal funciona sem Bridge e sem vários GPTs físicos:

1. criar e manter projetos;
2. salvar ideia e roteiro;
3. estruturar cenas;
4. manter prompts individuais por cena;
5. criar jobs de geração/refino;
6. acompanhar, cancelar e refazer jobs;
7. receber resultado dos jobs e exibir a galeria;
8. controlar o projeto pelo ChatGPT via MCP;
9. criar snapshots e voltar a estados anteriores com segurança.

## Arquitetura

```text
ChatGPT ──MCP──► Corvo Core ◄──► Interface Web
                    │
                    ├── D1: projetos, cenas, jobs e snapshots
                    │
                    └── fila PENDING ◄──► Corvo Agent / Flow
```

O navegador não é fonte de verdade. `localStorage` guarda somente a chave pessoal opcional. Projeto, roteiro, cenas, prompts, jobs e histórico ficam no D1.

## MCP — controle do app

Endpoint principal:

- `/mcp`
- alias: `/api/mcp`

A V0.2 expõe 23 ferramentas:

- `obter_contexto_corvo`
- `listar_projetos`
- `criar_projeto`
- `obter_projeto`
- `atualizar_projeto`
- `salvar_artefato`
- `substituir_cenas`
- `atualizar_cena`
- `excluir_cena`
- `iniciar_projeto`
- `pausar_projeto`
- `criar_jobs`
- `listar_jobs`
- `atualizar_job`
- `refazer_job`
- `cancelar_job`
- `excluir_job`
- `criar_snapshot`
- `listar_historico`
- `obter_snapshot`
- `restaurar_snapshot`
- `excluir_snapshot`
- `excluir_projeto`

Alterações semânticas feitas pelo MCP criam snapshots automaticamente. Edições principais feitas pela interface também criam pontos de restauração. O Core mantém até 100 snapshots por projeto.

Exemplos possíveis pelo ChatGPT:

- "Como está o projeto atual?"
- "Refaça o job que falhou."
- "Cancele os jobs ainda pendentes."
- "Volte o projeto para antes da última alteração."
- "Recupere só a cena 12 da versão anterior."

O botão **INICIAR** continua MCP-only: ele grava `readyForAi=true` e `status=READY`. Nenhuma API da OpenAI é chamada pelo app.

## Contrato do Agent

O Flow Agent continua isolado. Ele só precisa:

1. buscar jobs `PENDING`;
2. marcar `RUNNING`;
3. executar o Flow;
4. atualizar o job para `DONE` com `outputUrl`/`outputFile`, ou `FAILED` com `error`.

Quando um job `DONE` possui `sceneId` + `outputUrl`, o Core liga o resultado automaticamente à cena.

## Correção de build / Vercel

A V0.1 chamava `scripts/sites-env.sh` diretamente dentro dos scripts de build. Em ambientes onde o bit de execução do arquivo não é preservado, como ocorreu no deploy informado, isso gerava:

```text
scripts/sites-env.sh: Permission denied
Error: Command "npm run build" exited with 126
```

Na V0.2, `build-verified.sh`, `validate-artifact.sh` e `install-ci.sh` chamam os scripts explicitamente através de `bash`, portanto não dependem da permissão executável do arquivo dentro do ZIP/deploy.

## Bindings / variáveis

- `DB` — binding D1
- `MCP_ACCESS_TOKEN` — chave pessoal
- `MCP_OWNER_EMAIL` — email autorizado do ChatGPT (opcional)

## Filosofia

Continuam propositalmente fora do Core:

- Bridge;
- Redis;
- múltiplos GPTs físicos;
- lógica do Chrome/Flow no frontend;
- estados paralelos em `localStorage`;
- orquestração de IA codificada no app.

A inteligência fica no ChatGPT; o Core guarda estado e oferece ferramentas; o Corvo Agent executa ações locais.
