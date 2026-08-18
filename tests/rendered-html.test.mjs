import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("MVP contém Core, MCP e fila",()=>{
  const page=fs.readFileSync("app/page.tsx","utf8");
  const mcp=fs.readFileSync("app/api/mcp/route.ts","utf8");
  const store=fs.readFileSync("lib/corvo-store.ts","utf8");
  assert.match(page,/CORVO/);
  assert.match(page,/INICIAR/);
  assert.match(mcp,/obter_contexto_corvo/);
  assert.match(mcp,/criar_jobs/);
  assert.match(store,/function\s+emptyState\s*\(/);
  assert.match(store,/process\.env\.R2_ACCESS_KEY_ID/);
  assert.match(store,/process\.env\.R2_SECRET_ACCESS_KEY/);
  assert.match(store,/process\.env\.App_key_corvoapp/);
});
