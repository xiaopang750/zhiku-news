import { env } from 'cloudflare:workers';
// D1 permits at most 2,000,000 bytes per row/string. Keep payload <=1.5 MB
// and metadata bounded, leaving ample room for duplicated indexed fields.
// https://developers.cloudflare.com/d1/platform/limits/
const MAX_BODY_BYTES=5_000_000, MAX_ARTICLE_BYTES=1_500_000;
const bytes=(s:string)=>new TextEncoder().encode(s).byteLength;
async function readBounded(req:Request){
 const reader=req.body?.getReader();if(!reader)return '';
 const chunks:Uint8Array[]=[];let total=0;
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_BODY_BYTES){await reader.cancel();throw new RangeError('Batch too large')}chunks.push(value)}
 const all=new Uint8Array(total);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.byteLength}return new TextDecoder('utf-8',{fatal:true}).decode(all);
}
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function POST(req: Request) {
 const secret=(env as any).SYNC_WRITE_TOKEN;
 if(typeof secret!=='string'||secret.length<32)return Response.json({error:'sync_not_configured'},{status:503});
 const auth=req.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer ')||auth.length>512)return Response.json({error:'Unauthorized'},{status:401});
 const supplied=await digest(auth.slice(7)),expected=await digest(secret);let mismatch=0;
 for(let i=0;i<64;i++)mismatch|=supplied.charCodeAt(i)^expected.charCodeAt(i);
 if(mismatch)return Response.json({error:'Unauthorized'},{status:401});
 const origin=req.headers.get('origin'); if(origin&&origin!==new URL(req.url).origin) return Response.json({error:'Forbidden origin'},{status:403});
 if(Number(req.headers.get('content-length')||0)>MAX_BODY_BYTES)return Response.json({error:'Batch too large',max_bytes:MAX_BODY_BYTES},{status:413});
 let body:any;try{body=JSON.parse(await readBounded(req))}catch(e){return Response.json({error:e instanceof RangeError?'Batch too large':'Invalid JSON'},{status:e instanceof RangeError?413:400})}
 if(!body||!Array.isArray(body.articles)||body.articles.length!==1||body.run!==undefined)return Response.json({error:'Exactly one article per CAS request; run-state updates not supported'},{status:400});
 const db=env.DB!;const now=new Date().toISOString();
 for(const raw of body.articles){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return Response.json({error:'Invalid article'},{status:400});
 const a={...raw,id:String(raw.id||''),source:raw.source||raw.source_name||raw.organization||'',category:raw.article_type||'未分类',source_url:raw.source_url||raw.original_url||raw.url||'',status:raw.status||raw.analysis_status||'pending',summary_zh:raw.summary_zh||raw.summary||'',analysis:raw.analysis||{summary_zh:raw.summary,key_points:raw.key_points||[],entities:raw.entities||[],relations:raw.relations||[],events:raw.events||[],limitations:raw.warnings||[]}};
 if(!a.id||typeof a.title!=='string'||!a.title)return Response.json({error:'Invalid article'},{status:400});
 for(const [key,max] of [['id',512],['title',16000],['source',4096],['category',1024],['status',128],['published_at',128],['updated_at',128]] as const){if(a[key]!=null&&(typeof a[key]!=='string'||bytes(a[key])>max))return Response.json({error:'Invalid article metadata',id:a.id,field:key},{status:400})}
 const payload=JSON.stringify(a),size=bytes(payload);
 if(size>MAX_ARTICLE_BYTES)return Response.json({error:'Article payload too large; preserve content and retry using a supported larger-content storage path',id:a.id,bytes:size,max_bytes:MAX_ARTICLE_BYTES},{status:413});
 const previous=await db.prepare('SELECT payload FROM articles WHERE id=?').bind(a.id).first();
 const prior=previous?String(previous.payload):null;
 const actual=prior===null?null:await digest(prior);
 if(!Object.hasOwn(body,'expected_sha256')||body.expected_sha256!==actual)return Response.json({error:'sync_conflict',current_sha256:actual},{status:409});
 const values=[a.id,a.title,a.source,a.category,a.published_at||null,a.status,a.updated_at||now,payload];
 const statement=prior===null
 ?db.prepare('INSERT INTO articles(id,title,source,category,published_at,status,updated_at,payload) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(...values)
 :db.prepare('UPDATE articles SET title=?,source=?,category=?,published_at=?,status=?,updated_at=?,payload=? WHERE id=? AND payload=?').bind(...values.slice(1),a.id,prior);
 const result=await statement.run();
 if(result.meta.changes!==1)return Response.json({error:'sync_conflict'},{status:409});
 return Response.json({ok:true,id:a.id,sha256:await digest(payload),synced_at:now});
 }
}
