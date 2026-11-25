# Convergence and Bayesian Inference

This lab compares four modes of convergence, shows why the sample mean scales with √n, and illustrates Bayes’ rule with a detector and a Beta–Binomial model.

From the repository root, run `python3 -m http.server 8000` and open `http://localhost:8000/hw-convergence-bayes/`. Use HTTP because the simulation runs in a module worker. All browser dependencies are bundled.

## Convergence lab

The code simulates independent Bernoulli observations and records the running mean at selected prefixes. A fixed seed reproduces the same simulation. The page shows up to five paths and summarizes all paths in the table and CSV. The controls allow up to 4,096 observations in each of 1,000 paths.

The binomial mass is computed by recurrence, starting at the mode and normalizing. This gives the probability of exceeding the chosen deviation, while the exact MSE is p(1−p)/n. The strict comparison excludes values on the band boundary (using a 10⁻¹⁴ rounding guard). The CLT chart compares the standardized binomial CDF with a rational approximation to the standard normal CDF. The reported maximum gap checks both sides of each jump.

A finite simulation can illustrate these theorems but cannot establish almost sure convergence. An observed count of zero excursions also does not prove that the exact probability is zero. The correlation slider shows a variance identity under equal nonnegative correlations; it does not assume that such samples obey a CLT.

## Bayesian examples

The detector uses fictional probabilities and reports expected counts per 10,000 sessions. It leaves the posterior undefined when the evidence has zero probability.

The event rate model assumes independent trials given a common rate θ. For a Beta(a,b) prior and k events in n trials, the posterior is Beta(a+k,b+n−k). Its mean also predicts the next event under the same model. Equal-tailed credible intervals come from numerical inversion of the Beta CDF via the integer-shape binomial identity. The UI accepts integer prior shapes from 1 to 30 and up to 300 trials. Relative likelihood is divided by its maximum for display.

Compare the `7 of 10` and `70 of 100` presets to see how the same observed proportion affects the two priors. The results and intervals depend on the chosen prior and likelihood.

## Verification

Run `node test.mjs` from this directory. The checked-in `reference.json` can be regenerated with `python3 generate-reference.py` using SciPy. See [TEST_REPORT.md](TEST_REPORT.md) for the numerical and browser checks.
