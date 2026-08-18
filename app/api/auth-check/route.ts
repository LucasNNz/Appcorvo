import { CORVO_PRIVATE_CONFIG } from "../../../lib/corvo-private-config";

export const dynamic = "force-dynamic";

function clean(value: string | undefined) {
  return String(value || "").split(/\r?\n/)[0]?.trim() || "";
}

export async function GET(request: Request) {
  const configured = clean(CORVO_PRIVATE_CONFIG.mcpKey);
  if (!configured || configured.startsWith("COLE_AQUI_")) {
    return Response.json({
      ok: false, code: "MCP_KEY_NOT_CONFIGURED",
      message: "A chave MCP ainda não foi gravada em lib/corvo-private-config.ts. Rode CONFIGURAR_CORVO.bat antes do deploy."
    }, { status: 503 });
  }

  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (supplied !== configured) {
    return Response.json({
      ok: false, code: "MCP_KEY_INVALID",
      message: "A chave salva neste navegador é diferente da chave MCP embutida no servidor."
    }, { status: 401 });
  }

  try {
    const s = await import("../../../lib/corvo-store");
    await s.ensureSchema();
    const after = s.r2Diagnostics();
    return Response.json({
      ok: true, code: "READY", configMode: "embedded-private-config", storage: "cloudflare-r2-s3",
      r2: after,
      fixed: { endpoint: after.endpoint, bucket: after.bucket, region: after.region, statePath: after.statePath },
      message: "Chave MCP validada. R2 conectado usando configuração embutida do servidor."
    });
  } catch (error) {
    const s = await import("../../../lib/corvo-store");
    return Response.json({
      ok: false, code: "STORAGE_NOT_READY",
      r2: s.r2Diagnostics(),
      message: error instanceof Error ? error.message : "Falha ao validar Cloudflare R2"
    }, { status: 503 });
  }
}
