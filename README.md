# CORVO ROTEIRO MVP V0.3 — Vercel Native

Esta versão corrige a incompatibilidade entre o build `vinext`/Sites e o preset Next.js da Vercel.

## Arquitetura

- Next.js nativo na Vercel (`next build` → `.next`)
- Cloudflare D1 continua como única fonte de verdade
- Backend Next acessa D1 pela API HTTP oficial da Cloudflare
- MCP direto, sem OpenAI API e sem Bridge
- 23 ferramentas MCP com histórico, snapshots, rollback, retry/cancel/delete de jobs e controle de cenas/projetos

## Variáveis de ambiente na Vercel

Configure em Project Settings → Environment Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN` (D1 Read + D1 Write)
- `MCP_ACCESS_TOKEN`
- `MCP_OWNER_EMAIL` (opcional)

## Deploy

A Vercel pode manter o Framework Preset como **Next.js**.
O comando é `npm run build` e a saída é `.next`.

Não use mais os scripts `vinext`, `sites-env.sh`, Wrangler ou o antigo artifact `dist/server/index.js` nesta versão.
