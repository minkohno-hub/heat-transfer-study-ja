// Dynamically authored explanatory SVG, never a copied source-book figure.
// Labels and arrow directions reflect the current validated model input.
const esc=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('ja-JP',{maximumSignificantDigits:5}):'入力確認';
const label=(x,y,t,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${esc(t)}</text>`;
const arrow=(dir,y=113)=>dir===0?`<line x1="238" y1="${y-13}" x2="238" y2="${y+13}" class="diagram-arrow"/>`:
  dir>0?`<line x1="168" y1="${y}" x2="310" y2="${y}" class="diagram-arrow"/><path d="M296 ${y-9} L310 ${y} L296 ${y+9}" class="diagram-arrow"/>`:
  `<line x1="310" y1="${y}" x2="168" y2="${y}" class="diagram-arrow"/><path d="M182 ${y-9} L168 ${y} L182 ${y+9}" class="diagram-arrow"/>`;
const outer=(name,description,body)=>`<figure class="simulation-figure"><svg class="sim-physical-diagram" role="img" viewBox="0 0 480 210" xmlns="http://www.w3.org/2000/svg"><title>${esc(name)}</title><desc>${esc(description)}</desc>${body}</svg><figcaption>アプリ作成の図。形状は模式図であり、実際の寸法比や温度分布の厳密な可視化ではありません。</figcaption></figure>`;
export function renderSimulationDiagram(mode,values,result){
  const v=values||{};
  const invalid=result?.error||'';
  let name,desc,body;
  const signedFlux=delta=>result?.error?0:Number.isFinite(result?.watts)?Math.sign(result.watts):Math.sign(delta);
  if(mode==='conduction'){
    const diff=Number(v.hot)-Number(v.cold),dir=signedFlux(diff);
    name='平板内の定常熱伝導';desc=`左側温度${fmt(v.hot)}℃、右側温度${fmt(v.cold)}℃、板厚${fmt(v.thickness)}m、面積${fmt(v.area)}m²。熱は${dir>0?'左から右':dir<0?'右から左':'移動しない'}。`;
    body=`<rect x="184" y="45" width="110" height="112" class="diagram-solid"/>${label(184,31,'平板・熱伝導')}${label(28,76,'左面 ' +fmt(v.hot)+' ℃')}${label(320,76,'右面 '+fmt(v.cold)+' ℃')}${arrow(dir)}${label(178,179,'厚さ L = '+fmt(v.thickness)+' m')}${label(168,198,'面積 A = '+fmt(v.area)+' m²')}`;
  }else if(mode==='convection'){
    const diff=Number(v.surface)-Number(v.fluid),dir=signedFlux(diff);
    name='表面から流体への対流';desc=`表面温度${fmt(v.surface)}℃、流体温度${fmt(v.fluid)}℃、熱伝達率${fmt(v.h)}W毎平方メートル毎ケルビン。熱は${dir>0?'表面から流体へ':dir<0?'流体から表面へ':'移動しない'}。`;
    body=`<rect x="80" y="44" width="104" height="117" class="diagram-solid"/><path d="M210 46 Q245 62 210 78 Q245 94 210 110 Q245 126 210 145" class="diagram-boundary"/>${label(28,30,'固体表面')}${label(292,30,'流体（流れ →）')}${label(29,184,'Ts='+fmt(v.surface)+' ℃')}${label(286,184,'T∞='+fmt(v.fluid)+' ℃')}${arrow(dir)}${label(197,200,'h='+fmt(v.h)+' W/(m²·K)')}`;
  }else if(mode==='radiation'){
    const s=Number(v.surface)+273.15,c=Number(v.surrounding)+273.15,dir=signedFlux((s-c)*Number(v.emissivity));
    name='表面と周囲の放射交換';desc=`表面${fmt(s)}K、周囲${fmt(c)}K、放射率${fmt(v.emissivity)}。正味の熱移動は${dir>0?'表面から周囲へ':dir<0?'周囲から表面へ':'ゼロ'}。両者は絶対温度で比較。`;
    body=`<rect x="75" y="42" width="94" height="119" rx="9" class="diagram-solid"/><rect x="324" y="42" width="92" height="119" rx="9" class="diagram-ambient"/>${label(29,27,'放射面')}${label(325,27,'黒体の周囲')}${label(25,183,'Ts='+fmt(s)+' K')}${label(315,183,'Tsur='+fmt(c)+' K')}${arrow(dir)}${label(196,164,'ε = '+fmt(v.emissivity))}${label(165,200,'正味放射 Q̇ ∝ Ts⁴−Tsur⁴')}`;
  }else if(mode==='resistance'){
    const diff=Number(v.hot)-Number(v.cold),dir=signedFlux(diff);
    name='直列熱抵抗を通る伝熱';desc=`高温側${fmt(v.hot)}℃、低温側${fmt(v.cold)}℃。伝導層1の厚さ${fmt(v.L1)}m、層2の厚さ${fmt(v.L2)}m。熱は${dir>0?'高温側から低温側へ':dir<0?'低温側から高温側へ':'流れない'}。`;
    body=`<rect x="180" y="43" width="60" height="116" class="diagram-solid"/><rect x="240" y="43" width="63" height="116" class="diagram-ambient"/>${label(190,32,'層1')}${label(252,32,'層2')}${label(23,81,'高温側 '+fmt(v.hot)+' ℃')}${label(320,81,'低温側 '+fmt(v.cold)+' ℃')}${arrow(dir)}${label(180,183,'L1='+fmt(v.L1)+' m')}${label(304,183,'L2='+fmt(v.L2)+' m')}${label(166,201,'対流 ↔ 伝導 ↔ 対流')}`;
  }else if(mode==='transient'){
    const temp=result&&!result.error?result.temperature:Number(v.initial),amb=Number(v.ambient);
    const dir=result?.error?0:Number.isFinite(result?.watts)?Math.sign(result.watts):Math.sign(temp-amb);
    name='内部温度を一様と仮定した非定常冷却・加熱';desc=`経過時間${fmt(v.time)}秒、物体温度${fmt(temp)}℃、周囲流体温度${fmt(amb)}℃。Bi=${result&&!result.error?fmt(result.biot):'計算不能'}。熱は${dir>0?'物体から流体へ':dir<0?'流体から物体へ':'出入りしない'}。`;
    body=`<rect x="78" y="43" width="102" height="116" rx="12" class="diagram-solid"/><path d="M212 45 Q244 58 212 76 Q244 95 212 114 Q244 131 212 150" class="diagram-boundary"/>${label(39,28,'温度一様の固体')}${label(310,28,'周囲流体')}${label(35,183,'T(t)='+fmt(temp)+' ℃')}${label(305,183,'T∞='+fmt(amb)+' ℃')}${arrow(dir)}${label(177,201,'t='+fmt(v.time)+' s  /  Bi='+ (result&&!result.error?fmt(result.biot):'—'))}`;
  }else return '';
  if(invalid)desc+=' 入力値の再確認が必要。';
  return outer(name,desc,body);
}
