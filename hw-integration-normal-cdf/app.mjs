import {functions,domainValue,domainIntegral,rangeIntegral,pdf,gammaNormal,quadrature,erfSeries} from './core.mjs';
import {reference} from './reference.mjs';
const $=id=>document.getElementById(id);
const charts=new Map(), a='#148c80', b='#4a8ed4', c='#bc7940', d='#8a65c4';
const fmt=(x,n=9)=>x==null?'—':x===0?'0':Number(x.toPrecision(n)).toString();
const err=x=>x==null?'—':x===0?'0':x.toExponential(2);
const xy=(x,y)=>({x,y});
const line=(label,data,color,extra={})=>({type:'line',label,data,borderColor:color,backgroundColor:color,borderWidth:2,pointRadius:0,...extra});
const dots=(label,data,color)=>line(label,data,color,{showLine:false,pointRadius:3,pointHoverRadius:5});
const floors=x=>Math.max(x,1e-16);
function plot(id,datasets,xTitle,yTitle,x={},y={}){
  charts.get(id)?.destroy();
  const css=getComputedStyle(document.documentElement);
  const color=css.getPropertyValue('--muted').trim(), grid=css.getPropertyValue('--line').trim();
  const axis=(title,extra)=>({type:'linear',title:{display:true,text:title,color},grid:{color:grid},ticks:{color,maxTicksLimit:7},...extra});
  charts.set(id,new Chart($(id),{type:'line',data:{datasets},options:{
    responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'nearest',intersect:false},
    plugins:{legend:{position:'bottom',labels:{color,usePointStyle:true,boxWidth:10}}},
    scales:{x:axis(xTitle,x),y:axis(yTitle,y)}
  }}));
}
function table(id,rows){
  const fragment=document.createDocumentFragment();
  for(const row of rows){
    const tr=document.createElement('tr');
    for(const value of row){
      const td=document.createElement('td');td.textContent=value;tr.append(td);
    }
    fragment.append(tr);
  }
  $(id).replaceChildren(fragment);
}
function metrics(id,items){
  const nodes=items.map(([label,value])=>{
    const div=document.createElement('div'),small=document.createElement('small'),strong=document.createElement('b');
    div.className='metric';small.textContent=label;strong.textContent=value;div.append(small,strong);return div;
  });
  $(id).replaceChildren(...nodes);
}
function status(id,message,bad=false){$(id).textContent=message;$(id).classList.toggle('error',bad);}
function input(id,min,max,integer=true){
  const x=$(id).valueAsNumber;
  if(!Number.isFinite(x)||x<min||x>max||(integer&&!Number.isInteger(x)))throw new Error(`Enter ${integer?'an integer':'a number'} from ${min} to ${max}.`);
  return x;
}
function save(name,rows){
  const url=URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')+'\n'],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function bench(fn){
  let sink=0, n=1;
  for(let i=0;i<32;i++)sink+=fn();
  while(n<65536){
    const t=performance.now();
    for(let i=0;i<n;i++)sink+=fn();
    if(performance.now()-t>=7)break;
    n*=2;
  }
  const trials=[];
  for(let t=0;t<5;t++){
    const start=performance.now();
    for(let i=0;i<n;i++)sink+=fn();
    trials.push((performance.now()-start)*1000/n);
  }
  trials.sort((u,v)=>u-v);
  return {us:trials[2],sink};
}
async function timed(button,statusId,tasks){
  $(button).disabled=true;
  status(statusId,'Measuring five batches per method…');
  try{
    await new Promise(resolve=>setTimeout(resolve,30));
    const results=[];
    for(const [name,fn] of tasks){
      const {us,sink}=bench(fn);
      if(!Number.isFinite(sink))throw new Error('Benchmark result was not finite.');
      results.push(`${name}: ${fmt(us,4)} µs per call`);
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    status(statusId,results.join(' · ')+' (median; warm-up and charts excluded). Results depend on device and timer resolution.');
  }catch(e){status(statusId,e.message,true);}
  finally{$(button).disabled=false;}
}
let integration, normal;
for(const [key,f] of Object.entries(functions))$('fn').add(new Option(f.label,key));
function runIntegration(){
  try{
    const key=$('fn').value,n=input('n',1,32768),k=input('k',1,32768),cap=key==='inverse'?input('cap',1,256):16;
    const f=functions[key],domain=domainIntegral(key,n),range=rangeIntegral(key,k,cap);
    const counts=[...new Set([3,7,15,31,63,127,255,511,1023,2047,4095,n,k])].sort((x,y)=>x-y);
    const rows=counts.map(count=>{
      const domain=domainIntegral(key,count),range=rangeIntegral(key,count,cap).estimate;
      return {count,domain,range,de:Math.abs(domain-f.exact),re:Math.abs(range-f.exact)};
    });
    integration={key,f,n,k,cap,domain,range,rows};
    $('intTiming').textContent='';
    renderIntegration();
  }catch(e){status('intStatus',e.message,true);}
}
function renderIntegration(){
  const {key,f,n,k,domain,range:r,rows}=integration;
  status('intStatus',`${f.label} · ${n.toLocaleString('en')} domain intervals · ${k.toLocaleString('en')} range bins`);
  metrics('intMetrics',[
    [key==='dirichlet'?'Lebesgue reference':'Reference integral',fmt(f.exact)],
    [key==='dirichlet'?'Rational-tag sum':'Domain midpoint',fmt(domain)],
    [key==='inverse'?'Range midpoint (clipped)':'Range midpoint',fmt(r.estimate)],
    [key==='inverse'?'Omitted tail 1/T':'Range bound width',fmt(key==='inverse'?r.tail:r.upper-r.lower)]
  ]);
  const domainLabel=key==='dirichlet'?'Gap of rational-tag sum to Lebesgue value':'Domain absolute error';
  $('intDetails').textContent=`${domainLabel}: ${err(Math.abs(domain-f.exact))}. Range error against full integral: ${err(Math.abs(r.estimate-f.exact))}. Range bounds${r.tail?' for the clipped integral':''}: [${fmt(r.lower)}, ${fmt(r.upper)}]. ${n} domain samples; ${r.queries} superlevel queries.`+
    (r.tail?` Exact clipped integral: ${fmt(2-r.tail)}. Error against clipped target: ${err(Math.abs(r.estimate-(2-r.tail)))}. Midpoint plus analytical tail: ${fmt(r.estimate+r.tail)}.`:'')+
    (key==='dirichlet'?' Irrational-tag sum: 0 for every n. The gap is not a Riemann integration error.':'');
  $('intNote').textContent=f.note;
  table('intRows',rows.map(o=>[o.count,fmt(o.domain),fmt(o.range),err(o.de),err(o.re)]));
  const idx=Array.from({length:Math.min(n,100)},(_,i)=>Math.floor(i*n/Math.min(n,100)));
  const samples=idx.map(i=>xy((i+.5)*f.b/n,domainValue(key,i,n)));
  const continuous=[];
  if(!f.pathology){
    if(key==='step'||key==='indicator') {
      const lo=key==='step'?1:1, hi=key==='step'?3:0;
      continuous.push(xy(0,lo),xy(.5,lo),xy(.5,hi),xy(1,hi));
    }else{
      for(let i=key==='inverse'?1:0;i<=160;i++){
        const x=i*f.b/160;continuous.push(xy(x,f.f(x)));
      }
    }
  }
  const datasets=continuous.length?[line('f(x)',continuous,a)]:[];
  datasets.push(dots('Midpoint tags',samples,b));
  if(key==='dirichlet')datasets.push(dots('Irrational tags',idx.map(i=>xy((i+Math.SQRT2/2)/n,0)),c));
  plot('domainPlot',datasets,'Domain x','Function value',{min:0,max:f.b},{beginAtZero:true});
  $('domainCaption').textContent=key==='dirichlet'?'Only tagged samples are drawn. The irrational tags are exactly (i + √2/2)/n in the mathematical model.':key==='thomae'?'Each plotted rational uses the exact reduced denominator of (2i+1)/(2n). Irrational values are zero.':key==='inverse'?'The curve starts away from 0 for display. No endpoint value at 0 is used in the sum.':'Up to 100 midpoint tags shown; every selected interval contributes to the estimate.';
  const heights=Array.from({length:161},(_,i)=>i*r.T/160);
  if(key==='step')heights.push(1,1-1e-12);
  const hs=Array.from({length:Math.min(k,100)},(_,i)=>(Math.floor(i*k/Math.min(k,100))+.5)*r.T/k);
  plot('rangePlot',[line('S(y)',heights.sort((u,v)=>u-v).map(y=>xy(y,f.survival(y))),a),dots('Range midpoint tags',hs.map(y=>xy(y,f.survival(y))),b)],'Height y','Preimage length',{min:0,max:r.T},{min:0,max:f.b*1.06});
  const data=[line('Domain',rows.map(o=>xy(o.count,floors(o.de))),a,{pointRadius:2}),line('Range',rows.map(o=>xy(o.count,floors(o.re))),b,{pointRadius:2})];
  if(key==='dirichlet')data.push(line('Irrational tags',rows.map(o=>xy(o.count,1e-16)),c,{borderDash:[5,4]}));
  if(r.tail)data.push(line('Clipping deficit',rows.map(o=>xy(o.count,r.tail)),c,{borderDash:[5,4]}));
  plot('convergence',data,'Partition count','Absolute gap to reference',{type:'logarithmic'},{type:'logarithmic',min:1e-16});
}
const methods=[
  ['Gamma series / continued fraction',(z)=>gammaNormal(z),a],
  ['Simpson',(z,n)=>quadrature(z,n,true),b],
  ['Trapezoid',(z,n)=>quadrature(z,n,false),c],
  ['Direct erf series',(z)=>erfSeries(z),d],
];
const difference=(r,ref)=>r?Math.abs(r.cdf-ref.cdf):null;
const relative=(r,ref)=>r&&ref.tail>0?Math.abs(r.tail-ref.tail)/ref.tail:null;
function runNormal(){
  try{
    normal={z:input('z',-40,40,false),n:input('panels',2,16384)};
    $('cdfTiming').textContent='';
    renderNormal();
  }catch(e){status('cdfStatus',e.message,true);}
}
function renderNormal(){
  const {z,n}=normal,point=reference.find(r=>r.z===z);
  const current=methods.map(([name,fn])=>[name,fn(z,n)]);
  status('cdfStatus',`z = ${z} · ${n} trapezoid panels · ${n+n%2} Simpson panels`);
  table('cdfPoint',current.map(([name,r])=>r?[name,fmt(r.cdf,17),r.tail<0?`${fmt(r.tail)} (invalid)`:fmt(r.tail,14),r.work]:[name,'Outside demo range','—','—']));
  const fast=current[0][1];
  $('cdfReference').textContent=point?`Independent reference: Φ = ${fmt(point.cdf,17)}, q = ${fmt(point.tail,15)}. Gamma |ΔΦ| = ${err(difference(fast,point))}; relative q error = ${err(relative(fast,point))}.`:'This point is outside the stored reference grid. See the table for points with an independent comparison.';
  normal.rows=reference.map(ref=>({ref,rs:methods.map(([,fn])=>fn(ref.z,n))}));
  table('referenceRows',normal.rows.map(({ref,rs})=>[ref.z,fmt(ref.cdf,17),fmt(ref.tail,12),err(difference(rs[0],ref)),err(relative(rs[0],ref)),...rs.slice(1).map(r=>err(difference(r,ref)))]));
  const max=Math.max(...normal.rows.map(({ref,rs})=>difference(rs[0],ref)));
  const rel=Math.max(...normal.rows.map(({ref,rs})=>relative(rs[0],ref)??0));
  $('gridSummary').textContent=`On this grid: maximum gamma absolute CDF error ${err(max)}; maximum relative smaller-tail error ${err(rel)}. The two metrics expose different failure modes. Binary64 underflows at sufficiently extreme z; rounded Φ may equal 1 long before q becomes zero.`;
  table('etsuRows',[[1,.8413],[2,.9772],[3,.9987]].map(([x,v])=>[x,v,gammaNormal(x).cdf.toFixed(10),gammaNormal(x).cdf.toFixed(4)===v.toFixed(4)?'Yes':'No']));
  const xs=Array.from({length:201},(_,i)=>-5+i/20);
  if(z>-5&&z<5)xs.push(z);
  xs.sort((u,v)=>u-v);
  plot('density',[line('Density φ(x)',xs.map(x=>xy(x,pdf(x))),a),line('Area up to z (visible window)',xs.filter(x=>x<=z).map(x=>xy(x,pdf(x))),b,{fill:'origin',backgroundColor:'#4a8ed44a'})],'Standardized score','Density',{min:-5,max:5},{min:0});
  $('densityNote').textContent=Math.abs(z)>5?'The density window is [−5,5]. The selected z is outside it; the numerical result still includes the full tail.':'Shading displays the part of Φ(z) inside [−5,5]. The exact definition starts at −∞.';
  const selected=point&&z!==0?point:reference.find(r=>r.z===1);
  const panels=[4,8,16,32,64,128,256,512,1024,2048];
  plot('cdfConvergence',methods.slice(1,3).map(([name,fn,color])=>line(name,panels.map(p=>xy(p,floors(difference(fn(selected.z,p),selected)))),color,{pointRadius:2})),'Quadrature panels','Absolute CDF error',{type:'logarithmic'},{type:'logarithmic',min:1e-16});
  $('convergenceNote').textContent=`Compared at z = ${selected.z} using the independent reference${selected.z!==z?' (fallback when the selected z is zero or has no stored reference)':''}. Values below 10⁻¹⁶ share a display floor.`;
}
$('intForm').onsubmit=e=>{e.preventDefault();runIntegration();};
$('cdfForm').onsubmit=e=>{e.preventDefault();runNormal();};
$('fn').onchange=()=>{$('capField').hidden=$('fn').value!=='inverse';runIntegration();};
$('intBench').onclick=()=>{
  const {key,n,k,cap}=integration;
  timed('intBench','intTiming',[['Domain (n='+n+')',()=>domainIntegral(key,n)],['Range with bounds (k='+k+')',()=>rangeIntegral(key,k,cap).estimate]]);
};
$('cdfBench').onclick=()=>{
  const {z,n}=normal;
  timed('cdfBench','cdfTiming',methods.filter(([,fn])=>fn(z,n)).map(([name,fn])=>[name,()=>fn(z,n).tail]));
};
$('intCsv').onclick=()=>save('integration-convergence.csv',[['function','n','k','height_cap','domain_estimate','range_estimate','domain_abs_gap','range_abs_error'],...integration.rows.map(r=>[integration.key,r.count,r.count,integration.range.T,r.domain,r.range,r.de,r.re])]);
$('cdfCsv').onclick=()=>save('normal-cdf-comparison.csv',[['z','method','quadrature_panels','cdf','smaller_tail','reference_cdf','reference_tail','absolute_cdf_error','relative_tail_error','work'],...normal.rows.flatMap(({ref,rs})=>rs.flatMap((r,i)=>r?[[ref.z,methods[i][0],i===1?normal.n+normal.n%2:i===2?normal.n:'',r.cdf,r.tail,ref.cdf,ref.tail,difference(r,ref),relative(r,ref),r.work]]:[]))]);
function themeLabel(){$('theme').setAttribute('aria-pressed',String(document.documentElement.dataset.theme==='dark'));}
$('theme').onclick=()=>{
  const t=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=t;
  try{localStorage.setItem('statsTheme',t);}catch{}
  themeLabel();renderIntegration();renderNormal();
};
themeLabel();runIntegration();runNormal();
