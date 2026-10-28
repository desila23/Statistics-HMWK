# Homework 4 — Stochastic Penetration Processes

An interactive Statistics homework for the Master's Degree in Cybersecurity, Sapienza University of Rome. All interface text is English. This is an educational probability model: each of m attackers makes n attempts, one per system. It does not model operational intrusion detection or realistic attacker behaviour.

## Run

No installation, build step, backend, API key or CDN is required. Serve this directory over HTTP; module Web Workers do not work reliably from `file://`.

```sh
cd hw4
python3 -m http.server 8000
```

Open `http://localhost:8000/`. On GitHub Pages the entry point is `hw4/index.html`; all runtime assets use relative paths. Chart.js 4.5.1 is bundled under `vendor/` with its MIT license. Only optional reference links use external websites.

## Experiments

1. **Introduction and models.** Definitions, assumptions, interpretation and exact moments.
2. **Simulation lab.** Choose Bernoulli or symmetric Rademacher, n, m, p and a seed. Run, stop, reset, choose a random seed, compare models and export CSV. Eight complete attacker paths are retained; every attacker contributes to endpoint distributions. Inspect any retained path at any step or export all its increments. The three endpoint histograms show total, average and square-root-normalized scores.
3. **LLN and variance.** A separate run uses prefixes of the same m paths at increasing n. Vary epsilon to calculate strict exceedances, exact binomial tails, pointwise 95% Wilson intervals and the Chebyshev bound. The variance plots show empirical and theoretical values for all three quantities.
4. **Rademacher CLT.** Compare checkpoints n = 10, 30, 100 and 1,000, plus a custom n. Every run simulates to max(1,000, requested n) to keep the standard comparison available. View normalized density histograms against the fixed standard-normal density, moments, exact finite-n CDF gaps and empirical CDF gaps. A custom checkpoint remains available after selecting other tabs.
5. **Effect of m.** At fixed n, inspect nested ensembles of 50, 100, 500, 1,000 and 5,000 attackers, using unchanged histogram bins and the same exact single-attacker law. See sampling error and total variation distance to the exact discrete PMF.
6. **Conclusions and glossary.** The numerical LLN/CLT conclusions update from completed runs; definitions and model limits are stated beside the experiments.

The four independent default experiments start automatically. Changing form values leaves the previous completed plots in view, with their original generating parameters, until a new run completes. Stopping a worker discards partial results and preserves the previous completed result. The comparison button uses the lab's completed parameters and the current Bernoulli p setting; common uniforms pair the models, as stated in the chart note.

## Mathematical conventions

For Bernoulli increments, mean mu = p and variance sigma² = p(1−p). For symmetric Rademacher increments, mean mu = 0 and variance sigma² = 1. Within the ideal model, increments and attacker paths are independent and identically distributed.

| Quantity | Expected value | Variance |
|---|---:|---:|
| Total S_n | n mu | n sigma² |
| Average S_n/n | mu | sigma²/n |
| Normalized total S_n/sqrt(n) | mu sqrt(n) | sigma² |

The empirical variance is the unbiased sample variance with denominator m−1, calculated with Welford's algorithm. For m = 1 it is undefined and is displayed as a dash. The per-attacker law must not be confused with the aggregate score of all attackers.

- The LLN concerns concentration of each attacker's average around mu, not merely an ensemble mean close to mu. Exact and empirical tails use the strict event `abs(S_n/n − mu) > epsilon`. A tiny arithmetic tolerance resolves lattice boundary round-off.
- The Chebyshev bound is capped at one. Wilson intervals are pointwise Monte Carlo uncertainty intervals; checkpoints share prefixes and are therefore paired. They are not independent tests or a simultaneous confidence band.
- Rademacher `S_n/sqrt(n)` converges in distribution to N(0,1). Bernoulli `S_n/sqrt(n)` generally has mean p sqrt(n); it is **not** standard normal. The separate explanatory Bernoulli standardization `(S_n − np)/sqrt(np(1−p))` requires 0 < p < 1. No Bernoulli CLT histogram is claimed.
- Every histogram bin is a union of adjacent lattice cells. Height = count/(m × bin width), so the empirical area is one. The exact-law overlay aggregates exact probability mass into the same bins and divides by the same width. At finite n the scores remain discrete. The normal curve in the CLT panel is a density comparison, not a fitted distribution. The plotted range can exclude exact-law tails beyond the observed range.
- The CDF gap is the supremum absolute difference from the standard-normal CDF, evaluating both sides of discrete jumps. The exact gap describes finite-n discreteness; the empirical gap adds Monte Carlo noise. No KS p-value or hypothesis-test conclusion is reported. The normal CDF approximation has absolute error of approximately 7.5e−8.
- Total variation distance in the m experiment uses the full discrete support, independently of plotting bins. More m reduces sampling error on average, but no monotone improvement is promised for each nested realization. For the normalized ensemble mean, theoretical standard error is sqrt(sigma²/m).

