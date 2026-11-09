import {env} from 'cloudflare:workers';
import {savedBrief} from './saved-brief.mjs';
import {retrieveAndRerank} from './rag.mjs';
export async function retrieveEvidence(question:string,history:any[],onEvent:(data:any)=>void){
 const start=Date.now();
 onEvent({phase:'retrieving',label:'正在从库内正文召回相关段落'});
 // Bound data transferred from D1; never load attachments or complete report payloads into an isolate.
 const rows=await env.DB!.prepare(`SELECT id,title,source,published_at,
 json_extract(payload,'$.title_zh') AS title_zh,
 json_extract(payload,'$.translation.status') AS translation_status,
 COALESCE(json_extract(payload,'$.canonical_url'),json_extract(payload,'$.original_url'),json_extract(payload,'$.source_url')) AS source_url,
 substr(COALESCE(json_extract(payload,'$.original_markdown'),''),1,30000) AS original,
 substr(COALESCE(json_extract(payload,'$.translation.markdown'),''),1,30000) AS translation,
 length(COALESCE(json_extract(payload,'$.original_markdown'),'')) AS original_length,
 length(COALESCE(json_extract(payload,'$.translation.markdown'),'')) AS translation_length
 FROM articles ORDER BY published_at DESC,id ASC LIMIT 200`).all();
 const total=await env.DB!.prepare('SELECT count(*) AS n FROM articles').first();
 const fetched=Date.now();
 onEvent({phase:'reranking',label:'正在重排候选段落，选择更相关的证据'});
 const evidence=retrieveAndRerank(rows.results,{question,history,total:Number(total?.n||0)});
 onEvent({phase:'evidence_ready',label:`召回 ${evidence.coverage.recalled} 段，重排选取 ${evidence.coverage.selected} 段证据`,coverage:evidence.coverage});
 evidence.metrics={storeMs:fetched-start,rankMs:Date.now()-fetched,totalMs:Date.now()-start};
 console.info('rag_stage',{...evidence.metrics,...evidence.coverage});
 return evidence;
}

export async function retrieveSavedBrief(evidence:any){
 const ids=[...new Set(evidence.chunks.map((c:any)=>c.article_id))];if(!ids.length)return null;
 const rows=await env.DB!.prepare(`SELECT id,status,updated_at,
 substr(COALESCE(json_extract(payload,'$.original_markdown'),''),1,30000) AS original,
 COALESCE(json_extract(payload,'$.analysis.key_points'),json_extract(payload,'$.key_points'),'[]') AS points
 FROM articles WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all();
 return savedBrief(evidence,rows.results);
}
