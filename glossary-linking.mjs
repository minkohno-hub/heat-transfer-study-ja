// Pure, auditable dictionary matching. Original wording only; never parse
// question text as HTML or place interactive elements inside a radio label.
const entityMap={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
export const escapeTermHTML=(value)=>String(value??'').replace(/[&<>"']/g,x=>entityMap[x]);
const isWord=c=>c!==undefined&&/[\p{L}\p{N}_]/u.test(c);
const useLabel=s=>typeof s==='string'&&s.trim().length>=2&&s.length<=60&&!/[<>]/.test(s);

export function glossaryMatches(value,terms,{limit=5}={}){
  const source=String(value??'');
  if(!source||!Array.isArray(terms))return [];
  const variants=[];
  for(const term of terms){
    if(!term||typeof term.id!=='string'||term.availableInApp===false||term.linkable===false)continue;
    const candidates=[term.ja,...(Array.isArray(term.aliases)?term.aliases:[]),term.en];
    for(const candidate of candidates){
      if(!useLabel(candidate))continue;
      if(candidate.length===2&&!term.linkable)continue; // do not auto-link generic fragments
      variants.push({id:term.id,label:candidate,needle:candidate.toLocaleLowerCase('ja-JP'),
        isEnglish:/^[a-z\s-]+$/i.test(candidate)});
    }
  }
  variants.sort((a,b)=>b.label.length-a.label.length||a.id.localeCompare(b.id));
  const lower=source.toLocaleLowerCase('ja-JP');
  const found=[];
  for(let offset=0;offset<source.length;){
    let match;
    for(const v of variants){
      if(lower.slice(offset,offset+v.needle.length)!==v.needle)continue;
      if(v.isEnglish&&(isWord(source[offset-1])||isWord(source[offset+v.label.length])))continue;
      // Avoid abbreviated kanji matches within a longer Japanese word.
      if(v.label.length<=2&&!v.isEnglish&&(isWord(source[offset-1])&&isWord(source[offset+v.label.length])))continue;
      match=v;break;
    }
    if(!match){offset++;continue;}
    found.push({start:offset,end:offset+match.label.length,id:match.id,label:source.slice(offset,offset+match.label.length)});
    offset+=match.label.length;
    if(found.length>=limit)break;
  }
  return found;
}
export function renderGlossaryLinkedText(value,terms,{limit=5,math=false}={}){
  const source=String(value??''),matches=glossaryMatches(source,terms,{limit});
  let html='',last=0;
  for(const match of matches){
    html+=escapeTermHTML(source.slice(last,match.start));
    html+=`<button type="button" class="term-inline" data-term-open="${escapeTermHTML(match.id)}" aria-haspopup="dialog" aria-label="${escapeTermHTML(match.label)}の用語説明を開く">${escapeTermHTML(match.label)}</button>`;
    last=match.end;
  }
  html+=escapeTermHTML(source.slice(last));
  if(math){
    return html.replace(/_([A-Za-zΑ-Ωα-ω0-9∞]+)/gu,'<sub>$1</sub>')
      .replace(/\^\(([−+\-0-9./]+)\)/gu,'<sup>$1</sup>')
      .replace(/\^([−+\-]?\d+(?:\.\d+)?)/gu,'<sup>$1</sup>');
  }
  return html;
}
export function matchedTermIds(value,terms,options){
  return [...new Set(glossaryMatches(value,terms,options).map(x=>x.id))];
}
