# CORVO ROTEIRO MVP V0.4.0 — R2 AUTO-DETECT

MVP pessoal do novo Corvo: Next.js na Vercel, MCP direto e persistência no Cloudflare R2 pela API S3 compatível.

## MCP

Configure na Vercel:

```text
App_key_corvoapp=SUA_CHAVE_MCP
```

`MCP_OWNER_EMAIL` continua opcional.

## Cloudflare R2

Este pacote já usa como padrão o seu armazenamento:

```text
S3 URL: https://34da8bbc6302e3c68edf3a36f1569668.r2.cloudflarestorage.com/corvoquiz-prod
Endpoint: https://34da8bbc6302e3c68edf3a36f1569668.r2.cloudflarestorage.com
Bucket: corvoquiz-prod
```

Na Vercel você precisa adicionar as credenciais S3 do token R2:

```text
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

O token deve ter **Object Read & Write** no bucket `corvoquiz-prod`.

Os valores abaixo são opcionais porque já existem como padrão no código, mas podem ser usados para substituir o destino sem alterar o app:

```text
R2_S3_URL=https://34da8bbc6302e3c68edf3a36f1569668.r2.cloudflarestorage.com/corvoquiz-prod
R2_ENDPOINT=https://34da8bbc6302e3c68edf3a36f1569668.r2.cloudflarestorage.com
R2_BUCKET_NAME=corvoquiz-prod
```

`R2_S3_URL` pode conter `/corvoquiz-prod` no final: o Core separa automaticamente o endpoint S3 do nome do bucket.

## Estado

Projetos, cenas, jobs e snapshots ficam no objeto privado:

```text
corvo-core/state-v1.json
```

O R2 também será o destino natural para as imagens/arquivos quando conectarmos o Flow Agent.

## Endpoint MCP

```text
https://SEU-DOMINIO/api/mcp
```

Autenticação:

```text
Authorization: Bearer SUA_CHAVE_MCP
```

A interface continua salvando a chave MCP uma única vez no navegador e permite apenas ligar/desligar depois.


## Auto-detecção de credenciais R2/S3

O Core procura automaticamente, nesta ordem:

- Access Key: `R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_ID`, `R2_ACCESS_KEY` e nomes equivalentes detectáveis.
- Secret: `R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `AWS_SECRET_ACCESS_KEY`, `R2_SECRET_KEY` e equivalentes.
- Endpoint e bucket também aceitam aliases R2/S3/AWS.

O diagnóstico informa apenas **o nome da variável encontrada**, nunca o valor secreto.

Importante: variáveis adicionadas/alteradas na Vercel só ficam disponíveis para um novo deployment. Depois de salvá-las, faça **Redeploy**.
