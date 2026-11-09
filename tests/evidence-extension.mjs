import assert from 'node:assert/strict';import {extendEvidence}from'../lib/extend.mjs';const rows=[{id:'a',original:'x'.repeat(8000),translation:'y'.repeat(8000)},{id:'b',original:'z'.repeat(8000)}];const c=(id,s,e,section='original')=>({article_id:id,section,offset:s,text:rows.find(r=>r.id===id)[section].slice(s,e),score:3,source_url:'https://example.com/'+id});
const selected=[c('a',1000,2100),c('b',0,1100)];let r=extendEvidence(selected,[c('a',2000,3100)],rows,'具体数值是多少');assert.equal(r.added,1000);assert.equal(r.chosen.length,2);assert.deepEqual(r.chosen.map(x=>x.article_id),['a','b']);assert.equal(r.chosen[0].offset,1000);assert.equal(r.chosen[0].text.length,2100);
r=extendEvidence(selected,[c('a',2000,3101)],rows,'具体数值是多少');assert.equal(r.added,0); // complete candidate over growth cap, no clipping
r=extendEvidence(selected,[c('a',3000,4000)],rows,'为什么');assert.equal(r.added,0); // no gap fill
r=extendEvidence(selected,[c('a',0,1100,'translation')],rows,'为什么');assert.equal(r.added,0);
for(const q of ['最新的科技相关文章有哪些','最新文章列表','多源概览要点','给我最新科技要点总结'])assert.equal(extendEvidence(selected,[c('a',2000,3100)],rows,q).added,0);
r=extendEvidence([c('a',0,6000)], [c('a',5900,6600)],rows,'为什么');assert.equal(r.added,0); //6500 total strict, whole interval skip
console.log('PASS fixed slots/order/old chars, exact+1000 growth, no partial/no gap/no cross-section, latest/overview skip,6500cap');
