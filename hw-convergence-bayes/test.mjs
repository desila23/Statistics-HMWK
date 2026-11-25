import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {binomial,normalCDF,exactAt,samplePaths,alertBayes,betaCDF,betaQuantile,betaDensity,betaUpdate,relativeLikelihood} from './core.mjs';
const close=(a,b,e=1e-12)=>assert.ok(Math.abs(a-b)<=e,`${a} vs ${b} (tolerance ${e})`);
const ref=JSON.parse(readFileSync(new URL('./reference.json',import.meta.url)));
for(const [n,p,eps,tail,gap] of ref.convergence){
  const mass=binomial(n,p), a=exactAt(n,p,eps);
  close(mass.reduce((s,v)=>s+v,0),1);
  close(mass.reduce((s,v,k)=>s+v*k,0),n*p,1e-9);
  close(mass.reduce((s,v,k)=>s+v*(k-n*p)**2,0),n*p*(1-p),1e-9);
  close(a.tail,tail,2e-12);close(a.gap,gap,8e-8);
  assert.ok(a.tail<=a.bound+1e-12);
}
assert.deepEqual([...binomial(3,0)],[1,0,0,0]);
assert.deepEqual([...binomial(3,1)],[0,0,0,1]);
close(exactAt(4,.5,.25).tail,.125); // Outcomes exactly on the band do not count.
let maxError=0;for(const [z,want] of ref.normal)maxError=Math.max(maxError,Math.abs(normalCDF(z)-want));
assert.ok(maxError<8e-8);
const s={n:256,p:.3,epsilon:.08,m:1000,seed:20261125},a=samplePaths(s);
assert.deepEqual(a,samplePaths(s));
assert.notDeepEqual(a.paths,samplePaths({...s,seed:7}).paths);
assert.equal(a.paths.length,5);assert.equal(a.paths[0].at(-1).x,256);
for(const r of a.rows){
  close(r.empiricalTail,r.tail,6*Math.sqrt(r.tail*(1-r.tail)/s.m)+2/s.m);
  const pmf=binomial(r.n,s.p);
  const moment4=pmf.reduce((v,q,k)=>v+q*(k/r.n-s.p)**4,0);
  close(r.empiricalMSE,r.mse,6*Math.sqrt((moment4-r.mse**2)/s.m)+1e-15);
}
assert.throws(()=>samplePaths({...s,n:4097}));
console.log('PASS: 8 SciPy binomial/CLT configurations, 321 normal values, strict tails, variance and reproducible paths; max normal-CDF error '+maxError);
const alert=alertBayes(.01,.95,.05);
close(alert.posterior,95/590);close(alert.evidence,.059);close(alert.tp+alert.fp+alert.fn+alert.tn,1);
assert.equal(alertBayes(.01,0,0).posterior,null);
assert.equal(alertBayes(.01,1,1).negative,null);
assert.equal(alertBayes(0,1,.1).posterior,0);
assert.equal(alertBayes(1,1,.1).posterior,1);
for(const [a,b,n,k,A,B,mean,low,high] of ref.posteriors){
  const post=betaUpdate(a,b,n,k);
  assert.deepEqual([post.a,post.b],[A,B]);close(post.mean,mean);
  close(post.low,low,2e-12);close(post.high,high,2e-12);
  close(betaCDF(post.low,A,B),.025,1e-10);close(betaCDF(post.high,A,B),.975,1e-10);
}
assert.throws(()=>betaUpdate(1,1,2,3));
close(betaDensity(.2,2,2),.96);close(betaDensity(0,1,8),8);close(betaDensity(1,8,1),8);
assert.equal(relativeLikelihood(.7,10,7),1);assert.equal(relativeLikelihood(0,10,7),0);
assert.equal(relativeLikelihood(1,10,10),1);assert.equal(relativeLikelihood(.5,0,0),1);
close(betaQuantile(.25,1,1),.25);
console.log('PASS: 8 independent SciPy Beta posteriors, endpoints, no-data case, relative likelihood and Bayes base-rate example.');
