import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";

async function collectValues() {
  if (!input.isTTY) {
    const [mcpKey = "", access = "", secret = ""] = readFileSync(0, "utf8").split(/\r?\n/);
    return { mcpKey: mcpKey.trim(), access: access.trim(), secret: secret.trim() };
  }

  const rl = createInterface({ input, output });
  try {
    console.log("\nCORVO — CONFIGURAÇÃO LOCAL DE CREDENCIAIS\n");
    console.log("Os valores serão gravados somente em lib/corvo-private-config.ts deste computador.\n");
    const mcpKey = (await rl.question("Chave MCP: ")).trim();
    const access = (await rl.question("R2 Access Key ID: ")).trim();
    const secret = (await rl.question("R2 Secret Access Key: ")).trim();
    return { mcpKey, access, secret };
  } finally {
    rl.close();
  }
}

const { mcpKey, access, secret } = await collectValues();
if (!mcpKey || !access || !secret) {
  console.error("ERRO: todos os 3 valores são obrigatórios.");
  process.exit(1);
}
const esc = (v) => JSON.stringify(v);
const source = `/**\n * CORVO PRIVATE CONFIG — gerado localmente.\n * NÃO publique este arquivo em repositório público.\n */\nexport const CORVO_PRIVATE_CONFIG = {\n  mcpKey: ${esc(mcpKey)},\n  r2AccessKeyId: ${esc(access)},\n  r2SecretAccessKey: ${esc(secret)},\n} as const;\n`;
await writeFile(new URL("../lib/corvo-private-config.ts", import.meta.url), source, "utf8");
console.log("\nOK: credenciais gravadas em lib/corvo-private-config.ts");
console.log("Agora faça o deploy desta pasta.\n");
