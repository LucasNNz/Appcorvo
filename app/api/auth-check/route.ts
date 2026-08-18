export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configured = process.env.App_key_corvoapp?.trim();
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
      detected: schema.detected,
      message: `Chave MCP validada. R2 conectado via ${after.accessKeyEnv || "credencial detectada"} + ${after.secretKeyEnv || "secret detectada"}.`
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
