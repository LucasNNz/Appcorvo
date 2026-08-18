export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const s = await import("../../../lib/corvo-store"); const a = s.authorize(request);
  if (!a.ok) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const u = new URL(request.url), projectId = u.searchParams.get("projectId"), id = u.searchParams.get("id");
  if (id) return Response.json({ snapshot: await s.getSnapshot(a.ownerId, id) });
  if (!projectId) return Response.json({ error: "projectId obrigatório" }, { status: 400 });
  return Response.json({ history: await s.listSnapshots(a.ownerId, projectId, Number(u.searchParams.get("limit")) || 50) });
}
export async function POST(request: Request) {
  const s = await import("../../../lib/corvo-store"); const a = s.authorize(request);
  if (!a.ok) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const b = await request.json() as { projectId?: string; label?: string; reason?: string };
  if (!b.projectId) return Response.json({ error: "projectId obrigatório" }, { status: 400 });
  return Response.json({ snapshot: await s.createSnapshot(a.ownerId, { projectId: b.projectId, label: b.label, reason: b.reason, source: "site" }) }, { status: 201 });
}
export async function PATCH(request: Request) {
  const s = await import("../../../lib/corvo-store"); const a = s.authorize(request);
  if (!a.ok) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const b = await request.json() as { id?: string };
  if (!b.id) return Response.json({ error: "id obrigatório" }, { status: 400 });
  const restored = await s.restoreSnapshot(a.ownerId, b.id);
  return restored ? Response.json({ restored }) : Response.json({ error: "Snapshot não encontrado" }, { status: 404 });
}
export async function DELETE(request: Request) {
  const s = await import("../../../lib/corvo-store"); const a = s.authorize(request);
  if (!a.ok) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id obrigatório" }, { status: 400 });
  return Response.json(await s.deleteSnapshot(a.ownerId, id));
}
