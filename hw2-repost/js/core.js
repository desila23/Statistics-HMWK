/* Educational ECIES-like envelope. No production security claim. */
import {secp256k1 as curve} from '../vendor/noble.js';
export const N=curve.Point.Fn.ORDER;
export const P=curve.Point.Fp.ORDER;
export const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
export const unhex=s=>{if(typeof s!=='string'||!/^([\da-f]{2})*$/i.test(s))throw Error('Invalid hexadecimal bytes.');return Uint8Array.from(s.match(/../g)||[],x=>parseInt(x,16));};
const enc=new TextEncoder();
export function integer(value,min,max,label='Value'){const n=Number(value);if(String(value).trim()===''||!Number.isSafeInteger(n)||n<min||n>max)throw Error(`${label} must be an integer from ${min} to ${max}.`);return n;}
export function scalar(value){const d=BigInt(value);if(d<1n||d>=N)throw Error('Private scalar is outside 1…n−1.');return unhex(d.toString(16).padStart(64,'0'));}
export const publicKey=d=>hex(curve.getPublicKey(scalar(d),true));
export function randomInt(max){integer(max,1,0xffffffff,'Maximum');const limit=Math.floor(4294967296/max)*max;const a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%max+1;}
const concat=(...arrays)=>{const out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let pos=0;for(const a of arrays){out.set(a,pos);pos+=a.length;}return out;};
const protocol='statistics-hw2/ecies-like/v1';
function validatePacket(packet){if(packet.version!==protocol)throw Error('Unsupported envelope.');if(unhex(packet.salt).length!==32||unhex(packet.iv).length!==12||unhex(packet.ct).length<16)throw Error('Invalid envelope lengths.');curve.Point.fromHex(packet.R).assertValidity();curve.Point.fromHex(packet.Q).assertValidity();}
const context=p=>concat(enc.encode(protocol),unhex(p.R),unhex(p.Q));
export async function derive(d,other,packet){
  const shared=curve.getSharedSecret(scalar(d),unhex(other),true).slice(1); // x-coordinate, 32 bytes
  const material=await crypto.subtle.importKey('raw',shared,'HKDF',false,['deriveBits']);
  const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt:unhex(packet.salt),info:context(packet)},material,256));
  const key=await crypto.subtle.importKey('raw',bits,{name:'AES-GCM'},false,['encrypt','decrypt']);
  return {key,shared:hex(shared),symmetric:hex(bits)};
}
export async function encrypt(message,d){
  if(!crypto?.subtle)throw Error('Web Crypto requires HTTPS or localhost.');
  const Q=publicKey(d),r=curve.utils.randomSecretKey(),R=hex(curve.getPublicKey(r,true));
  const packet={version:protocol,Q,R,salt:hex(crypto.getRandomValues(new Uint8Array(32))),iv:hex(crypto.getRandomValues(new Uint8Array(12)))};
  const rScalar=BigInt('0x'+hex(r));const material=await derive(rScalar,Q,packet);
  packet.ct=hex(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:unhex(packet.iv),additionalData:context(packet),tagLength:128},material.key,enc.encode(message))));
  return {packet,ephemeral:hex(r),...material};
}
export async function decrypt(packet,d){validatePacket(packet);const material=await derive(d,packet.R,packet);const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(packet.iv),additionalData:context(packet),tagLength:128},material.key,unhex(packet.ct));return {...material,message:new TextDecoder('utf-8',{fatal:true}).decode(bytes)};}
export function caesar(text,key){integer(key,0,25,'Caesar shift');return text.replace(/[a-zA-Z]/g,ch=>{const base=ch<='Z'?65:97;return String.fromCharCode(base+(ch.charCodeAt(0)-base+key)%26);});}
export const decipher=(text,k)=>{integer(k,0,25,'Caesar shift');return caesar(text,(26-k)%26);};
export const letters=text=>text.toUpperCase().replace(/[^A-Z]/g,'');
export const counts=text=>{const out=Array(26).fill(0);for(const ch of letters(text))out[ch.charCodeAt(0)-65]++;return out;};
export function body(raw,which){const parts=raw.split(/\*\*\* START OF[^\n]*\*\*\*/);if(parts.length!==2)throw Error('Missing Gutenberg start marker.');let text=parts[1].split(/\*\*\* END OF[^\n]*\*\*\*/)[0];const start=which==='train'?'It is a truth universally acknowledged':'To Sherlock Holmes she is always';const i=text.indexOf(start);if(i<0)throw Error('Novel start marker missing.');text=text.slice(i);return text.replace(/\[Illustration:[\s\S]*?\]/g,' ');}
export function modelFrom(text){const s=letters(text),c=counts(s),total=s.length;if(!total)throw Error('Training text has no A–Z letters.');const p=c.map(x=>(x+1)/(total+26));const bigrams=Array(676).fill(1);for(let i=0;i<s.length-1;i++)bigrams[(s.charCodeAt(i)-65)*26+s.charCodeAt(i+1)-65]++;const denominator=Math.max(0,s.length-1)+676;return {total,counts:c,p,logBigram:bigrams.map(x=>Math.log(x/denominator))};}
export function attackCaesar(cipher,model,method='chi'){const s=letters(cipher);if(!s.length)throw Error('Enter at least one A–Z letter.');if(!['chi','bigram'].includes(method))throw Error('Unknown method.');const c=counts(s),len=s.length;const candidates=Array.from({length:26},(_,k)=>{let score=0;if(method==='chi'){for(let i=0;i<26;i++){const expected=len*model.p[i],observed=c[(i+k)%26];score+=(observed-expected)**2/expected;}}else{const plain=decipher(s,k);for(let i=0;i<plain.length-1;i++)score-=model.logBigram[(plain.charCodeAt(i)-65)*26+plain.charCodeAt(i+1)-65];}return {key:k,score};});const ranked=[...candidates].sort((a,b)=>a.score-b.score||a.key-b.key);return {candidates,ranked,key:ranked[0].key,plaintext:decipher(cipher,ranked[0].key),length:len};}
export function seeded(seed){let a=Number(seed)>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function wilson(success,total){const z=1.959963984540054,p=success/total,d=1+z*z/total,center=(p+z*z/(2*total))/d,half=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;return [Math.max(0,center-half),Math.min(1,center+half)];}
export function experiment(test,model,trials=200,seed=20261021){integer(trials,1,300,'Trials');integer(seed,0,4294967295,'Seed');const text=letters(test),slots=Math.floor(text.length/1000);if(slots<trials)throw Error('Not enough disjoint held-out blocks.');const rng=seeded(seed),blocks=Array.from({length:slots},(_,i)=>i);for(let i=slots-1;i>0;i--){const j=Math.floor(rng()*(i+1));[blocks[i],blocks[j]]=[blocks[j],blocks[i]];}const shifts=Array.from({length:trials},()=>Math.floor(rng()*26));const lengths=[5,10,20,50,100,200,500,1000],rows=[],raw=[];
  for(const length of lengths){let chi=0,bigram=0;for(let i=0;i<trials;i++){const start=blocks[i]*1000,plain=text.slice(start,start+length),actual=shifts[i],cipher=caesar(plain,actual),a=attackCaesar(cipher,model),b=attackCaesar(cipher,model,'bigram');chi+=Number(a.key===actual);bigram+=Number(b.key===actual);raw.push({length,trial:i+1,start,actual,chiKey:a.key,bigramKey:b.key,chiScore:a.ranked[0].score,bigramScore:b.ranked[0].score});}rows.push({length,trials,chiCorrect:chi,bigramCorrect:bigram,chiRate:chi/trials,bigramRate:bigram/trials,chiCI:wilson(chi,trials),bigramCI:wilson(bigram,trials)});}
  return {seed,trials,trainingLetters:model.total,testLetters:text.length,availableBlocks:slots,sampling:'Shuffled disjoint 1000-letter blocks without replacement; paired prefixes across lengths; same shifts for both scoring methods; ties choose smallest shift.',rows,raw};
}
export function* candidateSearch(target,max){integer(max,1,65536,'Search bound');const Q=curve.Point.fromHex(target);Q.assertValidity();let point=curve.Point.ZERO;for(let candidate=1;candidate<=max;candidate++){point=point.add(curve.Point.BASE);yield {candidate,match:point.equals(Q),public:hex(point.toBytes(true))};}}
