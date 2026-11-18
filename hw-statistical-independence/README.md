# Statistical Independence — Contingency Table Lab

An English-language Statistics homework with a working CSV analyzer. It builds the contingency table programmatically, displays joint/marginal/conditional frequencies, fits the independence model, computes Pearson's chi-square statistic and an optional asymptotic p-value, and distinguishes association from causality.

## Run

Serve the repository root over HTTP, for example with `python3 -m http.server 8000`, then open `/hw-statistical-independence/`. There is no build or backend. Chart.js 4.5.1 and its MIT license are bundled; no CDN is used. All uploaded/pasted data remains in the browser.

## Data workflow

1. Load an example, paste CSV or choose a local CSV file.
2. Choose comma, semicolon or tab delimiters, then **Read columns**.
3. Select distinct X and F columns. Select **None** for individual observations, or an integer frequency-count column for summarized observations.
4. **Analyze dataset**. Switch the frequency table view, choose an X category in the conditional chart, inspect cell contributions and export the unrounded cell statistics.

CSV has a header with unique, nonempty names. Quoted delimiters, line breaks, doubled quotes, CRLF and UTF-8 BOM are supported. Blank lines are ignored. Fields are trimmed when interpreted as categories; labels are case-sensitive. Empty X/F pairs are dropped and reported by input-row count. Zero-count rows are omitted, so categories represented only by zeros do not create empty margins. Missingness can change the result; no imputation is performed. Count values must be nonnegative integers, not survey weights.

Limits are 1,000,000 characters of pasted CSV (1,000,000 bytes for files), 20,000 data rows, 50 columns, 20 retained categories per analyzed variable and 10 million observations after expanding counts. Numeric values are category labels; bin continuous variables before import. The lab does not choose bins. Changing inputs does not overwrite the previous result until analysis succeeds; its data/column labels remain shown.

The three teaching datasets are constructed examples. The fourth is the public NIST wafer-defect example: 309 observations, three production shifts and four defect types. Loading another preset or a file clears the sampling-assumption checkbox.

## Definitions and formulas

With cell count O_ij, row total R_i, column total C_j and grand total N:

- Joint relative frequency: O_ij/N.
- Marginals: R_i/N and C_j/N.
- F given X: O_ij/R_i (each row sums to one).
- X given F: O_ij/C_j (each column sums to one).
- Expected count under independence: E_ij = R_i C_j/N.
- Pearson chi-square: sum over all cells of (O_ij−E_ij)²/E_ij.
- Degrees of freedom: (r−1)(c−1).
- Pearson residual: (O_ij−E_ij)/sqrt(E_ij); its square is a cell's chi-square contribution.
- Uncorrected Cramér's V: sqrt(chi-square/[N min(r−1,c−1)]).

Empirical independence is checked exactly using the integer equality O_ij N = R_i C_j. Given the input limits, these products are below JavaScript's exact-integer limit. This is a property of the sample's empirical distribution, not a proof about a population. A one-category variable gives df=0; the test and Cramér's V are undefined, while the frequency tables remain available.

The p-value is the right-tail chi-square probability Q(df/2, statistic/2), computed with a Lanczos log-gamma approximation plus a lower-gamma series or upper-gamma continued fraction. A p-value rounded to numeric zero is displayed as below 10^-300, not as a literally impossible null hypothesis. No Yates correction, exact test or resampling test is implemented.

## Interpreting the result

The checkbox concerns independence **between observations**, not the within-pair relationship under H0. The lab cannot verify the sampling design. Until that assumption is selected, the inferential result is phrased conditionally. Even after selecting it, the user must justify the assumption.

The lab uses a conservative approximation screen: every expected count must be at least 5. When that fails, it shows the statistic but withholds the p-value and significance decision. A more suitable exact or Monte Carlo procedure may then be needed. Repeated observations, clusters, structural zeros and complex survey designs require more specialized methods.

When valid, p < alpha means rejecting independence under the assumptions. A large p means failing to reject, not proving independence. Neither a significant association nor Cramér's V establishes causation. The interpretation discusses confounding, selection, reverse causation, effect size and the role of sample size.

## Export

CSV contains one row per retained X/F cell, including cells with zero observed counts inside the retained category grid. It includes variable/category names, observed and expected counts, all marginal and conditional proportions, residuals, contributions, N, statistic, df, eligible p-value, expected-count screen, V, alpha and sampling-assumption state. Sparse/degenerate p-values are left empty. String values beginning with a spreadsheet formula marker are prefixed with an apostrophe in exports; this does not affect analysis.

## Validation

Run `node hw-statistical-independence/test.mjs` from the repository root. Runtime tests need no packages. To rebuild independent numerical fixtures, install SciPy and run `python hw-statistical-independence/generate-reference.py`. The committed fixtures were generated using SciPy 1.17.0 with `chi2_contingency(..., correction=False)`.

See [TEST_REPORT.md](TEST_REPORT.md) for executed checks and actual results. No random number generator is used; the analysis is deterministic. Browser validation covered Chromium desktop, mobile/tablet frames, CSV import/download and both themes. Real Safari/iOS and the GitHub Pages deployment are pending.

## Files

- `index.html`, `style.css`: theory, lab, result views, interpretation and responsive layout.
- `core.mjs`: CSV parser, contingency construction, frequencies, test calculations and export.
- `app.mjs`: browser controls, tables, chart and current-result conclusions.
- `presets.mjs`: constructed examples and the published NIST counts.
- `generate-reference.py`, `reference.json`, `test.mjs`: independent fixtures and tests.
- `vendor/`: local Chart.js and license.

## Primary references

- [NIST/SEMATECH §7.4.5](https://www.itl.nist.gov/div898/handbook/prc/section4/prc45.htm)
- [SciPy chi2_contingency](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.contingency.chi2_contingency.html)
