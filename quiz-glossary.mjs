// Original learning UI: link only matching, actually published glossary terms.
// No HTML from user questions/terms enters the output without escaping.
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));

export function glossaryMatches(prompt,terms,limit=10){
  if(typeof prompt!=='string'||!Array.isArray(terms)||!prompt)return [];
  const tokens=[];
  for(const term of terms){
    if(!term||!(/^[a-z0-9-]{1,80}$/i).test(term.id||'')||term.availableInApp===false)continue;
    for(const token of [term.ja,...(Array.isArray(term.aliases)?term.aliases:[])]){
      if(typeof token!=='string'||token.length<2||token.length>45)continue;
      tokens.push({termId:term.id,token});
    }
  }
  tokens.sort((a,b)=>b.token.length-a.token.length||a.termId.localeCompare(b.termId));
  const matches=[];let at=0,covered=0;
  while(at<prompt.length&&covered<limit){
    const hit=tokens.find(({token})=>{
      if(!prompt.startsWith(token,at))return false;
      // Single Latin words / abbreviations must not highlight inside other words.
      if(/^[A-Za-z0-9]+$/.test(token)){
        const before=prompt[at-1]||'',after=prompt[at+token.length]||'';
        if(/[A-Za-z0-9]/.test(before)||/[A-Za-z0-9]/.test(after))return false;
      }
      return true;
    });
    if(hit){matches.push({start:at,end:at+hit.token.length,id:hit.termId,token:hit.token});at+=hit.token.length;covered++;}
    else at++;
  }
  return matches;
}
export function renderLinkedQuestion(prompt,terms,renderPlain=escapeHtml){
  if(typeof prompt!=='string')return '';
  let html='',last=0;
  for(const match of glossaryMatches(prompt,terms)){
    html+=renderPlain(prompt.slice(last,match.start));
    html+='<button type="button" class="quiz-term-link" data-quiz-term="'+escapeHtml(match.id)+'" aria-haspopup="dialog" aria-label="'+escapeHtml(match.token)+'の説明を開く">'+renderPlain(match.token)+'</button>';
    last=match.end;
  }
  return html+renderPlain(prompt.slice(last));
}
