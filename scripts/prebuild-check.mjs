import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const version = 'CORVO ROTEIRO MVP V0.3.3 — VERCEL SELF-CLEAN';
console.log(`\n=== ${version} ===`);

// 1) Sanitize residues from older Sites/Tailwind packages when a new ZIP is
// copied over an existing repository instead of replacing it entirely.
const stalePostcss = [
  'postcss.config.js',
  'postcss.config.cjs',
  'postcss.config.mjs',
  'postcss.config.ts',
];
for (const name of stalePostcss) {
  const file = path.join(root, name);
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true });
    console.log(`Removed stale build residue: ${name}`);
  }
}

const staleSites = [
  '.sites-runtime',
  '.openai-sites',
];
for (const name of staleSites) {
  const target = path.join(root, name);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Removed stale build residue: ${name}`);
  }
}

// 2) Validate that the MCP route is the native Next.js route, not the old
// re-export shim. We intentionally fail here because auto-rewriting business
// logic would be unsafe.
const route = path.join(root, 'app', 'api', 'mcp', 'route.ts');
if (!fs.existsSync(route)) throw new Error('MCP route ausente: app/api/mcp/route.ts');
const text = fs.readFileSync(route, 'utf8');
if (/export\s*\{[^}]*\bdynamic\b[^}]*\}\s*from/.test(text)) {
  throw new Error('Build bloqueado: app/api/mcp/route.ts ainda é o shim antigo que reexporta dynamic');
}
if (!/export\s+const\s+dynamic\s*=/.test(text)) {
  throw new Error('Build bloqueado: app/api/mcp/route.ts deve declarar export const dynamic diretamente');
}

// 3) package.json itself must remain Tailwind-free. Transitive PostCSS inside
// Next.js is normal and intentionally ignored.
const pkgText = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const pkg = JSON.parse(pkgText);
const direct = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
if (direct['@tailwindcss/postcss'] || direct['tailwindcss']) {
  throw new Error('Build bloqueado: Tailwind apareceu como dependência direta do projeto');
}

console.log('Preflight OK: resíduos antigos removidos; MCP nativo validado; build Next.js liberado.');
