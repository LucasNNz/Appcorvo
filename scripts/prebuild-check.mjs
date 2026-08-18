import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const version = 'CORVO ROTEIRO MVP V0.3.8 — VERCEL ONLY';
console.log(`\n=== ${version} ===`);

function remove(rel) {
  const target = path.join(root, rel);
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed legacy residue: ${rel}`);
}

// Artifacts from OpenAI Sites / vinext / Vite / Cloudflare scaffold.
[
  'postcss.config.js',
  'postcss.config.cjs',
  'postcss.config.mjs',
  'postcss.config.ts',
  '.sites-runtime',
  '.openai-sites',
  '.openai',
  'build',
  'worker',
  'db',
  'app/mcp',
  'vite.config.ts',
  'vite.config.js',
  'drizzle.config.ts',
  'drizzle',
  'wrangler.toml',
  'wrangler.json',
  'wrangler.jsonc',
  'scripts/build-verified.sh',
  'scripts/install-ci.sh',
  'scripts/sites-env.sh',
  'scripts/validate-artifact.sh',
  'tsconfig.tsbuildinfo',
].forEach(remove);

// Runtime/API from the old Corvo/Roteiro V0.7.x that must not coexist with
// this MVP. The old UI can be overwritten, but old route folders remain when
// files are copied over a repository instead of replacing it.
[
  'app/api/corvo',
  'lib/corvo-api.ts',
  'lib/corvo-blob.ts',
  'lib/corvo-bridge.ts',
  'lib/corvo-collector.ts',
  'lib/corvo-flow.ts',
  'lib/corvo-jobs.ts',
  'lib/corvo-manifests.ts',
].forEach(remove);

// Large legacy assets/tools are irrelevant to Vercel runtime and can be
// discarded from the build sandbox. This does not change the Git repository.
[
  'corvo-bridge-extension',
  'corvo-collector-extension',
  'corvo-flow-manager-worker',
  'public/downloads',
].forEach(remove);

const route = path.join(root, 'app', 'api', 'mcp', 'route.ts');
if (!fs.existsSync(route)) throw new Error('MCP route ausente: app/api/mcp/route.ts');
const text = fs.readFileSync(route, 'utf8');
if (/export\s*\{[^}]*\bdynamic\b[^}]*\}\s*from/.test(text)) {
  throw new Error('Build bloqueado: app/api/mcp/route.ts ainda reexporta dynamic');
}
if (!/export\s+const\s+dynamic\s*=/.test(text)) {
  throw new Error('Build bloqueado: app/api/mcp/route.ts deve declarar export const dynamic diretamente');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const direct = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
if (direct['@tailwindcss/postcss'] || direct['tailwindcss'] || direct['vite']) {
  throw new Error('Build bloqueado: dependência legada Tailwind/Vite reapareceu no package.json');
}

console.log('Preflight OK: fontes legadas removidas; somente o MVP Next atual seguirá para compilação.');
