import {normalCDF,alertBayes,betaUpdate,betaDensity,relativeLikelihood} from './core.mjs';
const $=id=>document.getElementById(id),charts=new Map();
const colors=['#138d7f','#4189ce','#9369c1','#c28243','#bf638f'];
const fmt=(v,d=6)=>v===null?'Undefined':v===0?'0':Math.abs(v)<.0001?v.toExponential(3):Number(v.toPrecision(d)).toLocaleString('en-US',{maximumSignificantDigits:d});
const pct=x=>x===null?'Undefined':(x*100).toFixed(2)+'%';
const point=(x,y)=>({x,y});
const curve=(label,data,color,extra={})=>({label,data,borderColor:color,backgroundColor:color,borderWidth:2,pointRadius:0,pointHoverRadius:4,...extra});
function plot(id,data,xLabel,yLabel,x={},y={},legend=true){
  charts.get(id)?.destroy();
  const s=getComputedStyle(document.documentElement),color=s.getPropertyValue('--muted').trim(),grid=s.getPropertyValue('--line').trim();
  const axis=(label,opts)=>({type:'linear',title:{display:true,text:label,color},grid:{color:grid},ticks:{color,maxTicksLimit:7},...opts});
  charts.set(id,new Chart($(id),{type:'line',data:{datasets:data},options:{
    responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'nearest',intersect:false},
    plugins:{legend:{display:legend,position:'bottom',labels:{color,usePointStyle:true,boxWidth:10}}},
    scales:{x:axis(xLabel,x),y:axis(yLabel,y)}
  }}));
}
function metrics(id,items){
  $(id).replaceChildren(...items.map(([label,value])=>{
    const box=document.createElement('div'),small=document.createElement('small'),b=document.createElement('b');
    box.className='metric';small.textContent=label;b.textContent=value;box.append(small,b);return box;
  }));
}
function table(id,rows){
  $(id).replaceChildren(...rows.map(row=>{
    const tr=document.createElement('tr');
    row.forEach((value,i)=>{const cell=document.createElement(i?'td':'th');if(i===0)cell.scope='row';cell.textContent=value;tr.append(cell);});
    return tr;
  }));
}
function status(id,value,error=false){$(id).textContent=value;$(id).classList.toggle('error',error);}
function read(id,min,max,integer=false){
  const v=$(id).valueAsNumber;
  if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw Error(`Enter ${integer?'an integer':'a value'} between ${min} and ${max} in ${$(id).labels[0].textContent.trim()}.`);
  return v;
}
const counters={
  rare:'Take independent Yₙ ∼ Bernoulli(1/n). Then P(Yₙ = 1) = E[Yₙ²] = 1/n → 0, so Yₙ → 0 in probability and in L². Since Σ1/n diverges and the events are independent, the second Borel–Cantelli lemma gives infinitely many ones almost surely. Therefore Yₙ does not converge almost surely to zero.',
  spike:'Let U be uniform on (0,1) and Yₙ = √n · 1{U ≤ 1/n}. For each U > 0 the spike eventually disappears, so Yₙ → 0 almost surely and in probability. Yet E[Yₙ²] = n·(1/n) = 1 for every n: no L² convergence.',
  law:'Take Y equal to +1 or −1 with probability ½ each, and set Yₙ = −Y for every n. Yₙ and Y have identical distributions, so Yₙ → Y in distribution. But P(|Yₙ − Y| > 1) = 1 for every n: no convergence in probability to Y. This example depends on how the two variables are coupled.'
};
function renderCounter(){$('counterResult').textContent=counters[$('counter').value];}
$('counter').onchange=renderCounter;
let sim=null,worker=null,beta=null;
function renderScale(){
  const rho=Number($('rho').value),n=sim?.settings.n??256,p=sim?.settings.p??.3,v=p*(1-p);
  $('rhoValue').textContent=rho.toFixed(2);
  $('scaleResult').textContent=`At n = ${n}, for variables with variance p(1−p) = ${fmt(v)}, the SD of the average is ${fmt(Math.sqrt(v/n))} for independent observations and ${fmt(Math.sqrt(v*(rho+(1-rho)/n)))} at ρ = ${rho.toFixed(2)}. The variance floor as n grows is ${fmt(v*rho)}. The simulation below always uses independent observations; this is a separate covariance calculation.`;
}
$('rho').oninput=renderScale;
function launch(){
  try{
    const settings={p:read('p',.05,.95),n:read('n',1,4096,true),m:read('m',1,1000,true),epsilon:read('eps',.01,.5),seed:read('seed',0,4294967295,true)};
    worker?.terminate();
    $('export').disabled=true;
    status('simStatus','Running independent Bernoulli paths…');
    const w=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});worker=w;
    const finish=()=>{w.terminate();if(worker===w)worker=null;$('export').disabled=!sim;};
    w.onerror=()=>{if(worker!==w)return;finish();status('simStatus','The simulation worker could not load. Open the lab over HTTP or HTTPS.',true);};
    w.onmessage=({data})=>{
      if(worker!==w)return;
      if(data.error){finish();status('simStatus',data.error,true);return;}
      sim={...data.result,settings};finish();renderSim();
      status('simStatus',`Complete · p = ${settings.p} · n = ${settings.n} · m = ${settings.m} · ε = ${settings.epsilon} · seed ${settings.seed}`);
    };
    w.postMessage(settings);
  }catch(e){$('export').disabled=!sim;status('simStatus',e.message,true);}
}
function renderSim(){
  if(!sim)return;
  const {settings:{p,n,m,epsilon},paths,rows}=sim,last=rows.at(-1),maxX=Math.max(2,n);
  metrics('simMetrics',[['Exact MSE',fmt(last.mse)],['Exact deviation probability',fmt(last.tail)],['Paths outside ε',last.outside+' / '+m],['CDF gap to N(0,1)',fmt(last.gap)]]);
  $('simNote').textContent=`At n = ${n}, the average has standard deviation ${fmt(Math.sqrt(last.mse))}. After multiplying the centered average by √n/√[p(1−p)], its variance is exactly 1. Chebyshev bounds the exact deviation probability by ${fmt(last.bound)} for ε = ${epsilon}.`;
  plot('pathsChart',[...paths.map((path,i)=>curve('Path '+(i+1),path,colors[i],{pointRadius:n===1?3:0})),curve('Target p',[point(1,p),point(maxX,p)],'#89969d',{borderDash:[6,4]})],'Prefix length n','Running mean',{type:'logarithmic',min:1,max:maxX},{min:0,max:1});
  plot('tailChart',[
    curve('Exact binomial',rows.map(r=>point(r.n,r.tail)),colors[0],{pointRadius:3}),
    curve('Simulation',rows.map(r=>point(r.n,r.empiricalTail)),colors[1],{pointRadius:3,borderDash:[3,4]}),
    curve('Chebyshev upper bound',rows.map(r=>point(r.n,r.bound)),colors[3],{pointRadius:2,borderDash:[6,4]})
  ],'Prefix length n','Probability',{type:'logarithmic',min:1,max:maxX},{min:0,max:1});
  const visible=last.stairs.filter(q=>q.x>=-4&&q.x<=4);
  const edges=[...last.stairs].reverse().find(q=>q.x< -4)?.y??0;
  plot('cltChart',[
    curve('Standardized binomial CDF',[point(-4,edges),...visible,point(4,visible.at(-1)?.y??edges)],colors[0]),
    curve('Standard normal CDF',Array.from({length:161},(_,i)=>{const x=-4+i/20;return point(x,normalCDF(x));}),colors[1],{borderDash:[6,4]})
  ],'Standardized value z','Cumulative probability',{min:-4,max:4},{min:0,max:1});
  table('simRows',rows.map(r=>[r.n,fmt(r.mse),fmt(r.empiricalMSE),fmt(r.tail),fmt(r.empiricalTail)]));
  renderScale();
}
$('simForm').onsubmit=e=>{e.preventDefault();launch();};
$('export').onclick=()=>{
  if(!sim)return;
  const {p,m,epsilon,seed}=sim.settings;
  const rows=['n,p,paths,epsilon,seed,exact_mse,empirical_mse,exact_tail,empirical_tail,deviations,chebyshev_bound,cdf_gap',...sim.rows.map(r=>[r.n,p,m,epsilon,seed,r.mse,r.empiricalMSE,r.tail,r.empiricalTail,r.outside,r.bound,r.gap].join(','))];
  const url=URL.createObjectURL(new Blob([rows.join('\n')+'\n'],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='convergence-experiment.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function runAlert(){
  try{
    const prior=read('base',0,100)/100,hit=read('hit',0,100)/100,fp=read('false',0,100)/100,a=alertBayes(prior,hit,fp);
    metrics('alertMetrics',[['Prior P(incident)',pct(prior)],['Likelihood P(alert | incident)',pct(hit)],['Evidence P(alert)',pct(a.evidence)],['Posterior P(incident | alert)',pct(a.posterior)]]);
    table('alertRows',[
      ['Incident',fmt(10000*a.tp),fmt(10000*a.fn),fmt(10000*prior)],
      ['Clean',fmt(10000*a.fp),fmt(10000*a.tn),fmt(10000*(1-prior))],
      ['Total',fmt(10000*a.evidence),fmt(10000*(1-a.evidence)),'10,000']
    ]);
    status('alertNote',a.posterior===null?'An alert has probability zero in this model. P(incident | alert) is undefined.':`Among ${fmt(10000*a.evidence)} expected alert sessions, ${fmt(10000*a.tp)} involve an incident: ${pct(a.posterior)}. The probability of an incident given no alert is ${pct(a.negative)}.`);
  }catch(e){status('alertNote',e.message,true);}
}
$('alertForm').onsubmit=e=>{e.preventDefault();runAlert();};
function runBeta(){
  try{
    const n=read('trials',0,300,true),k=read('events',0,300,true);
    const inputs=[[read('a1',1,30,true),read('b1',1,30,true)],[read('a2',1,30,true),read('b2',1,30,true)]];
    const post=inputs.map(([a,b])=>betaUpdate(a,b,n,k));
    beta={n,k,inputs,post};
    renderBeta();status('betaStatus',`Updated both priors with ${k} events in ${n} trials.`);
  }catch(e){status('betaStatus',e.message,true);}
}
function renderBeta(){
  if(!beta)return;
  const {n,k,inputs,post}=beta;
  table('betaRows',post.map((v,i)=>['Prior '+(i?'B':'A'),pct(v.priorMean),`Beta(${v.a}, ${v.b})`,pct(v.mean),`[${pct(v.low)}, ${pct(v.high)}]`]));
  const gap=Math.abs(post[0].mean-post[1].mean)*100;
  $('betaNote').textContent=n===0?'No data: the likelihood is constant, and each posterior equals its prior.':`The two predictions for the next trial differ by ${gap.toFixed(2)} percentage points. Each posterior mean gives the prior mean weight (a+b)/(a+b+n) and the observed fraction k/n weight n/(a+b+n). Try 70 of 100 to compare with 7 of 10.`;
  const xs=Array.from({length:401},(_,i)=>i/400);
  if(n&&k>0&&k<n){xs.push(k/n);xs.sort((x,y)=>x-y);}
  const data=[];
  inputs.forEach(([a,b],i)=>{
    const name=i?'B':'A',color=colors[i],v=post[i];
    data.push(curve('Prior '+name,xs.map(x=>point(x,betaDensity(x,a,b))),color,{borderDash:[5,4]}),curve('Posterior '+name,xs.map(x=>point(x,betaDensity(x,v.a,v.b))),color,{borderWidth:3}));
  });
  plot('betaChart',data,'Event probability θ','Probability density',{min:0,max:1},{beginAtZero:true});
  plot('likelihoodChart',[curve('Relative likelihood',xs.map(x=>point(x,relativeLikelihood(x,n,k))),colors[3])],'Event probability θ','L(θ) / max L',{min:0,max:1},{min:0,max:1.05},false);
}
$('betaForm').onsubmit=e=>{e.preventDefault();runBeta();};
for(const [id,n,k] of [['smallData',10,7],['largeData',100,70]])$(id).onclick=()=>{$('trials').value=n;$('events').value=k;runBeta();};
function markPending(form,statusId){
  $(form).addEventListener('input',()=>status(statusId,'Inputs changed. Submit to update the displayed results.'));
}
markPending('simForm','simStatus');markPending('alertForm','alertNote');markPending('betaForm','betaStatus');
function themeLabel(){$('theme').setAttribute('aria-pressed',String(document.documentElement.dataset.theme==='dark'));}
$('theme').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('statsTheme',t);}catch{}themeLabel();renderSim();renderBeta();};
themeLabel();renderCounter();renderScale();runAlert();runBeta();launch();
