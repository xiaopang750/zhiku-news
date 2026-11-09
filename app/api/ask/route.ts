import { env } from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {POST as mcp} from '../../mcp/route';
import {normalizeHistory} from '../../../lib/zhiku-agent.mjs';
import {answerWithPi} from '../../../lib/pi-research.mjs';
import {retrieveEvidence,retrieveSavedBrief} from '../../../lib/rag-store';
import {isSavedBriefQuery} from '../../../lib/saved-brief.mjs';
export const dynamic='force-dynamic';
// Best-effort isolate guard, not a distributed rate limiter.
const active=new Set<string>();
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
function friendly(e:unknown){
 const code=e instanceof Error?e.message:'';
 if(code==='provider_content_rejected')return '智谱内容安全审核拒绝了本次请求（1301），未生成回答。该代码未说明具体触发内容；重复提交相同请求通常无法解决。你仍可在文章列表查看原资料。';
 if(code==='model_not_configured')return '服务端模型密钥尚未配置；无需模型的检索提示与已核验摘要仍可使用。';
 const safeCode=/^(provider_http_\d{3}|provider_redirect_rejected|tool_failed|invalid_search|invalid_provider_response|empty_answer|invalid_tool_arguments|tool_not_allowed|agent_round_limit|client_cancelled|model_total_timeout|provider_stream_error|provider_stream_incomplete|provider_response_too_large)$/.test(code)?code:(e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'request_timeout':'unexpected_runtime_error');
 console.error('ask_failed',{code:safeCode});
 if(safeCode==='client_cancelled')return '本次请求已停止，已完成的对话仍保留。';
 if(safeCode==='model_total_timeout')return '模型在本次处理时间内未完成回答。请稍后重试，或指定一个主题以减少检索范围。';
 if(safeCode==='provider_stream_incomplete')return '模型连接中断，尚未收到完整回答。请重试。';
 if(safeCode==='request_timeout')return '这次处理超时或已停止。你可以重试，或将问题拆成两步。';
 if(code.startsWith('provider_http_'))return '模型服务暂时未完成请求，请稍后重试。';
 return '本次回答未完成，你的对话仍保留。请重试这条问题。';
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'请先登录。'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'请求来源不正确。'},403);
 if(active.has(user.userId))return reply({error:'上一条问题还在处理中，请稍候再试。'},429);
 let question:string,history:any[];
 try{const raw=await req.text();if(raw.length>64000)return reply({error:'对话内容过长，请新建对话。'},413);const b=JSON.parse(raw);question=b.question;history=normalizeHistory(b.history??[]);if(typeof question!=='string'||!question.trim()||question.length>4000)throw Error()}catch{return reply({error:'请填写 1–4000 字的问题，并使用有效对话历史。'},400)}
 const key=(env as any).BIGMODEL_CODING_API_KEY;
 const abort=new AbortController();
 const onAbort=()=>abort.abort();req.signal.addEventListener('abort',onAbort,{once:true});
 active.add(user.userId);
 const cleanup=()=>{active.delete(user.userId);req.signal.removeEventListener('abort',onAbort)};
 async function run(onEvent:(data:any)=>void){
  const requestStarted=Date.now();
  const sources=new Map<string,any>();
  async function rpc(method:string,params:any={}){const r=await mcp(new Request(new URL('/mcp',req.url),{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));const b:any=await r.json();if(b.error||b.result?.isError)throw Error('tool_failed');return b.result}
  const evidence=await retrieveEvidence(question,history,onEvent);
  for(const c of evidence.chunks)sources.set(c.article_id,{id:c.article_id,title:c.title,source:c.source});
  if(!evidence.chunks.length)return {answer:'当前知识库未召回足够相关的正文证据，暂不能给出可靠总结。请换一个更具体的主题或关键词。',sources:[],limitations:evidence.limitations,model:null,mode:'insufficient_evidence',metrics:{...evidence.metrics,modelCalls:0},rag:evidence.coverage};
  if(isSavedBriefQuery(question,history)){
   onEvent({phase:'verifying',label:'正在核对已保存分析与原文引文'});
   const saved=await retrieveSavedBrief(evidence);
   if(saved)return {...saved,metrics:{...saved.metrics,elapsedMs:Date.now()-requestStarted,rag:evidence.metrics}};
  }
  if(!key)throw Error('model_not_configured');
  const fastBrief=question.length<3800&&/最新/.test(question)&&/科技|技术/.test(question)&&/要点|总结|概括/.test(question);
  const available=fastBrief?{tools:[]}:await rpc('tools/list');
  const result=await answerWithPi({question:fastBrief?question+'（请用三个简明要点总结，每点给出来源和发表日期；不扩展到未检索资料。）':question,history,evidence,maxRounds:fastBrief?0:1,reasoningEffort:fastBrief?'low':'high',maxOutputTokens:fastBrief?1200:2000,signal:abort.signal,onEvent,onTrace:(data:any)=>console.info('ask_stage',data),apiKey:key,endpoint:'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions',model:'glm-5.3',authorized:true,tools:available.tools,invokeTool:async(name:string,args:any)=>{
   if(name==='search_articles'&&args.q!==undefined&&(typeof args.q!=='string'||args.q.length>200))throw Error('invalid_search');
   // Bound default reads. Pagination metadata remains intact for truthful partial-read reporting.
   if(name==='read_article')args.limit=Number.isInteger(args.limit)?Math.min(args.limit,4000):4000;
   const data=await rpc('tools/call',{name,arguments:args});
   for(const block of data.content||[])if(block.type==='text'){try{const d=JSON.parse(block.text);for(const a of d.articles||[])sources.set(a.id,{id:a.id,title:a.title_zh||a.title,source:a.source});if(d.id&&d.title)sources.set(d.id,{id:d.id,title:d.title})}catch{}}
   return data;
  }}).catch((e:unknown)=>{
   if(!(e instanceof Error)||e.message!=='provider_content_rejected')throw e;
   return {answer:'智谱内容安全审核拒绝了本次请求（1301），未生成回答，也不会自动重试。以下仅为此前检索命中的资料入口，不是问题答案：\n\n'+[...new Map(evidence.chunks.map((c:any)=>[c.article_id,c])).values()].map((c:any)=>`- ${c.title}｜${c.source||'来源未记录'}\n${c.site_url}`).join('\n\n'),mode:'retrieval_only_provider_rejected',limitations:['模型审核拒绝；下列资料仅为检索命中，未进行生成式总结或核验是否回答问题。'],metrics:{modelRejected:true}};
  });
  return {...result,limitations:[...new Set([...evidence.limitations,...(result.limitations||[])])],sources:[...sources.values()],model:(result as any).mode==='retrieval_only_provider_rejected'?null:'GLM-5.3',rag:evidence.coverage,metrics:{...result.metrics,rag:evidence.metrics}};
 }
 if(!req.headers.get('accept')?.includes('text/event-stream')){
  try{return reply(await run(()=>{}))}catch(e){return reply({error:friendly(e)},e instanceof Error&&e.message==='model_not_configured'?503:502)}finally{cleanup()}
 }
 const encoder=new TextEncoder();let closed=false;
 const stream=new ReadableStream({
  start(controller){
   const emit=(event:string,data:any)=>{if(!closed)try{controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))}catch{closed=true;abort.abort()}};
   emit('status',{phase:'starting',label:'已接收，正在准备检索'});
   const heartbeat=setInterval(()=>{if(!closed)try{controller.enqueue(encoder.encode(': keepalive\n\n'))}catch{closed=true;abort.abort()}},15000);
   void run(data=>emit('status',data)).then(data=>emit('done',data)).catch(e=>emit('error',{error:friendly(e)})).finally(()=>{clearInterval(heartbeat);cleanup();if(!closed){closed=true;controller.close()}});
  },
  cancel(){closed=true;abort.abort();cleanup()}
 });
 return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'private, no-store, no-transform','X-Accel-Buffering':'no'}});
}
