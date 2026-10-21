# ECC × Caesar — Statistics Homework 2 (repost)

An English-language interactive HTML/CSS/JavaScript laboratory for Statistics, MSc Cybersecurity, Sapienza. It is a new `hw2-repost/` project; previous homeworks remain unchanged.

## Run

Copy `hw2-repost/` into the root of `Statistics-HMWK`. No build or dependency installation is needed to use it. Publish the folder through the repository's existing GitHub Pages setup when ready. There are no CDN dependencies.

For local use, start a server from the repository root:

```sh
# Windows
py -m http.server 8000
# macOS / Linux
python3 -m http.server 8000
```

Open `http://localhost:8000/hw2-repost/`. Use HTTPS or localhost: Web Crypto is unavailable on ordinary insecure HTTP origins. Double-clicking `index.html` via `file://` is not supported because module scripts, workers and corpus loading require an HTTP origin.

## Sections

1. Introduction: Caesar versus a public-key hybrid scheme; distinction from the mod-17 toy curve.
2. Shared-message lab: every Caesar shift; real secp256k1 ECDH, HKDF-SHA-256, AES-256-GCM; inspect keys and intermediate values; authenticated decryption; wrong-key demonstration; public-envelope JSON download.
3. Statistical cryptanalysis: all 26 candidate scores, selectable decryptions, raw/decoded frequency charts, χ² and bigram models, eight ciphertext lengths, repeated seeded trials, Wilson intervals, real failed cases, raw CSV export.
4. Restricted ECC key recovery: cancellable worker, progressive point enumeration, exact key match, recovered-key decryption, measured wall-clock time.
5. Comparison and conclusions, with sources and explicit security limitations.

The default d = 1379 and B = 4096 are classroom examples. “Random d” samples uniformly from 1…B using rejection sampling and `crypto.getRandomValues`. The sender's fresh ephemeral scalar is sampled over the full valid secp256k1 range. `Q = dG` alone is not encryption.

## Reproduce and test

Using Node 20.19+ (verified with Node 24.19):

```sh
cd hw2-repost
node tests/run.mjs
```

This uses the already bundled curve dependency, runs the mathematical and cryptographic tests, recomputes the reference experiment and writes JSON/CSV results under `results/`. Open `tests/browser.html` through the same local server for browser checks. See `results/TEST_REPORT.md` for actual executed results and verification limits.

Runtime modules: `js/core.js` (cryptography/statistics), `js/worker.js` (search and experiment), `js/app.js` (UI), `vendor/noble.js` (bundled curve implementation). The site requests its corpus and result files from relative paths, so GitHub Pages subdirectories work.

To rebuild the vendored dependency only:

```sh
npm ci
npm run build:vendor
```

Dependencies are pinned: @noble/curves 2.0.1, @noble/hashes 2.0.1; esbuild 0.25.12 is a development tool. Both noble MIT licenses and the bundle's legal notices are included. The old homework contains secp256k1 generator multiplication for address derivation, but not arbitrary-point ECDH. This project uses the library for both public-point operations and ECDH instead of extending unaudited arithmetic.

## Reference experiment

Seed 20261021; 200 trials per length; lengths 5, 10, 20, 50, 100, 200, 500, 1000; 1,600 ciphertexts and 3,200 scored attacks. Training: Austen, 538,224 letters. Test: Doyle, 431,069 letters. See `data/SOURCES.md`, `results/reference.json`, and `results/reference-trials.csv`.

Disjoint 1,000-letter test blocks are sampled without replacement. Prefixes of each selected block are reused across lengths for paired comparisons. The methods share passages and shifts. A random shift is not a new language sample. Scores use only the training model and ciphertext; true keys are revealed only for evaluation. Wilson intervals are reference binomial intervals and are not a coverage guarantee for dependent literary text.

## Limits

This is an educational ECIES-like envelope, not a standardized production ECIES profile. Secrets are intentionally visible in the page. The sender is not authenticated and public-key distribution is not secured. AES-GCM authentication does not solve those problems. Message length is visible. Small recipient keys are insecure by design. Do not enter real secrets.

High observed entropy or balanced bits do not prove security. Search timing includes worker scheduling and optional presentation delays; it is not extrapolated to full-strength ECC keys. One test novel cannot represent all English. Browser/Node floating-point scores can differ in last decimal places while keys and trial inputs remain identical.

Light/dark theme persists using the same `statsTheme` preference as the previous homeworks. Charts have keyboard-selectable candidates and exact tables; narrow screens scroll the detailed charts and tables horizontally. Explanations use native details/dialog controls and a reduced-motion preference is respected.
