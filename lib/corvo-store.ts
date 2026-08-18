export type ProjectInput = {
  id?: string;
  title: string;
  topic?: string;
  format?: string;
  quantity?: string;
  mode?: string;
  status?: string;
  currentStep?: string;
  readyForAi?: boolean;
  ideaText?: string;
  scriptText?: string;
  promptsText?: string;
};

export type SceneInput = {
  id?: string;
  projectId: string;
  position?: number;
  title?: string;
  narration?: string;
  prompt?: string;
  variant?: string;
  status?: string;
  imageUrl?: string;
  imageFile?: string;
  notes?: string;
};

export type JobInput = {
  id?: string;
  projectId: string;
  sceneId?: string;
  type?: string;
  status?: string;
  prompt?: string;
  outputUrl?: string;
  outputFile?: string;
  error?: string;
  attempt?: number;
};

export type SnapshotInput = {
  projectId: string;
  label?: string;
  reason?: string;
  source?: string;
};

type D1Result<T> = { results?: T[] };
type Statement = {
  bind: (...values: unknown[]) => Statement;
  run: () => Promise<unknown>;
  all: <T>() => Promise<D1Result<T>>;
  first: <T>() => Promise<T | null>;
};
type Database = { prepare: (sql: string) => Statement; batch: (statements: Statement[]) => Promise<unknown> };
type D1QueryResult = { results?: Record<string, unknown>[]; success?: boolean };
type CloudflareEnvelope = { success?: boolean; errors?: Array<{ code?: number; message?: string }>; result?: D1QueryResult[] };
type BoundStatement = Statement & { __sql?: string; __params?: unknown[] };

const requiredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável ${name} não configurada no servidor.`);
  return value;
};

const normalizeParam = (value: unknown) => {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" || typeof value === "number" || value === null) return value;
  return String(value);
};

async function d1Request(payload: { sql: string; params?: unknown[] } | { batch: Array<{ sql: string; params?: unknown[] }> }) {
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  const databaseId = requiredEnv("CLOUDFLARE_D1_DATABASE_ID");
  const token = requiredEnv("CLOUDFLARE_D1_API_TOKEN");
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await response.json() as CloudflareEnvelope;
  if (!response.ok || !data.success) {
    const detail = data.errors?.map((e) => e.message || String(e.code || "erro")).join("; ") || `HTTP ${response.status}`;
    throw new Error(`Falha ao consultar D1: ${detail}`);
  }
  return data.result || [];
}

class HttpStatement implements BoundStatement {
  __sql: string;
  __params: unknown[];
  constructor(sql: string, params: unknown[] = []) { this.__sql = sql; this.__params = params; }
  bind(...values: unknown[]) { return new HttpStatement(this.__sql, values.map(normalizeParam)); }
  async run() { return (await d1Request({ sql: this.__sql, params: this.__params }))[0] || {}; }
  async all<T>() {
    const result = (await d1Request({ sql: this.__sql, params: this.__params }))[0];
    return { results: (result?.results || []) as T[] };
  }
  async first<T>() {
    const result = await this.all<T>();
    return result.results?.[0] ?? null;
  }
}

const httpDatabase: Database = {
  prepare(sql: string) { return new HttpStatement(sql); },
  async batch(statements: Statement[]) {
    const batch = statements.map((statement) => {
      const bound = statement as BoundStatement;
      if (!bound.__sql) throw new Error("Statement inválido no batch D1.");
      return { sql: bound.__sql, params: (bound.__params || []).map(normalizeParam) };
    });
    return d1Request({ batch });
  },
};

const database = () => httpDatabase;

export const newId = (prefix: string) => `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

