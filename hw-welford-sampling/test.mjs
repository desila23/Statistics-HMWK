import assert from 'node:assert/strict';
import {Welford,twoPass,scores,simulate,sizes,varianceOfVariance,validate,csv} from './core.mjs';
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t,`${a} vs ${b} (tolerance ${t})`);
const calc=xs=>{const w=new Welford();xs.forEach(x=>w.add(x));return w;};
let w=calc([2,4,6]);
assert.deepEqual([w.mean,w.M2,w.variance],[4,8,4]);
assert.deepEqual([calc([7]).mean,calc([7]).variance],[7,null]);
assert.equal(calc([1,5]).variance,8);
assert.equal(calc([7,7,7]).variance,0);
for(const xs of [[.1,.5,2.3,-.2],[1e12+2,1e12+4,1e12+6],[-3,10,50,12,1]]) {
  const w=calc(xs), d=twoPass(xs);
  close(w.mean,d.mean);close(w.M2,d.M2);close(w.variance,d.variance);
  if(xs.length>=3){const prev=calc(xs.slice(0,-1)),n=xs.length,delta=xs.at(-1)-prev.mean;close(w.variance,(n-2)/(n-1)*prev.variance+delta**2/n);}
}
console.log('PASS: Welford examples, two-pass equivalence and variance recurrence');
const support=Array.from({length:11},(_,i)=>i);
assert.equal(support.reduce((s,x)=>s+x,0)/11,5);
assert.equal(support.reduce((s,x)=>s+(x-5)**2,0)/11,10);
assert.equal(support.reduce((s,x)=>s+(x-5)**4,0)/11,178);
const exactN2=support.flatMap(a=>support.map(b=>(a-b)**2/2));
close(twoPass(exactN2).mean,10);
close(twoPass(exactN2).M2/121,varianceOfVariance(2));
const draw=scores(7128), repeat=scores(7128), counts=Array(11).fill(0), N=110000;
for(let i=0;i<N;i++){const x=draw();assert.equal(x,repeat());assert.ok(Number.isInteger(x)&&x>=0&&x<=10);counts[x]++;}
for(const c of counts)close(c,N/11,6*Math.sqrt(N/11*(10/11)));
console.log('PASS: exact uniform moments, exact n=2 variance dispersion, seeded score support and 6-SD frequency checks');
const seed=738,m=5000;
const sim=simulate(sizes,m,seed);
const stream=scores(seed), originals=new Map(sizes.map(n=>[n,[]]));
for(let j=0;j<m;j++){
  const xs=Array.from({length:1000},()=>stream());
  for(const n of sizes) originals.get(n).push(twoPass(xs.slice(0,n)));
}
for(const g of sim.groups){
  assert.equal(g.rows.length,m);
  assert.equal(sim.paths[0][0].variance,null);
  assert.equal(sim.paths[0].at(-1).t,1000);
  const expected=originals.get(g.n);
  g.rows.forEach((r,i)=>{
    assert.equal(r.id,i+1);close(r.mean,expected[i].mean);close(r.M2,expected[i].M2,1e-8);close(r.variance,expected[i].variance);
  });
  const a=twoPass(expected.map(x=>x.mean)), b=twoPass(expected.map(x=>x.variance));
  close(g.mean,a.mean);close(g.variance,b.mean);close(g.spreadMean,a.variance);close(g.spreadVariance,b.variance);
  close(g.mean,5,6*Math.sqrt(10/(g.n*m)));
  close(g.variance,10,6*Math.sqrt(varianceOfVariance(g.n)/m));
}
assert.deepEqual(simulate([2,30],20,0),simulate([2,30],20,0));
assert.notDeepEqual(simulate([2,30],20,0),simulate([2,30],20,1));
for(const args of [[[1],10,0],[[2],1,0],[[2],10,-1],[[2],10,1.5],[[10000],10000,0]])assert.throws(()=>validate(...args));
const out=csv(simulate([5],10,12)).trim().split('\n');
assert.equal(out.length,11);
assert.equal(out[0],'hacker_id,n,sample_mean,sample_variance,M2,distribution,seed');
assert.equal(out[1].split(',').at(-1),'12');
assert.equal(csv(sim,true).trim().split('\n').length,10);
console.log('PASS: 5,000 hackers × 1,000 scores, 45,000 estimates checked independently, aggregates, 6-SE checks, seed, limits and CSV');
for(const g of sim.groups)console.log(g.n, ...[g.mean,g.variance,g.spreadMean,g.spreadVariance].map(x=>x.toFixed(6)));
