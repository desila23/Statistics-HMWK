# Numerical Integration and the Normal CDF

One English-language lab for two Statistics exercises. Serve the repository root with `python3 -m http.server 8000` and open `/hw-integration-normal-cdf/`. No build or external library fetch is required. Chart.js and its license are included.

## Exercise 1: integration

Compare midpoint sums on the domain to midpoint quadrature of the superlevel length S(y) = measure({x : f(x) > y}). A bin (u,v] has preimage measure S(u) − S(v). The layer-cake identity integrates S over nonnegative heights; endpoint sums also bound the integral up to the chosen height cap. For a signed function the corresponding theory would treat positive and negative parts separately; the nine examples here are nonnegative.

- Six bounded ordinary examples: sine, square, a step, an absolute value, an indicator and sinc with its continuous value at 0. These are Riemann-integrable and both methods converge to the same value.
- The singular inverse square root is improper Riemann-integrable and Lebesgue-integrable. Its clipped integral is 2 − 1/T. At fixed T, the range method converges to the clipped value, not 2. The lab separately displays the omitted tail and the corrected estimate.
- Dirichlet has rational-tag sums 1 and irrational-tag sums 0 for every partition count in the demo. The tags are defined symbolically, not classified with floating-point arithmetic. The Lebesgue integral is 0; the Riemann integral does not exist.
- Thomae's function is Riemann- and Lebesgue-integrable with integral 0. Midpoint values use exact integer reduction of (2i+1)/(2n). All positive superlevel lengths are 0.
- Sinc superlevel boundaries are obtained by bisection; the reference integral is Si(π), rounded to binary64. Other superlevel lengths use closed formulas or measure-zero arguments.

At equal counts, domain midpoint quadrature costs n samples and the range routine uses 2k+1 superlevel queries for the estimate and its bounds. Sinc's interior queries each use 48 bisection iterations. The lab keeps n and k independently configurable, and its convergence table sweeps matched counts. Near discontinuities the error depends on grid alignment. The displayed plot floors tiny errors for log-scale readability; CSV keeps the unfloored values.

## Exercise 2: standard normal probabilities

The four methods are composite trapezoid, composite Simpson, a direct alternating erf series, and a tail-aware incomplete gamma method. The latter uses the lower-gamma series near zero and the upper-gamma continued fraction (modified Lentz) outside the center. It computes the smaller tail directly in the outer branch; the CDF on the right is the complement. The Liouville section derives the obstruction R′ − xR = 1 to an elementary antiderivative and explains why the exact erf identity still needs a numerical evaluator.

The [ETSU notes](https://faculty.etsu.edu/gardnerr/4047/notes-Hogg-McKean-Craig/Hogg-McKean-Craig-3-4.pdf), Example 3.4.2 (p. 7), give Φ(1), Φ(2), Φ(3) to four decimals: 0.8413, 0.9772, 0.9987. The browser compares these separately from the high-precision grid. The high-precision values come from mpmath 1.3.0 at 75 decimal digits using erfc, then round to binary64. Rebuild them with `python generate-reference.py` (mpmath required only for generation).

The lab compares absolute CDF error and relative smaller-tail error. Near one, CDF rounding can hide tail error. Trapezoid, Simpson and the direct erf series may lose tail digits through subtraction; a negative tail is displayed as invalid. The direct series is limited to |z| ≤ 6 in the demo. Deep enough tails underflow in binary64. The gamma method is not claimed to be correctly rounded; the two adjacent floats at the series/fraction switch can differ in the wrong order by about 2.2×10⁻¹⁶.

## Verification and measured examples

Run `node test.mjs` from this folder. Tests cover all nine functions, analytic range bounds, clipping, exact midpoint formulas, jump alignment, rational tags, 1,222 independent CDF reference points, symmetry, tails and the three published ETSU values. They also check that halving quadrature step size gives the expected error reduction at z=1, and allow a few machine epsilons at the gamma branch switch.

Observed in Node: gamma maximum absolute CDF error 2.22×10⁻¹⁶ and maximum relative smaller-tail error 5.52×10⁻¹⁴ (rounded up) on the stored test grid; maximum 58 terms or fraction iterations. These are measured errors on that grid, not global bounds.

In one Chrome benchmark at z=−2 with 128 quadrature panels, the median times per call were approximately 1.06 µs gamma, 1.59 µs Simpson, 1.83 µs trapezoid and 0.159 µs direct series. This central example favors the direct series for speed, but it does not retain accuracy in deep tails. For sinc at n=k=512, domain midpoint took about 32 µs and range midpoint with bounds about 1,800 µs. Times exclude chart rendering; they depend on device, browser, input, and timer resolution. Counts of terms, evaluations and queries are not equal-cost operations.

Chrome preview checks covered navigation, pathological and singular cases, CDF input, native input validation, theme, timing controls, CDF CSV download, and a 390 px frame. GitHub Pages and Safari/iOS are not yet verified.
