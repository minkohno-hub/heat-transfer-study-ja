// Accessible contextual definition panel: independently authored glossary data,
// escaped at the HTML boundary. No network request or remote dictionary is used.
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const detail=(label,value)=>value?'<p><strong>'+label+'：</strong>'+escapeHTML(value)+'</p>':'';
export function glossaryDialogHTML(term){
 if(!term||typeof term.id!=='string'||typeof term.ja!=='string')return '';
 const references=Array.isArray(term.relatedTerms)?term.relatedTerms.filter(x=>typeof x==='string').slice(0,8):[];
 return '<div class="term-overlay-backdrop" data-term-close></div>'+
 '<section class="term-dialog surface-card" role="dialog" aria-modal="true" aria-labelledby="term-dialog-title" aria-describedby="term-dialog-summary">'+
 '<button type="button" class="term-dialog-close" data-term-close aria-label="用語の説明を閉じる">×</button>'+
 '<p class="eyebrow">用語を確認</p><h2 id="term-dialog-title">'+escapeHTML(term.ja)+'</h2>'+
 '<p class="term-dialog-en" lang="en">'+escapeHTML(term.en||'')+'</p>'+
 '<p id="term-dialog-summary" class="term-dialog-summary">'+escapeHTML(term.short||term.meaning||'')+'</p>'+
 '<div class="term-dialog-detail">'+
 detail('やさしい説明',term.beginner)+detail('詳しい説明',term.detail)+
 detail('関連する式',term.formula)+detail('単位',term.unit)+
 (references.length?'<p><strong>関連用語：</strong>'+references.map(escapeHTML).join('、')+'</p>':'')+
 '</div>'+
 (term.source?.type==='supplement'?'<p class="term-unreviewed">アプリ独自の補足説明・外部専門家校閲前</p>':'')+
 '<div class="term-dialog-actions"><button type="button" class="button secondary" data-term-detail="'+escapeHTML(term.id)+'">用語集で詳しく見る</button>'+
 '<button type="button" class="button primary" data-term-close>問題に戻る</button></div></section>';
}
