/* Interactive HW 02. All cryptographic computations happen locally in the browser.
   ONLY hard-coded PUBLIC demonstration mnemonics are allowed. */
(() => {
'use strict';
const C=globalThis.EthCrypto, byId=id=>document.getElementById(id);
const publicMnemonics={
 a:'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
 b:'test test test test test test test test test test test junk'
};
let current=null, selected=0, latestStatistics=null, busy=false, pending=false;
const valueHex=v=>'0x'+C.toHex(v);
const stages=[
 {tag:'BIP-39',title:'From words to a 512-bit seed',label:'BIP-39 seed · 64 bytes',
  summary:'The publicly known demonstration phrase is converted to a binary seed with PBKDF2-HMAC-SHA512.',
  detail:'Before seed generation, BIP-39 represents random entropy as wordlist indices and includes checksum bits derived from SHA-256. To derive the seed, it uses the mnemonic (normalized with NFKD) as the password, “mnemonic” plus an optional passphrase as the salt, and 2048 PBKDF2 iterations. The same words and passphrase always give the same 64-byte seed. The words themselves should originally encode randomly generated entropy; this demo does not create a new mnemonic.',
  value:w=>valueHex(w.seed)},
 {tag:'BIP-32',title:'The root of a key tree',label:'Master private key · 32 bytes',
  summary:'A 512-bit seed becomes a master extended private key and chain code. This is the start of a hierarchical deterministic wallet.',
  detail:'BIP-32 computes HMAC-SHA512 with the key “Bitcoin seed”. The left half becomes the master scalar and the right half the 32-byte chain code. Child keys can then be derived along different paths. A chain code supports hierarchical derivation; it is not an Ethereum address.',
  value:w=>'Private scalar: '+valueHex(C.fromHex(w.master.k.toString(16).padStart(64,'0')))+'\nChain code: '+valueHex(w.master.chain)},
 {tag:'BIP-44',title:'Choosing one Ethereum account',label:'Derived private key · 32 bytes',
  summary:'BIP-44 organizes BIP-32 child derivation using a conventional path. In this demo the coin type 60 identifies Ethereum.',
  detail:'The path m / 44\' / 60\' / 0\' / 0 / i means purpose 44, Ethereum coin type 60, account 0, external chain 0, and address index i. The apostrophe marks hardened derivation. Changing the last index generates a different deterministic private key.',
  value:w=>'Path: '+w.path+'\nPrivate key: '+valueHex(w.privateKey)},
 {tag:'secp256k1',title:'From private key to public point',label:'Uncompressed public key · 65 bytes',
  summary:'The derived private scalar multiplies the fixed generator point: Q = kG, on Ethereum’s secp256k1 curve.',
  detail:'This is the same idea as Homework 1, but with a real 256-bit curve rather than a toy curve modulo 17. The public key shown is 0x04 followed by 32 bytes of x and 32 bytes of y. Only the 64 coordinate bytes (without 0x04) are sent to Keccak-256.',
  value:w=>valueHex(w.publicKey)},
 {tag:'Keccak-256',title:'From public key to a 20-byte address',label:'Keccak-256 digest → last 20 bytes',
  summary:'Hash the 64-byte uncompressed public-key coordinates, then keep the rightmost 20 bytes of the 32-byte hash.',
  detail:'The hash input is binary x || y, excluding the leading public-key format byte 0x04. Ethereum uses Keccak-256, not the standardized SHA3-256 variant. The last 160 hash bits form a 20-byte address; hexadecimal encoding adds the 0x prefix.',
  value:w=>'Keccak-256: '+valueHex(w.hash)+'\nLast 20 bytes: '+w.address},
 {tag:'EIP-55',title:'An address with an error-detecting checksum',label:'Checksummed Ethereum address',
  summary:'EIP-55 selects upper- or lowercase for the address’s hexadecimal letters, without changing its underlying 20 bytes.',
  detail:'Hash the lowercase hexadecimal address string (without 0x) with Keccak-256. For each address letter a–f, use uppercase when the matching hash nibble is at least 8. Digits never change. This offers partial typo detection, not authentication and not extra secret entropy.',
  value:w=>w.checksummed}
];
const setText=(id,v)=>{byId(id).textContent=v;};
function setTheme(theme){
 document.documentElement.dataset.theme=theme;
 const dark=theme==='dark',b=byId('theme-toggle');b.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
 b.setAttribute('aria-pressed',String(dark));b.querySelector('.theme-icon').textContent=dark?'☼':'☾';b.querySelector('.theme-label').textContent=dark?'Light':'Dark';
 try{localStorage.setItem('eth-hw2-theme',theme)}catch{}
}
function themeInit(){let saved;try{saved=localStorage.getItem('eth-hw2-theme')}catch{};setTheme(saved==='dark'?'dark':'light');byId('theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));}
async function copyText(v,btn){try{await navigator.clipboard.writeText(v);const old=btn.textContent;btn.textContent='Copied ✓';setTimeout(()=>btn.textContent=old,1500)}catch{const old=btn.textContent;btn.textContent='Select text to copy';setTimeout(()=>btn.textContent=old,2000)}}
function renderStage(){
 const item=stages[selected];
 document.querySelectorAll('[data-stage]').forEach(el=>{const active=Number(el.dataset.stage)===selected;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
 setText('stage-label',String(selected+1).padStart(2,'0')+' / '+item.tag);
 setText('stage-title',item.title);setText('stage-summary',item.summary);setText('stage-value-label',item.label);
 setText('stage-value',current?item.value(current):'Calculating…');
 setText('stage-explanation',item.detail);setText('stage-counter',`${selected+1} / 6`);
 setText('stage-ready',current?'Computed locally':'Computing…');
 byId('copy-stage').disabled=!current;byId('stage-back').disabled=selected===0;
 byId('stage-next').disabled=selected===5;
}
function selectStage(i){selected=Math.max(0,Math.min(5,i));renderStage();}
async function computeWallet(){
 if(busy){pending=true;return;}
 const idx=Number(byId('account-index').value);
 if(!Number.isInteger(idx)||idx<0||idx>19){setText('pipeline-error','Choose an integer account index between 0 and 19.');byId('pipeline-error').hidden=false;return;}
 const mnemonic=publicMnemonics[byId('mnemonic-select').value];
 if(!mnemonic)return;
 busy=true;current=null;byId('pipeline-error').hidden=true;
 byId('run-pipeline').disabled=true;setText('run-pipeline','Deriving…');setText('final-address','Computing…');byId('copy-address').disabled=true;
 setText('mnemonic-value',mnemonic);renderStage();
 try {
   const seed=await C.mnemonicToSeed(mnemonic);
   const master=await C.masterFromSeed(seed);
   // The key path is always fixed, but the demo phrase may change.
   const accountRoot=await C.accountRoot(seed);
   const node=await C.child(accountRoot,idx,false);
   current={seed,master,rootNode:accountRoot,node,...C.addressForKey(node.k),index:idx,path:`m/44'/60'/0'/0/${idx}`};
   setText('final-address',current.checksummed);setText('final-path',current.path);
   byId('copy-address').disabled=false;renderStage();
 } catch(err){console.error(err);setText('final-address','Calculation failed');setText('pipeline-error','Cannot derive wallet: '+(err?.message||'Unexpected error'));byId('pipeline-error').hidden=false;renderStage();}
 finally{busy=false;byId('run-pipeline').disabled=false;byId('run-pipeline').innerHTML='Derive address <span aria-hidden="true">→</span>';if(pending){pending=false;queueMicrotask(computeWallet);}}
}
function compareHashes(){
 const message=byId('hash-text').value;
 setText('hash-keccak',C.toHex(C.digest256(message,false)));
 setText('hash-sha3',C.toHex(C.digest256(message,true)));
}
function renderBars(container,items,colorAlt=false){
 const c=byId(container);c.replaceChildren();const max=Math.max(1,...items.map(x=>x.value));
 items.forEach((item,i)=>{
   const col=document.createElement('div');col.className='chart-col';
   const count=document.createElement('small');count.textContent=item.value;
   const bar=document.createElement('span');bar.className='bar'+(colorAlt?' alt':'');bar.style.height=`${Math.max(2,Math.round(item.value/max*112))}px`;
   bar.setAttribute('title',`${item.label}: ${item.value}`);
   const label=document.createElement('label');label.textContent=item.label;
   col.append(count,bar,label);c.appendChild(col);
 });
}
function updateBits(zero,one){const total=one+zero;
 byId('bit-chart').replaceChildren();
 [[zero,'0'],[one,'1']].forEach(([num,label])=>{
   const el=document.createElement('div');el.className='bit-bar';
   const barFrame=document.createElement('div');const bar=document.createElement('span');bar.style.height=`${total?num*100/total:0}%`;barFrame.appendChild(bar);
   const pct=document.createElement('strong');pct.textContent=total?(num*100/total).toFixed(1)+'%':'—';
   const lab=document.createElement('small');lab.textContent='bit '+label;
   el.append(barFrame,pct,lab);byId('bit-chart').appendChild(el);
 });
}
function bitOnes(buf){let n=0;for(const b of buf){let x=b;while(x){x&=x-1;n++;}}return n;}
function statsExplanation(kind){
 if(!latestStatistics)return '<p>Run the experiment to see its explanation.</p>';
 const s=latestStatistics;
 const ctxt=`The current experiment generated <strong>${s.count} deterministic addresses</strong> from one public demo phrase (indices 0 to ${s.count-1}). The addresses are related through BIP-32, so this is a small descriptive sample, not independent random sampling.`;
 if(kind==='hex')return `<p>Every Ethereum address contains <strong>40 hexadecimal digits</strong>. We count how many times each symbol 0–9 or a–f appears across all addresses, ignoring EIP-55 capitalization.</p><p>${ctxt}</p><p>The sample includes <strong>${40*s.count} hexadecimal characters</strong>. If each hex digit were equally likely, its expected frequency would be about <strong>${(40*s.count/16).toFixed(1)}</strong> in this sample.</p><p><strong>Interpretation:</strong> frequencies near each other may look uniform. But a histogram, even a perfect one, does not establish security or statistical independence.</p>`;
 if(kind==='bits')return `<p>Each raw Ethereum address is exactly <strong>160 bits</strong> long. We count all the zeros and ones across the derived addresses.</p><p>${ctxt}</p><p>We observed <strong>${s.ones} one bits</strong> and <strong>${s.zeros} zero bits</strong> out of ${s.totalBits} total bits, so ${(s.ones/s.totalBits*100).toFixed(2)}% are ones. A simple fair-bit baseline would be 50%.</p><p><strong>Interpretation:</strong> a roughly even split is compatible with a dispersed-looking output. It does not prove the address bits are unpredictable, and a short sample has substantial random variation.</p>`;
 if(kind==='avalanche')return `<p>For each trial we start with a short public test message, flip exactly <strong>one bit in its byte representation</strong>, and compute two Keccak-256 hashes. We then count differing output bits. The range is 0 to 256 bits.</p><p>Across <strong>${s.avalanche.length} trials</strong>, the average Hamming distance is <strong>${s.avalancheMean.toFixed(2)} / 256 bits</strong> (minimum ${s.avalancheMin}, maximum ${s.avalancheMax}). An ideal 50%-change reference suggests about <strong>128 bits</strong> per comparison.</p><p><strong>Interpretation:</strong> this behavior is associated with hash diffusion, rather than a requirement that adjacent elliptic-curve points look random in the same way. This is only an illustrative sample, not a formal cryptographic test.</p>`;
 if(kind==='checksums')return `<p>EIP-55 hashes the <strong>lowercase hexadecimal text</strong> of an address. Each hexadecimal letter a–f can be uppercase or lowercase depending on the corresponding Keccak hash nibble. The digits 0–9 do not change.</p><p>${ctxt}</p><p>Across all addresses we counted <strong>${s.lower} lowercase letters</strong> and <strong>${s.upper} uppercase letters</strong>, for an average of <strong>${(s.upper/s.count).toFixed(2)} uppercase letters per address</strong>.</p><p><strong>Interpretation:</strong> casing is redundant information for catching some transcription mistakes. The actual 20-byte address stays identical; this is not a new secret or stronger key.</p>`;
 return '';
}
async function runStatistics(){
 const count=Number(byId('stats-samples').value);
 if(!Number.isInteger(count)||count<4||count>32){setText('stats-progress','Please choose a whole number from 4 to 32.');return;}
 const btn=byId('stats-run');btn.disabled=true;
 setText('stats-progress','Calculating BIP-32 child addresses…');
 try{
   const mnemonic=publicMnemonics[byId('mnemonic-select').value];
   const seed=await C.mnemonicToSeed(mnemonic);const node=await C.accountRoot(seed);
   const digitCounts=Array(16).fill(0);let ones=0,lower=0,upper=0;
   for(let i=0;i<count;i++){
     const derived=await C.child(node,i,false);const addr=C.addressForKey(derived.k);
     const raw=addr.address.slice(2);for(const ch of raw)digitCounts[parseInt(ch,16)]++;
     ones+=bitOnes(C.fromHex(raw));
     for(const ch of addr.checksummed.slice(2))if(/[a-f]/.test(ch))lower++;else if(/[A-F]/.test(ch))upper++;
     if(i%4===3){setText('stats-progress',`Derived ${i+1} of ${count} accounts…`);await new Promise(resolve=>setTimeout(resolve,0));}
   }
   setText('stats-progress','Testing Keccak-256 with controlled one-bit input changes…');
   const distances=[];const baseText=new TextEncoder().encode('Statistics Homework 2 • Keccak one-bit input test');
   for(let i=0;i<48;i++){
     const original=C.bytes(baseText,new Uint8Array([i]));const changed=new Uint8Array(original);
     changed[i%baseText.length]^=1<<(i%8);
     distances.push(C.hamming(C.digest256(original),C.digest256(changed)));
     if(i%8===7){setText('stats-progress',`Compared ${i+1} of 48 Keccak pairs…`);await new Promise(resolve=>setTimeout(resolve,0));}
   }
   const avalancheMean=distances.reduce((a,b)=>a+b,0)/distances.length;
   const zeros=count*160-ones;
   latestStatistics={count,digitCounts,ones,zeros,lower,upper,totalBits:160*count,avalanche:distances,avalancheMean,avalancheMin:Math.min(...distances),avalancheMax:Math.max(...distances)};
   renderBars('hex-chart',digitCounts.map((value,i)=>({value,label:i.toString(16)})));
   updateBits(zeros,ones);
   const boundaries=[0,96,104,112,120,128,136,144,152,160,257];
   const bins=boundaries.slice(0,-1).map((a,i)=>({label:i===0?"<96":i===9?"≥160":String(a),value:distances.filter(v=>v>=a&&v<boundaries[i+1]).length}));
   renderBars('avalanche-chart',bins,true);
   setText('stat-count',count);setText('stat-ones',(ones/(160*count)*100).toFixed(1)+'%');setText('stat-avalanche',avalancheMean.toFixed(1));setText('stat-trials',distances.length);
   setText('checksum-average',(upper/count).toFixed(2));setText('checksum-lower',lower);setText('checksum-upper',upper);
   const sum=Math.max(1,lower+upper);byId('checksum-lower-bar').style.width=(lower/sum*100)+'%';byId('checksum-upper-bar').style.width=(upper/sum*100)+'%';
   setText('stats-progress',`Completed: ${count} addresses and 48 controlled Keccak bit-flip tests.`);
 }catch(err){console.error(err);setText('stats-progress','Statistical experiment failed: '+err.message);}
 finally{btn.disabled=false;}
}
const historyHTML=`<p>These technologies did not appear together. Wallet software combines ideas created for different purposes over several decades. The dates below refer to introductions or formal standards, not to the invention of every underlying mathematical idea.</p>
<ul><li><strong>1977 — RSA.</strong> Rivest, Shamir and Adleman introduce a practical public-key cryptosystem.</li>
<li><strong>2001 — SHA-2.</strong> The family includes SHA-512, later used in wallet key derivation.</li>
<li><strong>2012 — BIP-32.</strong> Hierarchical deterministic key derivation organizes accounts into a tree.</li>
<li><strong>2013 — BIP-39.</strong> Mnemonic backup phrases and deterministic seed generation are specified.</li>
<li><strong>2014 — BIP-44.</strong> A standard multi-account derivation path is proposed.</li>
<li><strong>2015 — SHA-3.</strong> NIST standardizes functions built from Keccak. Ethereum continues using its Keccak-256 variant with different padding/domain separation.</li>
<li><strong>2016 — EIP-55.</strong> Mixed-case checksum formatting is proposed for Ethereum addresses.</li></ul>
<p><strong>Why it matters:</strong> a modern wallet does not replace all these concepts with one new algorithm. It connects primitives that solve different problems.</p>
<p>Sources: <a href="https://bips.dev/32/" target="_blank" rel="noopener noreferrer">BIP-32</a>, <a href="https://bips.dev/39/" target="_blank" rel="noopener noreferrer">BIP-39</a>, <a href="https://bips.dev/44/" target="_blank" rel="noopener noreferrer">BIP-44</a>, <a href="https://eips.ethereum.org/EIPS/eip-55" target="_blank" rel="noopener noreferrer">EIP-55</a>.</p>`;
let lastModalTrigger=null;
function showModal(title,cat,html,trigger){lastModalTrigger=trigger||document.activeElement;setText('dialog-title',title);setText('dialog-category',cat);byId('dialog-body').innerHTML=html;byId('dialog-overlay').hidden=false;document.body.classList.add('modal-open');byId('dialog-close').focus();}
function closeModal(){if(byId('dialog-overlay').hidden)return;byId('dialog-overlay').hidden=true;document.body.classList.remove('modal-open');if(lastModalTrigger?.focus)lastModalTrigger.focus();}
function bind(){
 byId('run-pipeline').addEventListener('click',computeWallet);
 byId('mnemonic-select').addEventListener('change',()=>{setText('mnemonic-value',publicMnemonics[byId('mnemonic-select').value]);computeWallet();});
 byId('account-index').addEventListener('keydown',e=>{if(e.key==='Enter')computeWallet();});
 document.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>selectStage(Number(b.dataset.stage))));
 byId('stage-back').addEventListener('click',()=>selectStage(selected-1));
 byId('stage-next').addEventListener('click',()=>selectStage(selected+1));
 byId('copy-stage').addEventListener('click',()=>{if(current)copyText(stages[selected].value(current),byId('copy-stage'));});
 byId('copy-address').addEventListener('click',()=>{if(current)copyText(current.checksummed,byId('copy-address'));});
 byId('hash-run').addEventListener('click',compareHashes);byId('hash-text').addEventListener('keydown',e=>{if(e.key==='Enter')compareHashes()});
 byId('stats-run').addEventListener('click',runStatistics);
 byId('open-history').addEventListener('click',e=>showModal('A short history of wallet cryptography','HISTORICAL CONTEXT',historyHTML,e.currentTarget));
 document.querySelectorAll('[data-explain]').forEach(btn=>btn.addEventListener('click',()=>{
 const name=({hex:'Hex digit frequency',bits:'Address bit distribution',avalanche:'Keccak avalanche effect',checksums:'EIP-55 capitalization'})[btn.dataset.explain];
 showModal(name,'STATISTICS EXPLAINED',statsExplanation(btn.dataset.explain),btn);
 }));
 byId('dialog-close').addEventListener('click',closeModal);byId('dialog-done').addEventListener('click',closeModal);
 byId('dialog-overlay').addEventListener('click',e=>{if(e.target.matches('[data-dismiss]'))closeModal();});
 document.addEventListener('keydown',e=>{
 if(byId('dialog-overlay').hidden)return;
 if(e.key==='Escape'){closeModal();return;}
 if(e.key==='Tab'){const items=[...byId('dialog-overlay').querySelectorAll('button:not(:disabled),a[href]')];if(!items.length)return;
 if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items[items.length-1].focus();}
 else if(!e.shiftKey&&document.activeElement===items[items.length-1]){e.preventDefault();items[0].focus();}}
 });
}
function init(){themeInit();bind();compareHashes();renderStage();computeWallet();runStatistics();}
init();
})();
