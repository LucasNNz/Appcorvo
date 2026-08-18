import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const version = 'CORVO ROTEIRO MVP V0.3.2 — VERCEL CLEAN';
console.log(`\n=== ${version} ===`);

const route = path.join(root, 'app', 'api', 'mcp', 'route.ts');
if (!fs.existsSync(route)) throw new Error('MCP route ausente: app/api/mcp/route.ts');
const text = fs.readFileSync(route, 'utf8');
if (/export\s*\{[^}]*\bdynamic\b[^}]*\}\s*from/.test(text)) {
  throw new Error('Build bloqueado: dynamic não pode ser reexportado em app/api/mcp/route.ts');
}
if (!/export\s+const\s+dynamic\s*=/.test(text)) {
  throw new Error('Build bloqueado: app/api/mcp/route.ts deve declarar export const dynamic diretamente');
}

const forbiddenConfigs = ['postcss.config.js','postcss.config.cjs','postcss.config.mjs','postcss.config.ts'];
for (const name of forbiddenConfigs) {
  if (fs.existsSync(path.join(root, name))) throw new Error(`Build bloqueado: ${name} não deve existir neste projeto CSS puro`);
}

const pkg = fs.readFileSync(path.join(root, 'package.json'),'utf8');
if (pkg.includes('@tailwindcss/postcss') || pkg.includes('tailwindcss')) {
  throw new Error('Build bloqueado: dependência Tailwind inesperada em package.json');
}

console.log('Preflight OK: MCP route direta, sem PostCSS customizado e sem Tailwind.');
