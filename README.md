# CORVO ROTEIRO MVP V0.3.7 — MCP Diagnostic

MVP Next.js nativo para Vercel, com Core persistente em D1 e controle direto pelo ChatGPT via MCP.

## Variáveis de ambiente na Vercel

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN`
- `App_key_corvoapp` — única chave pessoal usada para autenticar o MCP e as chamadas do app ao Core
- `MCP_OWNER_EMAIL` — opcional; permite autenticação pelo cabeçalho de usuário do ChatGPT quando disponível

`App_key_corvoapp` é lida somente no backend. Depois de criar ou alterar essa variável na Vercel, faça um NOVO DEPLOY: deployments antigos não recebem variáveis adicionadas posteriormente.

## Chave salva no app

Na primeira vez, clique em **MCP DESLIGADO** e cole a mesma chave configurada em `App_key_corvoapp`.

O app agora valida em três etapas:
1. `App_key_corvoapp` existe no deployment atual;
2. a chave salva no navegador é exatamente a mesma;
3. o D1 está acessível e o schema pode ser validado.

O app informa separadamente:
- `App_key_corvoapp` ainda não carregada no deployment;
- chave incorreta;
- banco/D1 não pronto.

A chave continua salva em `localStorage`; desligar não apaga a chave.

## Diagnóstico

Endpoint interno do app:

`GET /api/auth-check`

Ele nunca devolve o valor de `App_key_corvoapp`; apenas informa se a variável está configurada, se a chave recebida confere e se o banco está acessível.

## Endpoint MCP

`/api/mcp`

O servidor aceita:
- `Authorization: Bearer <App_key_corvoapp>`
- ou `?key=<App_key_corvoapp>` para clientes que usem a chave na URL.

## Controle MCP

Mantidas as 23 ferramentas do Core: projetos, artefatos, cenas, jobs, retry/cancelamento, snapshots, histórico e rollback.

## Build Vercel

O prebuild continua removendo resíduos legados do Roteiro/OpenAI Sites antes de executar `next build`.