export async function ensureSchema() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, title TEXT NOT NULL, topic TEXT NOT NULL DEFAULT '', format TEXT NOT NULL DEFAULT 'REELS', quantity TEXT NOT NULL DEFAULT '1 VÍDEO', mode TEXT NOT NULL DEFAULT 'RÁPIDO', status TEXT NOT NULL DEFAULT 'DRAFT', current_step TEXT NOT NULL DEFAULT 'IDEIA', ready_for_ai INTEGER NOT NULL DEFAULT 0, idea_text TEXT NOT NULL DEFAULT '', script_text TEXT NOT NULL DEFAULT '', prompts_text TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS projects_owner_updated_idx ON projects(owner_id, updated_at DESC)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS scenes (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, project_id TEXT NOT NULL, position INTEGER NOT NULL, title TEXT NOT NULL DEFAULT '', narration TEXT NOT NULL DEFAULT '', prompt TEXT NOT NULL DEFAULT '', variant TEXT NOT NULL DEFAULT 'SINGLE', status TEXT NOT NULL DEFAULT 'PENDING', image_url TEXT NOT NULL DEFAULT '', image_file TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS scenes_project_position_idx ON scenes(owner_id, project_id, position ASC)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, project_id TEXT NOT NULL, scene_id TEXT, type TEXT NOT NULL DEFAULT 'GENERATE_IMAGE', status TEXT NOT NULL DEFAULT 'PENDING', prompt TEXT NOT NULL DEFAULT '', output_url TEXT NOT NULL DEFAULT '', output_file TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '', attempt INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS jobs_project_updated_idx ON jobs(owner_id, project_id, updated_at DESC)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, project_id TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', reason TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'system', project_json TEXT NOT NULL, scenes_json TEXT NOT NULL, jobs_json TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS snapshots_project_created_idx ON snapshots(owner_id, project_id, created_at DESC)`),
  ]);
}

export function authorize(request: Request) {
  const configured = process.env.App_key_corvoapp?.trim() || process.env.MCP_ACCESS_TOKEN?.trim();
  const ownerEmail = process.env.MCP_OWNER_EMAIL?.trim().toLowerCase();
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const key = new URL(request.url).searchParams.get("key")?.trim();
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (email && ownerEmail && email === ownerEmail) return { ok: true, ownerId: "corvo-owner", mode: "chatgpt-user" };
  if (configured && (auth === configured || key === configured)) return { ok: true, ownerId: "corvo-owner", mode: "access-token" };
  return { ok: false, ownerId: "", mode: "none" };
}

const projectRow = (r: Record<string, unknown>) => ({
  id: String(r.id), title: String(r.title), topic: String(r.topic), format: String(r.format), quantity: String(r.quantity), mode: String(r.mode),
  status: String(r.status), currentStep: String(r.current_step), readyForAi: Boolean(r.ready_for_ai), ideaText: String(r.idea_text),
  scriptText: String(r.script_text), promptsText: String(r.prompts_text), createdAt: String(r.created_at), updatedAt: String(r.updated_at),
});
const sceneRow = (r: Record<string, unknown>) => ({
  id: String(r.id), projectId: String(r.project_id), position: Number(r.position), title: String(r.title), narration: String(r.narration),
  prompt: String(r.prompt), variant: String(r.variant), status: String(r.status), imageUrl: String(r.image_url), imageFile: String(r.image_file),
  notes: String(r.notes), createdAt: String(r.created_at), updatedAt: String(r.updated_at),
});
const jobRow = (r: Record<string, unknown>) => ({
  id: String(r.id), projectId: String(r.project_id), sceneId: r.scene_id ? String(r.scene_id) : "", type: String(r.type), status: String(r.status),
  prompt: String(r.prompt), outputUrl: String(r.output_url), outputFile: String(r.output_file), error: String(r.error), attempt: Number(r.attempt),
  createdAt: String(r.created_at), updatedAt: String(r.updated_at),
});
const snapshotRow = (r: Record<string, unknown>) => ({
  id: String(r.id), projectId: String(r.project_id), label: String(r.label), reason: String(r.reason), source: String(r.source), createdAt: String(r.created_at),
});

