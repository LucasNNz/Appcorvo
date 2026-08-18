import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";

function singleLine(value) {
  return String(value ?? "")
    .replace(/[\r\n\u2028\u2029]/g, "")
    .trim();
}

function compactCredential(value) {
  return singleLine(value).replace(/\s+/g, "");
}

async function collectValues() {
  if (!input.isTTY) {
    const [mcpKey = "", access = "", secret = ""] = readFileSync(0, "utf8").split(/\r?\n/);
    return {
      mcpKey: singleLine(mcpKey),
      access: compactCredential(access),
      secret: compactCredential(secret),
    };
  }

  const rl = createInterface({ input, output });
  try {
    console.log("\nCORVO — CONFIGURAÇÃO LOCAL DE CREDENCIAIS\n");
    console.log("Os valores serão gravados somente em lib/corvo-private-config.ts deste computador.\n");
    const mcpKey = singleLine(await rl.question("Chave MCP: "));
    const access = compactCredential(await rl.question("R2 Access Key ID: "));
    const secret = compactCredential(await rl.question("R2 Secret Access Key: "));
    return { mcpKey, access, secret };
  } finally {
    rl.close();
  }
}

function chunk(value, size = 16) {
  const out = [];
  for (let i = 0; i < value.length; i += size) out.push(value.slice(i, i + size));
  return out;
}

const { mcpKey, access, secret } = await collectValues();
if (!mcpKey || !access || !secret) {
  console.error("ERRO: todos os 3 valores são obrigatórios.");
  process.exit(1);
}

const secretLines = chunk(secret).map((part) => `  ${JSON.stringify(part)},`).join("\n");
const source = `import "server-only";\n\n/**\n * CORVO PRIVATE CONFIG — gerado localmente.\n * NÃO publique este arquivo com credenciais ativas em repositório público.\n */\nconst R2_SECRET_PARTS = [\n${secretLines}\n] as const;\n\nexport const CORVO_PRIVATE_CONFIG = {\n  mcpKey: ${JSON.stringify(mcpKey)},\n  r2AccessKeyId: ${JSON.stringify(access)},\n  r2SecretAccessKey: R2_SECRET_PARTS.join(""),\n} as const;\n`;

await writeFile(new URL("../lib/corvo-private-config.ts", import.meta.url), source, "utf8");
console.log("\nOK: credenciais gravadas sem quebras de linha em lib/corvo-private-config.ts");
console.log("Agora faça o deploy desta pasta.\n");
