# Test report

## Numerical checks

`node test.mjs` passed with checked-in reference values generated using SciPy 1.17.0:

- Eight binomial configurations: mass, mean, variance, exact deviation probability and CDF gap. The test also checks strict band boundaries and the Chebyshev bound.
- 321 standard normal CDF values: maximum observed absolute error of 7.41 × 10⁻⁸.
- Reproducibility with a fixed seed, and empirical MSE and deviation rates consistent with their Monte Carlo error.
- Eight Beta posterior cases: shapes, means and credible intervals. Covered no data, all successes, no successes and invalid counts.
- The detector defaults and conditioning on evidence with zero probability.

## Browser checks

Tested in Chromium through a local HTTP preview. Confirmed navigation from the homepage, the module worker, five charts, editable controls, dark theme, a counterexample selector, and a CSV with 11 rows through n = 1,024. The exported theoretical MSE and empirical deviation fractions matched their formulas. The page fit 390 px and 768 px frames without horizontal page overflow.

| Check | Observed result |
| --- | --- |
| Bernoulli defaults: p = 0.30, n = 256, 500 paths, ε = 0.10 | Exact MSE 0.0008203125; exact deviation probability about 0.0004873; no deviations in the 500 seeded paths |
| Detector defaults: 1% base rate, 95% sensitivity, 5% false alarms | 95 true alerts and 495 false alerts per 10,000 expected sessions; posterior 16.10% |
| Beta priors with 7 events in 10 trials | Beta(8,4) and Beta(9,11); posterior means 66.67% and 45.00% |
| The same priors with 70 events in 100 trials | Beta(71,31) and Beta(72,38); posterior means 69.61% and 65.45% |

The public GitHub Pages URL and browsers other than Chromium were not tested.
