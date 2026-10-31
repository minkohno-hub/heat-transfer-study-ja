import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [deep,bank]=await Promise.all(['original-deep-lessons','questions'].map(async n=>JSON.parse(await readFile(new URL('../data/'+n+'.json',import.meta.url)))));
const lesson=deep.lessons.find(l=>l.sectionId==='9.8'),get=key=>bank.find(q=>q.id==='supp-tube-correlation-'+key+'-v1');
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
const number=s=>{
 const match=s.match(/\d+(?:\.\d+)?(?:×10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)?/u);assert.ok(match,s);
 const [base,power]=match[0].split('×10'),digits={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
 return Number(base)*(power?10**Number([...power].map(x=>digits[x]).join('')):1);
};
const unique=(key,expected)=>{const q=get(key);assert.deepEqual(q.choices.flatMap((s,i)=>Math.abs(number(s)-expected)<=.005*Math.abs(expected)?[i]:[]),[q.answer]);};
const G=500,D=.02,mu=.0002,k=.2,cp=4000,rho=800,rhov=4,x=.25,latent=1e6,flux=40000;

test('liquid-only reference uses total mass and a Darcy-based compatible single-phase coefficient',()=>{
 const Re=G*D/mu,ReLiquid=G*(1-x)*D/mu,Pr=mu*cp/k,f=.021;
 const Nu=(f/8)*(Re-1000)*Pr/(1+12.7*Math.sqrt(f/8)*Math.expm1(2*Math.log(Pr)/3));
 close(Re,50000);close(ReLiquid,37500);close(Pr,4);close(Nu,258.6814207288643);
 unique('liquid-only-reynolds',Re);unique('single-phase-reference',Nu*k/D);
 assert.ok(Re>=3000&&Re<=5e6&&Pr>=.5&&Pr<=2000);
 assert.ok(lesson.blocks.some(b=>b.text.includes('G(1−x)')));
});

test('Co and Boi use dimensionless mass-quality density and latent-flux ratios with one answer each',()=>{
 const ratio=(1-x)/x,root=Math.sqrt(rhov/rho),Co=Math.exp(.8*Math.log(ratio))*root,Boi=flux/(G*latent);
 close(Co,.17028720055828167);close(Boi,.00008);
 unique('convection-number',Co);unique('boiling-number',Boi);
 // q'' [W/m2] divided by G*hfg [kg/(m2 s) * J/kg] leaves no dimensions.
 const fluxUnit=[1,0,-3],massFluxUnit=[1,-2,-1],latentUnit=[0,2,-2];
 assert.deepEqual(fluxUnit.map((v,i)=>v-massFluxUnit[i]-latentUnit[i]),[0,0,0]);
 assert.notEqual(1/Boi,Boi);
});

test('both Kandlikar branches and the selected local wall temperature independently close the stated heat flux',()=>{
 const Co=Math.pow((1-x)/x,.8)*Math.sqrt(rhov/rho),Boi=flux/(G*latent),pref=Math.pow(1-x,.8);
 const nbd=pref*(.6683*Math.exp(-.2*Math.log(Co))+1058*Math.exp(.7*Math.log(Boi)));
 const cbd=pref*(1.136*Math.exp(-.9*Math.log(Co))+667.2*Math.exp(.7*Math.log(Boi)));
 close(nbd,1.8959129823376883);close(cbd,5.15836960304873);assert.ok(cbd>nbd);
 const hlo=2586.8142072886426,hfb=hlo*Math.max(nbd,cbd),wall=100+flux/hfb;
 close(hfb,13343.743775612329);close(wall,102.99765947792747);close((wall-100)*hfb,flux);
 unique('branch-choice',2000*Math.max(2,5));
 assert.notEqual(2000*(2+5),10000);
 assert.match(lesson.workedExample.answer,/103.0 ℃/);
});

test('horizontal correction is continuous at its threshold and acts only on the convection-number terms',()=>{
 const velocity=50/rho,Fr=velocity*velocity/(10*D),orientation=F=>F>=.04?1:Math.exp(.3*Math.log(25*F));
 close(Fr,.01953125);close(orientation(Fr),.8064937651852699);close(orientation(.04),1);
 close(orientation(.04-1e-12),1,1e-10);unique('horizontal-factor',orientation(Fr));
 const Co=.17028720055828167,Boi=8e-5,pref=.75**.8,fo=orientation(Fr);
 const conv=.6683*Co**(-.2),boiling=1058*Boi**.7;
 const corrected=pref*(conv*fo+boiling),allScaled=pref*(conv+boiling)*fo;
 assert.ok(corrected>allScaled);close(corrected-allScaled,pref*boiling*(1-fo));
 const item=get('orientation-placement');assert.equal(item.choices[item.answer],'R[a Co^m f_o+b Boi^n F]');
});

test('every numeric option corresponds to its documented error instead of an arbitrary near value',()=>{
 const qCo=get('convection-number'),root=Math.sqrt(rhov/rho),ratio=(1-x)/x;
 const CoCases=[ratio**.8*root,(1/ratio)**.8*root,ratio**.8,ratio**.8/root];
 qCo.choices.forEach((s,i)=>assert.ok(Math.abs(number(s)-CoCases[i])<.005*CoCases[i]));
 const original=[
  ['boiling-number',[.00008,.08,.0008,12500]],
  ['liquid-only-reynolds',[50000,37500,50000/.75,25000]],
  ['single-phase-reference',[2586.8142072886426,258.6814207288643,25868.142072886426,10347.25682915457]],
  ['horizontal-factor',[.8064937651852699,1,Math.sqrt(.48828125),.48828125]]
 ];
 for(const [key,values] of original){
  const q=get(key),n=q.answer,rotated=n?values.slice(-n).concat(values.slice(0,-n)):values;
  q.choices.forEach((s,i)=>assert.ok(Math.abs(number(s)-rotated[i])<.005*Math.abs(rotated[i]),q.id+' '+i));
 }
});

test('eight additions preserve revision and review boundaries without extending dryout or quality ranges',()=>{
 const items=bank.filter(q=>q.id.startsWith('supp-tube-correlation-'));
 assert.equal(items.length,8);assert.equal(new Set(items.map(q=>q.questionKind)).size,3);
 assert.deepEqual(items.map(q=>q.answer),[0,1,2,3,0,1,2,3]);
 for(const item of items){
  assert.equal(item.source.focusSectionId,'9.8');assert.equal(item.revision,'v1');assert.equal(item.expertReviewed,false);
  assert.match(item.reviewStatus,/外部専門家校閲前/);assert.equal(item.distractors.filter(s=>s.startsWith('正解。')).length,1);
  assert.ok(item.distractors[item.answer].startsWith('正解。'));assert.equal(item.solutionSteps.length,4);
 }
 const range=get('quality-range');assert.match(range.prompt,/0<x≤0.8/);assert.match(range.choices[range.answer],/範囲外/);
 assert.ok(lesson.blocks.some(b=>b.text.includes('限界熱流束')));
 assert.ok(lesson.pitfalls.some(p=>p.includes('方向因子')));
});
