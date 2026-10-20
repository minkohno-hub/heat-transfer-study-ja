// Browser-independent learning rules shared by the app and its automated checks.
export const DATA_FORMAT = 'heat-study-ja-learning-data';
export function createEmptyState() {
  return { schemaVersion: 1, settings: { theme: 'system', contentLanguage: 'ja', fontScale: 1, lineHeight: 1.8, width: 'reading' },
    lastSection: '1.1', readerPositions: {}, readSections: {}, bookmarks: [], questionBookmarks: [], attempts: [],
    mistakeNotes: {}, questionReports: {}, notes: [], reviews: {}, completedReviews: {}, sessions: [],
    plan: { active: false, goal: '', targetDate: '', minutesPerDay: 15 }, simComparisons: {} };
}
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string';
const finite = v => typeof v === 'number' && Number.isFinite(v);
const time = v => (text(v) || finite(v)) && Number.isFinite(new Date(v).getTime());
export function validDay(v) {
  if (!text(v) || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isFinite(+d) && d.toISOString().slice(0, 10) === v;
}
export function localDay(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return Number.isFinite(+d) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
}
export function shiftMonth(day, offset) {
  if (!validDay(day) || !Number.isInteger(offset)) return '';
  const d = new Date(`${day}T12:00:00`), old = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth()+offset);
  d.setDate(Math.min(old, new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));
  return localDay(d);
}
function unsafeKeys(v, depth=0) {
  if (depth>24) return true;
  if (!v || typeof v!=='object') return false;
  return Object.entries(v).some(([k,x]) => ['__proto__','constructor','prototype'].includes(k) || unsafeKeys(x,depth+1));
}
const optional = (o,k,check) => o[k] === undefined || check(o[k]);
const attemptOK = a => record(a) && text(a.questionId) && a.questionId.length>0 && typeof a.correct==='boolean' && time(a.at)
  && optional(a,'id',text) && optional(a,'selected',v=>Number.isInteger(v)&&v>=0&&v<4)
  && optional(a,'confidence',v=>['high','medium','low','unsure'].includes(v)) && optional(a,'mode',text);