## Reproducibility, retention and limits

Seeds are unsigned 32-bit integers, including zero. Mulberry32 generates exactly one uniform per increment in attacker-major order. Each path uses n successive draws. The same parameters and seed reproduce identical endpoints, retained paths, checkpoints and statistics. Increasing m with fixed n/seed retains the first m paths; changing the maximum horizon changes draw allocation for later attackers. Increasing-n experiments explicitly use prefixes from a single maximum-horizon run.

The PRNG approximates the ideal i.i.d. model; deterministic pseudorandom output does not prove independence and is not suitable for cryptography. Using the same seed across Bernoulli and Rademacher intentionally pairs the uniforms.

Accepted ranges: 1 ≤ n,m ≤ 20,000 and n×m ≤ 100,000,000 per run; Bernoulli 0 ≤ p ≤ 1. Only eight full trajectories and checkpoint/final endpoint arrays are retained, avoiding an n×m matrix. Path charts show at most about 450 coordinates per path; retained-path CSV includes every step. Endpoint statistics always use all m results.

Computations run in module Web Workers, yielding after 65,536 increments with progress messages; Stop terminates the worker. Large legal runs can take several seconds depending on the device. Chart rendering and exact finite-law calculations run on the main thread after completion. Very small m is valid but noisy; degenerate p = 0 or 1 is handled exactly. Finite simulation illustrates theorems and does not prove them or validate real-world security assumptions.

## Exports

- Lab CSV: one row per attacker with model, n, m, p, seed, total, average and normalized endpoint.
- Retained-path CSV: one row per step with the same parameters, attacker ID, increment and all three cumulative quantities.
- Increasing-n CSV: one row per attacker per checkpoint, also including epsilon.
- CLT CSV: all attacker endpoints for the displayed checkpoint, with that checkpoint's n.

## Verification

Node 20 or newer is sufficient; no npm dependencies are needed for the tests.

```sh
npm test
npm run reference
```

Open `tests/browser.html` through the same HTTP server to run production module-worker checks in a browser. The harness compares browser endpoints and paths with the small Node-generated fixture and exercises edge cases, progress, validation and termination. Reference fixtures are checks, never input data for the site's charts.

See [executed test report](results/TEST_REPORT.md), [math result](results/math-tests.json), [browser result](results/browser-tests.json) and [measured experiments](results/reference.json). The mathematical suite uses independent small-n binomial calculations and predeclared Monte Carlo uncertainty tolerances; it does not require random results to equal theoretical moments.

## Files

- `index.html`, `css/style.css`: eight sections, responsive layout, MathML formulas, theme and accessible controls.
- `js/core.js`: deterministic simulation, moments, exact probabilities, histograms, distances and CSV.
- `js/worker.js`: chunked module-worker execution.
- `js/charts.js`: Chart.js rendering and true-bin-width histogram plugin.
- `js/app.js`: controls, four experiments, exports and measured conclusions.
- `tests/`, `results/`: reproducible tests and executed results.
- `vendor/`: bundled Chart.js and license.

No previous homework directory is changed, and no shared homework navigation menu is introduced.

## References

- [MIT OpenCourseWare 18.05 — LLN and CLT](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class06-prep-b.pdf)
- [NIST/SEMATECH — Binomial distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366i.htm)
- [Chart.js documentation](https://www.chartjs.org/docs/latest/)

Author: Samuele De Santis · Statistics · 2026/2027.
