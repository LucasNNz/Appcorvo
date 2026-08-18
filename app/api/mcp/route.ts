import type { JobInput, ProjectInput, SceneInput } from "../../../lib/corvo-store";
export const dynamic = "force-dynamic";

const rw = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const ro = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const del = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
const idSchema = { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false };
const projectProps = {
  title: { type: "string" }, topic: { type: "string" }, format: { type: "string", enum: ["REELS", "VÍDEO COMPLETO"] },
  quantity: { type: "string", enum: ["1 VÍDEO", "LOTE"] }, mode: { type: "string", enum: ["RÁPIDO", "PESQUISAR ANTES"] },
  status: { type: "string" }, currentStep: { type: "string" }, readyForAi: { type: "boolean" }, ideaText: { type: "string" },
  scriptText: { type: "string" }, promptsText: { type: "string" },
};
const sceneProps = {
  id: { type: "string" }, position: { type: "integer", minimum: 1 }, title: { type: "string" }, narration: { type: "string" },
  prompt: { type: "string" }, variant: { type: "string", enum: ["SINGLE", "A", "B"] }, status: { type: "string" },
  imageUrl: { type: "string" }, imageFile: { type: "string" }, notes: { type: "string" },
};
const jobProps = {
  id: { type: "string" }, projectId: { type: "string" }, sceneId: { type: "string" }, type: { type: "string" }, status: { type: "string" },
  prompt: { type: "string" }, outputUrl: { type: "string" }, outputFile: { type: "string" }, error: { type: "string" },
  attempt: { type: "integer", minimum: 0 },
};

