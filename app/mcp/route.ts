import type { JobInput, ProjectInput, SceneInput } from "../../lib/corvo-store";
export const dynamic="force-dynamic";

const rw={readOnlyHint:false,destructiveHint:false,openWorldHint:false},ro={readOnlyHint:true,destructiveHint:false,openWorldHint:false},del={readOnlyHint:false,destructiveHint:true,openWorldHint:false};
const idSchema={type:"object",properties:{id:{type:"string"}},required:["id"],additionalProperties:false};
const projectProps={title:{type:"string"},topic:{type:"string"},format:{type:"string",enum:["REELS","VÍDEO COMPLETO"]},quantity:{type:"string",enum:["1 VÍDEO","LOTE"]},mode:{type:"string",enum:["RÁPIDO","PESQUISAR ANTES"]},status:{type:"string"},currentStep:{type:"string"},readyForAi:{type:"boolean"},ideaText:{type:"string"},scriptText:{type:"string"},promptsText:{type:"string"}};
const sceneProps={id:{type:"string"},position:{type:"integer",minimum:1},title:{type:"string"},narration:{type:"string"},prompt:{type:"string"},variant:{type:"string",enum:["SINGLE","A","B"]},status:{type:"string"},imageUrl:{type:"string"},imageFile:{type:"string"},notes:{type:"string"}};
const jobProps={id:{type:"string"},projectId:{type:"string"},sceneId:{type:"string"},type:{type:"string"},status:{type:"string"},prompt:{type:"string"},outputUrl:{type:"string"},outputFile:{type:"string"},error:{type:"string"},attempt:{type:"integer",minimum:0}};

