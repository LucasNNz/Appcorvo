import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = readFileSync(new URL("../lib/corvo-store.ts", import.meta.url), "utf8");
const auth = readFileSync(new URL("../app/api/auth-check/route.ts", import.meta.url), "utf8");
const cfg = readFileSync(new URL("../lib/corvo-private-config.ts", import.meta.url), "utf8");

assert.match(store, /CORVO_PRIVATE_CONFIG\.r2AccessKeyId/);
assert.match(store, /CORVO_PRIVATE_CONFIG\.r2SecretAccessKey/);
assert.match(store, /CORVO_PRIVATE_CONFIG\.mcpKey/);
assert.doesNotMatch(store, /process\.env\.R2_ACCESS_KEY_ID/);
assert.doesNotMatch(store, /process\.env\.R2_SECRET_ACCESS_KEY/);
assert.doesNotMatch(store, /process\.env\.App_key_corvoapp/);
assert.match(auth, /CORVO_PRIVATE_CONFIG\.mcpKey/);
assert.match(cfg, /COLE_AQUI_SUA_CHAVE_MCP/);
console.log("Embedded config wiring OK");
