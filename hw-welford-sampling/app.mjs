import {Welford,twoPass,sizes,mu,sigma2,varianceOfVariance,validate,csv} from './core.mjs';
const $=id=>document.getElementById(id);
const fmt=x=>x===null?'Undefined':Math.abs(x)>=1e9?String(x):Number(x.toPrecision(7)).toString();
const charts=new Map(), colors=['#118e82','#4084cf','#b96b35','#8c69c3'];
function line(label,data,color=colors[0],extra={}) {
  return {type:'line',label,data,borderColor:color,backgroundColor:color,pointRadius:2,borderWidth:2,tension:0,...extra};
}
function draw(id,datasets,xTitle,yTitle,x={},y={},type='line') {
  charts.get(id)?.destroy();
  const style=getComputedStyle(document.documentElement);
  const ink=style.getPropertyValue('--muted').trim(), grid=style.getPropertyValue('--line').trim();
  const scale=(title,opts)=>({type:'linear',title:{display:true,text:title,color:ink},ticks:{color:ink,maxTicksLimit:7},grid:{color:grid},...opts});
  charts.set(id,new Chart($(id),{type,data:{datasets},options:{
    responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'nearest',intersect:false},
    plugins:{legend:{labels:{color:ink,boxWidth:12,usePointStyle:true},position:'bottom'}},
    scales:{x:scale(xTitle,x),y:scale(yTitle,y)}
  }}));
}
const points=(xs,ys)=>xs.map((x,i)=>({x,y:ys[i]}));
const ref=(label,xs,y)=>line(label,points(xs,xs.map(()=>y)),colors[2],{borderDash:[6,4],pointRadius:0});
function pmf(){
  draw('pmf',[{label:'P(X = k) = 1/11',data:Array.from({length:11},(_,x)=>({x,y:1/11})),backgroundColor:colors[0]}],'Score k','Probability',{ticks:{stepSize:1,color:getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()}},{beginAtZero:true},'bar');
}
function bins(values,max,count=25){
  const width=max/count, counts=Array(count).fill(0);
  for(const x of values) counts[Math.max(0,Math.min(count-1,Math.floor(x/width)))]++;
  return counts.map((n,i)=>({x:(i+.5)*width,y:100*n/values.length,low:i*width,high:(i+1)*width,count:n}));
}
function histogram(id,data,max,axis,target,average,ceiling) {
  const marker=(label,x,color)=>line(label,[{x,y:0},{x,y:ceiling}],color,{pointRadius:0,borderDash:[5,4]});
  draw(id,[{type:'bar',label:'Simulated frequency',data,backgroundColor:'#118e82a6',borderColor:colors[0],borderWidth:1,barPercentage:1,categoryPercentage:1},
    marker('Theoretical target',target,colors[2]),marker('Empirical average',average,colors[1])],
    axis,'Hackers (%)',{min:0,max,offset:false},{min:0,max:ceiling},'bar');
  const c=charts.get(id);
  c.options.plugins.tooltip.callbacks.label=({dataset,raw})=>dataset.type==='bar'
    ? `${fmt(raw.low)} to ${fmt(raw.high)}: ${raw.count} hackers (${fmt(raw.y)}%)`
    : `${dataset.label}: ${fmt(raw.x)}`;
  c.update('none');
}
function histPair(groups,key,ids,max,axis,target){
  const lists=groups.map(g=>bins(g.rows.map(r=>r[key]),max));
  const ceiling=Math.max(1,...lists.flat().map(b=>b.y))*1.12;
  groups.forEach((g,i)=>histogram(ids[i],lists[i],max,axis,target,g[key],ceiling));
}
function status(id,message,error=false){
  $(id).textContent=message;$(id).classList.toggle('error',error);
}
let obs=[],updates=[],online=new Welford();
function clearSteps(){
  obs=[];updates=[];online=new Welford();status('stepStatus','Ready. Advance one observation or run the whole sequence.');showSteps();
}
function parse(){
  const input=$('sequence').value.trim();
  if(!input)throw new Error('Enter at least one observation.');
  const tokens=input.split(/[,\s]+/);
  if(tokens.length>500||tokens.some(v=>!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(v))) throw new Error('Enter up to 500 decimal numbers separated by commas or spaces.');
  const values=tokens.map(Number);
  if(values.some(x=>!Number.isFinite(x)||Math.abs(x)>1e140)) throw new Error('Each observation must be finite and at most 10¹⁴⁰ in magnitude.');
  return values;
}
function step(all){
  try{
    if(!obs.length)obs=parse();
    const end=all?obs.length:Math.min(obs.length,online.count+1);
    while(online.count<end){
      const x=obs[online.count],delta=online.add(x);
      updates.push({x,t:online.count,delta,mean:online.mean,M2:online.M2,variance:online.variance});
    }
    status('stepStatus',`Processed ${online.count} of ${obs.length} observations.`);showSteps();
  }catch(e){status('stepStatus',e.message,true);}
}
function showSteps(){
  $('steps').innerHTML=updates.map(r=>`<tr>${[r.x,r.t,r.delta,r.mean,r.M2,r.variance].map(v=>`<td>${fmt(v)}</td>`).join('')}</tr>`).join('');
  const xs=updates.map(r=>r.t);
  draw('stepChart',[line('Running mean',points(xs,updates.map(r=>r.mean))),line('Running sample variance',points(xs,updates.map(r=>r.variance)),colors[1])],'Observation count','Value',{min:1,max:Math.max(2,updates.length)});
  $('step').disabled=$('all').disabled=!!obs.length&&online.count===obs.length;
  if(!updates.length){$('comparison').textContent='Two-pass comparison appears after the first step.';return;}
  const direct=twoPass(obs.slice(0,online.count));
  $('comparison').textContent=`Two-pass result: mean = ${fmt(direct.mean)}, M2 = ${fmt(direct.M2)}, sample variance = ${fmt(direct.variance)}. Absolute differences from Welford: mean ${fmt(Math.abs(direct.mean-online.mean))}, M2 ${fmt(Math.abs(direct.M2-online.M2))}${direct.variance===null?'':', variance '+fmt(Math.abs(direct.variance-online.variance))}.`;
}
$('step').onclick=()=>step(false);$('all').onclick=()=>step(true);
$('clear').onclick=clearSteps;$('sequence').oninput=clearSteps;
$('large').onclick=()=>{$('sequence').value='1000000000002, 1000000000004, 1000000000006';clearSteps();step(true);};

