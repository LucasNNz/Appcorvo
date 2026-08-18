# CORVO ROTEIRO MVP V0.4.1 — R2 FIXED CONFIG

MVP pessoal do novo Corvo: Next.js na Vercel, MCP direto e persistência privada no Cloudflare R2 pela interface S3.

## Configuração fixa no código

Estes valores já estão embutidos e não precisam existir como variáveis na Vercel:

```text
R2 endpoint: https://34da8bbc6302e3c68edf3a36f1569668.r2.cloudflarestorage.com
R2 bucket: corvoquiz-prod
R2 region: auto
Estado: corvo-core/state-v1.json
MCP route: /api/mcp
```

## ÚNICAS 3 variáveis da Vercel

Configure exatamente estes nomes:

```text
App_key_corvoapp=SUA_CHAVE_MCP
R2_ACCESS_KEY_ID=ACCESS_KEY_ID_DO_TOKEN_R2
R2_SECRET_ACCESS_KEY=SECRET_ACCESS_KEY_DO_TOKEN_R2
```

Não há aliases, fallback, auto-detecção ou variáveis alternativas nesta versão.

Depois de adicionar ou alterar qualquer uma delas, faça um novo Redeploy na Vercel.

## MCP

Endpoint:

```text
https://SEU-DOMINIO/api/mcp
```

Autenticação aceita:

```text
Authorization: Bearer SUA_CHAVE_MCP
```

ou, para conexão por URL quando necessário:

```text
https://SEU-DOMINIO/api/mcp?key=SUA_CHAVE_MCP
```

A interface salva a chave MCP uma vez no navegador. Desligar a conexão preserva essa chave; ligar novamente apenas reutiliza o valor salvo.

## R2

`R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` precisam pertencer ao mesmo token S3/R2 e o token precisa de Object Read & Write no bucket `corvoquiz-prod`.

Projetos, cenas, jobs e snapshots são persistidos em:

```text
corvo-core/state-v1.json
```

O R2 também poderá receber imagens e arquivos do Flow Agent nas próximas etapas.
