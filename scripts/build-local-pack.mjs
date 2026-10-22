import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateQuestion} from '../study-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const write=async(path,data)=>{const full=resolve(root,path);await mkdir(dirname(full),{recursive:true});await writeFile(full,JSON.stringify(data,null,2)+'\n');};
const book=await read('data/book.json'), sections=book.chapters.flatMap(c=>c.sections), manifest={version:1,source:'AHTTv600.pdf',expertReviewed:false,files:[],questionFiles:[],glossaryFiles:[]};
const selectedSections=['7.6','7.7','8.1','8.2','8.3'];let questionCount=0;
async function localImage(item) {
  if(!item.src)return;
  const source=resolve(root,item.src);
  if(relative(root,source).startsWith('..'))throw new Error('教材画像が作業フォルダー外を参照しています。');
  const target=`data/local/figures/${source.split(/[\\/]/).at(-1)}`;
  await mkdir(dirname(resolve(root,target)),{recursive:true});await copyFile(source,resolve(root,target));item.src=target;
}
for(const id of selectedSections) {
  const section=sections.find(s=>s.id===id);
  if(section?.sourceReview?.status!=='source_checked')throw new Error(`${id}：原本照合が未記録です。`);
  for(const language of ['ja','en']) {
    const blocks=await read(`data/drafts/${id.replace('.','-')}-${language}.json`);
    if(!Array.isArray(blocks)||!blocks.length)throw new Error(`${id}：本文がありません。`);
    for(const b of blocks) {if(b.type==='figure')await localImage(b);if(b.alt&&typeof b.alt!=='string')throw new Error(`${id}：代替説明の形式が不正です。`);}
    const target=`data/local/sections/${id}-${language}.json`;
    await write(target,{sectionId:id,language,sourceReview:'source_checked',expertReviewed:false,reviewRecord:section.sourceReview.record,blocks});manifest.files.push(`./${target}`);
  }
  const questions=await read(`data/drafts/ch${id.replace('.','-')}-questions-ja.json`);
  questionCount+=questions.length;
  for(const q of questions) {const error=validateQuestion(q);if(error||q.reviewStatus!=='source_checked')throw new Error(`${q.id}：${error||'未確認です。'}`);q.availableInApp=true;if(q.figure)await localImage(q.figure);}
  const target=`data/local/questions/${id}-ja.json`;await write(target,questions);manifest.questionFiles.push(`./${target}`);
}
const glossary=(await read('data/glossary.json')).filter(t=>selectedSections.includes(t.source?.section));
// Preserve the established term ID; this local copy cites the newly checked occurrence.
const filmTemperature=(await read('data/glossary.json')).find(t=>t.id==='film-temperature');
if(filmTemperature&&!glossary.some(t=>t.id===filmTemperature.id))glossary.push({...filmTemperature,relatedSources:[filmTemperature.source],source:{section:'8.3',bookPages:'420',pdfPages:'434'}});
for(const t of glossary) {t.availableInApp=true;t.reviewStatus='source_checked';t.expertReviewed=false;
  if(t.id==='strouhal-number')t.source={section:'7.6',bookPages:'387–389',pdfPages:'401–403'};
  if(t.id==='approach-velocity')t.source={section:'7.6',bookPages:'393',pdfPages:'407'};
  if(t.id==='primary-source')t.source={section:'7.7',bookPages:'399',pdfPages:'413'};
  if(t.id==='heat-transfer-correlation')t.source={section:'7.7',bookPages:'397–399',pdfPages:'411–413'};
}
await write('data/local/glossary.json',glossary);manifest.glossaryFiles=['./data/local/glossary.json'];
await write('data/local-content-manifest.json',manifest);
console.log(`原本照合記録のある${selectedSections.length}節・日本語${questionCount}問・用語${glossary.length}件をローカル教材パックに配置しました。全章の網羅性確認と専門家校閲は未実施です。`);
