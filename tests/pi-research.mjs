import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {answerWithPi} from '../lib/pi-research.mjs';
const base={question:'最新科技要点',authorized:true,apiKey:'test-only',endpoint:'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions',evidence:{chunks:[{text:'source evidence'}]}};
const reply=m=>Response.json({choices:[{message:m}]});
let calls=0;
const result=await answerWithPi({...base,fetchImpl:async(_u,i)=>{calls++;const b=JSON.parse(i.body);assert.equal(b.stream,true);assert.ok(b.messages[0].role==='system');assert.equal(b.messages.filter(m=>m.role==='system').length,1);assert.match(b.messages[0].content,/主题相关不等于包含答案/);assert.ok(b.messages.at(-1).content.includes('source evidence'));return reply({content:'answer'});}});
assert.equal(result.answer,'answer');assert.equal(calls,1);assert.equal(result.metrics.engine,'pi-agent-core-1.5.0');
let round=0,invoked=0;
const tools=[{name:'read_article',description:'read',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id']}}];
await answerWithPi({...base,tools,invokeTool:async()=>{invoked++;return {text:'extra'};},fetchImpl:async(_u,i)=>{const b=JSON.parse(i.body);if(++round===1)return reply({tool_calls:[{id:'a',function:{name:'read_article',arguments:'{"id":"a"}'}}]});assert.equal(b.tool_choice,'none');assert.ok(b.messages.some(m=>m.role==='tool'&&m.content.includes('extra')));return reply({content:'verified'});}});
assert.equal(invoked,1);assert.equal(round,2);
await assert.rejects(answerWithPi({...base,fetchImpl:async()=>new Response(null,{status:302})}),/provider_redirect_rejected/);
await assert.rejects(answerWithPi({...base,fetchImpl:async()=>reply({tool_calls:[{id:'x',function:{name:'delete_article',arguments:'{}'}}]})}),/tool_not_allowed/);
await assert.rejects(answerWithPi({...base,authorized:false}),/not_authorized/);
await assert.rejects(answerWithPi({...base,endpoint:'https://example.com'}),/invalid_provider_endpoint/);
// Bundle the real installed Pi package and execute inside workerd, with only mock provider IO.
const bundled=await build({stdin:{contents:`import {answerWithPi} from './lib/pi-research.mjs'; export default {async fetch(){const result=await answerWithPi(${JSON.stringify(base).slice(0,-1)},fetchImpl:async()=>Response.json({choices:[{message:{content:'worker answer'}}]})});return Response.json(result)}}`,resolveDir:process.cwd(),sourcefile:'pi-worker.js'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
const mf=new Miniflare({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-05-15',cf:false});
try{const r=await mf.dispatchFetch('http://localhost');assert.equal((await r.json()).answer,'worker answer');}finally{await mf.dispose();}
console.log('PASS actual Pi 1.5.0: one-call evidence answer, bounded extra read, endpoint/redirect/whitelist validation, real workerd bundle. No external requests.');
let manyRound=0,manyInvoked=0;
const many=await answerWithPi({...base,tools,invokeTool:async()=>{manyInvoked++;return {text:'extra'}},fetchImpl:async()=>++manyRound===1?reply({tool_calls:Array.from({length:5},(_,i)=>({id:'many'+i,function:{name:'read_article',arguments:JSON.stringify({id:String(i)})}}))}):reply({content:'bounded result'})});
assert.equal(manyInvoked,2);assert.equal(many.rounds,2);assert.ok(many.limitations.length);
console.log('PASS: excess Pi tool requests are budgeted rather than causing an entire-response failure.');
await answerWithPi({...base,maxRounds:0,reasoningEffort:'low',maxOutputTokens:1200,fetchImpl:async(_u,i)=>{const b=JSON.parse(i.body);assert.equal(b.tool_choice,'none');assert.equal(b.reasoning_effort,'low');assert.equal(b.max_tokens,1200);return reply({content:'quick evidence summary'})}});
console.log('PASS: fast brief uses one synthesis call, no tools, explicit low reasoning and bounded output.');

for(const code of ['1210','secret-like-value']){const traces=[];await assert.rejects(answerWithPi({...base,onTrace:x=>traces.push(x),fetchImpl:async()=>Response.json({error:{code,message:'NEVER_LOG_SECRET_OR_ARTICLE'}},{status:400})}),/provider_http_400/);const diagnostic=traces.find(x=>x.stage==='provider_rejected');assert.equal(diagnostic.providerCode,code==='1210'?'1210':null);assert(!JSON.stringify(traces).includes('NEVER_LOG'));assert(!JSON.stringify(traces).includes('secret-like'));}
console.log('PASS: exactly one Pi-injected system instruction and numeric-only bounded provider diagnostics.');

await assert.rejects(answerWithPi({...base,fetchImpl:async()=>Response.json({error:{code:'1301'}},{status:400})}),/provider_content_rejected/);
