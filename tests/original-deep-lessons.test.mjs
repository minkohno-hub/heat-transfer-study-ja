import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateDeepLessons,deepLessonForSection} from '../original-deep-lessons.mjs';
import {checkPublicContent} from '../public-content-contract.mjs';
import {GUIDE_SECTIONS} from '../guide.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
test('advanced original Japanese instruction covers 8.4 and 8.5 without claiming an unlicensed translation',async()=>{
 const [book,deep]=await Promise.all(['data/book.json','data/original-deep-lessons.json'].map(read));
 assert.deepEqual(validateDeepLessons(book,deep),[]);
 assert.equal(deep.lessons.length,2);
 assert.deepEqual(deep.lessons.map(x=>x.sectionId),['8.4','8.5']);
 assert.equal(deep.translation,false);
 assert.equal(deep.expertReviewed,false);
 for(const l of deep.lessons){
  assert.equal(deepLessonForSection(deep,l.sectionId),l);
  assert.ok(l.blocks.length>=6);
  assert.ok(l.blocks.reduce((n,b)=>n+b.text.length,0)>=750);
  assert.ok(l.equations.every(e=>e.expression&&e.meaning&&e.label));
  assert.ok(l.pitfalls.length>=4);
  assert.ok(l.references.every(r=>r.url.startsWith('https://')));
  assert.ok(l.reviewStatus.includes('外部学術専門家校閲前'));
  assert.ok(l.workedExample.steps.length>=4);
 }
 assert.equal(deepLessonForSection(deep,'9.1'),null);
});
test('natural convection and film condensation independently recompute the two worked examples',()=>{
 const Ra=(9.81*.003*10*.2**3)/(1.5e-5*2e-5);
 const Nu=.59*Ra**.25,h=Nu*.026/.2,Q=h*.5*10;
 const close=(x,y,tol)=>assert.ok(Math.abs(x-y)<tol,x+' vs '+y);
 close(Ra,7.848e6,1e-4);close(Nu,31.23,.01);close(h,4.06,.01);close(Q,20.3,.03);
 const rho=950,rhov=.60,k=.68,mu=2.8e-4,g=9.81,latent=2.25e6,L=.20,dT=10;
 const hc=.943*(rho*(rho-rhov)*g*latent*k**3/(mu*L*dT))**.25;
 const heat=hc*(.20*.50)*dT,m=heat/latent;
 close(hc,9696.22,1);close(heat,9696.22,1);close(m,.0043094,1e-6);
 // h~L^(-1/4), and q''~(T_sat-T_w)^(3/4), within the same Nusselt-film idealization.
 close((hc*(2**(-.25)))/hc,2**(-.25),1e-10);
 close((hc*(2**(-.25))*(2*dT))/(hc*dT),2**(.75),1e-10);
});
test('public build checks advanced note structural integrity and mislabeling',async()=>{
 const [book,questions,glossary,originalNotes,deepLessons]=await Promise.all([
  'data/book.json','data/questions.json','data/glossary.json','data/original-notes.json','data/original-deep-lessons.json'
 ].map(read));
 for(const ch of book.chapters)for(const section of ch.sections){
  if(section.translationStatus==='translated')section.translationStatus='private_only';
  for(const key of ['blocks','blocksEn','figures','sourceReview'])delete section[key];
 }
 for(const q of questions)if(q.figure?.kind==='book')delete q.figure.src;
 const check=x=>checkPublicContent({book,questions,glossary,guides:GUIDE_SECTIONS,originalNotes,deepLessons:x});
 assert.deepEqual(check(deepLessons),[]);
 const broken=structuredClone(deepLessons);
 broken.lessons[0].sectionId='99.1';
 assert.ok(check(broken).some(x=>x.includes('対象範囲外')));
 const falseReview=structuredClone(deepLessons);
 falseReview.expertReviewed=true;
 assert.ok(check(falseReview).some(x=>x.includes('形式・権利表示')));
 const missing=structuredClone(deepLessons);
 missing.lessons.pop();
 assert.ok(check(missing).some(x=>x.includes('完全性')));
});