const tools = [
  { name: "obter_contexto_corvo", title: "Obter contexto do Corvo", description: "Lê projetos liberados para IA, projetos recentes e jobs pendentes. Use primeiro para descobrir o trabalho atual.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: ro },
  { name: "listar_projetos", title: "Listar projetos", description: "Lista os projetos do Roteiro, do mais recente ao mais antigo.", inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 100 } }, additionalProperties: false }, annotations: ro },
  { name: "criar_projeto", title: "Criar projeto", description: "Cria um novo projeto de vídeo no Corvo.", inputSchema: { type: "object", properties: projectProps, required: ["title"], additionalProperties: false }, annotations: rw },
  { name: "obter_projeto", title: "Obter projeto completo", description: "Lê projeto, ideia, roteiro, cenas, prompts, imagens, jobs e histórico recente em uma única chamada.", inputSchema: idSchema, annotations: ro },
  { name: "atualizar_projeto", title: "Atualizar projeto", description: "Atualiza metadados ou estado de um projeto. O Core cria snapshot automático antes da alteração.", inputSchema: { type: "object", properties: { id: { type: "string" }, changes: { type: "object", properties: projectProps, additionalProperties: false } }, required: ["id", "changes"], additionalProperties: false }, annotations: rw },
  { name: "salvar_artefato", title: "Salvar ideia, roteiro ou prompts", description: "Salva um artefato textual e avança a etapa. Cria snapshot automático antes de substituir conteúdo existente.", inputSchema: { type: "object", properties: { id: { type: "string" }, kind: { type: "string", enum: ["IDEIA", "ROTEIRO", "PROMPTS"] }, text: { type: "string" } }, required: ["id", "kind", "text"], additionalProperties: false }, annotations: rw },
  { name: "substituir_cenas", title: "Salvar estrutura de cenas", description: "Substitui as cenas do projeto. Cria snapshot automático antes da troca.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, scenes: { type: "array", minItems: 1, maxItems: 200, items: { type: "object", properties: sceneProps, additionalProperties: false } } }, required: ["projectId", "scenes"], additionalProperties: false }, annotations: rw },
  { name: "atualizar_cena", title: "Atualizar cena", description: "Atualiza narração, prompt, variante, status ou resultado de imagem de uma cena. Cria snapshot automático.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, scene: { type: "object", properties: sceneProps, required: ["id"], additionalProperties: false } }, required: ["projectId", "scene"], additionalProperties: false }, annotations: rw },
  { name: "excluir_cena", title: "Excluir cena", description: "Exclui uma cena e os jobs ligados a ela. Um snapshot é criado antes da exclusão.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, id: { type: "string" } }, required: ["projectId", "id"], additionalProperties: false }, annotations: del },
  { name: "iniciar_projeto", title: "Liberar projeto para o Corvo", description: "Marca o projeto como READY e pronto para ser conduzido pelo ChatGPT. Não chama API de IA; apenas grava o comando no Core.", inputSchema: idSchema, annotations: rw },
  { name: "pausar_projeto", title: "Pausar projeto", description: "Remove a liberação para IA e marca o projeto como pausado.", inputSchema: idSchema, annotations: rw },
  { name: "criar_jobs", title: "Criar jobs", description: "Cria jobs executáveis de geração/refinamento para o Corvo Agent consumir.", inputSchema: { type: "object", properties: { jobs: { type: "array", minItems: 1, maxItems: 200, items: { type: "object", properties: jobProps, required: ["projectId"], additionalProperties: false } } }, required: ["jobs"], additionalProperties: false }, annotations: rw },
  { name: "listar_jobs", title: "Listar jobs", description: "Lista jobs por projeto e/ou status para acompanhar a produção.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, status: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } }, additionalProperties: false }, annotations: ro },
  { name: "atualizar_job", title: "Atualizar job", description: "Atualiza estado/resultado de um job. Quando DONE tem sceneId e outputUrl, liga a imagem à cena.", inputSchema: { type: "object", properties: { id: { type: "string" }, changes: { type: "object", properties: jobProps, additionalProperties: false } }, required: ["id", "changes"], additionalProperties: false }, annotations: rw },
  { name: "refazer_job", title: "Refazer job", description: "Recoloca um job em PENDING, limpa resultado/erro, incrementa a tentativa e opcionalmente substitui o prompt.", inputSchema: { type: "object", properties: { id: { type: "string" }, prompt: { type: "string" } }, required: ["id"], additionalProperties: false }, annotations: rw },
  { name: "cancelar_job", title: "Cancelar job", description: "Marca um job ainda não concluído como CANCELLED.", inputSchema: idSchema, annotations: rw },
  { name: "excluir_job", title: "Excluir job", description: "Exclui definitivamente um job. Cria snapshot do projeto antes da exclusão.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, id: { type: "string" } }, required: ["projectId", "id"], additionalProperties: false }, annotations: del },
  { name: "criar_snapshot", title: "Criar ponto de restauração", description: "Guarda projeto, cenas e jobs como um ponto de restauração nomeado.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, label: { type: "string" }, reason: { type: "string" } }, required: ["projectId"], additionalProperties: false }, annotations: rw },
  { name: "listar_historico", title: "Listar histórico", description: "Lista snapshots/pontos de restauração de um projeto.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 200 } }, required: ["projectId"], additionalProperties: false }, annotations: ro },
  { name: "obter_snapshot", title: "Obter snapshot", description: "Lê o conteúdo completo de um ponto de restauração para conferência ou comparação.", inputSchema: idSchema, annotations: ro },
  { name: "restaurar_snapshot", title: "Restaurar snapshot", description: "Restaura projeto, cenas e jobs para um snapshot. Antes disso cria automaticamente um snapshot de segurança do estado atual.", inputSchema: idSchema, annotations: rw },
  { name: "excluir_snapshot", title: "Excluir snapshot", description: "Exclui um ponto de restauração específico.", inputSchema: idSchema, annotations: del },
  { name: "excluir_projeto", title: "Excluir projeto", description: "Exclui projeto, cenas e jobs, preservando um snapshot recuperável. Use somente quando o usuário pedir explicitamente.", inputSchema: idSchema, annotations: del },
];

const headers = { "MCP-Protocol-Version": "2025-03-26", "Access-Control-Allow-Origin": "*" };
const ok = (id: unknown, result: unknown) => Response.json({ jsonrpc: "2.0", id, result }, { headers });
const fail = (id: unknown, code: number, message: string, status = 200) => Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status, headers });

export async function POST(request: Request) {
  const s = await import("../../../lib/corvo-store");
  const auth = s.authorize(request);
  if (!auth.ok) return fail(null, -32001, "Não autorizado. Confira a conexão do Corvo.", 401);

  let body: { id?: unknown; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
  try { body = await request.json(); } catch { return fail(null, -32700, "JSON inválido", 400); }

  if (body.method === "initialize") return ok(body.id, {
    protocolVersion: "2025-03-26",
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: "corvo-roteiro", version: "0.3.1" },
    instructions: "Você é o orquestrador único do Corvo. O app é a fonte de verdade de projetos, roteiro, cenas e jobs. Comece por obter_contexto_corvo. Quando houver projeto readyForAi=true, leia-o por completo e continue a etapa atual. Salve cada artefato no Core assim que estiver definido. O Core possui histórico e rollback: alterações semânticas feitas pelas ferramentas principais criam snapshots automáticos; use listar_historico, obter_snapshot e restaurar_snapshot quando o usuário pedir para voltar ou desfazer. Para refazer tarefas de produção use refazer_job. Não dependa da memória da conversa para estado persistente. Jobs de imagem são executados externamente pelo Corvo Agent. Só exclua quando o usuário pedir explicitamente.",
  });
  if (body.method === "notifications/initialized") return new Response(null, { status: 202, headers });
  if (body.method === "ping") return ok(body.id, {});
  if (body.method === "tools/list") return ok(body.id, { tools });
  if (body.method !== "tools/call") return fail(body.id, -32601, "Método não encontrado");

  const name = body.params?.name;
  const args = body.params?.arguments || {};
  try {
    let data: unknown;
    let text = "";

    if (name === "obter_contexto_corvo") { data = await s.fullContext(auth.ownerId); text = "Contexto do Corvo carregado."; }
    else if (name === "listar_projetos") { const projects = await s.listProjects(auth.ownerId, Number(args.limit) || 100); data = { projects }; text = `${projects.length} projeto(s) encontrado(s).`; }
    else if (name === "criar_projeto") { const project = await s.createProject(auth.ownerId, args as ProjectInput, "chatgpt"); data = { project }; text = "Projeto criado."; }
    else if (name === "obter_projeto") { const project = await s.getProjectFull(auth.ownerId, String(args.id || "")); data = { project }; text = project ? "Projeto completo carregado." : "Projeto não encontrado."; }
    else if (name === "atualizar_projeto") {
      const id = String(args.id || ""); await s.createSnapshot(auth.ownerId, { projectId: id, label: "Antes de atualizar projeto", source: "chatgpt" });
      const project = await s.updateProject(auth.ownerId, id, (args.changes as Partial<ProjectInput>) || {}); data = { project }; text = project ? "Projeto atualizado; estado anterior preservado no histórico." : "Projeto não encontrado.";
    }
    else if (name === "salvar_artefato") {
      const id = String(args.id || ""), kind = String(args.kind || ""), value = String(args.text || "");
      await s.createSnapshot(auth.ownerId, { projectId: id, label: `Antes de salvar ${kind}`, source: "chatgpt" });
      const changes: Partial<ProjectInput> = kind === "IDEIA" ? { ideaText: value, currentStep: "ROTEIRO", status: "IN_PROGRESS" } : kind === "ROTEIRO" ? { scriptText: value, currentStep: "CENAS", status: "IN_PROGRESS" } : { promptsText: value, currentStep: "IMAGENS", status: "IN_PROGRESS" };
      const project = await s.updateProject(auth.ownerId, id, changes); data = { project }; text = `${kind} salvo; versão anterior preservada.`;
    }
    else if (name === "substituir_cenas") {
      const projectId = String(args.projectId || ""); await s.createSnapshot(auth.ownerId, { projectId, label: "Antes de substituir cenas", source: "chatgpt" });
      const scenes = await s.replaceScenes(auth.ownerId, projectId, (args.scenes as Omit<SceneInput, "projectId">[]) || []); data = { scenes }; text = `${scenes.length} cena(s) salva(s); estrutura anterior preservada.`;
    }
    else if (name === "atualizar_cena") {
      const projectId = String(args.projectId || ""); await s.createSnapshot(auth.ownerId, { projectId, label: "Antes de atualizar cena", source: "chatgpt" });
      const sceneArg = (args.scene as Omit<SceneInput, "projectId">) || {}; const scene = await s.saveScene(auth.ownerId, { ...sceneArg, projectId } as SceneInput); data = { scene }; text = "Cena atualizada; estado anterior preservado.";
    }
    else if (name === "excluir_cena") {
      const projectId = String(args.projectId || ""); await s.createSnapshot(auth.ownerId, { projectId, label: "Antes de excluir cena", source: "chatgpt" });
      data = await s.deleteScene(auth.ownerId, String(args.id || "")); text = "Cena excluída; pode ser recuperada pelo histórico.";
    }
    else if (name === "iniciar_projeto") { const project = await s.startProject(auth.ownerId, String(args.id || "")); data = { project }; text = "Projeto liberado para o Corvo."; }
    else if (name === "pausar_projeto") { const project = await s.pauseProject(auth.ownerId, String(args.id || "")); data = { project }; text = "Projeto pausado."; }
    else if (name === "criar_jobs") { const jobs = await s.createJobs(auth.ownerId, (args.jobs as JobInput[]) || []); data = { jobs }; text = `${jobs.length} job(s) criado(s).`; }
    else if (name === "listar_jobs") { const jobs = await s.listJobs(auth.ownerId, String(args.projectId || "") || undefined, String(args.status || "") || undefined, Number(args.limit) || 200); data = { jobs }; text = `${jobs.length} job(s) encontrado(s).`; }
    else if (name === "atualizar_job") { const job = await s.updateJob(auth.ownerId, String(args.id || ""), (args.changes as Partial<JobInput>) || {}); data = { job }; text = job ? "Job atualizado." : "Job não encontrado."; }
    else if (name === "refazer_job") { const id=String(args.id || ""); const current=await s.getJob(auth.ownerId,id); if(current) await s.createSnapshot(auth.ownerId,{projectId:current.projectId,label:"Antes de refazer job",source:"chatgpt"}); const job = await s.retryJob(auth.ownerId, id, typeof args.prompt === "string" ? args.prompt : undefined); data = { job }; text = job ? "Job recolocado na fila para nova tentativa; resultado anterior preservado no histórico." : "Job não encontrado."; }
    else if (name === "cancelar_job") { const job = await s.cancelJob(auth.ownerId, String(args.id || "")); data = { job }; text = job ? "Job cancelado." : "Job não encontrado."; }
    else if (name === "excluir_job") {
      const projectId = String(args.projectId || ""); await s.createSnapshot(auth.ownerId, { projectId, label: "Antes de excluir job", source: "chatgpt" });
      data = await s.deleteJob(auth.ownerId, String(args.id || "")); text = "Job excluído; estado anterior preservado.";
    }
    else if (name === "criar_snapshot") { const snapshot = await s.createSnapshot(auth.ownerId, { projectId: String(args.projectId || ""), label: String(args.label || ""), reason: String(args.reason || ""), source: "chatgpt" }); data = { snapshot }; text = "Ponto de restauração criado."; }
    else if (name === "listar_historico") { const history = await s.listSnapshots(auth.ownerId, String(args.projectId || ""), Number(args.limit) || 50); data = { history }; text = `${history.length} ponto(s) de restauração encontrado(s).`; }
    else if (name === "obter_snapshot") { const snapshot = await s.getSnapshot(auth.ownerId, String(args.id || "")); data = { snapshot }; text = snapshot ? "Snapshot carregado." : "Snapshot não encontrado."; }
    else if (name === "restaurar_snapshot") { const restored = await s.restoreSnapshot(auth.ownerId, String(args.id || "")); data = { restored }; text = restored ? "Snapshot restaurado; o estado que existia antes da restauração também foi salvo." : "Snapshot não encontrado."; }
    else if (name === "excluir_snapshot") { data = await s.deleteSnapshot(auth.ownerId, String(args.id || "")); text = "Snapshot excluído."; }
    else if (name === "excluir_projeto") { const id=String(args.id || ""); await s.createSnapshot(auth.ownerId,{projectId:id,label:"Antes de excluir projeto",reason:"Snapshot recuperável criado automaticamente",source:"chatgpt"}); data = await s.deleteProject(auth.ownerId, id); text = "Projeto excluído; snapshot de recuperação preservado."; }
    else return fail(body.id, -32602, "Ferramenta desconhecida");

    return ok(body.id, { content: [{ type: "text", text }], structuredContent: data });
  } catch (error) {
    return fail(body.id, -32000, error instanceof Error ? error.message : "Falha inesperada", 500);
  }
}

export async function GET() { return new Response("Use MCP Streamable HTTP via POST.", { status: 405, headers: { Allow: "POST" } }); }
export async function OPTIONS() { return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type,authorization,mcp-protocol-version", "Access-Control-Allow-Methods": "POST,OPTIONS" } }); }
