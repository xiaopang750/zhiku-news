import assert from 'node:assert/strict';
import {bodyOnly,retrieveAndRerank} from '../lib/rag.mjs';
// Observed archived JRC translation heading. Only exact navigation markers qualify.
const body='# 旅游业经济影响\n\n直接贡献为4.1%。\n\n## 填补数据缺口\n\n旅游卫星账户结合投入产出表。';
for(const marker of ['相关新闻（页面导航）','相关新闻 (页面导航)','相关新闻','Related news']){
 const raw=body+'\n\n## '+marker+'\n\n- 量子：12.9%的技术信号已达到可运行阶段。';
 assert.equal(bodyOnly(raw),body+'\n');
 const rows=[{id:'tourism',title:'旅游业经济影响',translation:raw}];
 assert.equal(retrieveAndRerank(rows,{question:'量子计算'}).chunks.length,0);
 const result=retrieveAndRerank(rows,{question:'旅游业直接贡献百分比是多少'});
 assert(result.chunks.length);assert(result.chunks[0].text.includes('4.1%'));
 assert(!result.chunks[0].text.includes('12.9%'));assert(raw.includes(result.chunks[0].text));
}
for(const text of [body,body+'\n## 相关新闻对旅游业的影响\n正文量子讨论',body+'\n## 相关新闻（研究方法）\n保留正常章节',body+'\n正文提到相关新闻（页面导航），但不是标题。',body+'\n## 相关链接\n方法论文和数据链接']){
 assert.equal(bodyOnly(text),text);
}
assert.equal(bodyOnly(body+'\r\n## 相关新闻（页面导航）\r\n量子'),body+'\r');
console.log('PASS: exact observed navigation suffix removed; ordinary headings/body/related methodology links retained; original source offsets preserved.');
