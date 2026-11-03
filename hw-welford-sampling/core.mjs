export const sizes = [2,5,10,30,50,100,300,500,1000];
export const mu = 5, sigma2 = 10, fourth = 178;
export const varianceOfVariance = n => (fourth - (n-3)/(n-1)*sigma2**2)/n;
export class Welford {
  count = 0;
  mean = 0;
  M2 = 0;
  add(x) {
    if (!Number.isFinite(x)) throw new Error('Expected a finite observation.');
    this.count++;
    const delta = x - this.mean;
    this.mean += delta / this.count;
    this.M2 += delta * (x - this.mean);
    return delta;
  }
  get variance() { return this.count > 1 ? this.M2/(this.count-1) : null; }
}
export function twoPass(xs) {
  const mean = xs.reduce((a,b)=>a+b,0)/xs.length;
  const M2 = xs.reduce((a,x)=>a+(x-mean)**2,0);
  return {mean,M2,variance:xs.length>1 ? M2/(xs.length-1) : null};
}
export function scores(seed) {
  let state = seed >>> 0;
  return () => {
    let u;
    do {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = Math.imul(state ^ state >>> 15, state | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      u = (t ^ t >>> 14) >>> 0;
    } while (u >= 4294967292); // Largest multiple of 11 below 2^32.
    return u % 11;
  };
}
export function validate(ns,m,seed) {
  if (!ns.length || ns.some(n=>!Number.isInteger(n)||n<2||n>10000)) throw new Error('Use integer n from 2 to 10,000.');
  if (!Number.isInteger(m)||m<2||m>10000) throw new Error('Use integer m from 2 to 10,000.');
  if (!Number.isInteger(seed)||seed<0||seed>4294967295) throw new Error('Seed must be an unsigned 32-bit integer.');
  if (Math.max(...ns)*m>10000000) throw new Error('Use at most 10 million scores per run.');
}
export function simulate(ns,m,seed,progress=()=>{}) {
  validate(ns,m,seed);
  ns=[...new Set(ns)].sort((a,b)=>a-b);
  const horizon=ns.at(-1), draw=scores(seed), checkpoints=new Set(ns);
  const rows=new Map(ns.map(n=>[n,[]])), paths=[];
  for(let j=1;j<=m;j++) {
    const w=new Welford(), path=[];
    for(let t=1;t<=horizon;t++) {
      w.add(draw());
      if(j<=4 && (t<=20||t===horizon||t%Math.ceil(horizon/220)===0))
        path.push({t,mean:w.mean,variance:w.variance});
      if(checkpoints.has(t)) rows.get(t).push({id:j,mean:w.mean,variance:w.variance,M2:w.M2});
    }
    if(j<=4) paths.push(path);
    if(j%Math.max(1,Math.floor(m/20))===0) progress(j/m);
  }
  return {m,seed,paths,groups:ns.map(n=>({n,rows:rows.get(n),...aggregate(rows.get(n))}))};
}
export function aggregate(rows) {
  const means=new Welford(), variances=new Welford();
  for(const row of rows) {means.add(row.mean);variances.add(row.variance);}
  return {mean:means.mean,variance:variances.mean,spreadMean:means.variance,spreadVariance:variances.variance};
}
export function csv({groups,seed,m},summary=false) {
  if(summary) return ['n,m,seed,average_sample_mean,average_sample_variance,variance_of_sample_means,variance_of_sample_variances,absolute_mean_error,absolute_variance_error',...groups.map(g=>[g.n,m,seed,g.mean,g.variance,g.spreadMean,g.spreadVariance,Math.abs(g.mean-mu),Math.abs(g.variance-sigma2)].join(','))].join('\n')+'\n';
  return ['hacker_id,n,sample_mean,sample_variance,M2,distribution,seed',...groups.flatMap(g=>g.rows.map(r=>[r.id,g.n,r.mean,r.variance,r.M2,'DiscreteUniform0to10',seed].join(',')))].join('\n')+'\n';
}
