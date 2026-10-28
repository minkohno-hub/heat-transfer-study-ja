import {readFile,readdir,writeFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateQuestion} from '../study-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const exists=async p=>{try{await access(resolve(root,p));return true;}catch{return false;}};
const book=await read('data/book.json'),warnings=[],errors=[],drafts=new Map(),pages=Array.from({length:book.pdfPageCount},(_,i)=>({pdfPage:i+1,bookPage:i+1>14?i+1-14:null,draftSections:[],draftBackMatter:[],sourceCheckedSections:[],availableSections:[],status:'未処理'}));
if(await exists('data/source/source-manifest.json')){
  const extracted=await read('data/source/source-manifest.json'),flagged=new Set(extracted.needsVisualReviewPages||[]);
  for(const page of pages)page.extraction={status:flagged.has(page.pdfPage)?'needs_visual_review':'page_text_extracted',formulaFidelity:'not_verified',wholePageTranslation:'not_verified',sourceSha256:extracted.sha256};
}
const blocksOf=d=>Array.isArray(d)?d:Array.isArray(d.blocks)?d.blocks:[];
let files=[];try{files=(await readdir(resolve(root,'data/drafts'))).filter(n=>n.endsWith('.json'));}catch{}
for(const file of files) {
  let data;try{data=await read(`data/drafts/${file}`);}catch{errors.push(`${file}: JSONを読み取れない`);continue;}
  const match=file.match(/^(\d+)-(\d+)-(ja|en)\.json$/);
  if(match) {
    const id=`${match[1]}.${match[2]}`,rows=blocksOf(data),entry=drafts.get(id)||{};entry[match[3]]={file,blocks:rows.length};drafts.set(id,entry);
    if(match[3]==='ja')for(const b of rows){if(b.sourceType&&b.sourceType!=='book')continue;for(const loc of [{pdfPage:b.pdfPage,bookPage:b.bookPage},...(b.sourcePages||[])]){const page=pages[loc.pdfPage-1];if(page&&!page.draftSections.includes(id))page.draftSections.push(id);}}
    if(match[3]==='en')for(const b of rows)if(b.alt&&typeof b.alt!=='string')warnings.push(`${file}: 図・式の代替説明が文字列でない`);
  }
  const back=file.match(/^ch(\d+)-(problems|references)-ja\.json$/);
  if(back)for(const b of blocksOf(data))for(const loc of [{pdfPage:b.pdfPage},...(b.sourcePages||[])]){
    const label=`ch${back[1]}-${back[2]}`,page=pages[loc.pdfPage-1];if(page&&!page.draftBackMatter.includes(label))page.draftBackMatter.push(label);
  }
  if(file.includes('questions'))for(const q of blocksOf(data)){const issue=validateQuestion(q);if(issue)warnings.push(`${file}: ${q.id||'ID未記録'} ${issue}`);}
}
const publicLoaded=new Set(),localDrafts=new Set(),localChecked=new Set();
const base=await read('data/content-manifest.json');
for(const path of base.files||[]){const data=await read(path);if(data.language==='ja')publicLoaded.add(data.sectionId);}
if(await exists('data/local-content-manifest.json'))for(const path of (await read('data/local-content-manifest.json')).files||[]){
  const data=await read(path);
  if(data.language==='ja'){
    if(data.sourceReview==='source_checked')localChecked.add(data.sectionId);
    else localDrafts.add(data.sectionId);
  }
}
const sections=book.chapters.flatMap(c=>c.sections);
for(const section of sections) {
  if(section.sourceReview?.status==='source_checked')for(let p=section.pdfStart;p<=section.pdfEnd;p++)pages[p-1]?.sourceCheckedSections.push(section.id);
  if(publicLoaded.has(section.id))for(let p=section.pdfStart;p<=section.pdfEnd;p++)pages[p-1]?.availableSections.push(section.id);
  if(section.translationStatus==='draft_complete'&&!drafts.get(section.id)?.ja)warnings.push(`${section.id}: 台帳は下書き完成だが日本語ファイルを検出できない`);
}
for(const p of pages)p.status=p.sourceCheckedSections.length?'一部の節の原本照合記録あり・全ページ網羅性未確認':p.availableSections.length?'アプリ収録の節あり・全ページ網羅性未確認':p.draftSections.length||p.draftBackMatter.length?'下書きあり・網羅性未確認':'未処理';
const chapters=book.chapters.map((c,i)=>({id:c.id,title:c.title,pdfStart:c.pdfStart,pdfEnd:book.chapters[i+1]?.pdfStart?book.chapters[i+1].pdfStart-1:Math.min(...(book.appendices||[]).map(a=>a.pdfStart).filter(p=>p>c.pdfStart),811)-1,sections:c.sections.map(s=>({id:s.id,draftLanguages:Object.keys(drafts.get(s.id)||{}),sourceChecked:s.sourceReview?.status==='source_checked',available:publicLoaded.has(s.id),expertReviewed:false})),backMatter:c.backMatter||[]}));
const inventory={date:'2026-10-20',pdfPages:book.pdfPageCount,scopeNote:'下書きの存在・節単位の原本照合・公開アプリ収録を区別する。ローカル専用パックは公開台帳の収録節に含めない。ページの全訳・網羅性・専門家校閲の完了率ではない。開始ページから推定した章範囲には区切りページが含まれ得る。',expertReviewCompleted:false,availableSections:[...publicLoaded],draftSectionCount:drafts.size,chapters,pageCoverage:pages,warnings:[...new Set(warnings)],errors};
if(!process.argv.includes('--check')) {
  await writeFile(resolve(root,'docs/CONTENT_INVENTORY.json'),JSON.stringify(inventory,null,2)+'\n');
  const rows=chapters.map(c=>`| ${c.id.slice(2)} ${c.title} | ${c.pdfStart}–${c.pdfEnd} | ${c.sections.filter(s=>s.draftLanguages.includes('ja')).length}/${c.sections.length} | ${c.sections.filter(s=>s.sourceChecked).length} | ${c.sections.filter(s=>s.available).length} |`);
  await writeFile(resolve(root,'docs/CONTENT_INVENTORY.md'),`# 全章・全PDFページの教材台帳\n\n更新日：2026-10-20。${inventory.scopeNote}\n\n| 章 | PDF範囲（開始ページから推定） | 日本語下書きのある節 | 原本照合を記録した節 | この端末で読める節 |\n|---|---|---:|---:|---:|\n${rows.join('\n')}\n\n全810ページの状態は CONTENT_INVENTORY.json の pageCoverage に記録。前付け、付録、索引、節の範囲外の未処理内容も未処理として残す。\n\n専門家校閲：未実施。下書きの構造上の確認事項：${inventory.warnings.length}件。JSON解析エラー：${errors.length}件。確認事項はJSON台帳の warnings を参照。\n`);
}
console.log(JSON.stringify({draftSections:drafts.size,availableSections:[...publicLoaded],localDraftSections:localDrafts.size,localSourceCheckedSections:localChecked.size,structuralWarnings:inventory.warnings.length,parseErrors:errors.length}));
if(errors.length)process.exitCode=1;
