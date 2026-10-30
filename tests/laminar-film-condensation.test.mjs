import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CONDENSATION_DEFAULTS, condensationFields, condensationFieldNames, FILM_GRAVITY,
 FILM_RE_MAX, FILM_JA_MAX, nusseltFilmCoefficient, calculateFilmCondensation,
 filmThicknessAt, filmLocalCoefficient, filmCumulativeMassFlow,
 renderCondensationFields, renderCondensationSteps, renderCondensationDiagram,
 condensationThicknessGraph, condensationLocalGraph
} from '../laminar-film-condensation.mjs';

const calc = patch => calculateFilmCondensation({...CONDENSATION_DEFAULTS,...patch});
const near = (a,b,rel=1e-9) => assert.ok(Math.abs(a-b) <= rel*Math.max(1,Math.abs(a),Math.abs(b)),String(a)+' != '+String(b));

test('Nusselt coefficient agrees with independently published fluid example',()=>{
 near(nusseltFilmCoefficient(585,7,158.9e-6,.091,776900,.1,20),1482.206403453679,1e-12);
 assert.throws(()=>nusseltFilmCoefficient(10,20,.001,.3,1e6,.1,2),RangeError);
 assert.throws(()=>nusseltFilmCoefficient(1000,0,0,.3,1e6,.1,2),RangeError);
});

test('default physical coefficient and all thermal outputs match direct equations',()=>{
 const r=calc({});
 assert.equal(r.error,undefined);
 const v=r.values;
 const h=(2*Math.SQRT2/3)*(FILM_GRAVITY*v.rhoLiquid*(v.rhoLiquid-v.rhoVapor)*v.latent*v.conductivity**3/
   (v.viscosity*v.height*(v.saturation-v.wall)))**.25;
 near(r.h,h); near(r.h,17298.468658481124,1e-10);
 near(r.deltaT,2);near(r.area,.04);
 near(r.watts,1383.87749267849,1e-10);
 near(r.massFlow,r.watts/v.latent);
 near(r.massFluxPerWidth,r.massFlow/v.width);
 near(r.filmRe,4*r.massFlow/(v.width*v.viscosity));
 near(r.meanNu,r.h*v.height/v.conductivity);
 near(r.jakob,v.cpLiquid*r.deltaT/v.latent);
});

test('film increases by x^(1/4) and local h decreases by x^(-1/4)',()=>{
 const r=calc({});
 near(filmThicknessAt(r,0),0);near(filmThicknessAt(r,r.values.height),r.filmThickness);
 near(filmThicknessAt(r,r.values.height/16),r.filmThickness/2);
 near(filmLocalCoefficient(r,r.values.height/16),2*r.endLocalH);
 near(filmLocalCoefficient(r,r.values.height),r.endLocalH);
 near(r.h,(4/3)*r.endLocalH,1e-12);
 assert.throws(()=>filmLocalCoefficient(r,0),RangeError);
});

test('condensate mass conservation also follows liquid-film momentum balance',()=>{
 const r=calc({}),v=r.values;
 const momentumGamma=v.rhoLiquid*(v.rhoLiquid-v.rhoVapor)*FILM_GRAVITY*r.filmThickness**3/(3*v.viscosity);
 near(momentumGamma,r.massFluxPerWidth,1e-10);
 near(4*momentumGamma/v.viscosity,r.filmRe);
 near(r.watts,r.massFlow*v.latent);
});

test('local heat flux integrated from the top reproduces total latent heat',()=>{
 const r=calc({}),n=200,top=0,bottom=r.values.height;
 // Substitution z = (x/L)^(3/4) makes the integrated heat-flow smooth at x=0.
 let integral=0;
 for(let i=0;i<n;i++){
  const z=(i+.5)/n,x=bottom*z**(4/3);
  const jacobian=bottom*4/3*z**(1/3);
  integral+=filmLocalCoefficient(r,x)*r.deltaT*jacobian/n;
 }
 near(integral*r.values.width,r.watts,1e-10);
});

test('flow accumulated above height x scales as x^(3/4)',()=>{
 const r=calc({});
 near(filmCumulativeMassFlow(r,0),0);
 near(filmCumulativeMassFlow(r,r.values.height),r.massFlow);
 near(filmCumulativeMassFlow(r,r.values.height/16),r.massFlow/8);
 assert.throws(()=>filmCumulativeMassFlow(r,-.1),RangeError);
 assert.throws(()=>filmThicknessAt(r,r.values.height*1.01),RangeError);
});

test('width scales heat and condensate but not film thickness or coefficient',()=>{
 const x=calc({width:.2}),y=calc({width:.8});
 near(y.watts,4*x.watts);near(y.massFlow,4*x.massFlow);
 near(y.filmRe,x.filmRe);near(y.filmThickness,x.filmThickness);
 near(y.h,x.h);
});

