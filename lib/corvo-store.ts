import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

type Project = {
  id: string;
  ownerId: string;
  title: string;
  topic: string;
  format: string;
  quantity: string;
  mode: string;
  status: string;
  currentStep: string;
  readyForAi: boolean;
  ideaText: string;
  scriptText: string;
  promptsText: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
};

type Scene = {
  id: string;
  ownerId: string;
  projectId: string;
  position: number;
  title: string;
  narration: string;
  prompt: string;
  variant: string;
  status: string;
  imageUrl: string;
  imageFile: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type Job = {
  id: string;
  ownerId: string;
  projectId: string;
  sceneId: string;
  type: string;
  status: string;
  prompt: string;
  outputUrl: string;
  outputFile: string;
  error: string;
  attempt: number;
  createdAt: string;
  updatedAt: string;
};

type Snapshot = {
  id: string;
  ownerId: string;
  projectId: string;
  label: string;
  reason: string;
  source: string;
  project: Omit<Project, "ownerId">;
  scenes: Array<Omit<Scene, "ownerId">>;
  jobs: Array<Omit<Job, "ownerId">>;
  createdAt: string;
};

type CorvoState = {
  version: 1;
  projects: Project[];
  scenes: Scene[];
  jobs: Job[];
  snapshots: Snapshot[];
};

function emptyState(): CorvoState {
  return { version: 1, projects: [], scenes: [], jobs: [], snapshots: [] };
}

const STATE_PATH = "corvo-core/state-v1.json";
const R2_ENDPOINT = "https://34da8bbc6302e3c68edf3a36f1569668.r2.cloudflarestorage.com";
const R2_BUCKET = "corvoquiz-prod";
const R2_REGION = "auto";

function cleanEnv(value: string | undefined) {
  return String(value || "").split(/\r?\n/)[0]?.trim() || "";
}

function r2Config() {
  const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY);

  if (!accessKeyId || !secretAccessKey) {
    const missing = [
      !accessKeyId ? "R2_ACCESS_KEY_ID" : "",
      !secretAccessKey ? "R2_SECRET_ACCESS_KEY" : "",
    ].filter(Boolean).join(" e ");
    throw new Error(`R2_NOT_CONFIGURED: ${missing} não carregada(s) neste deployment. Salve exatamente essas variáveis na Vercel e faça Redeploy.`);
  }

  return {
    accessKeyId,
    secretAccessKey,
    endpoint: R2_ENDPOINT,
    bucket: R2_BUCKET,
    region: R2_REGION,
  };
}

export function r2Diagnostics() {
  return {
    accessKeyLoaded: Boolean(cleanEnv(process.env.R2_ACCESS_KEY_ID)),
    secretKeyLoaded: Boolean(cleanEnv(process.env.R2_SECRET_ACCESS_KEY)),
    accessKeyEnv: "R2_ACCESS_KEY_ID",
    secretKeyEnv: "R2_SECRET_ACCESS_KEY",
    endpoint: R2_ENDPOINT,
    bucket: R2_BUCKET,
    region: R2_REGION,
    statePath: STATE_PATH,
  };
}

let cachedR2Client: S3Client | null = null;
let cachedR2Key = "";

function r2Client() {
  const config = r2Config();
  const key = `${config.endpoint}|${config.bucket}|${config.accessKeyId}`;
  if (!cachedR2Client || cachedR2Key !== key) {
    cachedR2Client?.destroy();
    cachedR2Key = key;
    cachedR2Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      forcePathStyle: true,
      maxAttempts: 2,
    });
  }
  return { config, client: cachedR2Client };
}

function storageError(error: unknown): Error {
  const raw = error instanceof Error ? error.message : String(error || "erro desconhecido");
  const low = raw.toLowerCase();
  if (raw.startsWith("R2_")) return error instanceof Error ? error : new Error(raw);
  if (low.includes("invalidaccesskeyid")) return new Error("R2_ACCESS_KEY_INVALID: o Access Key ID do R2 foi recusado.");
  if (low.includes("signaturedoesnotmatch") || low.includes("signature")) return new Error("R2_SIGNATURE_FAILED: confira R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY; as duas credenciais precisam pertencer ao mesmo token R2.");
  if (low.includes("nosuchbucket") || low.includes("bucket does not exist")) return new Error("R2_BUCKET_NOT_FOUND: o bucket corvoquiz-prod não foi encontrado.");
  if (low.includes("accessdenied") || low.includes("forbidden") || low.includes("403")) return new Error("R2_ACCESS_DENIED: o token R2 precisa de Object Read & Write para o bucket corvoquiz-prod.");
  if (low.includes("enotfound") || low.includes("getaddrinfo") || low.includes("eai_again")) return new Error("R2_DNS_FAILED: não foi possível resolver o endpoint S3 do R2.");
  return new Error(`R2_STORAGE_ERROR: ${raw}`);
}

