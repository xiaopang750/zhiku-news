const sourceNames:Record<string,string>={
 'Atlantic Council':'大西洋理事会','Atlantic Council（大西洋理事会）':'大西洋理事会',
 'Council on Foreign Relations':'外交关系委员会','European Council on Foreign Relations':'欧洲对外关系委员会',
 'German Institute of Development and Sustainability (IDOS)':'德国发展与可持续性研究所（IDOS）',
 'Human Rights Watch':'人权观察','Human Rights Watch (HRW)':'人权观察（HRW）',
 'Jamestown Foundation':'詹姆斯敦基金会','Thailand Development Research Institute (TDRI)':'泰国发展研究院（TDRI）'
};
export const sourceLabel=(s:string)=>sourceNames[s]||s||'来源待补充';
export function articleTitle(a:any){return a.title_zh||a.analysis?.title_zh||(a.title==='Putin wants peace talks. He doesn’t want peace.'||a.title==="Putin wants peace talks. He doesn't want peace."?'普京想要和平谈判，但他并不想要和平。':a.title)||'文章标题待补充'}
