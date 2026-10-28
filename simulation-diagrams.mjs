// Accessible, original SVG schematic drawings. They describe each model's
// actual geometry and sign convention, not a rendering of a textbook figure.
const clean=value=>{const v=Number(value);return value!==''&&value!==null&&Number.isFinite(v)?v:null;};
const num=(value,unit='')=>{const n=clean(value);return n===null?'入力待ち':n.toLocaleString('ja-JP',{maximumSignificantDigits:5})+unit;};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const phrase=(a,b)=>{const x=clean(a),y=clean(b);return x===null||y===null?'温度差を確認してください':x===y?'温度差は0。正味の熱流は0':x>y?'左側から右側へ熱が移動':'右側から左側へ熱が移動';};
const tx=(x,y,text,extra='')=>`<text x="${x}" y="${y}" class="model-label ${extra}">${esc(text)}</text>`;
const rect=(x,y,w,h,kind)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="model-${kind}"/>`;
const arrow=(from,to,y,label)=>`<path d="M${from},${y} L${to},${y}" class="model-arrow" marker-end="url(#model-arrowhead)"/>${tx((from+to)/2,y-11,label,'model-center')}`;
export function renderSimulationDiagram(mode,values={},result={}){
 if(!['conduction','resistance','convection','radiation','transient'].includes(mode))return '';
 let inner='',description='',caption='';
 if(mode==='conduction'){
   const f=clean(values.hot),t=clean(values.cold),forward=f!==null&&t!==null?f>=t:true;
   description=`厚さ${num(values.thickness,' m')}、断面積${num(values.area,' m²')}の平板。左面${num(values.hot,' ℃')}、右面${num(values.cold,' ℃')}。${phrase(values.hot,values.cold)}。`;
   inner=rect(208,44,140,112,'solid')+tx(208,30,'平板（一定のk）')+tx(210,179,`厚さ L = ${num(values.thickness,' m')}`)+tx(35,94,`高温側 ${num(values.hot,' ℃')}`)+tx(400,94,`低温側 ${num(values.cold,' ℃')}`)+
     arrow(forward?158:402,forward?205:350,102,'Q̇')+
     arrow(forward?353:402,forward?405:352,102,'Q̇')+tx(190,199,`k = ${num(values.k,' W/(m·K)')}, A = ${num(values.area,' m²')}`);
   caption='高温側・低温側は入力欄の名称です。温度が逆転すると矢印も反転します。';
 }else if(mode==='resistance'){
   const f=clean(values.hot),t=clean(values.cold),forward=f!==null&&t!==null?f>=t:true;
   description=`直列の対流境界と2層の平板伝導。左側${num(values.hot,' ℃')}、右側${num(values.cold,' ℃')}。${phrase(values.hot,values.cold)}。`;
   inner=rect(158,50,24,105,'fluid')+rect(182,50,92,105,'solid')+rect(274,50,92,105,'solid')+rect(366,50,24,105,'fluid')+
     tx(192,42,'層1')+tx(303,42,'層2')+tx(12,96,`左 ${num(values.hot,' ℃')}`)+tx(402,96,`右 ${num(values.cold,' ℃')}`)+
     tx(186,177,`L1=${num(values.L1,'m')}`)+tx(294,177,`L2=${num(values.L2,'m')}`)+
     tx(120,201,`k1=${num(values.k1)}, k2=${num(values.k2)} W/(m·K)`)+
     arrow(forward?125:429,forward?153:391,117,'Q̇');
   caption='左対流→層1→層2→右対流の直列モデルです。図の厚さは模式的で実寸比例ではありません。';
 }else if(mode==='convection'){
   const s=clean(values.surface),a=clean(values.fluid),forward=s!==null&&a!==null?s>=a:true;
   description=`表面温度${num(values.surface,' ℃')}、流体温度${num(values.fluid,' ℃')}、h=${num(values.h,' W/(m²·K)')}。${forward?'表面から流体へ':'流体から表面へ'}熱移動。`;
   inner=rect(60,50,120,112,'solid')+tx(74,38,'固体表面')+rect(203,50,303,112,'fluid')+
     tx(250,38,'流体（主流の向き →）')+tx(55,187,`Ts=${num(values.surface,' ℃')}`)+tx(280,187,`T∞=${num(values.fluid,' ℃')}`)+
     arrow(266,467,75,'流体の流れ')+arrow(forward?183:317,forward?315:185,121,'Q̇')+
     tx(220,154,`h=${num(values.h,' W/(m²·K)')}`);
   caption='流体の流れと熱移動方向は必ずしも同じではありません。境界層は省略し、hで近似します。';
 }else if(mode==='radiation'){
   const s=clean(values.surface),a=clean(values.surrounding),forward=s!==null&&a!==null?s>=a:true;
   description=`放射面${num(values.surface,' ℃')}、囲い温度${num(values.surrounding,' ℃')}、放射率${num(values.emissivity)}。放射の正味熱移動は${forward?'放射面から囲いへ':'囲いから放射面へ'}。`;
   inner=rect(50,48,118,114,'solid')+rect(390,48,118,114,'environment')+
     tx(65,38,'放射面')+tx(414,38,'囲い（黒体）')+
     tx(36,185,`Ts=${num(values.surface,'℃')}`)+tx(392,185,`Tsur=${num(values.surrounding,'℃')}`)+
     arrow(171,384,83,'放出')+arrow(386,172,134,'入射')+
     tx(190,201,`放射率 ε=${num(values.emissivity)}／正味 ${forward?'→':'←'}`);
   caption='出射と入射は両方向に存在します。正味の向きは絶対温度の四乗差によって決まります。';
 }else{
   const temp=result?.error?values.initial:result.temperature;
   const start=clean(temp),end=clean(values.ambient);
   description=`物体の初期温度${num(values.initial,' ℃')}、現在の推定温度${num(temp,' ℃')}、流体温度${num(values.ambient,' ℃')}。経過時間${num(values.time,' s')}。内部の温度差を無視する集中熱容量近似。`;
   inner=rect(100,50,184,112,'solid')+rect(315,50,178,112,'fluid')+
     tx(113,39,'物体（温度は一様と仮定）')+tx(347,39,'周囲流体')+
     tx(107,97,`T(t)=${num(temp,' ℃')}`)+tx(340,97,`T∞=${num(values.ambient,' ℃')}`)+
     arrow(start===null||end===null||start>=end?287:320,start===null||end===null||start>=end?320:287,124,'Q̇')+
     tx(109,184,`初期 T0=${num(values.initial,' ℃')}`)+tx(342,184,`t=${num(values.time,' s')}`)+tx(190,202,`Bi=${num(result.biot)}（小さいことを確認）`);
   caption='実物の断面温度分布を描いたものではありません。Biが大きいと近似の精度は保証されません。';
 }
 const title='熱移動モデルの模式図';
 return `<figure class="simulation-model-figure" data-model="${mode}"><svg viewBox="0 0 560 215" role="img" aria-label="${esc(description)}"><title>${title}</title>
   <defs><marker id="model-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 Z" class="model-arrow-head"/></marker></defs>
   ${inner}</svg><figcaption><strong>アプリ作成の図</strong>：${esc(caption)}</figcaption></figure>`;
}
