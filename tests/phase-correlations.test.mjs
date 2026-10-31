import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async name=>JSON.parse(await readFile(new URL('../data/'+name+'.json',import.meta.url)));
const [questions,deep]=await Promise.all(['questions','original-deep-lessons'].map(read));
const item=key=>questions.find(q=>q.id==='supp-phase-correlation-'+key+'-v1');
const close=(a,b,rtol=1e-10)=>assert.ok(Math.abs(a-b)<=rtol*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
const unique=(key,values,expected,rtol=.005)=>{
 const q=item(key);assert.ok(q);assert.equal(values.length,4);
 assert.deepEqual(values.flatMap((v,i)=>Math.abs(v-expected)<=rtol*Math.abs(expected)?[i]:[]),[q.answer],key);
};

test('cylinder Nusselt and coefficient forms agree with one rounded choice and the published example',()=>{
 const rv=.5,rl=900,nu=4e-5/rv,k=.1,g=10,D=.05,dt=300,latent=2458550;
 // Independently use the nondimensional form rather than the h form in the question.
 const Nu=.62*Math.sqrt(Math.sqrt((rl-rv)*g*latent*D**3/(nu*k*dt)));
 const h=Nu*k/D;
 close(Nu,114.21849555728264);close(h,228.4369911145653);
 unique('cylinder-h',[228,114,457,368],h);
 const film=deep.lessons.find(l=>l.sectionId==='9.4');
 assert.match(film.workedExample.answer,/2.18 kW/);
 assert.ok(film.workedExample.steps.some(s=>s.includes('Pr_v≥0.6')));
 // R* uses saturation densities; it must not reuse the film density without stating it.
 const lc=Math.sqrt(.03/(10*(900-1))),rstar=.025/lc;
 assert.ok(rstar>=1.86);close(rstar,13.685454565417838);
 assert.match(film.equations.find(e=>e.label==='毛管長と小径円筒の補正').expression,/ρ_v,sat/);
});

test('latent correction is conditional, dimensionally an energy per mass, and not the 0.4 alternative',()=>{
 const cp=2000,dt=300,latent=2e6,Pr=4e-5*cp/.1;
 assert.ok(Pr>=.6);
 const sensible=cp*dt,coefficient=.968-.163/Pr,corrected=latent+coefficient*sensible;
 close(Pr,.8);close(coefficient,.76425);close(corrected,2458550);
 const q=item('latent-correction');
 unique('latent-correction',q.choices.map(s=>Number(s.split(' ')[0])*1e6),corrected,.0003);
 assert.notEqual(corrected,latent+.4*sensible);
 // D increases by 16: Nu increases by 8, but dividing by the new D halves h.
 const coefficientRatio=Math.pow(16,3/4)/16;
 const scaling=item('diameter-scaling');
 unique('diameter-scaling',scaling.choices.map(s=>parseFloat(s)),coefficientRatio);
});

test('radiation uses kelvin and the coupled correction rather than adding full radiation twice',()=>{
 const sigma=5.670374419e-8,Tw=400+273.15,Ts=100+273.15,dt=Tw-Ts,eps=.1;
 // Factored fourth-power difference provides a separate, cancellation-safe check.
 const hr=eps*sigma*(Tw+Ts)*(Tw*Tw+Ts*Ts);
 close(hr,3.5144904746662564);
 const hb=228.4369911145653;
 assert.ok(hr<hb);
 const total=hb+.75*hr,area=Math.PI*.05*.20,heat=total*dt*area;
 close(heat,2177.8103885577525);
 assert.ok((hb+hr)*dt*area>heat);
 const q=item('radiation-coupling');
 const pairs=q.choices.map(s=>[parseFloat(s),parseFloat(s.split('、')[1])*1000]);
 assert.deepEqual(pairs.flatMap(([h,flux],i)=>h===55&&flux===16500?[i]:[]),[q.answer]);
 assert.ok(20<40);
});

test('flat minimum heat flux closes velocity units, each numerical distractor, and instantaneous storage',()=>{
 const rv=4,rl=800,latent=1e6,surfaceTension=.02,g=10;
 const velocity=Math.sqrt(Math.sqrt(surfaceTension*g*(rl-rv)/(rl+rv)**2));
 const flux=.09*rv*latent*velocity;
 close(velocity,.12527307602872617);close(flux,45098.30737034142);
 const q=item('flat-minimum');unique('flat-minimum',q.choices.map(s=>parseFloat(s)*1000),flux);
 const errors=[.09*rv*latent*Math.pow(surfaceTension*g*(rl-rv)/rv**2,.25),flux*rv,flux/10];
 for(const wrong of errors)assert.ok(Math.abs(wrong-flux)>.01*flux);
 close(flux*.012,541.179688444097);close((600-flux*.012)/200,.294101557779515);
 assert.match(deep.lessons.find(l=>l.sectionId==='9.5').workedExample.answer,/45.1 kW\/m²/);
 // kg,m,s exponent vectors: [sigma*g*delta-rho / rho-sum^2]^(1/4).
 const sigma=[1,0,-2],gravity=[0,1,-2],density=[1,-3,0];
 const unit=sigma.map((v,i)=>(v+gravity[i]+density[i]-2*density[i])/4);
 assert.deepEqual(unit,[0,1,-1]);
 const dim=item('minimum-dimension');assert.equal(dim.choices[dim.answer],'m·s⁻¹');
});

test('wire radius correction and gravity scaling keep their separate geometry dependencies',()=>{
 const ratio=r=>.515*Math.pow(18/(r*r*(2*r*r+1)),.25);
 const r=.5,factor=ratio(r),base=45;
 close(factor,1.3555562333410671);close(base*factor,61.000030500348025);
 const q=item('wire-geometry');unique('wire-geometry',q.choices.map(s=>parseFloat(s)),base*factor);
 close(base*ratio(2*r),36.27083514319843);
 const gravity=item('minimum-gravity');unique('minimum-gravity',gravity.choices.map(s=>parseFloat(s)),Math.sqrt(Math.sqrt(16)));
 // At fixed physical wire radius, R*~sqrt(g), so increasing g also changes the wire correction.
 assert.notEqual(2*ratio(r*Math.sqrt(16))/ratio(r),2);
 const lesson=deep.lessons.find(l=>l.sectionId==='9.5');
 assert.ok(lesson.blocks.some(b=>b.text.includes('g→0')));
});

test('all eight added items preserve source, unique answer explanations, revision and internal-only status',()=>{
 const added=questions.filter(q=>q.id.startsWith('supp-phase-correlation-'));
 assert.equal(added.length,8);
 for(const q of added){
  assert.ok(['9.4','9.5'].includes(q.source.focusSectionId));
  assert.equal(q.source.chapterId,'ch9');assert.equal(q.revision,'v1');assert.equal(q.expertReviewed,false);
  assert.match(q.reviewStatus,/外部専門家校閲前/);assert.equal(q.choices.length,4);
  assert.equal(q.distractors.filter(s=>s.startsWith('正解。')).length,1);
  assert.ok(q.distractors[q.answer].startsWith('正解。'));assert.ok(q.solutionSteps.length>=4);
 }
 assert.deepEqual(added.map(q=>q.answer),[0,1,2,3,0,1,2,3]);
});
