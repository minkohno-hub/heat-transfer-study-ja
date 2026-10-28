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
const compactSvg=(mode,result,desc)=>{
  const v=result.values||{},q=Number(result.watts),hot=q>0,neutral=q===0;
  const top=mode==='conduction'?['左側 Tₕ',finite(v.hot)]:
    mode==='convection'?['固体表面',finite(v.surface)]:
    mode==='radiation'?['放射面',finite(v.surface)]:
    mode==='resistance'?['流体1',finite(v.hot)]:['物体',finite(result.temperature)];
  const bottom=mode==='conduction'?['右側 T𝚌',finite(v.cold)]:
    mode==='convection'?['周囲流体',finite(v.fluid)]:
    mode==='radiation'?['大きな黒体囲い',finite(v.surrounding)]:
    mode==='resistance'?['流体2',finite(v.cold)]:['周囲流体',finite(v.ambient)];
  const colorA=neutral?'diagram-cold-side':hot?'diagram-hot-side':'diagram-cold-side';
  const colorB=neutral?'diagram-cold-side':hot?'diagram-cold-side':'diagram-hot-side';
  const mainTitle=mode==='conduction'?'熱伝導':
    mode==='convection'?'対流':
    mode==='radiation'?'熱放射':
    mode==='resistance'?'熱抵抗':'時間変化';
  const flowX=mode==='conduction'||mode==='resistance'?255:150;
  const vector=neutral?label(flowX,161,'正味移動なし','diagram-neutral'):
    q>0?`<line x1="${flowX}" y1="111" x2="${flowX}" y2="202" class="diagram-heat diagram-flow-line"/><polygon points="${flowX},210 ${flowX-8},194 ${flowX+8},194" class="diagram-heat"/>`:
    `<line x1="${flowX}" y1="202" x2="${flowX}" y2="111" class="diagram-heat diagram-flow-line"/><polygon points="${flowX},103 ${flowX-8},119 ${flowX+8},119" class="diagram-heat"/>`;
  const center=mode==='conduction'?
    `${rect(72,138,148,38,'diagram-layer-one')}${label(146,162,'平板 L = '+finite(v.thickness)+' m','diagram-mini-main')}`:
    mode==='resistance'?
    `${rect(42,137,96,40,'diagram-layer-one')}${rect(140,137,96,40,'diagram-layer-two')}${label(90,162,'第1層','diagram-mini-main')}${label(190,162,'第2層','diagram-mini-main')}`:
    mode==='radiation'?
    `<path d="M70 135 q12 9 0 18 t0 18 M102 135 q12 9 0 18 t0 18 M198 135 q12 9 0 18 t0 18" class="diagram-radiation-wave" fill="none"/>`:
    mode==='convection'? `<path d="M65 143 Q95 126 126 143 T190 143 M65 177 Q95 160 126 177 T190 177" class="diagram-fluid-lines"/>`:
    `${label(150,154,'t = '+finite(v.time)+' 秒','diagram-figure-heading')}${label(150,175,'初期 '+finite(v.initial)+' ℃','diagram-figure-heading')}`;
  const upper=`${rect(20,29,260,75,colorA)}${label(150,54,top[0],'diagram-mini-main')}${label(150,84,top[1]+' ℃','diagram-mini-temp')}`;
  const lower=`${rect(20,220,260,66,colorB)}${label(150,242,bottom[0],'diagram-mini-main')}${label(150,271,bottom[1]+' ℃','diagram-mini-temp')}`;
  const modelLabel=label(150,20,mainTitle,'diagram-figure-heading');
  return `<svg class="sim-physical-mini" viewBox="0 0 300 300" role="img" aria-label="${desc} モバイル用の縦配置模式図。"><title>${mainTitle}・スマートフォン用図解</title><desc>${desc}</desc>${modelLabel}${upper}${center}${vector}${lower}</svg>`;
};
const svg=(name,desc,shapes,caption,mode,result)=>`<figure class="sim-physical-figure"><svg class="sim-physical-svg" viewBox="0 0 580 214" role="img" aria-label="${desc}"><title>${name}</title><desc>${desc}</desc>${shapes}</svg>${compactSvg(mode,result,desc)}<figcaption>${caption}。図形の大きさ・色は模式的な表現で、実物の温度分布や流体速度を数値解析したものではありません。</figcaption></figure>`;
const rect=(x,y,w,h,cl)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" class="${cl}"/>`;
const waves=(x,cl)=>`<path d="M${x} 66 q -10 10 0 20 t0 20 t0 20" class="${cl} diagram-wave" fill="none"/>`;
export function renderSimulationVisual(mode,result){
  if(!result||result.error)return '';
  const v=result.values||{},q=Number(result.watts);
  if(!Number.isFinite(q))return '';
  const common=(title,desc,shapes,caption)=>svg(title,desc,shapes,caption,mode,result);
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
    const shapes=`${rect(30,75,170,111,Number(v.surface)>=Number(v.fluid)?'diagram-hot-side':'diagram-cold-side')}${rect(382,75,168,111,Number(v.surface)<Number(v.fluid)?'diagram-hot-side':'diagram-cold-side')}
    <path d="M405 91 Q430 80 456 91 T530 91 M405 119 Q430 108 456 119 T530 119 M405 148 Q430 137 456 148 T530 148" class="diagram-fluid-lines"/>
    ${heatArrow(q,211,369,123)}
    ${label(115,35,'固体表面')}${label(468,35,'周囲流体')}
    ${label(115,55,finite(v.surface)+' ℃')}${label(468,55,finite(v.fluid)+' ℃')}
    ${label(290,194,'h = '+finite(v.h)+' W/(m²·K)')}`;
    return common('固体表面と周囲流体の対流',desc,shapes,'対流熱伝達率hにより表面と流体の間で熱交換');
  }
  if(mode==='radiation'){
    const desc=`放射率 ${finite(v.emissivity)} の面が ${finite(v.surface)} ℃、囲いが ${finite(v.surrounding)} ℃。正味放射熱移動率 ${finite(q)} W。真空中も熱放射は可能。`;
    const shapes=`${rect(27,71,172,107,Number(v.surface)>=Number(v.surrounding)?'diagram-hot-side':'diagram-cold-side')}${rect(390,71,164,107,Number(v.surface)<Number(v.surrounding)?'diagram-hot-side':'diagram-cold-side')}
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
    const shapes=`${rect(25,65,174,108,dt>=0?'diagram-hot-side':'diagram-cold-side')}${rect(383,65,171,108,dt<0?'diagram-hot-side':'diagram-cold-side')}
    ${heatArrow(q,211,371,123)}
    ${label(111,35,'物体')}${label(468,35,'周囲流体')}
    ${label(111,54,finite(current)+' ℃')}${label(468,54,finite(ambient)+' ℃')}
    ${label(112,195,'初期 '+finite(initial)+' ℃')}${label(474,195,'t = '+finite(v.time)+' s')}
    ${label(290,72,'温度変化の向き','diagram-figure-heading')}`;
    return common('集中熱容量法の物体の冷却・加熱',desc,shapes,'物体内部は温度一様と仮定。物体温度は時間とともに変わる');
  }
  return '';
}
