export function binomial(n,p){
  if(!Number.isInteger(n)||n<0||!Number.isFinite(p)||p<0||p>1)throw Error('Invalid binomial parameters.');
  const mass=new Float64Array(n+1);
  if(p===0||p===1){mass[p===0?0:n]=1;return mass;}
  const mode=Math.min(n,Math.floor((n+1)*p));
  mass[mode]=1;
  for(let k=mode;k>0;k--)mass[k-1]=mass[k]*k/(n-k+1)*(1-p)/p;
  for(let k=mode;k<n;k++)mass[k+1]=mass[k]*(n-k)/(k+1)*p/(1-p);
  const total=mass.reduce((s,v)=>s+v,0);
  return mass.map(v=>v/total);
}
export function normalCDF(z){
  // Standard rational normal-tail approximation; absolute error < 8e-8.
  if(z===0)return .5;
  const x=Math.abs(z),t=1/(1+.2316419*x);
  const tail=Math.exp(-x*x/2)/Math.sqrt(2*Math.PI)*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return z<0?tail:1-tail;
}
function mulberry32(seed){
  let s=seed>>>0;
  return ()=>{
    s=(s+0x6D2B79F5)>>>0;let z=s;
    z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);
    return ((z^(z>>>14))>>>0)/4294967296;
  };
}
export function exactAt(n,p,epsilon){
  const mass=binomial(n,p), scale=Math.sqrt(n*p*(1-p));
  let tail=0,cdf=0,gap=0;
  const stairs=[];
  for(let k=0;k<=n;k++){
    const x=(k-n*p)/scale,next=Math.min(1,cdf+mass[k]),phi=normalCDF(x);
    if(Math.abs(k/n-p)>epsilon+1e-14)tail+=mass[k];
    gap=Math.max(gap,Math.abs(cdf-phi),Math.abs(next-phi));
    stairs.push({x,y:cdf},{x,y:next});cdf=next;
  }
  const mse=p*(1-p)/n;
  return {tail:Math.min(1,tail),mse,gap,stairs,bound:Math.min(1,mse/epsilon**2)};
}
export function samplePaths({p,n,m,epsilon,seed}){
  if(!Number.isFinite(p)||p<=0||p>=1||!Number.isInteger(n)||n<1||n>4096||!Number.isInteger(m)||m<1||m>1000||!Number.isFinite(epsilon)||epsilon<=0||!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Invalid simulation parameters.');
  const ns=[...new Set([1,2,4,8,16,32,64,128,256,512,1024,2048,n].filter(t=>t<=n))].sort((a,b)=>a-b);
  const counts=new Map(ns.map(t=>[t,{n:t,outside:0,squared:0}]));
  const random=mulberry32(seed),paths=[],stride=Math.max(1,Math.ceil(n/220));
  for(let j=0;j<m;j++){
    let heads=0;const path=[];
    for(let t=1;t<=n;t++){
      if(random()<p)heads++;
      if(j<5&&(t<=12||t===n||t%stride===0))path.push({x:t,y:heads/t});
      const row=counts.get(t);
      if(row){const d=heads/t-p;row.outside+=Math.abs(d)>epsilon+1e-14?1:0;row.squared+=d*d;}
    }
    if(j<5)paths.push(path);
  }
  return {paths,rows:[...counts.values()].map(row=>({...row,empiricalTail:row.outside/m,empiricalMSE:row.squared/m,...exactAt(row.n,p,epsilon)}))};
}
export function alertBayes(prior,hit,falseAlarm){
  if([prior,hit,falseAlarm].some(p=>!Number.isFinite(p)||p<0||p>1))throw Error('Probabilities must be between 0 and 1.');
  const tp=prior*hit,fp=(1-prior)*falseAlarm,fn=prior*(1-hit),tn=(1-prior)*(1-falseAlarm);
  const evidence=tp+fp;
  return {tp,fp,fn,tn,evidence,posterior:evidence>0?tp/evidence:null,negative:fn+tn>0?fn/(fn+tn):null};
}
const logFacts=[0];
for(let i=1;i<=1000;i++)logFacts.push(logFacts[i-1]+Math.log(i));
export function betaDensity(x,a,b){
  if(x===0)return a===1?b:0;
  if(x===1)return b===1?a:0;
  return Math.exp(logFacts[a+b-1]-logFacts[a-1]-logFacts[b-1]+(a-1)*Math.log(x)+(b-1)*Math.log1p(-x));
}
export function betaCDF(x,a,b){
  // Integer shapes: I_x(a,b) = P(Binomial(a+b-1,x) >= a).
  const mass=binomial(a+b-1,x);
  let sum=0;
  for(let k=a;k<mass.length;k++)sum+=mass[k];
  return Math.min(1,sum);
}
export function betaQuantile(q,a,b){
  let lo=0,hi=1;
  for(let i=0;i<42;i++){const x=(lo+hi)/2;if(betaCDF(x,a,b)<q)lo=x;else hi=x;}
  return (lo+hi)/2;
}
export function betaUpdate(a,b,n,k){
  if(![a,b,n,k].every(Number.isInteger)||a<1||a>30||b<1||b>30||n<0||n>300||k<0||k>n)throw Error('Use integer shapes from 1 to 30 and 0 ≤ successes ≤ trials ≤ 300.');
  const A=a+k,B=b+n-k;
  return {a:A,b:B,priorMean:a/(a+b),mean:A/(A+B),variance:A*B/((A+B)**2*(A+B+1)),low:betaQuantile(.025,A,B),high:betaQuantile(.975,A,B)};
}
export function relativeLikelihood(x,n,k){
  if(n===0)return 1;
  const logL=p=>{
    if((p===0&&k>0)||(p===1&&n>k))return -Infinity;
    return (k?k*Math.log(p):0)+(n>k?(n-k)*Math.log1p(-p):0);
  };
  return Math.exp(logL(x)-logL(k/n));
}
