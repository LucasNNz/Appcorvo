# CORVO ROTEIRO MVP V0.3.8 — VERCEL ONLY

MVP pessoal do novo Corvo: Next.js na Vercel, MCP direto e armazenamento persistente no Vercel Blob privado.

## O que saiu

- Cloudflare D1
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_D1_DATABASE_ID
- CLOUDFLARE_D1_API_TOKEN

## Variável manual

Na Vercel configure apenas a chave do MCP:

```text
App_key_corvoapp=SUA_CHAVE
```

`MCP_OWNER_EMAIL` é opcional.

## Persistência

No projeto da Vercel, abra **Storage → Create Database → Blob → Private** e conecte o Blob ao projeto.
Projetos novos conectados ao Vercel Blob usam OIDC por padrão, então as Functions podem autenticar no Blob sem uma chave Cloudflare nem outra integração externa.

Depois faça um novo deploy.

## MCP

Endpoint:

```text
https://SEU-DOMINIO/api/mcp
```

Autenticação:

```text
Authorization: Bearer SUA_CHAVE
```

A mesma chave pode ser salva uma vez na interface e depois apenas ligada/desligada.

## Estado

O Core mantém projetos, cenas, jobs e snapshots no arquivo privado:

```text
corvo-core/state-v1.json
```

O ChatGPT continua com as 23 ferramentas MCP de leitura, edição, jobs, histórico e rollback.