test('shorter and longer plates obey L^(-1/4) h and L^(3/4) total heat scaling',()=>{
 const a=calc({height:.05}),b=calc({height:.1});
 near(b.h/a.h,2**(-.25));
 near(b.watts/a.watts,2**(.75));
 near(b.filmThickness/a.filmThickness,2**(.25));
 near(b.filmRe/a.filmRe,2**(.75));
});

test('temperature difference scales h with -1/4 and heat with +3/4',()=>{
 const a=calc({wall:99}),b=calc({wall:98});
 near(b.h/a.h,2**(-.25));
 near(b.watts/a.watts,2**(.75));
 near(b.filmRe/a.filmRe,2**(.75));
});

test('viscosity, conductivity and density affect h consistently',()=>{
 const base=calc({});
 const thicker=calc({viscosity:2*CONDENSATION_DEFAULTS.viscosity});
 near(thicker.h/base.h,2**(-.25));
 near(thicker.filmRe/base.filmRe,2**(-1.25));
 const lessConductive=calc({conductivity:.5*CONDENSATION_DEFAULTS.conductivity});
 near(lessConductive.h/base.h,.5**(.75));
 const lightVapor=calc({rhoVapor:0});
 assert.ok(lightVapor.h>base.h);
});

test('wave-free film Reynolds threshold protects Nusselt solution domain',()=>{
 assert.ok(calc({}).filmRe<FILM_RE_MAX);
 assert.ok(calc({height:.5}).error?.includes('Re'));
 assert.ok(calc({wall:95}).error?.includes('Re'));
 assert.ok(calc({width:.001}).error); // geometric bounds are validated separately from film Re
});

test('Jakob number bound excludes significant liquid sensible-heat effects',()=>{
 assert.ok(calc({}).jakob<FILM_JA_MAX);
 const r=calc({latent:1e4});
 assert.ok(r.error?.includes('Ja'));
 assert.ok(calc({cpLiquid:20000,wall:85}).error?.includes('Ja'));
});

test('equal, hotter wall and insufficient deltaT are invalid condensation cases',()=>{
 assert.ok(calc({wall:100}).error);
 assert.ok(calc({wall:101}).error);
 assert.ok(calc({wall:99.999}).error);
 assert.equal(calc({wall:99.99}).error,undefined);
});

test('invalid typed input, absolute zero and impossible densities are rejected',()=>{
 const variants=[
 null,[],{...CONDENSATION_DEFAULTS,viscosity:'0x10'},
 {...CONDENSATION_DEFAULTS,rhoLiquid:0},
 {...CONDENSATION_DEFAULTS,rhoVapor:958},
 {...CONDENSATION_DEFAULTS,rhoVapor:10000},
 {...CONDENSATION_DEFAULTS,latent:Infinity},
 {...CONDENSATION_DEFAULTS,width:-1},
 {...CONDENSATION_DEFAULTS,height:0},
 {...CONDENSATION_DEFAULTS,wall:-273.15},
 {...CONDENSATION_DEFAULTS,saturation:-273.15},
 {...CONDENSATION_DEFAULTS,cpLiquid:''},
 {...CONDENSATION_DEFAULTS,conductivity:NaN},
 {...CONDENSATION_DEFAULTS,rhoLiquid:null}
 ];
 for(const values of variants) assert.ok(calculateFilmCondensation(values).error,String(values));
});

test('UI fields escape untrusted values and svg graphs have explained physical axes',()=>{
 const r=calc({});
 assert.equal(condensationFields.length,10);assert.equal(condensationFieldNames.length,10);
 const html=renderCondensationFields({...CONDENSATION_DEFAULTS,height:'"><img src=x onerror=alert(1)>'});
 assert.ok(!html.includes('<img'));assert.match(html,/&quot;&gt;&lt;img/);
 const steps=renderCondensationSteps(r);
 assert.match(steps,/Nu/);assert.match(steps,/Re/);assert.match(steps,/kg\/h/);
 const diagram=renderCondensationDiagram(r);
 assert.match(diagram,/role="img"/);assert.match(diagram,/流下/);
 const chart1=condensationThicknessGraph(r,r),chart2=condensationLocalGraph(r,r);
 assert.match(chart1,/δ（mm）/);assert.match(chart2,/W\/\(m²·K\)/);
 assert.match(chart1,/chart-baseline/);assert.match(chart2,/chart-baseline/);
 for(const raw of [steps,diagram,chart1,chart2])assert.ok(!/NaN|Infinity|undefined/.test(raw));
 assert.equal(condensationThicknessGraph({error:'bad'}),'');
 assert.equal(condensationLocalGraph({error:'bad'}),'');
});
