import {readFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildAuthoringQueue} from '../authoring-queue.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=async name=>JSON.parse(await readFile(join(root,name),'utf8'));
const [book,originalNotes,deepLessons,questions,evidence]=await Promise.all([
  'data/book.json','data/original-notes.json','data/original-deep-lessons.json',
  'data/questions.json','data/readiness-evidence.json'
].map(read));
const report=buildAuthoringQueue({book,originalNotes,deepLessons,questions,evidence});
if(process.argv.includes('--json')){
  console.log(JSON.stringify(report,null,2));
}else{
  console.log('独立教材の執筆キュー（完成・承認の判定とは別）');
  console.log('短い概念ノート:',report.shortConceptNoteDrafts,'/',report.sectionCount,'節');
  console.log('詳しい独立教材の下書き:',report.detailedLessonDrafts,'/',report.sectionCount,'節');
  console.log('節別の出題数が最低値に到達:',report.sectionsWithMinimumQuestionDrafts,'/',report.sectionCount,'節');
  console.log('節別の出題技能種類が最低値に到達:',report.sectionsWithMinimumQuestionKinds,'/',report.sectionCount,'節');
  console.log('執筆の最低条件を同時に満たす節:',report.draftAuthoringMinimumMet,'/',report.sectionCount,'節');
  console.log('最低出題数に対する不足:',report.remainingQuestionDraftMinimum,'問');
  console.log('第三者承認と公開権利を含む最終合格:',report.externallyAcceptedSections,'/',report.sectionCount,'節');
  console.log('次に執筆を優先する節:',report.next.map(x=>x.sectionId+' '+x.title+' (詳細 '+(x.detailedLessonDraft?'あり':'なし')+', 不足'+x.missingQuestionDrafts+'問)').join('; '));
  console.log(report.warning);
}
