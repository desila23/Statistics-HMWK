# Statistics — Homework 1: From Private Key to Public Key

Sito didattico per **HMWK 1**. Include spiegazioni teoriche in inglese, simulatore della curva `y² ≡ x³ + 7 (mod 17)`, moltiplicazione scalare passo passo e analisi statistica.

## Avvio rapido

1. Estrai lo ZIP mantenendo la struttura delle cartelle.
2. Apri `index.html` nel browser (Chrome, Edge o Firefox). Non servono server o installazioni.
3. Per modificare il progetto usa VS Code: apri la cartella e cambia i file descritti sotto.

Puoi pubblicare questo stesso contenuto con **GitHub Pages**.

## Che cosa mostra ogni sezione

| Sezione del sito | Richiesta dell'homework | Cosa visualizzi |
|---|---|---|
| 01 — The Idea | Spiegare k, G e Q, la curva e il concetto di one-way | Testo teorico e diagramma `Private Key → kG → Public Key` |
| 02 — Experiment | Definire G e k, calcolare Q = kG | Modifica dei parametri, risultato, punti su curva |
| 03 — Step by Step | Implementare la somma di punti e stampare G...kG | Tabella interattiva e animazione, formule apribili a richiesta (senza esempio lungo) |
| 04 — Statistical Exploration | Studiare coordinate, frequenze, bit, correlazioni, avalanche-like behavior | Quattro grafici/analisi con spiegazione cliccabile |
| 05 — Interpretation | Discutere significato e limiti delle proprietà statistiche e differenze rispetto agli hash | Conclusione in forma discorsiva |

## Dove modificare testo, grafica e comportamento

Le righe riportate si riferiscono a questa versione. In VS Code usa `Ctrl+F` sul testo o sull'ID indicato.

| Voglio cambiare | File | Cerca |
|---|---|---|
| Titolo principale `From Private Key → Public Key` | `index.html` | `id="main-title"` (riga 68) |
| Frase descrittiva sotto il titolo | `index.html` | `class="hero-description"` |
| Testo teorico introduttivo | `index.html` | `id="how-it-works"` (riga 141) |
| Spiegazioni e istruzioni del simulatore | `index.html` | `id="simulator"` (riga 287) |
| Spiegazione delle formule (apertura su richiesta) | `index.html` | `id="walkthrough"` (riga 468), `id="formulas-details"` (riga 586) |
| Descrizioni visibili prima dei grafici | `index.html` | `id="statistics"` (riga 625), `chart-micro-copy` |
| Testi delle **finestre che si aprono cliccando i grafici** | `js/app.js` | `function explanationHTML(kind)` (circa riga 296). Cerca `case 'x'`, `case 'y'`, `case 'bits'`, `case 'relationships'` |
| Testo conclusivo | `index.html` | `id="conclusions"` (riga 920), `class="conclusion-prose"` (riga 935) |
| Aspetto del titolo | `css/style.css` | `.hero-title` nella sezione `HW1 CUSTOMIZATION` |
| Aspetto delle quattro schede statistiche | `css/style.css` | `.explainable-card` e `.chart-guide` |
| Aspetto della finestra popup | `css/style.css` | `.explanation-dialog` e `.explanation-backdrop` |
| Colori del **tema chiaro** | `css/style.css` | `:root` in cima al file; ulteriori colori nella sezione di personalizzazione |
| Colori del **tema scuro** | `css/style.css` | `html[data-theme="dark"]` dopo il commento `Night palette` |
| Logica del pulsante tema chiaro/scuro | `js/app.js` | `function setTheme` e `function initTheme` |
| Punti e colori del grafico SVG | `js/app.js` | `function drawCurve`, oggetto `palette` |
| Intervallo e calcolo delle statistiche | `js/ecc.js`, `js/app.js` | `statistics`, `runStatistics`, `drawFrequencies`, `drawBits` |
| Algoritmi matematici | `js/ecc.js` | `addDetailed`, `multiples`, `multiply`, `order` |

**Layout v3:** in Step by Step la tabella cresce con il numero di passaggi fino a un limite e poi scorre. Le formule si aprono cliccando “Point-addition formulas”. Nelle conclusioni la linea verde evidenzia soltanto il primo paragrafo e tutti i testi usano la larghezza disponibile.

**Per la grafica:** le regole personalizzate si trovano in `css/style.css` da riga 15. Per il nuovo riquadro delle formule cerca `.formula-hint` (circa riga 85). Per la linea verde delle conclusioni cerca `.conclusion-prose p:first-child` (circa riga 190). Per la larghezza dei paragrafi cerca `V3: Full-width explanatory copy` (riga 393).

## Come usare i pannelli statistici

Scegli `N values`, premi `Run analysis` e fai clic su uno dei quattro pannelli A, B, C o D. Si apre una finestra di spiegazione che include i numeri dell'esperimento **attualmente selezionato**. Si chiude con `X`, `Back to charts`, clic sullo sfondo o tasto `Esc`.

Il pulsante `Dark / Light` è in alto a destra. La preferenza resta memorizzata nel browser, se è possibile usare il salvataggio locale.

## Test e risultati attesi

Con `G = (1, 5)`:

- `k = 6` → `Q = (5, 8)`.
- `k = 9` → `O (∞)`.
- `k = 10` → `(1, 5)`.
- `N = 9` → 8 risultati finiti, 1 punto all'infinito.
- L'ordine di G è **9**, quindi i risultati si ripetono ogni 9 somme.

Con `G = (6, 6)`, `k = 18` → `O (∞)` perché il punto ha ordine 18.

Il modulo `test-ecc.js` verifica automaticamente l'aritmetica e le statistiche (`node test-ecc.js` dalla cartella principale, se hai Node installato). **Node non è necessario per usare il sito.**

## Limiti da sapere prima di consegnare

- La curva è piccola apposta e **non è sicura per un wallet reale**.
- Il punto O non ha coordinate x/y, quindi viene escluso dai grafici delle coordinate ma contato separatamente.
- L'entropia e la correlazione descrivono l'esperimento, non dimostrano sicurezza o casualità.
- La distanza di Hamming fra output di scalari consecutivi è soltanto una misura *avalanche-like*, non lo Strict Avalanche Criterion di una funzione hash.
- Homework 2 sulla derivazione degli indirizzi Ethereum è separato e **non fa parte di questo ZIP**.

## Pubblicazione su GitHub Pages

1. Crea un repository pubblico.
2. Carica `index.html`, le cartelle `css` e `js` e, se vuoi, `README.md` e gli altri file.
3. In GitHub vai su `Settings → Pages → Deploy from a branch`, scegli `main` e `/(root)`.
4. Verifica il sito pubblicato, poi inserisci quel link nel foglio del professore.

Usa solo chiavi dimostrative. Non inserire frasi di recupero o chiavi segrete di wallet reali.
