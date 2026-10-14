/* Educational Ethereum derivation engine (test vectors only).
   BIP-39 seed generation: native WebCrypto PBKDF2-HMAC-SHA512.
   BIP-32 private CKD; secp256k1 public point calculation; Keccak-256/ SHA3-256.
   This is teaching code, NOT audited wallet software. Never enter real secrets. */
(function(root) {
  'use strict';
  const te = new TextEncoder();
  const MASK = (1n << 64n) - 1n;
  const P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
  const N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const G = {x:0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
    y:0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n};
  const RATE=136;
  const RC=[
    0x0000000000000001n,0x0000000000008082n,0x800000000000808An,0x8000000080008000n,
    0x000000000000808Bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,
    0x000000000000008An,0x0000000000000088n,0x0000000080008009n,0x000000008000000An,
    0x000000008000808Bn,0x800000000000008Bn,0x8000000000008089n,0x8000000000008003n,
    0x8000000000008002n,0x8000000000000080n,0x000000000000800An,0x800000008000000An,
    0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];
  const RHO=[0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
  const rot=(a,n)=> n ? ((a<<BigInt(n)) | (a>>BigInt(64-n))) & MASK : a;
  function keccakF(a) {
    for(let r=0;r<24;r++) {
      const c=new Array(5),d=new Array(5),b=new Array(25);
      for(let x=0;x<5;x++) c[x]=a[x]^a[x+5]^a[x+10]^a[x+15]^a[x+20];
      for(let x=0;x<5;x++) d[x]=c[(x+4)%5]^rot(c[(x+1)%5],1);
      for(let y=0;y<5;y++) for(let x=0;x<5;x++) a[x+5*y]^=d[x];
      for(let y=0;y<5;y++) for(let x=0;x<5;x++) b[y+5*((2*x+3*y)%5)]=rot(a[x+5*y],RHO[x+5*y]);
      for(let y=0;y<5;y++) for(let x=0;x<5;x++) a[x+5*y]=b[x+5*y]^((~b[(x+1)%5+5*y])&b[(x+2)%5+5*y]);
      a[0]^=RC[r];
    }
  }
  function digest256(input,sha3=false) {
    const data=input instanceof Uint8Array?input:te.encode(String(input));
    const blocks=Math.ceil((data.length+1)/RATE);
    const padded=new Uint8Array(blocks*RATE);
    padded.set(data);padded[data.length]^=sha3?0x06:0x01;padded[padded.length-1]^=0x80;
    const a=new Array(25).fill(0n);
    for(let off=0;off<padded.length;off+=RATE){
      for(let i=0;i<RATE/8;i++){
        let lane=0n;for(let j=0;j<8;j++)lane|=BigInt(padded[off+i*8+j])<<BigInt(j*8);
        a[i]^=lane;
      }
      keccakF(a);
    }
    const out=new Uint8Array(32);
    for(let i=0;i<32;i++)out[i]=Number((a[Math.floor(i/8)]>>BigInt(8*(i%8)))&255n);
    return out;
  }
  const mod=(a,p=P)=>((a%p)+p)%p;
  function inverse(a,m=P){
    if(mod(a,m)===0n)throw new Error('No modular inverse');
    let b=m, u=1n,v=0n; a=mod(a,m);
    while(b){const q=a/b; [a,b]=[b,a-q*b];[u,v]=[v,u-q*v];}
    if(a!==1n)throw new Error('No inverse');
    return mod(u,m);
  }
  function add(A,B){
    if(A===null)return B;if(B===null)return A;
    if(A.x===B.x&&mod(A.y+B.y)===0n)return null;
    const slope=A.x===B.x&&A.y===B.y
      ?mod((3n*A.x*A.x)*inverse(2n*A.y))
      :mod((B.y-A.y)*inverse(B.x-A.x));
    const x=mod(slope*slope-A.x-B.x);
    return {x,y:mod(slope*(A.x-x)-A.y)};
  }
  function multiply(k){
    if(k<=0n||k>=N)throw new Error('Scalar out of range');
    let result=null,point=G;
    while(k>0n){if(k&1n)result=add(result,point);point=add(point,point);k>>=1n;}
    return result;
  }
  const bytes=(...arrays)=>{const result=new Uint8Array(arrays.reduce((s,a)=>s+a.length,0));let off=0;for(const a of arrays){result.set(a,off);off+=a.length;}return result;};
  const toHex=v=>Array.from(v,b=>b.toString(16).padStart(2,'0')).join('');
  const fromHex=str=>new Uint8Array((str.replace(/^0x/,'').match(/.{2}/g)||[]).map(s=>parseInt(s,16)));
  const bigintToBytes=(v,len=32)=>fromHex(v.toString(16).padStart(len*2,'0'));
  const bytesToBigint=v=>BigInt('0x'+toHex(v));
  const indexBytes=i=>new Uint8Array([(i>>>24)&255,(i>>>16)&255,(i>>>8)&255,i&255]);
  const compressed=point=>bytes(new Uint8Array([point.y&1n?3:2]),bigintToBytes(point.x));
  const uncompressed=point=>bytes(new Uint8Array([4]),bigintToBytes(point.x),bigintToBytes(point.y));
  function webCrypto(){
    if(root.crypto?.subtle)return root.crypto.subtle;
    if(typeof require==='function')return require('node:crypto').webcrypto.subtle;
    throw new Error('WebCrypto unavailable: use HTTPS or localhost.');
  }
  async function hmacSha512(key,data){
    const subtle=webCrypto();const imported=await subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-512'},false,['sign']);
    return new Uint8Array(await subtle.sign('HMAC',imported,data));
  }
  async function mnemonicToSeed(mnemonic,passphrase=''){
    const subtle=webCrypto();const pass=te.encode(mnemonic.normalize('NFKD'));
    const salt=te.encode(('mnemonic'+passphrase).normalize('NFKD'));
    const key=await subtle.importKey('raw',pass,'PBKDF2',false,['deriveBits']);
    return new Uint8Array(await subtle.deriveBits({name:'PBKDF2',hash:'SHA-512',salt,iterations:2048},key,512));
  }
  async function masterFromSeed(seed){
    const I=await hmacSha512(te.encode('Bitcoin seed'),seed);
    const k=bytesToBigint(I.slice(0,32));
    if(k===0n||k>=N)throw new Error('Invalid master key');
    return {k,chain:I.slice(32)};
  }
  async function child(parent,index,hardened=false){
    if(!Number.isInteger(index)||index<0||index>=0x80000000)throw new Error('Invalid BIP-32 child index');
    const actual=(index+(hardened?0x80000000:0))>>>0;
    const header=hardened?bytes(new Uint8Array([0]),bigintToBytes(parent.k)):compressed(multiply(parent.k));
    const I=await hmacSha512(parent.chain,bytes(header,indexBytes(actual)));
    const il=bytesToBigint(I.slice(0,32));const k=mod(parent.k+il,N);
    if(il>=N||k===0n)throw new Error('BIP-32 invalid child; choose next index');
    return {k,chain:I.slice(32)};
  }
  async function accountRoot(seed){
    let r=await masterFromSeed(seed);
    r=await child(r,44,true);r=await child(r,60,true);r=await child(r,0,true);
    return child(r,0,false);
  }
  function checksummedAddress(address){
    const lc=address.replace(/^0x/i,'').toLowerCase();
    if(!/^[0-9a-f]{40}$/.test(lc))throw new Error('Ethereum address must be 20 bytes');
    const hash=toHex(digest256(te.encode(lc)));
    return '0x'+lc.split('').map((ch,i)=>/[a-f]/.test(ch)&&parseInt(hash[i],16)>=8?ch.toUpperCase():ch).join('');
  }
  function addressForKey(key){
    const point=multiply(key);
    const pub=uncompressed(point);
    const hash=digest256(pub.slice(1));
    const raw='0x'+toHex(hash.slice(12));
    return {privateKey:bigintToBytes(key),publicKey:pub,hash,address:raw,checksummed:checksummedAddress(raw),point};
  }
  async function deriveWallet(mnemonic,index=0,passphrase=''){
    const seed=await mnemonicToSeed(mnemonic,passphrase);
    const rootNode=await accountRoot(seed);
    const node=await child(rootNode,index,false);
    return {seed,master:await masterFromSeed(seed),rootNode,node,...addressForKey(node.k),index,
      path:`m/44'/60'/0'/0/${index}`};
  }
  function hamming(a,b){if(a.length!==b.length)throw Error('Length mismatch');let n=0;for(let i=0;i<a.length;i++){let x=a[i]^b[i];while(x){x&=x-1;n++;}}return n;}
  root.EthCrypto={digest256,toHex,fromHex,bytes,multiply,add,uncompressed,compressed,mnemonicToSeed,masterFromSeed,accountRoot,child,addressForKey,deriveWallet,checksummedAddress,hamming,constants:{P,N,G}};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.EthCrypto;
})(typeof globalThis!=='undefined'?globalThis:this);
