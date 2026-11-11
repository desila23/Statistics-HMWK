const PI = Math.PI;
const sinc = x => x === 0 ? 1 : Math.sin(x)/x;
export const functions = {
  sine:{label:'sin(x) · [0, π]',b:PI,max:1,exact:2,f:Math.sin,
    survival:y=>y>=1?0:2*Math.acos(y), note:'Two symmetric branches. The preimage above y has length π − 2 asin(y).'},
  square:{label:'x² · [0, 1]',b:1,max:1,exact:1/3,f:x=>x*x,
    survival:y=>y>=1?0:1-Math.sqrt(y), note:'For 0 ≤ y < 1, the preimage above y is (√y, 1].'},
  step:{label:'1 / 3 step · [0, 1]',b:1,max:3,exact:2,f:x=>x<.5?1:3,
    survival:y=>y<1?1:y<3?.5:0, note:'The survival curve has jumps at y = 1 and 3. A domain grid can miss the jump location; the range method uses the exact half-interval masses.'},
  absolute:{label:'|x − ½| · [0, 1]',b:1,max:.5,exact:.25,f:x=>Math.abs(x-.5),
    survival:y=>Math.max(0,1-2*y), note:'Two pieces above y have total length 1 − 2y. Range midpoint quadrature is exact here because this survival curve is linear.'},
  inverse:{label:'1/√x · (0, 1]',b:1,max:Infinity,exact:2,f:x=>1/Math.sqrt(x),
    survival:y=>y<=1?1:1/(y*y), note:'Unbounded at 0, hence not properly Riemann-integrable on [0,1]. The improper Riemann and Lebesgue integrals both equal 2. A finite range cap T omits exactly 1/T of area.'},
  indicator:{label:'Indicator of [0, ½) · [0, 1]',b:1,max:1,exact:.5,f:x=>x<.5?1:0,
    survival:y=>y<1?.5:0, note:'One positive level, supported on half the interval. The midpoint of an odd domain grid lands at the jump; an even grid aligns with it.'},
  sinc:{label:'sin(x)/x · [0, π]',b:PI,max:1,exact:1.8519370519824662,f:sinc,
    survival:y=>{
      if(y<=0)return PI;
      if(y>=1)return 0;
      let lo=0, hi=PI;
      for(let i=0;i<48;i++){const x=(lo+hi)/2;if(sinc(x)>y)lo=x;else hi=x;}
      return (lo+hi)/2;
    }, levelCost:48,note:'Define f(0) = 1 by continuity. Sinc is decreasing here; find its superlevel length by 48 bisection steps. The reference is Si(π).'},
  dirichlet:{label:'Dirichlet function · [0, 1]',b:1,max:1,exact:0,f:()=>1,
    survival:()=>0,pathology:true,note:'Every rational sample gives 1; every irrational sample gives 0. The tagged sums disagree for arbitrarily fine meshes, so there is no Riemann integral. All positive superlevel sets are countable and have measure zero.'},
  thomae:{label:'Thomae’s function · [0, 1]',b:1,max:1,exact:0,pathology:true,
    survival:()=>0,note:'The score is 1/q for a reduced rational p/q, and 0 on irrationals. For each y > 0 only finitely many denominators q < 1/y contribute. It is continuous at irrationals, discontinuous at rationals, and Riemann- and Lebesgue-integrable with value 0.'}
};
const gcd=(a,b)=>{while(b){[a,b]=[b,a%b];}return a;};
export function domainValue(key,i,n){
  if(key==='dirichlet')return 1;
  if(key==='thomae')return gcd(2*i+1,2*n)/(2*n);
  const f=functions[key];
  return f.f((i+.5)*f.b/n);
}
export function domainIntegral(key,n){
  let sum=0;
  for(let i=0;i<n;i++)sum+=domainValue(key,i,n);
  return sum*functions[key].b/n;
}
export function rangeIntegral(key,k,cap=16){
  const f=functions[key],T=Number.isFinite(f.max)?f.max:cap,h=T/k;
  let low=0,high=0,mid=0;
  let left=f.survival(0);
  for(let j=0;j<k;j++){
    const right=f.survival((j+1)*h);
    high+=left;low+=right;mid+=f.survival((j+.5)*h);left=right;
  }
  return {estimate:mid*h,lower:low*h,upper:high*h,T,tail:key==='inverse'?1/T:0,queries:2*k+1};
}

const invSqrt2Pi=1/Math.sqrt(2*PI), eps=2*Number.EPSILON;
export const pdf=x=>Math.exp(-x*x/2)*invSqrt2Pi;
const result=(z,q,work)=>({cdf:z<0?q:1-q,tail:q,work});
export function gammaNormal(z){
  if(z===0)return {cdf:.5,tail:.5,work:0};
  if(!Number.isFinite(z)||Math.abs(z)>40) return result(z,0,0);
  const x=z*z/2;
  if(x<1.5){
    // Lower incomplete gamma ratio for a=1/2. Factor √x = |z|/√2.
    let term=2,sum=term,i=0;
    do{term*=x/(++i+.5);sum+=term;}while(term>eps*sum&&i<1000);
    const p=Math.abs(z)*invSqrt2Pi*Math.exp(-x)*sum;
    return result(z,.5*(1-p),i+1);
  }
  // Upper incomplete gamma continued fraction, evaluated with modified Lentz.
  const tiny=1e-300;
  let b=x+.5,c=1/tiny,d=1/b,h=d,i=0,delta;
  const guard=v=>Math.abs(v)<tiny?(v<0?-tiny:tiny):v;
  do{
    i++;
    const a=-i*(i-.5);
    b+=2;
    d=1/guard(b+a*d);c=guard(b+a/c);
    delta=d*c;h*=delta;
  }while(Math.abs(delta-1)>eps&&i<1000);
  // Combine the prefactor in log space; exp(-x) alone may underflow too early.
  const q=Math.exp(-x+Math.log(.5*Math.abs(z)*invSqrt2Pi*h));
  return result(z,q,i);
}
export function quadrature(z,n,simpson){
  if(z===0)return {cdf:.5,tail:.5,work:0};
  if(simpson&&n%2)n++;
  const a=Math.abs(z),h=a/n;
  let s=pdf(0)+pdf(a), correction=0;
  for(let i=1;i<n;i++){
    const v=pdf(i*h)*(simpson?(i%2?4:2):2)-correction;
    const t=s+v;correction=(t-s)-v;s=t;
  }
  return result(z,.5-s*h/(simpson?3:2),n+1);
}
export function erfSeries(z){
  const a=Math.abs(z);
  if(a>6)return null;
  if(a===0)return {cdf:.5,tail:.5,work:0};
  let k=0,term=a*invSqrt2Pi,sum=term, correction=0;
  do{
    k++;
    term*=-(a*a/2)/k*(2*k-1)/(2*k+1);
    const v=term-correction,t=sum+v;correction=(t-sum)-v;sum=t;
  }while(Math.abs(term)>eps*Math.abs(sum)&&k<1000);
  return result(z,.5-sum,k+1);
}
