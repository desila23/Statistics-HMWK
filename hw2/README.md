# Statistics — Homework 2 (bozza 1)

**From Wallet Seed to Ethereum Address: Hashing, Key Derivation and Cryptographic Primitives**

Prima bozza interattiva per HMWK 2. Lo stile riprende Homework 1 v3 (che non è stato modificato).
Tutti i testi del sito sono in **inglese**. Il codice è separato in HTML/CSS/JavaScript.

## Come provarlo

1. Estrai lo ZIP.
2. Entra nella cartella `ethereum-statistics-hw2`.
3. Apri `index.html` con Chrome oppure, per un funzionamento affidabile su tutti i browser, avvia un piccolo server locale:

```bash
python -m http.server 8000
```

4. Apri `http://localhost:8000`.

Funziona anche una volta pubblicato con GitHub Pages. Non richiede un backend o API esterne. BIP-39 e BIP-32 usano **Web Crypto** del browser per PBKDF2 e HMAC-SHA512 (disponibile su HTTPS/localhost).

## Cosa contiene

- **01 / The Idea** — una spiegazione del processo e un pop-up *View timeline* con la storia delle tecnologie.
- **02 / Live Pipeline** — calcolo reale delle sei fasi BIP-39 → BIP-32 → BIP-44 → secp256k1 → Keccak-256 → EIP-55. Scegli uno dei due esempi pubblici e un indice di account da 0 a 19; ogni fase è selezionabile e mostra il suo output.
- **03 / Different Jobs** — distinzione tra generazione di chiavi, derivazione, crittografia asimmetrica, hashing, checksum, codifica. Confronto interattivo Keccak-256 / SHA3-256.
- **04 / Statistical Exploration** — campioni di indirizzi derivati, frequenze dei caratteri esadecimali, bit 0/1, 48 prove di diffusione con flip di un bit sull'input di Keccak, conteggio lettere maiuscole/minuscole con EIP-55. Premi sui riquadri per spiegazioni.
- **05 / Interpretation** — conclusioni discorsive e collegamento con HMWK 1.

**Limiti importanti:** il sito usa solo mnemoniche pubbliche di prova. Non genera frasi nuove, non accetta frasi private, non firma transazioni e **non è un wallet sicuro**. Le statistiche riguardano campioni piccoli e didattici; non costituiscono prove di sicurezza.

## Come modificare il sito

| Vuoi modificare… | Apri |
| --- | --- |
| Titolo, sottotitolo, etichette, teoria, conclusioni, tabella delle operazioni | `index.html` |
| Colori, sfondi, tema scuro, larghezze, griglie, grafici | `css/style.css` |
| Stile comune ripreso dalla v3 del primo homework | `css/base-hw1.css` |
| Descrizioni dei sei passaggi, output mostrati e relativo testo | `js/app.js`, array `stages` all'inizio |
| Testi delle finestre sulla statistica | `js/app.js`, funzione `statsExplanation` |
| Testo del pop-up storico | `js/app.js`, costante `historyHTML` |
| Quantità e definizione degli esperimenti statistici | `js/app.js`, funzione `runStatistics` |
| Due frasi di prova | `js/app.js`, `publicMnemonics` (NON usare frasi segrete!) |
| Formule crittografiche e derivazione | `js/crypto.js` |
| Icona/etichetta e link della barra superiore | `index.html`, `<header>` |

I nomi degli ID principali sono `#pipeline`, `#statistics`, `#conclusions`; nel codice le funzioni `renderStage`, `computeWallet`, `runStatistics`, `showModal` gestiscono le interazioni.

## Verifica dei calcoli

Esempi pubblici e riproducibili con l'indice 0 e il path `m/44'/60'/0'/0/0`:

- Demo A `abandon` ripetuto 11 volte + `about` → `0x9858EfFD232B4033E47d90003D41EC34EcaEda94`.
- Demo B `test` ripetuto 11 volte + `junk` → `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`.

Per eseguire il test delle primitive (facoltativo, richiede Node.js):

```bash
node test-crypto.js
```

Il test verifica Keccak, SHA3-256, seed BIP-39, due indirizzi derivati, EIP-55, secp256k1 e differenza tra indici.

## Riferimenti primari

- BIP-39: https://bips.dev/39/
- BIP-32: https://bips.dev/32/
- BIP-44: https://bips.dev/44/
- EIP-55: https://eips.ethereum.org/EIPS/eip-55
- Specifiche Keccak / SHA-3: https://keccak.team/keccak_specs_summary.html
- Ethereum accounts: https://ethereum.org/en/developers/docs/accounts/

I testi didattici sono originali. La struttura è ispirata alla consegna e all'approccio interattivo dei progetti pubblici discussi in classe, senza copiarne testi o codice.
