# CORVO ROTEIRO MVP V0.3.2 — Vercel Clean

# CORVO ROTEIRO MVP V0.3.1 — Vercel Build Fix

Correção do build nativo da Vercel/Next.js.

## Correções desta versão

- O MCP oficial agora existe somente em `app/api/mcp/route.ts`.
- `dynamic = "force-dynamic"` é declarado diretamente no mesmo Route Handler, sem reexportação.
- Removido `app/mcp/route.ts` duplicado.
- Removida a configuração PostCSS/Tailwind antiga; esta versão usa CSS puro.
- Como a interface usa CSS puro, o Next.js usa o processamento CSS padrão sem Tailwind/PostCSS customizado.
- Mantido Next.js nativo na Vercel (`next build` → `.next`).
- Mantidas as 23 ferramentas MCP e histórico/rollback.

## Variáveis de ambiente na Vercel

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN`
- `MCP_ACCESS_TOKEN`
- `MCP_OWNER_EMAIL` (opcional)

## Endpoint MCP

`/api/mcp`

### Limpeza adicional para Vercel

- `vercel.json` removido: a Vercel detecta Next.js e aplica o preset nativo.
- `.npmrc` específico do antigo Sites removido.
- `package-lock.json` podado para conter apenas dependências alcançáveis pelo Next/React/TypeScript atuais.
