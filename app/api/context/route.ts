export const dynamic="force-dynamic";
export async function GET(request:Request){const s=await import("../../../lib/corvo-store");const a=s.authorize(request);if(!a.ok)return Response.json({error:"Não autorizado"},{status:401});return Response.json(await s.fullContext(a.ownerId));}
