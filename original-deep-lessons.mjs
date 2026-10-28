// Original, advanced Japanese teaching materials: not translations of the book.
// The external references ground physical relations, not a claim of expert review.
export const DEEP_LESSON_IDS=Object.freeze(['1.1','1.2','1.3','2.1','2.2','2.3','2.4','3.1','3.2','3.3','3.4','4.1','4.2','4.3','4.5','5.2','5.3','5.6','6.1','7.2','8.4','8.5','9.1','10.1','10.3','11.3']);
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function validateDeepLessons(book,document){
 const errors=[];
 if(!Array.isArray(book?.chapters))return ['原本目次がありません。'];
 if(!object(document)||document.schemaVersion!==1||document.kind!=='original_japanese_deep_lesson_v1'
   ||document.translation!==false||document.expertReviewed!==false||!Array.isArray(document.lessons))
   return ['独立発展講座の形式・権利表示が正しくありません。'];
 const sections=new Map(book.chapters.flatMap(c=>c.sections.map(s=>[s.id,{...s,chapterId:c.id}])));
 const seen=new Set();
 for(const lesson of document.lessons){
  const label='発展講座 '+String(lesson?.sectionId);
  if(!object(lesson)){errors.push(label+': オブジェクト不正');continue;}
  const sec=sections.get(lesson.sectionId);
  if(!sec||!DEEP_LESSON_IDS.includes(lesson.sectionId))errors.push(label+': 対象範囲外');
  if(seen.has(lesson.sectionId))errors.push(label+': 重複');seen.add(lesson.sectionId);
  for(const key of ['title','objective','reviewStatus']){
   if(!nonempty(lesson[key]))errors.push(label+': '+key+' 不足');
  }
  if(!Array.isArray(lesson.blocks)||lesson.blocks.length<5||
    lesson.blocks.some(b=>!object(b)||!nonempty(b.heading)||!nonempty(b.text)||b.text.length<70))
    errors.push(label+': 独立講義本文の欠落');
  if(!Array.isArray(lesson.equations)||lesson.equations.length<2||
    lesson.equations.some(e=>!nonempty(e.label)||!nonempty(e.expression)||!nonempty(e.meaning)))
    errors.push(label+': 数式の定義・単位・仮定不足');
  const e=lesson.workedExample;
  if(!object(e)||!nonempty(e.title)||!nonempty(e.problem)||!nonempty(e.answer)||
    !nonempty(e.limitations)||!Array.isArray(e.steps)||e.steps.length<4||!e.steps.every(nonempty))
    errors.push(label+': 段階例題の不足');
  if(!Array.isArray(lesson.pitfalls)||lesson.pitfalls.length<3||!lesson.pitfalls.every(nonempty))
    errors.push(label+': 誤用に関する注意の不足');
  if(!Array.isArray(lesson.references)||lesson.references.length<2||
    lesson.references.some(r=>!nonempty(r.title)||!/^https:\/\/[a-z0-9.-]+\/[^\s<>]*$/i.test(r.url||'')))
    errors.push(label+': 根拠参照先の不足');
  if(!lesson.reviewStatus?.includes('外部学術専門家校閲前'))
    errors.push(label+': 未校閲表示が欠落');
  if(lesson.fullTranslation===true||lesson.expertReviewed===true||lesson.blocks?.some(x=>x.bookText||x.originalFigure))
    errors.push(label+': 原本の権利未確認本文または虚偽の校閲情報');
 }
 if(seen.size!==DEEP_LESSON_IDS.length||DEEP_LESSON_IDS.some(id=>!seen.has(id)))errors.push('登録済み対象節の独立発展講座の完全性がありません。');
 return errors;
}
export function deepLessonForSection(document,id){
 return document?.lessons?.find(l=>l.sectionId===id)||null;
}
