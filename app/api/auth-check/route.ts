export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configured = String(process.env.App_key_corvoapp || "").split(/\r?\n/)[0]?.trim() || "";
  if (!configured) {
    return Response.json({
      ok: false, code: "MCP_KEY_NOT_CONFIGURED",
      message: "App_key_corvoapp não foi carregada neste deployment. Salve a variável na Vercel e faça Redeploy."
    }, { status: 503 });
  }

  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (supplied !== configured) {
    return Response.json({
      ok: false, code: "MCP_KEY_INVALID",
      message: "A chave salva no navegador não corresponde a App_key_corvoapp deste deployment."
    }, { status: 401 });
  }

  try {
    const s = await import("../../../lib/corvo-store");
    const schema = await s.ensureSchema();
    const after = s.r2Diagnostics();
    return Response.json({
      ok: true, code: "READY", envName: "App_key_corvoapp", storage: "cloudflare-r2-s3",
      r2: after,
      fixed: { endpoint: after.endpoint, bucket: after.bucket, region: after.region, statePath: after.statePath },
      message: "Chave MCP validada. R2 conectado com R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY."
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
