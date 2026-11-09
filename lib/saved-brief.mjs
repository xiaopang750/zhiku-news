/** Pre-analysis display, not a fresh model answer. Never invent claims or citations. */
export function isSavedBriefQuery(question,history=[]){
 if(history.length||!/最新/.test(question)||!/科技|技术/.test(question)||!/要点|总结|概括/.test(question))return false;
 return !question.replace(/给我|请|帮我|最新|科技|技术|相关|要点|总结|概括|一下|的|[\s，。！？、]/g,'');
}
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const escape=s=>String(s||'').replace(/[\\`*_{}\[\]<>]/g,'\\$&');
export function savedBrief(evidence,rows){
 const selected=[];
 for(const chunk of evidence.chunks){
  const a=rows.find(x=>x.id===chunk.article_id);if(!a||!['done','completed','analyzed'].includes(a.status))continue;
  let points;try{points=JSON.parse(a.points||'[]')}catch{continue}
  const original=norm(a.original),p=points.find(p=>typeof p.statement==='string'&&p.statement.length<1400&&Array.isArray(p.evidence)&&p.evidence.length&&p.evidence.every(e=>typeof e.quote==='string'&&e.quote.trim().length>=20&&original.includes(norm(e.quote))));
  if(!p)continue;
  selected.push({chunk,point:p,updated_at:a.updated_at});
 }
 if(selected.length!==evidence.chunks.length||!selected.length)return null;
 const answer=['以下是知识库中最新相关资料的已保存分析要点。本次仅筛选与核对原文引文，未重新调用模型分析。',...selected.map(({chunk:c,point:p,updated_at},i)=>`### ${i+1}. ${escape(c.title)}\n${escape(p.statement)}\n\n发表：${escape(c.published_at||'未知')}；来源：${escape(c.source||'未记录')}。\n[查看文章](${c.site_url})\n\n原文依据：${escape(p.evidence.map(e=>e.quote).join(' / '))}\n\n分析记录更新时间：${escape(updated_at||'未记录')}`)].join('\n\n');
 return {answer,model:'已保存分析（本次未调用模型）',mode:'saved_analysis_brief',limitations:[...evidence.limitations,'这是已保存分析的快速呈现，不是本次新生成的综合判断；引文存在不等于已独立核验原作者事实。'],sources:selected.map(({chunk:c})=>({id:c.article_id,title:c.title,source:c.source})),metrics:{modelCalls:0},rag:evidence.coverage};
}
