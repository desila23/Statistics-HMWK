# Statistics — Cryptography Homeworks

Un'unica repository, con due pagine GitHub Pages indipendenti.

## Link dopo la pubblicazione

Sostituisci `USERNAME` e `REPOSITORY` con quelli della tua repository:

- Home: `https://USERNAME.github.io/REPOSITORY/`
- Homework 1: `https://USERNAME.github.io/REPOSITORY/hw1/`
- Homework 2: `https://USERNAME.github.io/REPOSITORY/hw2/`

Nel foglio del professore inserisci il link `/hw1/` per il primo homework e `/hw2/` per il secondo.

## Pubblicazione su GitHub Pages

1. Crea una repository pubblica su GitHub, ad esempio `statistics-cryptography-homeworks`.
2. Carica **il contenuto** di questo ZIP nella radice del repository: `index.html`, `hw1/`, `hw2/` e `README.md`.
3. Vai in **Settings > Pages**. In **Build and deployment**, scegli **Deploy from a branch**, branch **main**, cartella **/(root)**, e salva.
4. Apri i tre indirizzi indicati sopra. La pubblicazione potrebbe richiedere qualche minuto.

## Struttura

```
index.html             # Pagina iniziale con i due link
hw1/index.html         # Homework 1 — versione v3, invariata
hw1/css/ & hw1/js/    # Grafica e logica HMWK 1
hw2/index.html         # Homework 2 — prima bozza, invariata
hw2/css/ & hw2/js/    # Grafica e logica HMWK 2
```

Ogni homework è autonomo. I file di origine sono stati copiati senza modificarli; è stata aggiunta solo la pagina iniziale. Per gli interventi sui singoli homework consulta i rispettivi README.

## Test rapidi (con Node.js)

```bash
cd hw1 && node test-ecc.js
cd ../hw2 && node test-crypto.js
```

La pagina iniziale non richiede librerie né server. Gli homework usano le proprie risorse locali. Il secondo funziona in modo più affidabile sotto GitHub Pages o un server locale.

**Sicurezza:** i dati dimostrativi di HMWK 2 sono pubblici; non inserire vere frasi di recupero.
