import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("MVP contém Core, MCP e fila",()=>{
  const page=fs.readFileSync("app/page.tsx","utf8");
  const mcp=fs.readFileSync("app/api/mcp/route.ts","utf8");
  assert.match(page,/CORVO/);
  assert.match(page,/INICIAR/);
  assert.match(mcp,/obter_contexto_corvo/);
  assert.match(mcp,/criar_jobs/);
});
