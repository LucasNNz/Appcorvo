# CORVO ROTEIRO MVP V0.4.4 — Embedded Private Config

Esta versão elimina a dependência de Environment Variables da Vercel para MCP e R2.

## Configuração rápida

No Windows, extraia o ZIP e execute:

`CONFIGURAR_CORVO.bat`

Informe localmente:

1. chave MCP
2. R2 Access Key ID
3. R2 Secret Access Key

O script grava os três valores em `lib/corvo-private-config.ts`.

Depois faça o deploy da pasta configurada.

## Configuração fixa do R2

- Endpoint: `https://34da8bbc6302e3c68edf3a36f1569668.r2.cloudflarestorage.com`
- Bucket: `corvoquiz-prod`
- Region: `auto`
- Estado: `corvo-core/state-v1.json`
- MCP: `/api/mcp`

## Segurança

`lib/corvo-private-config.ts` passa a conter credenciais reais depois da configuração.
Não envie essa versão configurada para um repositório GitHub público. Use um repositório privado ou deploy direto para a Vercel.

A chave continua sendo digitada uma única vez no botão MCP do navegador e fica salva localmente para ligar/desligar sem apagar.


## V0.4.4
- Corrige gravação de credenciais com quebra de linha.
- Secret R2 é dividido em partes no TypeScript e remontado no servidor.
- Configurador remove CR/LF e espaços acidentais de Access/Secret.
- Prebuild bloqueia placeholders e configuração insegura.
