# CORVO ROTEIRO MVP V0.3.3 — Vercel Clean

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


## Vercel self-clean (V0.3.3)
Se esta versão for copiada por cima de uma pasta antiga, o prebuild remove automaticamente `postcss.config.*` residual e pastas antigas do Sites antes do `next build`. Isso evita que uma configuração Tailwind antiga contamine o deploy atual.

## V0.3.4 — Vercel Hard-Clean

Esta versão trata explicitamente o cenário em que os arquivos novos são copiados sobre um repositório antigo. Antes do `next build`, remove resíduos legados do scaffold OpenAI Sites/vinext/Vite/Worker/Drizzle (`build/`, `worker/`, `db/`, `app/mcp/`, `vite.config.ts`, `drizzle.config.ts`, PostCSS antigo e scripts Sites). O `tsconfig.json` também limita a compilação aos diretórios atuais `app/` e `lib/`.

## V0.3.5 — Vercel Pruned

Build defensivo para repositórios que receberam versões novas por sobreposição. Antes de compilar, remove fontes antigas do OpenAI Sites/vinext e também as rotas/libs do Roteiro V0.7.x que poderiam continuar versionadas. O `tsconfig` lista explicitamente apenas os arquivos do MVP atual.