async function readState(): Promise<CorvoState> {
  try {
    const { client, config } = r2Client();
    const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: STATE_PATH }));
    if (!result.Body) return emptyState();
    const text = await result.Body.transformToString("utf-8");
    if (!text.trim()) return emptyState();
    const parsed = JSON.parse(text) as Partial<CorvoState>;
    return {
      version: 1,
      projects: Array.isArray(parsed.projects) ? parsed.projects as Project[] : [],
      scenes: Array.isArray(parsed.scenes) ? parsed.scenes as Scene[] : [],
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs as Job[] : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots as Snapshot[] : [],
    };
  } catch (error) {
    const e = error as { name?: string; $metadata?: { httpStatusCode?: number }; message?: string };
    if (e?.name === "NoSuchKey" || e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404 || /NoSuchKey/i.test(String(e?.message || ""))) {
      return emptyState();
    }
    throw storageError(error);
  }
}

async function writeState(state: CorvoState): Promise<void> {
  try {
    const { client, config } = r2Client();
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: STATE_PATH,
      Body: JSON.stringify(state),
      ContentType: "application/json; charset=utf-8",
      CacheControl: "no-store",
    }));
  } catch (error) {
    throw storageError(error);
  }
}

const publicProject = ({ ownerId: _ownerId, ...item }: Project) => item;
const publicScene = ({ ownerId: _ownerId, ...item }: Scene) => item;
const publicJob = ({ ownerId: _ownerId, ...item }: Job) => item;
const publicSnapshot = ({ ownerId: _ownerId, project: _project, scenes: _scenes, jobs: _jobs, ...item }: Snapshot) => item;

function touchProjectInState(state: CorvoState, ownerId: string, id: string, at = new Date().toISOString()) {
  const project = state.projects.find((p) => p.ownerId === ownerId && p.id === id);
  if (project) project.updatedAt = at;
}

function snapshotFromState(state: CorvoState, ownerId: string, input: SnapshotInput): Snapshot {
  const project = state.projects.find((p) => p.ownerId === ownerId && p.id === input.projectId);
  if (!project) throw new Error("Projeto não encontrado");
  const now = new Date().toISOString();
  const { ownerId: _po, ...projectCopy } = project;
  const scenes = state.scenes
    .filter((s) => s.ownerId === ownerId && s.projectId === input.projectId)
    .map(({ ownerId: _so, ...scene }) => ({ ...scene }));
  const jobs = state.jobs
    .filter((j) => j.ownerId === ownerId && j.projectId === input.projectId)
    .map(({ ownerId: _jo, ...job }) => ({ ...job }));
  return {
    id: newId("snapshot"), ownerId, projectId: input.projectId,
    label: input.label?.trim() || `Snapshot ${now}`,
    reason: input.reason?.trim() || "",
    source: input.source?.trim() || "system",
    project: { ...projectCopy }, scenes, jobs, createdAt: now,
  };
}

