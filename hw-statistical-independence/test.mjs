import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCSV,contingency,analyze,chiSquareSF,exportCSV,csvCell} from './core.mjs';
import {presets} from './presets.mjs';
const close=(a,b,t=1e-11)=>assert.ok(Math.abs(a-b)<=t,`${a} vs ${b}, tolerance ${t}`);
function fromCounts(matrix){
 const lines=['X,F,Count'];
 matrix.forEach((row,i)=>row.forEach((v,j)=>lines.push([i,j,v].join(','))));
 return analyze(contingency(parseCSV(lines.join('\n')),0,1,2));
}
const ref=JSON.parse(readFileSync(new URL('./reference.json',import.meta.url)));
for(const fixture of ref.tables){
 const a=fromCounts(fixture.observed);
 close(a.stat,fixture.statistic);close(a.p,fixture.p,2e-13);assert.equal(a.df,fixture.df);
 a.expected.forEach((row,i)=>row.forEach((e,j)=>close(e,fixture.expected[Number(a.xLabels[i])][Number(a.fLabels[j])])));
 close(a.joint.flat().reduce((s,x)=>s+x,0),1);
 a.rowConditional.forEach(row=>close(row.reduce((s,x)=>s+x,0),1));
 a.colTotals.forEach((_,j)=>close(a.colConditional.reduce((s,row)=>s+row[j],0),1));
 a.expected.forEach((row,i)=>close(row.reduce((s,x)=>s+x,0),a.rowTotals[i]));
 a.colTotals.forEach((c,j)=>close(a.expected.reduce((s,row)=>s+row[j],0),c));
 close(a.contributions.flat().reduce((s,x)=>s+x,0),a.stat);
 for(let i=0;i<a.observed.length;i++)for(let j=0;j<a.observed[0].length;j++){
  close(a.joint[i][j],a.rowConditional[i][j]*a.rowTotals[i]/a.total);
  close(a.joint[i][j],a.colConditional[i][j]*a.colTotals[j]/a.total);
 }
 const transposed=fromCounts(fixture.observed[0].map((_,j)=>fixture.observed.map(row=>row[j])));
 close(transposed.stat,a.stat);close(transposed.p,a.p);close(transposed.v,a.v);
}
let maxRelative=0;
for(const {df,statistic,p} of ref.survival){
 const actual=chiSquareSF(statistic,df);
 if(p>1e-300)maxRelative=Math.max(maxRelative,Math.abs(actual-p)/p);
 close(actual,p,2e-12);
 if(p>1e-300)assert.ok(Math.abs(actual-p)/p<2e-11);
}
const sample=analyze(contingency(parseCSV(presets.product.csv),0,1,2));
assert.equal(sample.stat,0);assert.equal(sample.p,1);assert.equal(sample.sampleIndependent,true);assert.equal(sample.v,0);
assert.equal(analyze(contingency(parseCSV(presets.sparse.csv),0,1)).adequate,false);
const constant=analyze(contingency(parseCSV('X,F\nA,Yes\nA,No'),0,1));
assert.equal(constant.df,0);assert.equal(constant.p,null);assert.equal(constant.v,null);
const quote=parseCSV('\uFEFFX,F,Count\r\n"A, A","A ""quote""",2\r\n"Line\nBreak",Other,3\r\n');
assert.deepEqual(quote.rows,[['A, A','A "quote"','2'],['Line\nBreak','Other','3']]);
assert.equal(parseCSV('X;F\nA;B',';').rows[0][1],'B');
assert.equal(parseCSV('X\tF\nA\tB','\t').rows[0][1],'B');
assert.equal(parseCSV('X,F\nA,B\n\n\r\n').rows.length,1);
for(const text of ['X,X\nA,B','X,F\nA','X,F\n"A,B','X,F\nA,"B"x','X,F\nA,B"','X,\nA,B'])assert.throws(()=>parseCSV(text));
for(const count of ['-1','1.5','NaN','','Infinity','10000001'])assert.throws(()=>contingency(parseCSV('X,F,Count\nA,B,'+count),0,1,2));
assert.throws(()=>contingency(parseCSV('X,F\nA,B'),0,0));
assert.throws(()=>contingency(parseCSV('X,F\nA,B'),0,1,0));
const missing=analyze(contingency(parseCSV('X,F,Count\nA,B,2\n,Missing,7\nMissing,,5\nUnused,Unused,0\n A ,B,3'),0,1,2));
assert.equal(missing.total,5);assert.equal(missing.missing,2);assert.equal(missing.zero,1);assert.equal(missing.xLabels.length,1);
assert.throws(()=>contingency(parseCSV('X,F\n,Only missing'),0,1));
assert.throws(()=>contingency(parseCSV('X,F\n'+Array.from({length:21},(_,i)=>i+',A').join('\n')),0,1));
const raw=analyze(contingency(parseCSV('X,F\nA,Yes\nA,No\nB,No\nA,Yes'),0,1));
const counted=fromCounts([[2,1],[0,1]]);
close(raw.stat,counted.stat);close(raw.p,counted.p);assert.deepEqual(raw.observed,counted.observed);
const exported=parseCSV(exportCSV(sample,.05,false));
assert.equal(exported.rows.length,4);
assert.equal(exported.header.includes('expected_count'),true);
assert.equal(exported.rows[0][exported.header.indexOf('asymptotic_p')],'1');
const sparse=analyze(contingency(parseCSV(presets.sparse.csv),0,1));
assert.equal(parseCSV(exportCSV(sparse,.05,true)).rows[0][14],'');
console.log('PASS: '+ref.tables.length+' independent SciPy tables; counts, margins, conditionals, expected values, χ², p and Cramér V');
console.log('PASS: '+ref.survival.length+' SciPy survival references; maximum relative error '+maxRelative);
console.log('PASS: exact empirical independence, sparse and degenerate cases, CSV quoting, invalid inputs, missing pairs, zero counts and exports');

assert.equal(csvCell('=1+1'), JSON.stringify(String.fromCharCode(39)+'=1+1'));
assert.throws(()=>parseCSV('a'.repeat(1000001)));
assert.throws(()=>parseCSV('X,F\n'+'A,B\n'.repeat(20001)));
console.log('PASS: input size limits and spreadsheet-safe string exports');
