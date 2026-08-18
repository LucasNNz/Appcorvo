# CORVO ROTEIRO MVP V0.3.6 — MCP Key Toggle

MVP Next.js nativo para Vercel, com Core persistente em D1 e controle direto pelo ChatGPT via MCP.

## Variáveis de ambiente na Vercel

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN`
- `App_key_corvoapp` — chave pessoal usada para autenticar o MCP e as chamadas do app ao Core
- `MCP_OWNER_EMAIL` — opcional; permite autenticação pelo cabeçalho de usuário do ChatGPT quando disponível

`App_key_corvoapp` é lida somente no backend. Ela nunca é enviada automaticamente ao navegador.

## Chave salva no app

Na primeira vez, clique em **MCP DESLIGADO** e cole a mesma chave configurada em `App_key_corvoapp`. O navegador salva a chave em `localStorage`. Depois disso:

- clique em **MCP LIGADO** para desligar;
- clique em **MCP DESLIGADO** para ligar novamente;
- desligar não apaga a chave;
- use **ALTERAR CHAVE SALVA** somente se precisar trocar/remover a chave.

A chave salva é local ao navegador/dispositivo.

## Endpoint MCP

`/api/mcp`

O servidor aceita `Authorization: Bearer <App_key_corvoapp>`. Por compatibilidade de migração, `MCP_ACCESS_TOKEN` ainda é aceito como fallback se a nova variável não estiver configurada.

## Controle MCP

Mantidas as 23 ferramentas do Core: projetos, artefatos, cenas, jobs, retry/cancelamento, snapshots, histórico e rollback.

## Build Vercel

O prebuild continua removendo resíduos legados do Roteiro/OpenAI Sites antes de executar `next build`.