export const newId = (prefix: string) => `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

export async function ensureSchema() {
  const state = await readState();
  // Inicializa o arquivo somente quando ainda não há estado algum.
  if (!state.projects.length && !state.scenes.length && !state.jobs.length && !state.snapshots.length) {
    await writeState(state);
  }
  const config = r2Config();
  return { storage: "cloudflare-r2-s3", bucket: config.bucket, endpoint: config.endpoint, region: config.region, ready: true };
}

export function authorize(request: Request) {
  const configured = cleanEnv(process.env.App_key_corvoapp);
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const key = new URL(request.url).searchParams.get("key")?.trim();
  if (configured && (auth === configured || key === configured)) return { ok: true, ownerId: "corvo-owner", mode: "access-token" };
  return { ok: false, ownerId: "", mode: "none" };
}

export async function createProject(ownerId: string, input: ProjectInput, source = "site") {
  const state = await readState();
  const now = new Date().toISOString();
  const item: Project = {
    id: input.id || newId("project"), ownerId, title: input.title.trim(), topic: input.topic?.trim() || "", format: input.format || "REELS",
    quantity: input.quantity || "1 VÍDEO", mode: input.mode || "RÁPIDO", status: input.status || "DRAFT", currentStep: input.currentStep || "IDEIA",
    readyForAi: Boolean(input.readyForAi), ideaText: input.ideaText || "", scriptText: input.scriptText || "", promptsText: input.promptsText || "",
    createdAt: now, updatedAt: now, source,
  };
  state.projects.push(item);
  await writeState(state);
  return publicProject(item);
}

export async function listProjects(ownerId: string, limit = 100) {
  const state = await readState();
  return state.projects
    .filter((p) => p.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, Math.max(1, Math.min(100, limit)))
    .map(publicProject);
}

export async function getProject(ownerId: string, id: string) {
  const state = await readState();
  const project = state.projects.find((p) => p.ownerId === ownerId && p.id === id);
  return project ? publicProject(project) : null;
}

export async function updateProject(ownerId: string, id: string, changes: Partial<ProjectInput>) {
  const state = await readState();
  const cur = state.projects.find((p) => p.ownerId === ownerId && p.id === id);
  if (!cur) return null;
  const now = new Date().toISOString();
  cur.title = (changes.title ?? cur.title).trim();
  cur.topic = (changes.topic ?? cur.topic).trim();
  if (changes.format !== undefined) cur.format = changes.format;
  if (changes.quantity !== undefined) cur.quantity = changes.quantity;
  if (changes.mode !== undefined) cur.mode = changes.mode;
  if (changes.status !== undefined) cur.status = changes.status;
  if (changes.currentStep !== undefined) cur.currentStep = changes.currentStep;
  if (changes.readyForAi !== undefined) cur.readyForAi = Boolean(changes.readyForAi);
  if (changes.ideaText !== undefined) cur.ideaText = changes.ideaText;
  if (changes.scriptText !== undefined) cur.scriptText = changes.scriptText;
  if (changes.promptsText !== undefined) cur.promptsText = changes.promptsText;
  cur.updatedAt = now;
  await writeState(state);
  return publicProject(cur);
}

export async function deleteProject(ownerId: string, id: string) {
  const state = await readState();
  const existed = state.projects.some((p) => p.ownerId === ownerId && p.id === id);
  state.jobs = state.jobs.filter((j) => !(j.ownerId === ownerId && j.projectId === id));
  state.scenes = state.scenes.filter((s) => !(s.ownerId === ownerId && s.projectId === id));
  state.projects = state.projects.filter((p) => !(p.ownerId === ownerId && p.id === id));
  if (existed) await writeState(state);
  return { id, deleted: existed };
}

export async function listScenes(ownerId: string, projectId: string) {
  const state = await readState();
  return state.scenes
    .filter((s) => s.ownerId === ownerId && s.projectId === projectId)
    .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
    .map(publicScene);
}

export async function saveScene(ownerId: string, input: SceneInput) {
  const state = await readState();
  const now = new Date().toISOString();
  const id = input.id || newId("scene");
  let item = state.scenes.find((s) => s.ownerId === ownerId && s.id === id);
  if (!item) {
    item = {
      id, ownerId, projectId: input.projectId, position: Number(input.position ?? 1), title: input.title ?? "", narration: input.narration ?? "",
      prompt: input.prompt ?? "", variant: input.variant ?? "SINGLE", status: input.status ?? "PENDING", imageUrl: input.imageUrl ?? "",
      imageFile: input.imageFile ?? "", notes: input.notes ?? "", createdAt: now, updatedAt: now,
    };
    state.scenes.push(item);
  } else {
    item.projectId = input.projectId || item.projectId;
    if (input.position !== undefined) item.position = Number(input.position);
    if (input.title !== undefined) item.title = input.title;
    if (input.narration !== undefined) item.narration = input.narration;
    if (input.prompt !== undefined) item.prompt = input.prompt;
    if (input.variant !== undefined) item.variant = input.variant;
    if (input.status !== undefined) item.status = input.status;
    if (input.imageUrl !== undefined) item.imageUrl = input.imageUrl;
    if (input.imageFile !== undefined) item.imageFile = input.imageFile;
    if (input.notes !== undefined) item.notes = input.notes;
    item.updatedAt = now;
  }
  touchProjectInState(state, ownerId, item.projectId, now);
  await writeState(state);
  return publicScene(item);
}

export async function replaceScenes(ownerId: string, projectId: string, inputs: Omit<SceneInput, "projectId">[]) {
  const state = await readState();
  const now = new Date().toISOString();
  state.jobs = state.jobs.filter((j) => !(j.ownerId === ownerId && j.projectId === projectId));
  state.scenes = state.scenes.filter((s) => !(s.ownerId === ownerId && s.projectId === projectId));
  const scenes: Scene[] = inputs.slice(0, 200).map((input, i) => ({
    id: input.id || newId("scene"), ownerId, projectId, position: Number(input.position ?? i + 1), title: input.title ?? "", narration: input.narration ?? "",
    prompt: input.prompt ?? "", variant: input.variant ?? "SINGLE", status: input.status ?? "PENDING", imageUrl: input.imageUrl ?? "",
    imageFile: input.imageFile ?? "", notes: input.notes ?? "", createdAt: now, updatedAt: now,
  }));
  state.scenes.push(...scenes);
  const project = state.projects.find((p) => p.ownerId === ownerId && p.id === projectId);
  if (project) { project.currentStep = "CENAS"; project.status = "IN_PROGRESS"; project.updatedAt = now; }
  await writeState(state);
  return scenes.map(publicScene);
}

export async function deleteScene(ownerId: string, id: string) {
  const state = await readState();
  const scene = state.scenes.find((s) => s.ownerId === ownerId && s.id === id);
  if (!scene) return { id, deleted: false };
  state.jobs = state.jobs.filter((j) => !(j.ownerId === ownerId && j.sceneId === id));
  state.scenes = state.scenes.filter((s) => !(s.ownerId === ownerId && s.id === id));
  touchProjectInState(state, ownerId, scene.projectId);
  await writeState(state);
  return { id, projectId: scene.projectId, deleted: true };
}

export async function createJobs(ownerId: string, inputs: JobInput[]) {
  const state = await readState();
  const out: Job[] = [];
  const now = new Date().toISOString();
  for (const input of inputs.slice(0, 200)) {
    const id = input.id || newId("job");
    let item = state.jobs.find((j) => j.ownerId === ownerId && j.id === id);
    if (!item) {
      item = {
        id, ownerId, projectId: input.projectId, sceneId: input.sceneId || "", type: input.type || "GENERATE_IMAGE", status: input.status || "PENDING",
        prompt: input.prompt || "", outputUrl: input.outputUrl || "", outputFile: input.outputFile || "", error: input.error || "",
        attempt: Number(input.attempt) || 0, createdAt: now, updatedAt: now,
      };
      state.jobs.push(item);
    } else {
      item.projectId = input.projectId || item.projectId;
      if (input.sceneId !== undefined) item.sceneId = input.sceneId || "";
      if (input.type !== undefined) item.type = input.type;
      if (input.status !== undefined) item.status = input.status;
      if (input.prompt !== undefined) item.prompt = input.prompt;
      if (input.outputUrl !== undefined) item.outputUrl = input.outputUrl;
      if (input.outputFile !== undefined) item.outputFile = input.outputFile;
      if (input.error !== undefined) item.error = input.error;
      if (input.attempt !== undefined) item.attempt = Number(input.attempt) || 0;
      item.updatedAt = now;
    }
    touchProjectInState(state, ownerId, item.projectId, now);
    out.push(item);
  }
  await writeState(state);
  return out.map(publicJob);
}

export async function listJobs(ownerId: string, projectId?: string, status?: string, limit = 200) {
  const state = await readState();
  return state.jobs
    .filter((j) => j.ownerId === ownerId && (!projectId || j.projectId === projectId) && (!status || j.status === status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, Math.max(1, Math.min(500, limit)))
    .map(publicJob);
}

export async function getJob(ownerId: string, id: string) {
  const state = await readState();
  const job = state.jobs.find((j) => j.ownerId === ownerId && j.id === id);
  return job ? publicJob(job) : null;
}

export async function updateJob(ownerId: string, id: string, changes: Partial<JobInput>) {
  const state = await readState();
  const job = state.jobs.find((j) => j.ownerId === ownerId && j.id === id);
  if (!job) return null;
  const now = new Date().toISOString();
  if (changes.projectId !== undefined) job.projectId = changes.projectId;
  if (changes.sceneId !== undefined) job.sceneId = changes.sceneId || "";
  if (changes.type !== undefined) job.type = changes.type;
  if (changes.status !== undefined) job.status = changes.status;
  if (changes.prompt !== undefined) job.prompt = changes.prompt;
  if (changes.outputUrl !== undefined) job.outputUrl = changes.outputUrl;
  if (changes.outputFile !== undefined) job.outputFile = changes.outputFile;
  if (changes.error !== undefined) job.error = changes.error;
  if (changes.attempt !== undefined) job.attempt = Number(changes.attempt) || 0;
  job.updatedAt = now;
  if (job.sceneId && job.outputUrl && job.status === "DONE") {
    const scene = state.scenes.find((s) => s.ownerId === ownerId && s.id === job.sceneId);
    if (scene) { scene.imageUrl = job.outputUrl; scene.imageFile = job.outputFile; scene.status = "DONE"; scene.updatedAt = now; }
  }
  touchProjectInState(state, ownerId, job.projectId, now);
  await writeState(state);
  return publicJob(job);
}

export async function retryJob(ownerId: string, id: string, prompt?: string) {
  const state = await readState();
  const job = state.jobs.find((j) => j.ownerId === ownerId && j.id === id);
  if (!job) return null;
  if (job.status === "RUNNING") throw new Error("Não é possível refazer um job enquanto ele está RUNNING. Cancele-o primeiro.");
  const now = new Date().toISOString();
  if (job.sceneId) {
    const scene = state.scenes.find((s) => s.ownerId === ownerId && s.id === job.sceneId);
    if (scene) { scene.status = "PENDING"; scene.imageUrl = ""; scene.imageFile = ""; scene.updatedAt = now; }
  }
  job.status = "PENDING"; job.prompt = prompt ?? job.prompt; job.outputUrl = ""; job.outputFile = ""; job.error = ""; job.attempt += 1; job.updatedAt = now;
  touchProjectInState(state, ownerId, job.projectId, now);
  await writeState(state);
  return publicJob(job);
}

export async function cancelJob(ownerId: string, id: string) {
  const state = await readState();
  const job = state.jobs.find((j) => j.ownerId === ownerId && j.id === id);
  if (!job) return null;
  if (job.status === "DONE") throw new Error("Job DONE não é cancelado; use refazer_job se quiser uma nova tentativa.");
  job.status = "CANCELLED"; job.updatedAt = new Date().toISOString();
  touchProjectInState(state, ownerId, job.projectId, job.updatedAt);
  await writeState(state);
  return publicJob(job);
}

export async function deleteJob(ownerId: string, id: string) {
  const state = await readState();
  const job = state.jobs.find((j) => j.ownerId === ownerId && j.id === id);
  if (!job) return { id, deleted: false };
  state.jobs = state.jobs.filter((j) => !(j.ownerId === ownerId && j.id === id));
  touchProjectInState(state, ownerId, job.projectId);
  await writeState(state);
  return { id, projectId: job.projectId, deleted: true };
}

export async function touchProject(ownerId: string, id: string) {
  const state = await readState();
  touchProjectInState(state, ownerId, id);
  await writeState(state);
}

export async function listSnapshots(ownerId: string, projectId: string, limit = 50) {
  const state = await readState();
  return state.snapshots
    .filter((s) => s.ownerId === ownerId && s.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, Math.min(200, limit)))
    .map(publicSnapshot);
}

export async function createSnapshot(ownerId: string, input: SnapshotInput) {
  const state = await readState();
  const item = snapshotFromState(state, ownerId, input);
  state.snapshots.push(item);
  const keepIds = new Set(state.snapshots
    .filter((s) => s.ownerId === ownerId && s.projectId === input.projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100)
    .map((s) => s.id));
  state.snapshots = state.snapshots.filter((s) => s.ownerId !== ownerId || s.projectId !== input.projectId || keepIds.has(s.id));
  await writeState(state);
  return publicSnapshot(item);
}

export async function getSnapshot(ownerId: string, id: string) {
  const state = await readState();
  const snap = state.snapshots.find((s) => s.ownerId === ownerId && s.id === id);
  if (!snap) return null;
  return { ...publicSnapshot(snap), project: snap.project, scenes: snap.scenes, jobs: snap.jobs };
}

export async function restoreSnapshot(ownerId: string, snapshotId: string) {
  const state = await readState();
  const snap = state.snapshots.find((s) => s.ownerId === ownerId && s.id === snapshotId);
  if (!snap) return null;
  const current = state.projects.find((p) => p.ownerId === ownerId && p.id === snap.projectId);
  if (current) state.snapshots.push(snapshotFromState(state, ownerId, { projectId: snap.projectId, label: "Antes da restauração", reason: `Snapshot de segurança antes de restaurar ${snapshotId}`, source: "system" }));
  const restoredAt = new Date().toISOString();
  state.jobs = state.jobs.filter((j) => !(j.ownerId === ownerId && j.projectId === snap.projectId));
  state.scenes = state.scenes.filter((s) => !(s.ownerId === ownerId && s.projectId === snap.projectId));
  state.projects = state.projects.filter((p) => !(p.ownerId === ownerId && p.id === snap.projectId));
  state.projects.push({ ...snap.project, ownerId, updatedAt: restoredAt });
  state.scenes.push(...snap.scenes.map((s) => ({ ...s, ownerId, updatedAt: restoredAt })));
  state.jobs.push(...snap.jobs.map((j) => ({ ...j, ownerId, updatedAt: restoredAt })));
  await writeState(state);
  return { snapshotId, projectId: snap.projectId, restored: true, restoredAt };
}

export async function deleteSnapshot(ownerId: string, id: string) {
  const state = await readState();
  const snap = state.snapshots.find((s) => s.ownerId === ownerId && s.id === id);
  if (!snap) return { id, deleted: false };
  state.snapshots = state.snapshots.filter((s) => !(s.ownerId === ownerId && s.id === id));
  await writeState(state);
  return { id, projectId: snap.projectId, deleted: true };
}

export async function getProjectFull(ownerId: string, id: string) {
  const state = await readState();
  const project = state.projects.find((p) => p.ownerId === ownerId && p.id === id);
  if (!project) return null;
  const scenes = state.scenes.filter((s) => s.ownerId === ownerId && s.projectId === id).sort((a, b) => a.position - b.position).map(publicScene);
  const jobs = state.jobs.filter((j) => j.ownerId === ownerId && j.projectId === id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(publicJob);
  const history = state.snapshots.filter((s) => s.ownerId === ownerId && s.projectId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20).map(publicSnapshot);
  return {
    ...publicProject(project), scenes, jobs, history,
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
  const state = await readState();
  const project = state.projects.find((p) => p.ownerId === ownerId && p.id === id);
  if (!project) return null;
  const scenes = state.scenes.filter((s) => s.ownerId === ownerId && s.projectId === id);
  const jobs = state.jobs.filter((j) => j.ownerId === ownerId && j.projectId === id);
  let step = "IDEIA";
  if (project.ideaText) step = "ROTEIRO";
  if (project.scriptText) step = "CENAS";
  if (scenes.length) step = "PROMPTS";
  if (scenes.some((s) => s.prompt)) step = "IMAGENS";
  if (jobs.some((j) => j.status === "PENDING" || j.status === "RUNNING")) step = "PRODUCAO";
  project.readyForAi = true; project.status = "READY"; project.currentStep = step; project.updatedAt = new Date().toISOString();
  await writeState(state);
  return publicProject(project);
}

export async function pauseProject(ownerId: string, id: string) {
  const state = await readState();
  const project = state.projects.find((p) => p.ownerId === ownerId && p.id === id);
  if (!project) return null;
  project.readyForAi = false; project.status = "PAUSED"; project.updatedAt = new Date().toISOString();
  await writeState(state);
  return publicProject(project);
}

export async function fullContext(ownerId: string) {
  const state = await readState();
  const projects = state.projects.filter((p) => p.ownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100).map(publicProject);
  const ready = projects.filter((p) => p.readyForAi);
  const pendingJobs = state.jobs.filter((j) => j.ownerId === ownerId && j.status === "PENDING").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 500).map(publicJob);
  return { counts: { projects: projects.length, ready: ready.length, pendingJobs: pendingJobs.length }, readyProjects: ready, projects, pendingJobs };
}
