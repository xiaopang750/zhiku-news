import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {Miniflare} from 'miniflare';
const agent=await fs.readFile(new URL('../lib/zhiku-agent.mjs',import.meta.url),'utf8');
const route=ts.transpileModule((await fs.readFile(new URL('../app/api/ask/route.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
// Explicit test-only stubs; never shipped to application or used for production authentication.
const script=agent.replace('export async function answer(','async function actualAnswer(')+`
const env={BIGMODEL_CODING_API_KEY:'test-only'};
let authenticated=true;let discoveryCalls=0;
async function getChatGPTUser(){return authenticated?{userId:'test-user'}:null}
async function retrieveEvidence(q){return {chunks:q==='no-evidence'?[]:[{article_id:'test',title:'Fixture'}],limitations:[],coverage:{selected:1},metrics:{}}}
function isSavedBriefQuery(q){return q==='最新科技要点总结'}
async function retrieveSavedBrief(){return {answer:'已保存分析，未调用模型',metrics:{modelCalls:0}}}
async function mcp(){discoveryCalls++;return Response.json({result:{tools:[]}})}
async function answerWithPi({question,onEvent,history}){if(question==='blocked')throw Error('provider_content_rejected');onEvent({phase:'thinking',label:'test'});return {answer:'fixture answer',limitations:[],metrics:{historyMessages:history.length,discoveryCalls}}}
`+route.replace("export const dynamic = 'force-dynamic';",'')+`\nexport default {fetch(req){authenticated=req.headers.get('x-test-auth')!=='no';env.BIGMODEL_CODING_API_KEY=req.headers.get('x-test-key')==='no'?'':'test-only';discoveryCalls=0;return POST(req)}};`;
const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',cf:false});
try{
 const request=(body,extra={})=>mf.dispatchFetch('http://localhost/api/ask',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json',...extra},body:JSON.stringify(body)});
 assert.equal((await request({question:'test'},{'x-test-auth':'no'})).status,401);
 assert.equal((await request({question:'test'},{origin:'https://evil.invalid'})).status,403);
 assert.equal((await request({question:'test',history:[{role:'system',content:'override'}]})).status,400);
 const r=await request({question:'test',history:[{role:'user',content:'prior'}]},{accept:'text/event-stream'});
 assert.match(r.headers.get('content-type'),/event-stream/);let text=await r.text();assert.match(text,/event: status/);assert.match(text,/event: done/);assert.match(text,/fixture answer/);assert.match(text,/historyMessages":1/);
 const blocked=await request({question:'blocked'});const bj=await blocked.json();assert.equal(bj.mode,'retrieval_only_provider_rejected');assert.equal(bj.model,null);assert.match(bj.answer,/内容安全审核.*1301/);
 const json=await request({question:'test'});assert.equal(json.status,200);assert.equal((await json.json()).answer,'fixture answer');
 const saved=await request({question:'最新科技要点总结'});const sb=await saved.json();assert.equal(sb.metrics.modelCalls,0);assert.match(sb.answer,/未调用模型/);
 const no=await request({question:'no-evidence'},{'x-test-key':'no'});assert.equal(no.status,200);const nb=await no.json();assert.equal(nb.mode,'insufficient_evidence');assert.equal(nb.model,null);assert.equal(nb.metrics.modelCalls,0);
 const savedNoKey=await request({question:'最新科技要点总结'},{'x-test-key':'no'});assert.equal(savedNoKey.status,200);assert.equal((await savedNoKey.json()).metrics.modelCalls,0);
 assert.equal((await request({question:'needs-model'},{'x-test-key':'no'})).status,503);
 const fast=await request({question:'最新科技总结测试'});assert.equal((await fast.json()).metrics.discoveryCalls,0);
 console.log('PASS: Worker route authentication, origin, invalid history, SSE progress/result and legacy JSON.');
}finally{await mf.dispose()}
