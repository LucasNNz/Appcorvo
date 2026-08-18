# Corvo Roteiro — MVP V0.1

Reescrita enxuta do Roteiro usando a arquitetura que funcionou no Valorização: um Core persistente, MCP direto e uma fila simples para execução externa.

## Objetivo do MVP

O MVP cobre o fluxo principal sem Bridge e sem vários GPTs físicos:

1. criar e manter projetos;
2. salvar ideia e roteiro;
3. estruturar cenas;
4. manter prompts individuais por cena;
5. criar jobs de geração;
6. receber status/resultado dos jobs;
7. exibir galeria de imagens;
8. controlar tudo também pelo ChatGPT via MCP.

## Arquitetura

```text
ChatGPT ──MCP──► Corvo Core ◄──► Interface Web
                    │
                    ├── D1: projetos, cenas e jobs
                    │
                    └── fila PENDING ◄──► Corvo Agent / Flow (próxima integração)
```

O navegador não é fonte de verdade. `localStorage` guarda somente a chave pessoal opcional. Projeto, roteiro, cenas, prompts e jobs ficam no D1.

## MCP

Endpoint principal:

- `/mcp`
- alias: `/api/mcp`

Ferramentas V0.1:

- `obter_contexto_corvo`
- `listar_projetos`
- `criar_projeto`
- `obter_projeto`
- `atualizar_projeto`
- `salvar_artefato`
- `substituir_cenas`
- `atualizar_cena`
- `iniciar_projeto`
- `pausar_projeto`
- `criar_jobs`
- `listar_jobs`
- `atualizar_job`
- `excluir_projeto`

O botão **INICIAR** não chama OpenAI API. Ele grava `readyForAi=true` e `status=READY`. Quando o ChatGPT consulta `obter_contexto_corvo`, o projeto aparece como liberado.

## Contrato do Agent

O Flow Agent não precisa conhecer a UI ou o ChatGPT. Na próxima etapa ele só precisa:

1. buscar jobs `PENDING`;
2. marcar `RUNNING`;
3. executar o Flow;
4. atualizar o job para `DONE` com `outputUrl` e `outputFile`, ou `FAILED` com `error`.

Quando um job `DONE` possui `sceneId` + `outputUrl`, o Core liga o resultado automaticamente à cena.

## Cloudflare / OpenAI Sites

O projeto reutiliza a base técnica do Valorização (`vinext`, D1, Worker e MCP Streamable HTTP).

Variáveis esperadas:

- `DB` — binding D1
- `MCP_ACCESS_TOKEN` — chave pessoal
- `MCP_OWNER_EMAIL` — email autorizado do ChatGPT (opcional)

## Fora do MVP V0.1

Propositalmente deixados de fora para evitar trazer a complexidade antiga cedo demais:

- Bridge;
- Redis;
- múltiplos GPTs físicos;
- Collector/Analista/refinador separados;
- R2 e upload binário;
- automação local do Flow embutida no app;
- regras avançadas de retry/checkpoint do Roteiro V0.7.2.

Esses comportamentos só entram quando forem necessários e, preferencialmente, isolados no `Corvo Agent`.