export function validateLearningData(data, {stored=false}={}) {
  const invalid = message => `${message}現在の記録は変更していません。`;
  if (!record(data) || data.schemaVersion!==1 || (!stored && data.format!==DATA_FORMAT)) return invalid('対応する学習データ形式ではありません。');
  if (unsafeKeys(data)) return invalid('データの階層または項目名が正しくありません。');
  for (const [key,label] of Object.entries({attempts:'回答履歴',bookmarks:'本文のしおり',questionBookmarks:'問題ブックマーク',sessions:'学習セッション'})) if (!Array.isArray(data[key])) return invalid(`「${label}」の形式が正しくありません。`);
  for (const key of ['settings','plan','mistakeNotes']) if (!record(data[key])) return invalid('設定・計画・間違いノートの形式が正しくありません。');
  if (data.attempts.length>100000 || data.bookmarks.length>20000 || data.sessions.length>20000) return invalid('データ件数の上限を超えています。');
  if (!data.attempts.every(attemptOK)) return invalid('回答履歴の日時・選択肢・自信度を確認してください。');
  if (!data.bookmarks.every(b=>record(b)&&text(b.id)&&text(b.sectionId)&&text(b.note)&&time(b.createdAt)&&optional(b,'position',v=>finite(v)&&v>=0)&&optional(b,'blockId',text)&&optional(b,'language',v=>['ja','en'].includes(v)))) return invalid('しおりの形式が正しくありません。');
  if (!data.questionBookmarks.every(text)) return invalid('問題ブックマークの形式が正しくありません。');
  if (!data.sessions.every(s=>record(s)&&validDay(s.date)&&Number.isInteger(s.total)&&s.total>=0&&Number.isInteger(s.correct)&&s.correct>=0&&s.correct<=s.total&&time(s.startedAt)&&optional(s,'finishedAt',time)&&optional(s,'answers',v=>Array.isArray(v)&&v.every(attemptOK)))) return invalid('学習セッションの形式が正しくありません。');
  const s=data.settings;
  if (!optional(s,'theme',v=>['system','light','dark'].includes(v)) || !optional(s,'contentLanguage',v=>['ja','en'].includes(v)) || !optional(s,'fontScale',v=>finite(v)&&v>=0.7&&v<=2) || !optional(s,'lineHeight',v=>finite(v)&&v>=1.2&&v<=3) || !optional(s,'width',v=>['reading','wide'].includes(v))) return invalid('表示設定の値が正しくありません。');
  const p=data.plan;
  if (!optional(p,'active',v=>typeof v==='boolean') || !optional(p,'goal',text) || !optional(p,'targetDate',v=>v===''||validDay(v)) || !optional(p,'minutesPerDay',v=>finite(v)&&v>=5&&v<=60)) return invalid('学習計画の日付・時間が正しくありません。');
  if (!Object.values(data.mistakeNotes).every(n=>record(n)&&['reason','memory','nextTime'].every(k=>optional(n,k,text))&&optional(n,'updatedAt',time))) return invalid('間違いノートの形式が正しくありません。');
  if (!optional(data,'notes',v=>Array.isArray(v)&&v.every(n=>record(n)&&text(n.id)&&text(n.text)&&text(n.sectionId)&&time(n.createdAt)&&optional(n,'title',text)))) return invalid('学習メモの形式が正しくありません。');
  if (!optional(data,'reviews',v=>record(v)&&Object.values(v).every(r=>record(r)&&validDay(r.dueDate)&&optional(r,'suggestedDays',d=>d===null||(finite(d)&&d>0))&&optional(r,'lastAnsweredAt',time)&&optional(r,'lastReviewedAt',time)))) return invalid('復習予定の形式が正しくありません。');
  if (!optional(data,'completedReviews',v=>record(v)&&Object.values(v).every(time))) return invalid('復習完了記録の日時が正しくありません。');
  if (!optional(data,'questionReports',v=>record(v)&&Object.values(v).every(a=>Array.isArray(a)&&a.every(r=>record(r)&&text(r.category)&&text(r.message)&&time(r.at))))) return invalid('問題報告の形式が正しくありません。');
  if (!optional(data,'readerPositions',v=>record(v)&&Object.values(v).every(p=>(finite(p)&&p>=0)||(record(p)&&finite(p.scrollY)&&p.scrollY>=0&&optional(p,'blockId',text)&&optional(p,'updatedAt',time))))) return invalid('読書位置の形式が正しくありません。');
  if (!optional(data,'readSections',v=>record(v)&&Object.values(v).every(x=>typeof x==='boolean'))) return invalid('読了記録の形式が正しくありません。');
  if (!optional(data,'lastSection',text)) return invalid('最後に読んだ節の形式が正しくありません。');
  if (!optional(data,'simComparisons',v=>record(v)&&Object.entries(v).every(([mode,values])=>record(values)&&!calculateHeatTransfer(mode,values).error))) return invalid('比較用シミュレーター条件が正しくありません。');
  return '';
}
export function normalizeLearningData(data) {
  const out=createEmptyState();
  for (const k of Object.keys(out)) if (data[k]!==undefined) out[k]=structuredClone(data[k]);
  out.settings={...createEmptyState().settings,...out.settings}; out.plan={...createEmptyState().plan,...out.plan};
  return out;
}
const updated = v => record(v) ? [v.updatedAt,v.at,v.createdAt,v.lastReviewedAt,v.lastAnsweredAt].filter(text).sort().at(-1)||'' : '';
function newest(a,b) { return updated(b)>updated(a) ? b : a; }
function mergeMap(a,b) { const out={...a}; for(const [k,v] of Object.entries(b)) out[k]=k in out ? newest(out[k],v) : v; return out; }
function mergeRows(a,b) {
  const map=new Map();
  for(const item of [...a,...b]) { const key=item.id||JSON.stringify(item); map.set(key,map.has(key)?newest(map.get(key),item):item); }
  return [...map.values()];
}
export function mergeLearningData(current, incoming) {
  const a=normalizeLearningData(current), b=normalizeLearningData(incoming);
  const out={...a,settings:{...a.settings,...incoming.settings},plan:{...a.plan,...incoming.plan}};
  for(const k of ['attempts','sessions','bookmarks','notes']) out[k]=mergeRows(a[k],b[k]);
  out.attempts.sort((x,y)=>Date.parse(x.at)-Date.parse(y.at));
  out.questionBookmarks=[...new Set([...a.questionBookmarks,...b.questionBookmarks])];
  for(const k of ['mistakeNotes','readerPositions','reviews']) out[k]=mergeMap(a[k],b[k]);
  out.readSections={...a.readSections}; for(const [k,v] of Object.entries(b.readSections)) out.readSections[k]=Boolean(a.readSections[k]||v);
  out.questionReports={...a.questionReports}; for(const [k,v] of Object.entries(b.questionReports)) out.questionReports[k]=mergeRows(a.questionReports[k]||[],v);
  out.completedReviews={...a.completedReviews}; for(const [k,v] of Object.entries(b.completedReviews)) if(!out.completedReviews[k]||v>out.completedReviews[k]) out.completedReviews[k]=v;
  out.simComparisons={...a.simComparisons,...b.simComparisons};
  return out;
}
export function chapterKey(value) {
  if (value==='supplement'||!value) return 'supplement';
  const m=String(value).match(/^(?:ch)?(\d+)/); return m ? `ch${m[1]}` : String(value);
}
export function normalizedText(v) { return String(v||'').normalize('NFKC').toLowerCase(); }
export function searchRanges(value,query) {
  const s=String(value||''),q=normalizedText(query);if(!q)return [];
  const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(s)]:Array.from(s).map((segment,i,a)=>({segment,index:a.slice(0,i).join('').length}));
  let normalized='';const starts=[],ends=[];
  for(const {segment,index} of segments){const part=normalizedText(segment);normalized+=part;for(let i=0;i<part.length;i++){starts.push(index);ends.push(index+segment.length);}}
  const ranges=[];let at=0,index;
  while((index=normalized.indexOf(q,at))!==-1){const next=[starts[index],ends[index+q.length-1]];if(ranges.length&&next[0]<=ranges.at(-1)[1])ranges.at(-1)[1]=next[1];else ranges.push(next);at=index+q.length;}
  return ranges;
}
export function searchSnippet(value, query, limit=240) {
  const s=String(value||''),first=searchRanges(s,query)[0];
  const start=Math.max(0,(first?.[0]??0)-Math.floor(limit/3)), end=Math.min(s.length,start+limit);
  return `${start?'…':''}${s.slice(start,end)}${end<s.length?'…':''}`;
}
export function searchEntries(entries,{query='',kind='all',chapter='all',field='all'}={}) {
  const q=normalizedText(query); if(!q.trim())return [];
  return entries.filter(e=>(kind==='all'||e.kind===kind)&&(chapter==='all'||chapterKey(e.chapter)===chapterKey(chapter))&&(field==='all'||e.field===field)&&normalizedText(`${e.title} ${e.text}`).includes(q));
}
export function nextReviewDays(attempts,answer) {
  if(!answer.correct || ['low','unsure'].includes(answer.confidence))return 1;
  let streak=0; for(const a of [...attempts].reverse()) {if(!a.correct||['low','unsure'].includes(a.confidence))break;streak++;}
  return (answer.confidence==='high'?[7,14,30,60]:[4,7,14,30])[Math.min(streak,3)];
}
export function planMinutes(total) {
  const n=Math.min(60,Math.max(5,Math.round(Number(total)||15))), reading=Math.max(1,Math.round(n*.4)), practice=Math.max(1,Math.round(n*.35));
  return [reading,practice,n-reading-practice];
}
export const STEFAN_BOLTZMANN_VALUE=5.670374419e-8;
export function calculateHeatTransfer(mode,values) {
  const fields={conduction:['k','area','thickness','hot','cold'],convection:['h','area','surface','fluid'],radiation:['emissivity','area','surface','surrounding']}[mode];
  if(!fields||!record(values))return {error:'計算の種類と入力項目を確認してください。'};
  const numeric={};
  for(const k of fields) {
    const v=values[k]; if(!['number','string'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(Number(v)))return {error:'すべての項目に有限の数値を入力してください。空欄は計算できません。'};
    numeric[k]=Number(v);
  }
  if(numeric.area<=0)return {error:'面積 A は0より大きい値にしてください。'};
  const temperatures=mode==='conduction'?['hot','cold']:mode==='convection'?['surface','fluid']:['surface','surrounding'];
  if(temperatures.some(k=>numeric[k]<=-273.15))return {error:'温度は絶対零度（−273.15 ℃）より高い値にしてください。'};
  let watts,delta,extra={};
  if(mode==='conduction') {if(numeric.k<=0||numeric.thickness<=0)return {error:'熱伝導率 k と厚さ L は0より大きい値にしてください。'};delta=numeric.hot-numeric.cold;watts=numeric.k*numeric.area*delta/numeric.thickness;}
  if(mode==='convection') {if(numeric.h<=0)return {error:'対流熱伝達率 h は0より大きい値にしてください。'};delta=numeric.surface-numeric.fluid;watts=numeric.h*numeric.area*delta;}
  if(mode==='radiation') {if(numeric.emissivity<0||numeric.emissivity>1)return {error:'放射率 ε は0〜1で入力してください。'};const surfaceK=numeric.surface+273.15,surroundingK=numeric.surrounding+273.15;delta=numeric.surface-numeric.surrounding;watts=numeric.emissivity*STEFAN_BOLTZMANN_VALUE*numeric.area*(surfaceK**4-surroundingK**4);extra={surfaceK,surroundingK};}
  if(!Number.isFinite(watts)||!Number.isFinite(delta))return {error:'計算できる数値範囲を超えました。入力値を小さくしてください。'};
  return {watts,delta,values:numeric,...extra};
}
export function validateQuestion(q) {
  if(!record(q)||!text(q.id)||!text(q.prompt)||!Array.isArray(q.choices)||q.choices.length!==4||!q.choices.every(text)||new Set(q.choices).size!==4||!Number.isInteger(q.answer)||q.answer<0||q.answer>3)return '問題文・4つの選択肢・正解の形式を確認してください。';
  if(!text(q.explanation)||!Array.isArray(q.distractors)||q.distractors.length!==4||!q.distractors.every(v=>text(v)&&v.trim()))return '4つの選択肢それぞれの理由が必要です。';
  if(!record(q.source)||(!text(q.source.section)&&!(q.source.type==='supplement'&&text(q.source.reference))))return '問題の出典を確認してください。';
  if(q.figure&&((!text(q.figure.src)&&q.figure.kind!=='app-created')||!text(q.figure.alt)||!q.figure.alt.trim()))return '図の場所と代替説明が必要です。';
  return '';
}

export function speechChunks(blocks, maxLength=240) {
  if(!Array.isArray(blocks)||!Number.isInteger(maxLength)||maxLength<40)return [];
  const chunks=[],strings=value=>typeof value==='string'?[value]:Array.isArray(value)?value.flatMap(strings):[];
  for(const block of blocks){
    const parts=[block.title,block.caption,block.alt||block.expression,block.text,block.explanation,block.description,block.headers,block.rows,block.items,block.attribution];
    if(block.type==='supplement')parts.unshift('補足説明。');
    if(block.type==='footnote')parts.unshift('脚注。');
    for(const part of [...new Set(parts.flatMap(strings))]){
      let remaining=part.trim();
      while(remaining){
        let end=Math.min(maxLength,remaining.length);
        if(end<remaining.length){
          const prefix=remaining.slice(0,end),boundaries=[...prefix.matchAll(/[。！？\n]|[.!?;]\s|\s/gu)];
          const split=boundaries.at(-1);if(split&&split.index>=maxLength/3)end=split.index+split[0].length;
          if(/[\uD800-\uDBFF]/u.test(remaining[end-1]))end--;
        }
        const chunk=remaining.slice(0,end).trim();if(chunk)chunks.push(chunk);remaining=remaining.slice(end).trim();
      }
    }
  }
  return chunks;
}
