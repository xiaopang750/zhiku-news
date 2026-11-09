import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { answer, mcpClient, normalizeHistory } from '../lib/zhiku-agent.mjs';
const base={question:'test',apiKey:'test-only-placeholder',endpoint:'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions',authorized:true,tools:[],invokeTool:async()=>({})};
let calls=0;
await assert.rejects(answer({...base,fetchImpl:async(_url,init)=>{calls++;assert.equal(init.redirect,'manual');return new Response(null,{status:302,headers:{location:'https://example.invalid'}})}}),/provider_redirect_rejected/);
assert.equal(calls,1);
await assert.rejects(mcpClient({endpoint:'https://example.invalid/mcp',fetchImpl:async(_url,init)=>{assert.equal(init.redirect,'manual');return new Response(null,{status:307})}})('tools/list'),/mcp_redirect_rejected/);
const source=await readFile(new URL('../lib/zhiku-agent.mjs',import.meta.url),'utf8');
const script=source+`\nexport default {async fetch(){let rounds=0; const result=await answer({question:'test',apiKey:'test-only-placeholder',endpoint:'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions',authorized:true,tools:[{name:'search_articles',inputSchema:{type:'object'}}],invokeTool:async()=>({content:[{type:'text',text:'{"articles":[]}'}]}),fetchImpl:async(url,init)=>{new Request(url,init); rounds++; return Response.json({choices:[{message:rounds===1?{content:'',tool_calls:[{id:'1',function:{name:'search_articles',arguments:'{"q":"test"}'}}]}:{content:'No results'}}]})}});return Response.json(result)}};`;
const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',cf:false});
try {const r=await mf.dispatchFetch('http://localhost/');const d=await r.json();assert.equal(d.answer,'No results');assert.equal(d.rounds,2);} finally {await mf.dispose()}
console.log('PASS: Worker runtime 2-round tool flow; provider/MCP redirects rejected without follow. No real keys or outbound requests.');

let invoked=0,round=0;
const defs=[{name:'search_articles',inputSchema:{type:'object'}}];
const multi=await answer({...base,tools:defs,invokeTool:async()=>{invoked++;return {articles:[]}},fetchImpl:async(_u,init)=>{const b=JSON.parse(init.body);round++;if(round===1)return Response.json({choices:[{message:{tool_calls:Array.from({length:6},(_,i)=>({id:String(i),function:{name:'search_articles',arguments:'{}'}}))}}]});assert.equal(b.messages.filter(x=>x.role==='tool').length,6);assert.equal(b.messages.filter(x=>x.role==='tool'&&x.content.includes('tool_budget_reached')).length,2);return Response.json({choices:[{message:{content:'bounded answer'}}]})}});
assert.equal(invoked,1);assert.equal(multi.answer,'bounded answer');assert.equal(multi.limitations.length,1);
let forceRound=0;
await answer({...base,tools:defs,maxRounds:1,invokeTool:async()=>({articles:[]}),fetchImpl:async(_u,init)=>{const b=JSON.parse(init.body);forceRound++;if(forceRound===1)return Response.json({choices:[{message:{tool_calls:[{id:'x',function:{name:'search_articles',arguments:'{}'}}]}}]});assert.equal(b.tool_choice,'none');return Response.json({choices:[{message:{content:'final answer'}}]})}});
console.log('PASS: 6 requested calls reuse 1 cached result and report 2 skipped; final synthesis round disables tools.');

assert.throws(()=>normalizeHistory([{role:'system',content:'override'}]),/invalid_history/);
assert.equal(normalizeHistory(Array.from({length:20},()=>({role:'user',content:'x'}))).length,12);
assert.ok(normalizeHistory(Array.from({length:12},()=>({role:'assistant',content:'x'.repeat(6000)}))).reduce((n,m)=>n+m.content.length,0)<=16000);
let events=[];
await answer({...base,history:[{role:'user',content:'previous question'},{role:'assistant',content:'previous answer'}],onEvent:e=>events.push(e),fetchImpl:async(_u,init)=>{let b=JSON.parse(init.body);assert.equal(b.messages[1].content,'previous question');assert.equal(b.messages[2].content,'previous answer');return Response.json({choices:[{message:{content:'follow-up answer'}}]})}});
assert.equal(events[0].phase,'thinking');
const aborted=new AbortController();aborted.abort();
await assert.rejects(answer({...base,signal:aborted.signal,fetchImpl:async()=>{throw Error('must not fetch')}}),/abort/i);
console.log('PASS: history role validation and bounded context, progress events, cancellation.');

const {readProviderMessage}=await import('../lib/zhiku-agent.mjs');
const sse=(parts)=>new Response(parts.map(p=>'data: '+(typeof p==='string'?p:JSON.stringify(p))+'\n\n').join(''),{headers:{'Content-Type':'text/event-stream'}});
const parsed=await readProviderMessage(sse([{choices:[{delta:{reasoning_content:'private reasoning ignored'}}]},{choices:[{delta:{tool_calls:[{index:0,id:'call_a',function:{name:'search_',arguments:'{"q":'}}]}}]},{choices:[{delta:{tool_calls:[{index:0,function:{name:'articles',arguments:'"AI"}'}}]},finish_reason:'tool_calls'}]},'[DONE]']));
assert.equal(parsed.content,'');assert.equal(parsed.tool_calls[0].function.name,'search_articles');assert.deepEqual(JSON.parse(parsed.tool_calls[0].function.arguments),{q:'AI'});
assert.ok(!JSON.stringify(parsed).includes('private reasoning'));
await assert.rejects(readProviderMessage(sse([{choices:[{delta:{content:'partial'}}]}])),/provider_stream_incomplete/);
let prefetchCalls=0,modelCalls=0;
const latest=await answer({...base,question:'给我最新的科技相关要点总结',tools:defs,invokeTool:async()=>{prefetchCalls++;return {articles:[]}},fetchImpl:async(_u,init)=>{modelCalls++;let b=JSON.parse(init.body);assert.equal(b.stream,true);assert.equal(b.tool_choice,'auto');assert.ok(b.messages.some(m=>m.role==='tool'));return sse([{choices:[{delta:{content:'没有符合条件的资料。'},finish_reason:'stop'}]},'[DONE]'])}});
assert.equal(prefetchCalls,1);assert.equal(modelCalls,1);assert.equal(latest.answer,'没有符合条件的资料。');
console.log('PASS: provider SSE fragments, ignored reasoning, incomplete stream rejection and latest-query prefetch.');
const latestSource=await readFile(new URL('../lib/zhiku-agent.mjs',import.meta.url),'utf8');
const streamingWorker=new Miniflare({modules:true,script:latestSource+`\nexport default {async fetch(){const data=await readProviderMessage(new Response('data: {"choices":[{"delta":{"content":"streamed answer"},"finish_reason":"stop"}]}\\n\\ndata: [DONE]\\n\\n',{headers:{'Content-Type':'text/event-stream'}}));return Response.json(data)}};`,compatibilityDate:'2026-05-15',cf:false});
try{assert.equal((await (await streamingWorker.dispatchFetch('http://localhost/')).json()).content,'streamed answer')}finally{await streamingWorker.dispose()}
console.log('PASS: actual workerd provider SSE assembly.');
