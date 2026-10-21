# Verification report — 21 October 2026

## Mathematical and cryptographic tests

Executed command: `node tests/run.mjs` using v24.19.0.

**1,806 assertions passed.** No tests are declared passed without execution.

- Caesar: all 26 shifts; complete uppercase/lowercase alphabet; UTF-8, whitespace, punctuation and empty input.
- Curve: SEC 2 generator, p/n parameters, six public keys independently cross-checked with Node/OpenSSL; invalid scalars rejected.
- Range validation; cryptographic random keys stay within declared bounds (not a randomness proof).
- ECIES-like round-trips: ASCII, multilingual/emoji, empty message, 10,000 characters; sender/receiver shared secret and AES key match; JSON envelope portable; wrong keys and altered ciphertext/salt/IV/R/Q rejected; repeated encryption uses fresh output.
- Exhaustive recovery: first, batch boundary, middle and last candidate; authenticated decryption with recovered key; key outside bound not found.
- Statistics: counts/normalization; χ² independently recomputed for all candidates; all 26 rotated versions recover the long example; empty alphabet rejected; deterministic ties; Wilson boundary cases.
- Reference experiment: 1,600 actual ciphertext trials / 3,200 attacks; independent count aggregation; disjoint blocks within each length; paired prefixes; exact repeatability with the same seed.

Public keys were compared against the independent Node/OpenSSL secp256k1 implementation for d = 1, 2, 1379, 4096, 65536, n−1. No exact future attack time is inferred from measurements.

## Measured reference experiment

Seed: 20261021. Training: 538,224 A–Z letters. Test: 431,069. Available disjoint 1,000-letter blocks: 431. Each length uses 200 sampled blocks; prefixes are paired across lengths. 1,600 ciphertext trials; two methods; 3,200 attacks. Exact raw rows and scores are included in JSON and CSV.

| Letters | Trials | χ² correct | χ² rate | χ² Wilson 95% | Bigram correct | Bigram rate |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 200 | 99 | 49.5% | 42.6–56.4% | 153 | 76.5% |
| 10 | 200 | 155 | 77.5% | 71.2–82.7% | 196 | 98.0% |
| 20 | 200 | 194 | 97.0% | 93.6–98.6% | 200 | 100.0% |
| 50 | 200 | 200 | 100.0% | 98.1–100.0% | 200 | 100.0% |
| 100 | 200 | 200 | 100.0% | 98.1–100.0% | 200 | 100.0% |
| 200 | 200 | 200 | 100.0% | 98.1–100.0% | 200 | 100.0% |
| 500 | 200 | 200 | 100.0% | 98.1–100.0% | 200 | 100.0% |
| 1,000 | 200 | 200 | 100.0% | 98.1–100.0% | 200 | 100.0% |

Longer prefixes improved endpoint recovery on this sample. The χ² method made 101 errors at 5 letters, 45 at 10, and 6 at 20. Its five longer-length results were not all independent: the same 200 passages supply paired prefixes. The page exposes actual failed trials. The bigram method used the same held-out inputs and generally helped for very short texts.

A 100% observed rate is not certainty for all English. The Wilson lower bound remains below 100%. Literary blocks are dependent, so the intervals are reference measures rather than a guaranteed coverage result. No p-values are inferred from χ² ranking scores.

## Browser and layout verification

Executed in the cloud Chrome browser against the served, shipped modules: **32 browser checks passed**. These cover all 26 Caesar shifts, ECC worker key recovery from Q alone, multiple progress updates, a key outside the search interval, statistical worker results, and all 1,600 trial inputs and recovered keys. The statistical rows match the Node reference exactly. Maximum absolute score difference between browser and Node: 5.684341886080802e-14; floating-point scores are compared with a relative tolerance, not string equality.

Main-page interactions checked: rerun experiment, open a failed trial, inspect another candidate, open/close explanatory dialog, light/dark switch. Layout visually checked at desktop and in a 390 × 844 CSS-pixel iframe. The mobile page body and scroll width both measured 390 px; detailed charts/tables have their own horizontal scrolling. This is responsive layout verification, not a real-device Safari/iOS test. Screenshots are included in the ZIP.

**Verification limit:** the internal preview origin is HTTP `terminal.local`, which does not provide `crypto.subtle`. Browser HKDF/AES-GCM encryption and the complete recovered-key UI decryption were therefore skipped there. The exact shipped cryptographic code, including round-trips, wrong-key rejection, tampering and recovered-key decryption, passed Node Web Crypto tests. The downloadable site requires HTTPS or localhost; it was not publicly deployed for this task. No browser security settings were weakened.

No application JavaScript errors were observed during the checks. Chrome-extension metadata errors were emitted by the preview environment and were unrelated to the app. Full browser-suite output is included as `browser-checks.txt`.

## Security and scope limits

The curve is standard secp256k1, not the Homework 1 curve over F17. The recipient key interval is deliberately reduced. The ephemeral key is full-range. ECDH → HKDF-SHA-256 (public salt and protocol/R/Q context) → AES-256-GCM (96-bit nonce, 128-bit tag; protocol/R/Q as additional authenticated data). Wrong keys and modified envelopes fail authentication in executed Node tests.

The scheme is educational, not production-audited or a standardized ECIES profile. It has no authenticated sender identity or protected public-key directory. Search duration depends on browser scheduling and optional display pacing. No entropy-based security claim is made. The original repository checkout remained clean; no push or deployment was performed.
