// Static, local, original terminology. No network service and no HTML in dataset text.
const escapeText=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const ambiguous=new Set(['熱','W','J','K','℃','m','s','比','流れ','密度','傾き']);
const latin=/[A-Za-z0-9_]/;
const shortLabels=new Set(['比熱','積分','対流','黒体','潜熱','顕熱','層流','乱流','向流','並流','射度',
  'bi','fo','re','pr','nu','ra','gr','sc','sh','pe']);
export function termCandidates(terms){
  if(!Array.isArray(terms))return [];
  const indexed=new Map();
  for(const term of terms){
    if(!term||!term.id||!term.ja||term.availableInApp===false)continue;
    for(const label of [term.ja,...(Array.isArray(term.aliases)?term.aliases:[]),term.en]){
      if(typeof label!=='string'||!label.trim()||label.length<2||ambiguous.has(label)||/^[^\p{L}\p{N}]+$/u.test(label))continue;
      if(label.length<3&&!shortLabels.has(label.toLocaleLowerCase()))continue;
      const key=label.toLocaleLowerCase();
      if(!indexed.has(key))indexed.set(key,{label,id:term.id});
    }
  }
  return [...indexed.values()].sort((a,b)=>b.label.length-a.label.length||a.id.localeCompare(b.id));
}
export function matchTerms(input,terms,maxMatches=4){
  const text=String(input??'');
  if(!text||!Number.isInteger(maxMatches)||maxMatches<1)return [];
  const matches=[],candidates=termCandidates(terms);
  let cursor=0;
  while(cursor<text.length&&matches.length<maxMatches){
    const found=candidates.find(item=>{
      if(text.slice(cursor,cursor+item.label.length).toLocaleLowerCase()!==item.label.toLocaleLowerCase())return false;
      if(/^[A-Za-z]/.test(item.label)){
        if(cursor>0&&latin.test(text[cursor-1]))return false;
        const after=text[cursor+item.label.length];
        if(after&&latin.test(after))return false;
      }
      return true;
    });
    if(found){matches.push({start:cursor,end:cursor+found.label.length,id:found.id,label:text.slice(cursor,cursor+found.label.length)});cursor+=found.label.length;}
    else cursor++;
  }
  return matches;
}
export function renderTermLinks(input,terms,{limit=4}={}){
  const text=String(input??''),hits=matchTerms(text,terms,limit);
  let output='',cursor=0;
  for(const hit of hits){
    output+=escapeText(text.slice(cursor,hit.start));
    // Span with role=button avoids nesting a labelable button in answer-choice labels.
    // Native delegated pointer/keyboard handling must suppress the label's radio default.
    output+=`<span role="button" tabindex="0" class="inline-term" data-term-id="${escapeText(hit.id)}" aria-label="${escapeText(hit.label)}の意味を開く" aria-haspopup="dialog">${escapeText(hit.label)}</span>`;
    cursor=hit.end;
  }
  return output+escapeText(text.slice(cursor));
}
// The same examples and navigation are available in the full glossary and the
// in-place panel. IDs are validated at public-build time; text is still escaped.
export function renderTermLearningLinks(term){
  const sections=Array.isArray(term.relatedSections)?term.relatedSections:[];
  const models={conduction:'平板伝導',convection:'対流',radiation:'放射',resistance:'直列熱抵抗',transient:'非定常冷却・加熱'};
  const simulations=(Array.isArray(term.relatedSimulators)?term.relatedSimulators:[]).filter(id=>models[id]);
  return (sections.length?`<div class="term-related"><strong>関連する節</strong>${sections.map(id=>`<button type="button" class="text-link" data-section="${escapeText(id)}">§${escapeText(id)}の教材へ →</button>`).join('')}</div>`:'')+
    (simulations.length?`<div class="term-related"><strong>関連するモデル</strong>${simulations.map(id=>`<a class="text-link" href="#guide/sim-${id}">${models[id]}の説明と計算へ →</a>`).join('')}</div>`:'');
}
export function renderTermExample(term){
 return term.example?`<p class="term-example"><strong>独立作成の例：</strong>${escapeText(term.example)}</p>`:'';
}
export function renderTermSheet(term,terms=[]){
  const detail=term.detail||term.meaning,brief=term.brief||term.meaning;
  const related=Array.isArray(term.related)?term.related.slice(0,8):[];
  const relatedMarkup=related.map(label=>{
    const matches=terms.filter(item=>item.id!==term.id&&[item.ja,item.en,...(item.aliases||[])].includes(label));
    return matches.length===1?`<button type="button" class="inline-term" data-term-id="${escapeText(matches[0].id)}" aria-label="${escapeText(label)}の意味を開く">${escapeText(label)}</button>`:escapeText(label);
  }).join('・');
  return `<div class="modal-backdrop term-backdrop" data-term-backdrop>
    <section class="report-modal surface-card term-sheet" role="dialog" aria-modal="true" aria-labelledby="term-sheet-title" aria-describedby="term-sheet-brief" tabindex="-1">
    <button type="button" class="modal-close" data-close-term aria-label="用語の説明を閉じる">×</button>
    <p class="eyebrow">${term.source?.type==='supplement'?'補足説明':'書籍に関連する用語'} · 学習用ミニ辞典</p>
    <h2 id="term-sheet-title">${escapeText(term.ja)}</h2>
    ${term.en?`<p class="term-english" lang="en">${escapeText(term.en)}</p>`:''}
    <p id="term-sheet-brief" class="term-sheet-brief">${escapeText(brief)}</p>
    ${term.beginner&&term.beginner!==brief&&term.beginner!==detail?`<h3>はじめての説明</h3><p>${escapeText(term.beginner)}</p>`:''}
    <h3>詳しい説明</h3><p>${escapeText(detail)}</p>
    ${term.formula?`<p><strong>関連式：</strong> <span class="term-formula">${escapeText(term.formula)}</span></p>`:''}
    ${term.unit?`<p><strong>単位：</strong> ${escapeText(term.unit)}</p>`:''}
    ${renderTermExample(term)}
    ${related.length?`<p><strong>関連語：</strong> ${relatedMarkup}</p>`:''}
    ${renderTermLearningLinks(term)}
    <button type="button" class="button secondary" data-term-detail="${escapeText(term.id)}">用語集で詳しく見る</button>
    </section></div>`;
}
