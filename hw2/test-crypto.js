const assert=require('node:assert/strict');
const C=require('./js/crypto.js');
(async()=>{
 const mnemonicA='abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
 const mnemonicB='test test test test test test test test test test test junk';
 assert.equal(C.toHex(C.digest256('')),'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
 assert.equal(C.toHex(C.digest256('',true)),'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a');
 assert.equal(C.toHex(await C.mnemonicToSeed(mnemonicA)).slice(0,32),'5eb00bbddcf069084889a8ab91555681');
 assert.equal(C.toHex(await C.mnemonicToSeed(mnemonicA,'TREZOR')).slice(0,32),'c55257c360c07c72029aebc1b53c05ed');
 assert.equal((await C.deriveWallet(mnemonicA,0)).checksummed,'0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
 assert.equal((await C.deriveWallet(mnemonicB,0)).checksummed,'0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
 assert.equal((await C.deriveWallet(mnemonicA,0)).publicKey.length,65);
 assert.equal(C.checksummedAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed'),'0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
 const a=await C.deriveWallet(mnemonicA,0),b=await C.deriveWallet(mnemonicA,1);
 assert.notEqual(a.address,b.address);assert.equal(a.address.length,42);
 const P=C.constants.P,G=C.constants.G;
 assert.equal(((G.y*G.y-G.x*G.x*G.x-7n)%P+P)%P,0n);
 console.log('PASS: Keccak256, SHA3-256, mnemonic→seed, BIP32/44 addresses, EIP55, secp256k1, account indices.');
})().catch(e=>{console.error(e);process.exit(1)});
