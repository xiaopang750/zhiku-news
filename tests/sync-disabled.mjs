import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {Miniflare} from 'miniflare';
const src=await fs.readFile(new URL('../app/api/sync/route.ts',import.meta.url),'utf8');
const route=ts.transpileModule(src.replace("import { env } from 'cloudflare:workers';",''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const script=`let env;${route}\nexport default {fetch(req,bindings){env=bindings;return POST(req)}}`;
const token='test-only-secret-not-for-production-123456';
for(const configured of [false,true]){
 const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',cf:false,d1Databases:['DB'],bindings:configured?{SYNC_WRITE_TOKEN:token}:{}});
 try{
 const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE articles(id TEXT PRIMARY KEY,title TEXT,source TEXT,category TEXT,published_at TEXT,status TEXT,updated_at TEXT,payload TEXT)').run();
 const call=(body,auth)=>mf.dispatchFetch('http://localhost/api/sync',{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'Bearer '+auth}:{})},body:JSON.stringify(body)});
 const body={articles:[{id:'fixture',title:'Safe fixture'}],expected_sha256:null};
 assert.equal((await call(body)).status,configured?401:503);
 assert.equal((await call(body,'invalid')).status,configured?401:503);
 assert.equal((await db.prepare('SELECT count(*) n FROM articles').first()).n,0);
 if(!configured)continue;
 assert.equal((await call({...body,run:{}},token)).status,400);
 const [a,b]=await Promise.all([call(body,token),call(body,token)]);assert.deepEqual([a.status,b.status].sort(),[200,409]);
 const good=await (a.status===200?a:b).json();
 assert.equal((await call(body,token)).status,409);
 const update={articles:[{id:'fixture',title:'Revised fixture'}],expected_sha256:good.sha256};
 const results=await Promise.all([call(update,token),call({...update,articles:[{id:'fixture',title:'Concurrent edit'}]},token)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal((await db.prepare('SELECT count(*) n FROM articles').first()).n,1);
 console.log('PASS: D1 atomic create/update race protection, invalid/absent auth, absent configuration, no run-state updates');
 }finally{await mf.dispose()}
}
