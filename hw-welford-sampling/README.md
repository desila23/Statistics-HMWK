# Welford’s Algorithm — Sampling Mean and Variance

One English-language lab for two exercises: derive Welford’s update for the mean, centered sum of squares and sample variance; then use that update for repeated samples of scores from 0 to 10.

## Run locally

Serve the repository root over HTTP (for example, `python3 -m http.server 8000`), then open `/hw-welford-sampling/`. The module worker requires HTTP(S); opening the HTML as a file is not supported. Chart.js and its license are bundled. No build, external CDN or backend is required.

In Exercise 1, edit the sequence and use **Next observation** or **Run all**. The two-pass calculation is an independent numerical comparison. In Exercise 2, enter integer n, m and a 32-bit seed, then run the lab. The sample-size sweep uses nine fixed sizes (2, 5, 10, 30, 50, 100, 300, 500, 1000). It records prefixes of the same 1,000-score trajectories, so comparisons across n are paired. The standalone lab and sweep consume the stream differently when their horizons differ.

## Statistical model

Scores are modeled as i.i.d. discrete uniform integers on 0 through 10. The exact mean is 5, variance 10 and fourth central moment 178. Mulberry32 supplies reproducible pseudorandom integers; rejection before taking the remainder modulo 11 avoids uneven mapping of the 32-bit range. It is not a cryptographic generator.

The Welford state is count, mean and M2. After incrementing count, update delta, mean and M2 in that order. Sample variance is M2/(n−1), undefined for n < 2. Across hackers, average the two estimators separately and measure their spreads with the m−1 denominator. The theoretical sampling variances are 10/n for the sample mean and [178 − 100(n−3)/(n−1)]/n for the sample variance. These formulas describe individual estimates, not the error of their Monte Carlo averages.

The lab CSV contains one row per hacker, with seed and model. The sweep CSV has one row per sample size. The worker limits each run to 10 million scores; plots show at most four paths and thin long paths for display. Histogram bins are fixed within each comparison, and their heights represent percentages. The simulation does not model realistic penetration attacks.

## Verification

Run `node hw-welford-sampling/test.mjs` from the repository root. Tests cover the recurrence, one observation, pairs, constants, decimals, large offsets, exact moments, score support and seeded reproducibility. A run of 5,000 hackers with 1,000 scores each compares 45,000 pairs of estimates with two-pass calculations. Aggregate estimates are checked against theory using tolerances of six theoretical Monte Carlo standard errors; score counts use six binomial standard deviations.

In that test run, empirical variance across sample means went from 2.008484 at n=5 to 0.099703 at n=100. Empirical variance across sample variances went from 25.437202 to 0.819307. These are seeded observations, not guarantees for every run.

Chrome preview checks covered the worker, plots, step demo, rejected input, theme, CSV download and a 390 px frame. GitHub Pages publication and Safari/iOS testing are pending.
