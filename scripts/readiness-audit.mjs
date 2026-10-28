import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {auditFullCurriculumReadiness} from '../curriculum-readiness.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=async path=>JSON.parse(await readFile(join(root,path),'utf8'));
const [book,originalNotes,questions,evidence]=await Promise.all([
 'data/book.json','data/original-notes.json','data/questions.json','data/readiness-evidence.json'
].map(read));
const report=auditFullCurriculumReadiness({book,originalNotes,questions,...evidence});
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
 console.log('教材の100%完成判定（原本全文訳・専門レビュー・問題品質を分けて評価）');
 console.log('独立作成の短い日本語概念ノート:',report.originalConceptNotes,'/',report.sectionCount,'節');
 console.log('原本と独立照合・承認された節:',report.independentlyReviewedSections,'/',report.sectionCount,'節');
 console.log('日本語全文公開の許諾を確認した節:',report.verifiedRightsSections,'/',report.sectionCount,'節');
 console.log('出典を照合して公開した日本語の全文節:',report.verifiedJapaneseFullTextSections,'/',report.sectionCount,'節');
 console.log('量・難度分類・独立検証を全て満たす節別問題:',report.questionBankReadySections,'/',report.sectionCount,'節');
 console.log('全要件を満たす節:',report.fullyReadySections,'/',report.sectionCount,'節');
 console.log('4択問題の総数:',report.questionCount,'問。問題数のみで完成と判定しません。');
 console.log('全面完成の検証:',report.fullCompletion?'合格':'未達成');
 console.log('警告：未確認の外部校閲や権利を、AIの文章作成・テスト成功だけで承認扱いにしない。');
}
if(process.argv.includes('--strict')&&!report.fullCompletion)process.exitCode=1;
