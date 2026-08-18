export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configured = process.env.App_key_corvoapp?.trim();
  if (!configured) {
    return Response.json({
      ok: false,
      code: "MCP_KEY_NOT_CONFIGURED",
      message: "App_key_corvoapp não está disponível neste deployment. Salve a variável na Vercel e faça um novo deploy."
    }, { status: 503 });
  }

  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (supplied !== configured) {
    return Response.json({
      ok: false,
      code: "MCP_KEY_INVALID",
      message: "A chave salva no navegador não corresponde a App_key_corvoapp deste deployment."
    }, { status: 401 });
  }

  try {
    const s = await import("../../../lib/corvo-store");
    await s.ensureSchema();
    return Response.json({
      ok: true,
      code: "READY",
      envName: "App_key_corvoapp",
      database: "ready",
      message: "Chave MCP e banco validados."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao validar banco";
    return Response.json({
      ok: false,
      code: "DATABASE_NOT_READY",
      message
    }, { status: 503 });
  }
}
