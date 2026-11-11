import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {functions,domainIntegral,domainValue,rangeIntegral,gammaNormal,quadrature,erfSeries} from './core.mjs';
import {reference} from './reference.mjs';

const close=(a,b,t=1e-12)=>assert.ok(Math.abs(a-b)<=t,`${a} is not within ${t} of ${b}`);
for(const [key,f] of Object.entries(functions)){
  for(const n of [1,3,32,255,2048]){
    const r=rangeIntegral(key,n,16), target=f.exact-r.tail;
    assert.ok(r.lower-1e-12<=target&&target<=r.upper+1e-12,key);
    assert.ok(r.lower-1e-12<=r.estimate&&r.estimate<=r.upper+1e-12,key);
    close(r.upper-r.lower,r.T/n*(f.survival(0)-f.survival(r.T)));
    assert.equal(r.queries,2*n+1);
  }
}
for(const key of ['sine','square','absolute','step','indicator','sinc']){
  const exact=functions[key].exact;
  close(domainIntegral(key,4096),exact,1e-7);
  close(rangeIntegral(key,4096).estimate,exact,2e-4);
}
close(domainIntegral('square',8),1/3-1/(12*8**2));
close(domainIntegral('step',4),2);
close(domainIntegral('step',3),7/3);
close(domainIntegral('indicator',3),1/3);
close(domainIntegral('indicator',4),.5);
assert.equal(domainIntegral('dirichlet',17),1);
assert.equal(rangeIntegral('dirichlet',17).estimate,0);
assert.equal(rangeIntegral('thomae',17).estimate,0);
assert.equal(domainValue('thomae',1,3),.5); // midpoint 3/6 = 1/2
close(domainIntegral('thomae',256),1/512);
const fixedCap=rangeIntegral('inverse',16384,16);
close(fixedCap.estimate+fixedCap.tail,2,2e-7);
assert.ok(Math.abs(domainIntegral('inverse',16384)-2)<Math.abs(domainIntegral('inverse',256)-2));
console.log('PASS: nine functions, range bounds, singular truncation and rational-tag cases');

const grid=JSON.parse(readFileSync(new URL('./test-reference.json',import.meta.url),'utf8'));
let maxAbs=0,maxRel=0,maxWork=0,prev=0;
for(const ref of grid){
  const g=gammaNormal(ref.z);
  assert.ok(g.cdf>=prev-4*Number.EPSILON&&g.cdf<=1&&g.tail>=0&&g.tail<=.5);
  prev=g.cdf;
  maxAbs=Math.max(maxAbs,Math.abs(g.cdf-ref.cdf));
  maxRel=Math.max(maxRel,Math.abs(g.tail-ref.tail)/ref.tail);
  maxWork=Math.max(maxWork,g.work);
  assert.equal(g.tail,gammaNormal(-ref.z).tail);
}
assert.ok(maxAbs<=5e-15);
assert.ok(maxRel<=2e-12);
assert.ok(maxWork<100);
assert.equal(gammaNormal(0).cdf,.5);
assert.equal(gammaNormal(40).cdf,1);
assert.equal(gammaNormal(-40).tail,0);
assert.ok(gammaNormal(20).tail>0);
for(const [z,v] of [[1,'0.8413'],[2,'0.9772'],[3,'0.9987']])assert.equal(gammaNormal(z).cdf.toFixed(4),v);
const atOne=reference.find(r=>r.z===1).cdf;
const e=(n,s)=>Math.abs(quadrature(1,n,s).cdf-atOne);
assert.ok(e(16,false)/e(32,false)>3.9);
assert.ok(e(16,true)/e(32,true)>15);
assert.equal(quadrature(1,9,true).work,11);
close(erfSeries(-2).cdf,reference.find(r=>r.z===-2).cdf);
assert.equal(erfSeries(8),null);
console.log(`PASS: ${grid.length} independent normal points; max absolute CDF error ${maxAbs}; max relative tail error ${maxRel}; max gamma work ${maxWork}`);
console.log('PASS: published ETSU digits, quadrature convergence, direct series and extreme tails');
