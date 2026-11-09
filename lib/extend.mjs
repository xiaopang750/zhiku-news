/** Conservative extension: fixed original slots/order; +<=1000 chars globally; <=6500 total. */
export function extendEvidence(selected,ranked,rows,question){
 const q=question.replace(/《[^》]+》/g,''),overview=/概览|总览|综述|概述|总结|要点|关键点|盘点|多源|多机构|新闻列表|文章列表|\boverview\b|\bsummary\b|\bsummarize\b/i.test(q);
 const pureRecent=/(?:最新|最近|近期|latest|recent)/i.test(q)&&!/(?:多少|数值|百分|金额|预算|比例|测量|为什么|为何|原因|缺失|具体陈述)/i.test(q);
 const factual=/多少|数值|缺失|百分|金额|预算|比例|增加|下降|上升|准确率|测量|具体陈述|原文依据|为什么|为何|原因|如何|怎样|是否|事实|\bhow\b|\bwhy\b/i.test(q);
 const sources=new Map(rows.map(r=>[r.id,r]));const chosen=selected.map(d=>({...d}));let chars=chosen.reduce((n,d)=>n+d.text.length,0),added=0;const audit=[];
 if(!factual||overview||pureRecent)return {chosen,chars,added,active:false,audit};
 for(const d of ranked){const source=sources.get(d.article_id)?.[d.section],start=d.offset,end=start+d.text.length;if(typeof source!=='string'||!Number.isInteger(start)||start<0||source.slice(start,end)!==d.text)continue;
  for(let i=0;i<chosen.length;i++){const old=chosen[i];if(old.article_id!==d.article_id||old.section!==d.section)continue;const oldEnd=old.offset+old.text.length;if(start>oldEnd||end<old.offset)continue;const lo=Math.min(start,old.offset),hi=Math.max(end,oldEnd),delta=hi-lo-old.text.length;if(delta<=0)continue;
   if(added+delta>1000||chars+delta>6500){audit.push({slot:i,action:'skip_budget',delta});continue;}
   const original=selected[i];if(source.slice(old.offset,oldEnd)!==old.text||lo>original.offset||hi<original.offset+original.text.length)throw Error('source_interval_mismatch');
   chosen[i]={...old,offset:lo,text:source.slice(lo,hi),extension_from:[...(old.extension_from||[]),{offset:start,end}],original_interval:{offset:original.offset,end:original.offset+original.text.length},score_scope:'original selection priority; extension not rescored'};added+=delta;chars+=delta;audit.push({slot:i,action:'extend',delta});break;
  }
 }
 if(chosen.length!==selected.length||added>1000||chars>6500)throw Error('extension_invariant_failed');
 chosen.forEach((d,i)=>{const old=selected[i];if(d.article_id!==old.article_id||d.section!==old.section||d.offset>old.offset||d.offset+d.text.length<old.offset+old.text.length||d.text.slice(old.offset-d.offset,old.offset-d.offset+old.text.length)!==old.text)throw Error('original_selection_not_preserved');});
 return {chosen,chars,added,active:true,audit};
}