export async function createProject(ownerId: string, input: ProjectInput, source = "site") {
  await ensureSchema();
  const now = new Date().toISOString();
  const item = {
    id: input.id || newId("project"), title: input.title.trim(), topic: input.topic?.trim() || "", format: input.format || "REELS",
    quantity: input.quantity || "1 VÍDEO", mode: input.mode || "RÁPIDO", status: input.status || "DRAFT", currentStep: input.currentStep || "IDEIA",
    readyForAi: Boolean(input.readyForAi), ideaText: input.ideaText || "", scriptText: input.scriptText || "", promptsText: input.promptsText || "",
    createdAt: now, updatedAt: now, source,
  };
  await database().prepare(`INSERT INTO projects (id,owner_id,title,topic,format,quantity,mode,status,current_step,ready_for_ai,idea_text,script_text,prompts_text,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(item.id, ownerId, item.title, item.topic, item.format, item.quantity, item.mode, item.status, item.currentStep, item.readyForAi ? 1 : 0, item.ideaText, item.scriptText, item.promptsText, item.createdAt, item.updatedAt).run();
  return item;
}

export async function listProjects(ownerId: string, limit = 100) {
  await ensureSchema();
  const res = await database().prepare(`SELECT * FROM projects WHERE owner_id=? ORDER BY updated_at DESC LIMIT ?`).bind(ownerId, Math.max(1, Math.min(100, limit))).all<Record<string, unknown>>();
  return (res.results || []).map(projectRow);
}

export async function getProject(ownerId: string, id: string) {
  await ensureSchema();
  const row = await database().prepare(`SELECT * FROM projects WHERE owner_id=? AND id=?`).bind(ownerId, id).first<Record<string, unknown>>();
  return row ? projectRow(row) : null;
}

export async function updateProject(ownerId: string, id: string, changes: Partial<ProjectInput>) {
  const cur = await getProject(ownerId, id);
  if (!cur) return null;
  const next = { ...cur, ...changes, title: (changes.title ?? cur.title).trim(), topic: (changes.topic ?? cur.topic).trim(), updatedAt: new Date().toISOString() };
  await database().prepare(`UPDATE projects SET title=?,topic=?,format=?,quantity=?,mode=?,status=?,current_step=?,ready_for_ai=?,idea_text=?,script_text=?,prompts_text=?,updated_at=? WHERE owner_id=? AND id=?`)
    .bind(next.title, next.topic, next.format, next.quantity, next.mode, next.status, next.currentStep, next.readyForAi ? 1 : 0, next.ideaText, next.scriptText, next.promptsText, next.updatedAt, ownerId, id).run();
  return next;
}

export async function deleteProject(ownerId: string, id: string) {
  await ensureSchema();
  const db = database();
  await db.batch([
    db.prepare(`DELETE FROM jobs WHERE owner_id=? AND project_id=?`).bind(ownerId, id),
    db.prepare(`DELETE FROM scenes WHERE owner_id=? AND project_id=?`).bind(ownerId, id),
    db.prepare(`DELETE FROM projects WHERE owner_id=? AND id=?`).bind(ownerId, id),
  ]);
  return { id, deleted: true };
}

export async function listScenes(ownerId: string, projectId: string) {
  await ensureSchema();
  const res = await database().prepare(`SELECT * FROM scenes WHERE owner_id=? AND project_id=? ORDER BY position ASC, created_at ASC`).bind(ownerId, projectId).all<Record<string, unknown>>();
  return (res.results || []).map(sceneRow);
}

export async function saveScene(ownerId: string, input: SceneInput) {
  await ensureSchema();
  const now = new Date().toISOString();
  const id = input.id || newId("scene");
  const existing = input.id ? await database().prepare(`SELECT * FROM scenes WHERE owner_id=? AND id=?`).bind(ownerId, id).first<Record<string, unknown>>() : null;
  const cur = existing ? sceneRow(existing) : null;
  const item = {
    id, projectId: input.projectId || cur?.projectId || "", position: Number(input.position ?? cur?.position ?? 1), title: input.title ?? cur?.title ?? "",
    narration: input.narration ?? cur?.narration ?? "", prompt: input.prompt ?? cur?.prompt ?? "", variant: input.variant ?? cur?.variant ?? "SINGLE",
    status: input.status ?? cur?.status ?? "PENDING", imageUrl: input.imageUrl ?? cur?.imageUrl ?? "", imageFile: input.imageFile ?? cur?.imageFile ?? "",
    notes: input.notes ?? cur?.notes ?? "", createdAt: cur?.createdAt || now, updatedAt: now,
  };
  await database().prepare(`INSERT INTO scenes (id,owner_id,project_id,position,title,narration,prompt,variant,status,image_url,image_file,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,position=excluded.position,title=excluded.title,narration=excluded.narration,prompt=excluded.prompt,variant=excluded.variant,status=excluded.status,image_url=excluded.image_url,image_file=excluded.image_file,notes=excluded.notes,updated_at=excluded.updated_at`)
    .bind(item.id, ownerId, item.projectId, item.position, item.title, item.narration, item.prompt, item.variant, item.status, item.imageUrl, item.imageFile, item.notes, item.createdAt, item.updatedAt).run();
  await touchProject(ownerId, item.projectId);
  return item;
}

export async function replaceScenes(ownerId: string, projectId: string, inputs: Omit<SceneInput, "projectId">[]) {
  await ensureSchema();
  const db = database();
  await db.batch([
    db.prepare(`DELETE FROM jobs WHERE owner_id=? AND project_id=?`).bind(ownerId, projectId),
    db.prepare(`DELETE FROM scenes WHERE owner_id=? AND project_id=?`).bind(ownerId, projectId),
  ]);
  const out = [];
  for (let i = 0; i < inputs.slice(0, 200).length; i++) out.push(await saveScene(ownerId, { ...inputs[i], projectId, position: inputs[i].position ?? i + 1 }));
  await updateProject(ownerId, projectId, { currentStep: "CENAS", status: "IN_PROGRESS" });
  return out;
}

export async function deleteScene(ownerId: string, id: string) {
  await ensureSchema();
  const row = await database().prepare(`SELECT project_id FROM scenes WHERE owner_id=? AND id=?`).bind(ownerId, id).first<{ project_id: string }>();
  if (!row) return { id, deleted: false };
  await database().prepare(`DELETE FROM jobs WHERE owner_id=? AND scene_id=?`).bind(ownerId, id).run();
  await database().prepare(`DELETE FROM scenes WHERE owner_id=? AND id=?`).bind(ownerId, id).run();
  await touchProject(ownerId, row.project_id);
  return { id, projectId: row.project_id, deleted: true };
}

export async function createJobs(ownerId: string, inputs: JobInput[]) {
  await ensureSchema();
  const out = [];
  for (const input of inputs.slice(0, 200)) {
    const now = new Date().toISOString();
    const item = {
      id: input.id || newId("job"), projectId: input.projectId, sceneId: input.sceneId || null, type: input.type || "GENERATE_IMAGE",
      status: input.status || "PENDING", prompt: input.prompt || "", outputUrl: input.outputUrl || "", outputFile: input.outputFile || "",
      error: input.error || "", attempt: Number(input.attempt) || 0, createdAt: now, updatedAt: now,
    };
    await database().prepare(`INSERT INTO jobs (id,owner_id,project_id,scene_id,type,status,prompt,output_url,output_file,error,attempt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET scene_id=excluded.scene_id,type=excluded.type,status=excluded.status,prompt=excluded.prompt,output_url=excluded.output_url,output_file=excluded.output_file,error=excluded.error,attempt=excluded.attempt,updated_at=excluded.updated_at`)
      .bind(item.id, ownerId, item.projectId, item.sceneId, item.type, item.status, item.prompt, item.outputUrl, item.outputFile, item.error, item.attempt, item.createdAt, item.updatedAt).run();
    out.push(item);
    await touchProject(ownerId, item.projectId);
  }
  return out;
}

export async function listJobs(ownerId: string, projectId?: string, status?: string, limit = 200) {
  await ensureSchema();
  const where = ["owner_id=?"];
  const binds: unknown[] = [ownerId];
  if (projectId) { where.push("project_id=?"); binds.push(projectId); }
  if (status) { where.push("status=?"); binds.push(status); }
  binds.push(Math.max(1, Math.min(500, limit)));
  const res = await database().prepare(`SELECT * FROM jobs WHERE ${where.join(" AND ")} ORDER BY updated_at DESC LIMIT ?`).bind(...binds).all<Record<string, unknown>>();
  return (res.results || []).map(jobRow);
}

export async function getJob(ownerId: string, id: string) {
  await ensureSchema();
  const row = await database().prepare(`SELECT * FROM jobs WHERE owner_id=? AND id=?`).bind(ownerId, id).first<Record<string, unknown>>();
  return row ? jobRow(row) : null;
}

export async function updateJob(ownerId: string, id: string, changes: Partial<JobInput>) {
  const cur = await getJob(ownerId, id);
  if (!cur) return null;
  const next = { ...cur, ...changes, sceneId: changes.sceneId ?? cur.sceneId, updatedAt: new Date().toISOString() };
  await database().prepare(`UPDATE jobs SET project_id=?,scene_id=?,type=?,status=?,prompt=?,output_url=?,output_file=?,error=?,attempt=?,updated_at=? WHERE owner_id=? AND id=?`)
    .bind(next.projectId, next.sceneId || null, next.type, next.status, next.prompt, next.outputUrl, next.outputFile, next.error, next.attempt, next.updatedAt, ownerId, id).run();
  if (next.sceneId && next.outputUrl && next.status === "DONE") {
    await saveScene(ownerId, { id: next.sceneId, projectId: next.projectId, imageUrl: next.outputUrl, imageFile: next.outputFile, status: "DONE" });
  }
  await touchProject(ownerId, next.projectId);
  return next;
}

export async function retryJob(ownerId: string, id: string, prompt?: string) {
  const cur = await getJob(ownerId, id);
  if (!cur) return null;
  if (cur.status === "RUNNING") throw new Error("Não é possível refazer um job enquanto ele está RUNNING. Cancele-o primeiro.");
  if (cur.sceneId) await saveScene(ownerId, { id: cur.sceneId, projectId: cur.projectId, status: "PENDING", imageUrl: "", imageFile: "" });
  return updateJob(ownerId, id, {
    status: "PENDING", prompt: prompt ?? cur.prompt, outputUrl: "", outputFile: "", error: "", attempt: cur.attempt + 1,
  });
}

export async function cancelJob(ownerId: string, id: string) {
  const cur = await getJob(ownerId, id);
  if (!cur) return null;
  if (cur.status === "DONE") throw new Error("Job DONE não é cancelado; use refazer_job se quiser uma nova tentativa.");
  return updateJob(ownerId, id, { status: "CANCELLED" });
}

export async function deleteJob(ownerId: string, id: string) {
  const cur = await getJob(ownerId, id);
  if (!cur) return { id, deleted: false };
  await database().prepare(`DELETE FROM jobs WHERE owner_id=? AND id=?`).bind(ownerId, id).run();
  await touchProject(ownerId, cur.projectId);
  return { id, projectId: cur.projectId, deleted: true };
}

export async function touchProject(ownerId: string, id: string) {
  await ensureSchema();
  await database().prepare(`UPDATE projects SET updated_at=? WHERE owner_id=? AND id=?`).bind(new Date().toISOString(), ownerId, id).run();
}

export async function listSnapshots(ownerId: string, projectId: string, limit = 50) {
  await ensureSchema();
  const res = await database().prepare(`SELECT id,project_id,label,reason,source,created_at FROM snapshots WHERE owner_id=? AND project_id=? ORDER BY created_at DESC LIMIT ?`)
    .bind(ownerId, projectId, Math.max(1, Math.min(200, limit))).all<Record<string, unknown>>();
  return (res.results || []).map(snapshotRow);
}

export async function createSnapshot(ownerId: string, input: SnapshotInput) {
  await ensureSchema();
  const project = await getProject(ownerId, input.projectId);
  if (!project) throw new Error("Projeto não encontrado");
  const [scenes, jobs] = await Promise.all([listScenes(ownerId, input.projectId), listJobs(ownerId, input.projectId, undefined, 500)]);
  const now = new Date().toISOString();
  const item = {
    id: newId("snapshot"), projectId: input.projectId, label: input.label?.trim() || `Snapshot ${now}`,
    reason: input.reason?.trim() || "", source: input.source?.trim() || "system", createdAt: now,
  };
  await database().prepare(`INSERT INTO snapshots (id,owner_id,project_id,label,reason,source,project_json,scenes_json,jobs_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(item.id, ownerId, item.projectId, item.label, item.reason, item.source, JSON.stringify(project), JSON.stringify(scenes), JSON.stringify(jobs), item.createdAt).run();
  await database().prepare(`DELETE FROM snapshots WHERE owner_id=? AND project_id=? AND id NOT IN (SELECT id FROM snapshots WHERE owner_id=? AND project_id=? ORDER BY created_at DESC LIMIT 100)`)
    .bind(ownerId, item.projectId, ownerId, item.projectId).run();
  return item;
}

export async function getSnapshot(ownerId: string, id: string) {
  await ensureSchema();
  const row = await database().prepare(`SELECT * FROM snapshots WHERE owner_id=? AND id=?`).bind(ownerId, id).first<Record<string, unknown>>();
  if (!row) return null;
  return {
    ...snapshotRow(row),
    project: JSON.parse(String(row.project_json)),
    scenes: JSON.parse(String(row.scenes_json)),
    jobs: JSON.parse(String(row.jobs_json)),
  };
}

export async function restoreSnapshot(ownerId: string, snapshotId: string) {
  const snap = await getSnapshot(ownerId, snapshotId);
  if (!snap) return null;
  const current = await getProject(ownerId, snap.projectId);
  if (current) await createSnapshot(ownerId, { projectId: snap.projectId, label: "Antes da restauração", reason: `Snapshot de segurança antes de restaurar ${snapshotId}`, source: "system" });

  const db = database();
  const project = snap.project as ReturnType<typeof projectRow>;
  const scenes = snap.scenes as ReturnType<typeof sceneRow>[];
  const jobs = snap.jobs as ReturnType<typeof jobRow>[];
  const restoredAt = new Date().toISOString();

  await db.batch([
    db.prepare(`DELETE FROM jobs WHERE owner_id=? AND project_id=?`).bind(ownerId, snap.projectId),
    db.prepare(`DELETE FROM scenes WHERE owner_id=? AND project_id=?`).bind(ownerId, snap.projectId),
    db.prepare(`DELETE FROM projects WHERE owner_id=? AND id=?`).bind(ownerId, snap.projectId),
  ]);

  await db.prepare(`INSERT INTO projects (id,owner_id,title,topic,format,quantity,mode,status,current_step,ready_for_ai,idea_text,script_text,prompts_text,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(project.id, ownerId, project.title, project.topic, project.format, project.quantity, project.mode, project.status, project.currentStep, project.readyForAi ? 1 : 0, project.ideaText, project.scriptText, project.promptsText, project.createdAt, restoredAt).run();

  for (const scene of scenes) {
    await db.prepare(`INSERT INTO scenes (id,owner_id,project_id,position,title,narration,prompt,variant,status,image_url,image_file,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(scene.id, ownerId, scene.projectId, scene.position, scene.title, scene.narration, scene.prompt, scene.variant, scene.status, scene.imageUrl, scene.imageFile, scene.notes, scene.createdAt, restoredAt).run();
  }
  for (const job of jobs) {
    await db.prepare(`INSERT INTO jobs (id,owner_id,project_id,scene_id,type,status,prompt,output_url,output_file,error,attempt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(job.id, ownerId, job.projectId, job.sceneId || null, job.type, job.status, job.prompt, job.outputUrl, job.outputFile, job.error, job.attempt, job.createdAt, restoredAt).run();
  }
  return { snapshotId, projectId: snap.projectId, restored: true, restoredAt };
}

export async function deleteSnapshot(ownerId: string, id: string) {
  await ensureSchema();
  const row = await database().prepare(`SELECT project_id FROM snapshots WHERE owner_id=? AND id=?`).bind(ownerId, id).first<{ project_id: string }>();
  if (!row) return { id, deleted: false };
  await database().prepare(`DELETE FROM snapshots WHERE owner_id=? AND id=?`).bind(ownerId, id).run();
  return { id, projectId: row.project_id, deleted: true };
}

export async function getProjectFull(ownerId: string, id: string) {
  const project = await getProject(ownerId, id);
  if (!project) return null;
  const [scenes, jobs, history] = await Promise.all([listScenes(ownerId, id), listJobs(ownerId, id), listSnapshots(ownerId, id, 20)]);
  return {
    ...project, scenes, jobs, history,
    summary: {
      sceneCount: scenes.length,
      imageCount: scenes.filter((s) => s.imageUrl).length,
      jobCount: jobs.length,
      pendingJobs: jobs.filter((j) => !["DONE", "FAILED", "CANCELLED"].includes(j.status)).length,
      snapshots: history.length,
    },
  };
}

export async function startProject(ownerId: string, id: string) {
  const full = await getProjectFull(ownerId, id);
  if (!full) return null;
  let step = "IDEIA";
  if (full.ideaText) step = "ROTEIRO";
  if (full.scriptText) step = "CENAS";
  if (full.scenes.length) step = "PROMPTS";
  if (full.scenes.some((s) => s.prompt)) step = "IMAGENS";
  if (full.jobs.some((j) => j.status === "PENDING" || j.status === "RUNNING")) step = "PRODUCAO";
  return updateProject(ownerId, id, { readyForAi: true, status: "READY", currentStep: step });
}

export async function pauseProject(ownerId: string, id: string) {
  return updateProject(ownerId, id, { readyForAi: false, status: "PAUSED" });
}

export async function fullContext(ownerId: string) {
  const projects = await listProjects(ownerId, 100);
  const ready = projects.filter((p) => p.readyForAi);
  const pendingJobs = await listJobs(ownerId, undefined, "PENDING", 500);
  return { counts: { projects: projects.length, ready: ready.length, pendingJobs: pendingJobs.length }, readyProjects: ready, projects, pendingJobs };
}