let lab,sweep;
const jobs=new Map();
function launch(kind,ns,m,seed){
  const statusId=kind+'Status',exportId=kind==='lab'?'exportLab':'exportSweep';
  try{validate(ns,m,seed);}catch(e){status(statusId,e.message,true);return;}
  jobs.get(kind)?.terminate();
  $(exportId).disabled=true;
  status(statusId,'Simulating…');
  let w;
  try{w=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});}
  catch(e){status(statusId,'Unable to start the worker. Serve the site over HTTP or HTTPS.',true);return;}
  jobs.set(kind,w);
  const finish=()=>{w.terminate();jobs.delete(kind);$(exportId).disabled=!(kind==='lab'?lab:sweep);};
  w.onerror=()=>{finish();status(statusId,'Simulation worker could not load. Check the server and browser console.',true);};
  w.onmessage=({data})=>{
    if(data.progress!==undefined){status(statusId,`Simulating… ${Math.round(data.progress*100)}%`);return;}
    if(data.error){finish();status(statusId,data.error,true);return;}
    if(kind==='lab'){lab=data.result;showLab();}else{sweep=data.result;showSweep();}
    finish();
    status(statusId,`Complete · m = ${m.toLocaleString('en')} · n = ${ns.join(', ')} · seed ${seed}`);
  };
  w.postMessage({ns,m,seed});
}
function showLab(){
  if(!lab)return;
  const g=lab.groups[0], n=g.n;
  $('labMetrics').innerHTML=[['Theoretical mean',mu],['Average sample mean',g.mean],['Theoretical variance',sigma2],['Average sample variance',g.variance]].map(([l,v])=>`<div class="metric"><small>${l}</small><b>${fmt(v)}</b></div>`).join('');
  $('labDetails').textContent=`Absolute errors: mean ${fmt(Math.abs(g.mean-mu))}; variance ${fmt(Math.abs(g.variance-sigma2))}. Across hackers: SD of sample means ${fmt(Math.sqrt(g.spreadMean))} (theory ${fmt(Math.sqrt(sigma2/n))}); SD of sample variances ${fmt(Math.sqrt(g.spreadVariance))} (theory ${fmt(Math.sqrt(varianceOfVariance(n)))}).`;
  histPair([g],'mean',['meanHist'],10,'Sample mean',mu);
  histPair([g],'variance',['varHist'],50,'Sample variance',sigma2);
  for(const [key,id,target] of [['mean','runningMean',mu],['variance','runningVar',sigma2]]) {
    draw(id,[...lab.paths.map((p,i)=>line('Hacker '+(i+1),p.map(r=>({x:r.t,y:r[key]})),colors[i],{pointRadius:0,pointHitRadius:6})),ref('Theory',[1,n],target)],'Systems attempted',key==='mean'?'Running mean':'Running sample variance',{min:1,max:n},{beginAtZero:true});
  }
  draw('scatter',[{type:'scatter',label:'Hackers',data:g.rows.map(r=>({x:r.mean,y:r.variance})),backgroundColor:'#118e8277',pointRadius:2},
    line('μ = 5',[{x:mu,y:0},{x:mu,y:50}],colors[2],{pointRadius:0,borderDash:[5,4]}),ref('σ² = 10',[0,10],sigma2)],'Sample mean','Sample variance',{min:0,max:10},{min:0,max:50},'scatter');
}
function showSweep(){
  if(!sweep)return;
  const groups=sweep.groups,xs=groups.map(g=>g.n);
  $('sweepRows').innerHTML=groups.map(g=>`<tr>${[g.n,g.mean,g.variance,g.spreadMean,g.spreadVariance,Math.abs(g.mean-mu),Math.abs(g.variance-sigma2)].map(v=>`<td>${fmt(v)}</td>`).join('')}</tr>`).join('');
  for(const [id,key,theory,axis] of [['avgMeanN','mean',()=>mu,'Average sample mean'],['avgVarN','variance',()=>sigma2,'Average sample variance'],['spreadMeanN','spreadMean',n=>sigma2/n,'Variance of sample means'],['spreadVarN','spreadVariance',varianceOfVariance,'Variance of sample variances']]){
    draw(id,[line('Simulation',points(xs,groups.map(g=>g[key]))),line('Theory',points(xs,xs.map(theory)),colors[2],{borderDash:[6,4],pointRadius:0})],'Systems per hacker n (log scale)',axis,{type:'logarithmic',min:2,max:1000},{beginAtZero:key.startsWith('spread')});
  }
  const pair=[groups.find(g=>g.n===5),groups.find(g=>g.n===100)];
  histPair(pair,'mean',['smallMean','largeMean'],10,'Sample mean',mu);
  histPair(pair,'variance',['smallVar','largeVar'],50,'Sample variance',sigma2);
  $('observed').textContent=`Observed in this sweep: at n = 5 the variance across sample means is ${fmt(pair[0].spreadMean)} and across sample variances is ${fmt(pair[0].spreadVariance)}. At n = 100 these are ${fmt(pair[1].spreadMean)} and ${fmt(pair[1].spreadVariance)}. These values describe this run; the theory curves give the expected sampling dispersion.`;
}
function save(file,content){
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const runLab=()=>launch('lab',[$('n').valueAsNumber],$('m').valueAsNumber,$('seed').valueAsNumber);
const runSweep=()=>launch('sweep',sizes,$('sweepM').valueAsNumber,$('sweepSeed').valueAsNumber);
$('labForm').onsubmit=e=>{e.preventDefault();runLab();};
$('sweepForm').onsubmit=e=>{e.preventDefault();runSweep();};
$('reset').onclick=()=>{$('labForm').reset();runLab();};
$('newSeed').onclick=()=>{$('seed').value=crypto.getRandomValues(new Uint32Array(1))[0];runLab();};
$('exportLab').onclick=()=>{if(lab)save('welford-samples.csv',csv(lab));};
$('exportSweep').onclick=()=>{if(sweep)save('welford-sample-size-summary.csv',csv(sweep,true));};
function themeLabel(){$('theme').setAttribute('aria-pressed',String(document.documentElement.dataset.theme==='dark'));}
$('theme').onclick=()=>{
  const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=theme;
  try{localStorage.setItem('statsTheme',theme);}catch{}
  themeLabel();pmf();showSteps();showLab();showSweep();
};
themeLabel();pmf();clearSteps();runLab();runSweep();
