// Copyright-safe original learning diagrams: inline SVG, no external pictures or textbook art.
// Illustrative geometry is schematic, not a calibrated temperature-field solver.
const fmt=v=>Number(v).toLocaleString('ja-JP',{maximumFractionDigits:2});
const finite=v=>Number.isFinite(Number(v))?fmt(v):'?';
const label=(x,y,value,cl='diagram-label')=>`<text x="${x}" y="${y}" class="${cl}" text-anchor="middle">${value}</text>`;
const arrow=(from,to,y,color='diagram-heat')=>{
  const x1=from<to?from:from-2,x2=from<to?to-10:to+10;
  const tip=from<to?`<polygon points="${to},${y} ${to-14},${y-7} ${to-14},${y+7}" class="${color}"/>`:`<polygon points="${to},${y} ${to+14},${y-7} ${to+14},${y+7}" class="${color}"/>`;
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="${color} diagram-flow-line"/>${tip}`;
};
const heatArrow=(flux,from=196,to=385,y=125)=>flux>0?arrow(from,to,y):flux<0?arrow(to,from,y):`${label(290,132,'熱移動なし','diagram-neutral')}`;
const marker=(x,y,num,fill)=>`<circle cx="${x}" cy="${y}" r="5" fill="${fill}"/>${label(x,y+19,num)}`;
const svg=(name,desc,shapes,caption)=>`<figure class="sim-physical-figure"><svg class="sim-physical-svg" viewBox="0 0 580 214" role="img" aria-label="${desc}"><title>${name}</title><desc>${desc}</desc>${shapes}</svg><figcaption>${caption}。図形の大きさ・色は模式的な表現で、実物の温度分布や流体速度を数値解析したものではありません。</figcaption></figure>`;
const rect=(x,y,w,h,cl)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" class="${cl}"/>`;
const waves=(x,cl)=>`<path d="M${x} 66 q -10 10 0 20 t0 20 t0 20" class="${cl} diagram-wave" fill="none"/>`;
export function renderSimulationVisual(mode,result){
  if(!result||result.error)return '';
  const v=result.values||{},q=Number(result.watts);
  if(!Number.isFinite(q))return '';
  const common=(title,desc,shapes,caption)=>svg(title,desc,shapes,caption);
  if(mode==='conduction'){
    const direction=q>0?'左側から右側へ':q<0?'右側から左側へ':'熱移動なし';
    const desc=`平板の熱伝導。左側 ${finite(v.hot)} ℃、右側 ${finite(v.cold)} ℃、厚さ ${finite(v.thickness)} m。熱の向きは${direction}。`;
    const shapes=`${rect(32,73,155,106,'diagram-reservoir diagram-left')}${rect(393,73,155,106,'diagram-reservoir diagram-right')}
    <defs><linearGradient id="diagram-conduction-gradient" x1="0" x2="1"><stop offset="0" stop-color="${Number(v.hot)>=Number(v.cold)?'#de8a67':'#6caab4'}"/><stop offset="1" stop-color="${Number(v.hot)>=Number(v.cold)?'#6caab4':'#de8a67'}"/></linearGradient></defs>
    <rect x="198" y="79" width="184" height="94" rx="3" fill="url(#diagram-conduction-gradient)" opacity=".73"/>
    ${label(110,39,'左側 Tₕ')}${label(470,39,'右側 T𝚌')}${label(110,57,finite(v.hot)+' ℃')}${label(470,57,finite(v.cold)+' ℃')}
    ${label(290,194,'平板の厚さ L = '+finite(v.thickness)+' m')}${heatArrow(q,210,368,125)}
    ${label(290,68,'熱伝導','diagram-figure-heading')}`;
    return common('平板内の熱の向き',desc,shapes,'高い温度から低い温度へ向かう一次元定常伝導');
  }
  if(mode==='convection'){
    const desc=`表面 ${finite(v.surface)} ℃と流体 ${finite(v.fluid)} ℃の対流熱交換。熱移動率 ${finite(q)} W。正は表面から流体、負は流体から表面。`;
    const shapes=`${rect(30,75,170,111,'diagram-solid')}${rect(382,75,168,111,'diagram-fluid')}
    <path d="M405 91 Q430 80 456 91 T530 91 M405 119 Q430 108 456 119 T530 119 M405 148 Q430 137 456 148 T530 148" class="diagram-fluid-lines"/>
    ${heatArrow(q,211,369,123)}
    ${label(115,35,'固体表面')}${label(468,35,'周囲流体')}
    ${label(115,55,finite(v.surface)+' ℃')}${label(468,55,finite(v.fluid)+' ℃')}
    ${label(290,194,'h = '+finite(v.h)+' W/(m²·K)')}`;
    return common('固体表面と周囲流体の対流',desc,shapes,'対流熱伝達率hにより表面と流体の間で熱交換');
  }
  if(mode==='radiation'){
    const desc=`放射率 ${finite(v.emissivity)} の面が ${finite(v.surface)} ℃、囲いが ${finite(v.surrounding)} ℃。正味放射熱移動率 ${finite(q)} W。真空中も熱放射は可能。`;
    const shapes=`${rect(27,71,172,107,'diagram-solid')}${rect(390,71,164,107,'diagram-enclosure')}
    ${waves(240,'diagram-radiation-wave')}${waves(279,'diagram-radiation-wave')}${waves(318,'diagram-radiation-wave')}
    ${heatArrow(q,212,374,148)}
    ${label(112,37,'放射面 Tₛ')}${label(471,37,'大きな黒体囲い')}
    ${label(112,57,finite(v.surface)+' ℃')}${label(471,57,finite(v.surrounding)+' ℃')}
    ${label(291,198,'ε = '+finite(v.emissivity)+' ／ 絶対温度Kの4乗で計算')}`;
    return common('表面と黒体囲いの熱放射',desc,shapes,'電磁波による正味放射交換。単純化した形態係数1のモデル');
  }
  if(mode==='resistance'){
    const nodes=Array.isArray(result.temperatures)?result.temperatures:[];
    const layers=[{x:34,w:88,cl:'diagram-fluid'},{x:122,w:105,cl:'diagram-connector'},{x:227,w:68,cl:'diagram-layer-one'},{x:295,w:68,cl:'diagram-layer-two'},{x:363,w:95,cl:'diagram-connector'},{x:458,w:89,cl:'diagram-fluid'}];
    const shapes=`${layers.map(item=>rect(item.x,85,item.w,82,item.cl)).join('')}
    ${heatArrow(q,140,438,126)}
    ${label(78,43,'流体1')}${label(270,43,'壁1')}${label(332,43,'壁2')}${label(502,43,'流体2')}
    ${nodes.map((t,i)=>label(45+i*119,185,finite(t)+'℃','diagram-node-label')).join('')}
    ${label(290,205,'対流 → 伝導 → 伝導 → 対流','diagram-figure-heading')}`;
    const desc=`2層の壁と両側対流を直列につなぐ熱抵抗モデル。左流体${finite(v.hot)} ℃、右流体${finite(v.cold)} ℃、総熱移動率 ${finite(q)} W。各境界の計算温度を下に表示。`;
    return common('多層壁と直列熱抵抗',desc,shapes,'層界面の温度を下に示す定常モデル。各層の温度降下は熱抵抗に比例');
  }
  if(mode==='transient'){
    const current=Number(result.temperature),ambient=Number(v.ambient),initial=Number(v.initial),dt=current-ambient;
    if(!Number.isFinite(current)||!Number.isFinite(ambient))return '';
    const direction=dt>0?'物体から流体へ放熱':dt<0?'流体から物体へ吸熱':'温度差なし';
    const desc=`集中熱容量モデル。初期温度 ${finite(initial)} ℃、経過 ${finite(v.time)} 秒後の物体温度 ${finite(current)} ℃、周囲流体温度 ${finite(ambient)} ℃。${direction}。`;
    const shapes=`${rect(25,65,174,108,'diagram-solid')}${rect(383,65,171,108,'diagram-fluid')}
    ${heatArrow(q,211,371,123)}
    ${label(111,35,'物体')}${label(468,35,'周囲流体')}
    ${label(111,54,finite(current)+' ℃')}${label(468,54,finite(ambient)+' ℃')}
    ${label(112,195,'初期 '+finite(initial)+' ℃')}${label(474,195,'t = '+finite(v.time)+' s')}
    ${label(290,72,'温度変化の向き','diagram-figure-heading')}`;
    return common('集中熱容量法の物体の冷却・加熱',desc,shapes,'物体内部は温度一様と仮定。物体温度は時間とともに変わる');
  }
  return '';
}