const tools=[
{name:"obter_contexto_corvo",title:"Obter contexto do Corvo",description:"Lê projetos liberados para IA, projetos recentes e jobs pendentes. Use primeiro para descobrir o trabalho atual.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:ro},
{name:"listar_projetos",title:"Listar projetos",description:"Lista os projetos do Roteiro, do mais recente ao mais antigo.",inputSchema:{type:"object",properties:{limit:{type:"integer",minimum:1,maximum:100}},additionalProperties:false},annotations:ro},
{name:"criar_projeto",title:"Criar projeto",description:"Cria um novo projeto de vídeo no Corvo.",inputSchema:{type:"object",properties:projectProps,required:["title"],additionalProperties:false},annotations:rw},
{name:"obter_projeto",title:"Obter projeto completo",description:"Lê projeto, ideia, roteiro, cenas, prompts, imagens e jobs em uma única chamada.",inputSchema:idSchema,annotations:ro},
{name:"atualizar_projeto",title:"Atualizar projeto",description:"Atualiza metadados ou estado de um projeto existente.",inputSchema:{type:"object",properties:{id:{type:"string"},changes:{type:"object",properties:projectProps,additionalProperties:false}},required:["id","changes"],additionalProperties:false},annotations:rw},
{name:"salvar_artefato",title:"Salvar ideia, roteiro ou prompts",description:"Salva um artefato textual no projeto e atualiza a etapa correspondente.",inputSchema:{type:"object",properties:{id:{type:"string"},kind:{type:"string",enum:["IDEIA","ROTEIRO","PROMPTS"]},text:{type:"string"}},required:["id","kind","text"],additionalProperties:false},annotations:rw},
{name:"substituir_cenas",title:"Salvar estrutura de cenas",description:"Substitui a lista de cenas do projeto pela estrutura informada. Use após definir o roteiro visual.",inputSchema:{type:"object",properties:{projectId:{type:"string"},scenes:{type:"array",minItems:1,maxItems:200,items:{type:"object",properties:sceneProps,additionalProperties:false}}},required:["projectId","scenes"],additionalProperties:false},annotations:rw},
{name:"atualizar_cena",title:"Atualizar cena",description:"Atualiza narração, prompt, variante, status ou resultado de imagem de uma cena.",inputSchema:{type:"object",properties:{projectId:{type:"string"},scene:{type:"object",properties:sceneProps,required:["id"],additionalProperties:false}},required:["projectId","scene"],additionalProperties:false},annotations:rw},
{name:"iniciar_projeto",title:"Liberar projeto para o Corvo",description:"Marca o projeto como READY e pronto para ser conduzido pelo ChatGPT. Não chama API de IA; apenas grava o comando no Core.",inputSchema:idSchema,annotations:rw},
{name:"pausar_projeto",title:"Pausar projeto",description:"Remove a liberação para IA e marca o projeto como pausado.",inputSchema:idSchema,annotations:rw},
{name:"criar_jobs",title:"Criar jobs",description:"Cria jobs executáveis, normalmente de geração ou refinamento de imagem, para o Corvo Agent consumir.",inputSchema:{type:"object",properties:{jobs:{type:"array",minItems:1,maxItems:200,items:{type:"object",properties:jobProps,required:["projectId"],additionalProperties:false}}},required:["jobs"],additionalProperties:false},annotations:rw},
{name:"listar_jobs",title:"Listar jobs",description:"Lista jobs por projeto e/ou status para acompanhar a produção.",inputSchema:{type:"object",properties:{projectId:{type:"string"},status:{type:"string"},limit:{type:"integer",minimum:1,maximum:500}},additionalProperties:false},annotations:ro},
{name:"atualizar_job",title:"Atualizar job",description:"Atualiza o estado/resultado de um job. Quando um job DONE tem sceneId e outputUrl, a imagem também é ligada automaticamente à cena.",inputSchema:{type:"object",properties:{id:{type:"string"},changes:{type:"object",properties:jobProps,additionalProperties:false}},required:["id","changes"],additionalProperties:false},annotations:rw},
{name:"excluir_projeto",title:"Excluir projeto",description:"Exclui projeto, cenas e jobs definitivamente. Use somente quando o usuário pedir explicitamente.",inputSchema:idSchema,annotations:del}
];

const headers={"MCP-Protocol-Version":"2025-03-26","Access-Control-Allow-Origin":"*"};
const ok=(id:unknown,result:unknown)=>Response.json({jsonrpc:"2.0",id,result},{headers});
const fail=(id:unknown,code:number,message:string,status=200)=>Response.json({jsonrpc:"2.0",id,error:{code,message}},{status,headers});

export async function POST(request:Request){
 const s=await import("../../lib/corvo-store"),auth=s.authorize(request);if(!auth.ok)return fail(null,-32001,"Não autorizado. Confira a conexão do Corvo.",401);
 let body:{id?:unknown;method?:string;params?:{name?:string;arguments?:Record<string,unknown>}};try{body=await request.json()}catch{return fail(null,-32700,"JSON inválido",400)}
 if(body.method==="initialize")return ok(body.id,{protocolVersion:"2025-03-26",capabilities:{tools:{listChanged:false}},serverInfo:{name:"corvo-roteiro",version:"0.1.0"},instructions:"Você é o orquestrador único do Corvo. O app é a fonte de verdade de projetos, roteiro, cenas e jobs. Comece por obter_contexto_corvo. Quando houver projeto readyForAi=true, leia-o por completo e continue a etapa atual. Salve cada artefato no Core assim que estiver definido. Não dependa da memória da conversa para estado persistente. Jobs de imagem são executados externamente pelo Corvo Agent; crie-os e acompanhe-os pelas ferramentas. Só exclua quando o usuário pedir explicitamente."});
 if(body.method==="notifications/initialized")return new Response(null,{status:202,headers});if(body.method==="ping")return ok(body.id,{});if(body.method==="tools/list")return ok(body.id,{tools});if(body.method!=="tools/call")return fail(body.id,-32601,"Método não encontrado");
 const name=body.params?.name,args=body.params?.arguments||{};try{let data:unknown,text="";
 if(name==="obter_contexto_corvo"){data=await s.fullContext(auth.ownerId);text="Contexto do Corvo carregado.";}
 else if(name==="listar_projetos"){const projects=await s.listProjects(auth.ownerId,Number(args.limit)||100);data={projects};text=`${projects.length} projeto(s) encontrado(s).`;}
 else if(name==="criar_projeto"){const project=await s.createProject(auth.ownerId,args as ProjectInput,"chatgpt");data={project};text="Projeto criado.";}
 else if(name==="obter_projeto"){const project=await s.getProjectFull(auth.ownerId,String(args.id||""));data={project};text=project?"Projeto completo carregado.":"Projeto não encontrado.";}
 else if(name==="atualizar_projeto"){const project=await s.updateProject(auth.ownerId,String(args.id||""),(args.changes as Partial<ProjectInput>)||{});data={project};text=project?"Projeto atualizado.":"Projeto não encontrado.";}
 else if(name==="salvar_artefato"){const id=String(args.id||""),kind=String(args.kind||""),value=String(args.text||"");const changes:Partial<ProjectInput>=kind==="IDEIA"?{ideaText:value,currentStep:"ROTEIRO",status:"IN_PROGRESS"}:kind==="ROTEIRO"?{scriptText:value,currentStep:"CENAS",status:"IN_PROGRESS"}:{promptsText:value,currentStep:"IMAGENS",status:"IN_PROGRESS"};const project=await s.updateProject(auth.ownerId,id,changes);data={project};text=`${kind} salvo.`;}
 else if(name==="substituir_cenas"){const scenes=await s.replaceScenes(auth.ownerId,String(args.projectId||""),((args.scenes as Omit<SceneInput,"projectId">[])||[]));data={scenes};text=`${scenes.length} cena(s) salva(s).`;}
 else if(name==="atualizar_cena"){const sceneArg=(args.scene as Omit<SceneInput,"projectId">)||{};const scene=await s.saveScene(auth.ownerId,{...sceneArg,projectId:String(args.projectId||"")} as SceneInput);data={scene};text="Cena atualizada.";}
 else if(name==="iniciar_projeto"){const project=await s.startProject(auth.ownerId,String(args.id||""));data={project};text="Projeto liberado para o Corvo.";}
 else if(name==="pausar_projeto"){const project=await s.pauseProject(auth.ownerId,String(args.id||""));data={project};text="Projeto pausado.";}
 else if(name==="criar_jobs"){const jobs=await s.createJobs(auth.ownerId,(args.jobs as JobInput[])||[]);data={jobs};text=`${jobs.length} job(s) criado(s).`;}
 else if(name==="listar_jobs"){const jobs=await s.listJobs(auth.ownerId,String(args.projectId||"")||undefined,String(args.status||"")||undefined,Number(args.limit)||200);data={jobs};text=`${jobs.length} job(s) encontrado(s).`;}
 else if(name==="atualizar_job"){const job=await s.updateJob(auth.ownerId,String(args.id||""),(args.changes as Partial<JobInput>)||{});data={job};text=job?"Job atualizado.":"Job não encontrado.";}
 else if(name==="excluir_projeto"){data=await s.deleteProject(auth.ownerId,String(args.id||""));text="Projeto excluído.";}
 else return fail(body.id,-32602,"Ferramenta desconhecida");
 return ok(body.id,{content:[{type:"text",text}],structuredContent:data});}catch(error){return fail(body.id,-32000,error instanceof Error?error.message:"Falha inesperada",500)}
}
export async function GET(){return new Response("Use MCP Streamable HTTP via POST.",{status:405,headers:{Allow:"POST"}})}
export async function OPTIONS(){return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,authorization,mcp-protocol-version","Access-Control-Allow-Methods":"POST,OPTIONS"}})}
