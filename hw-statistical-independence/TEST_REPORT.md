# Executed validation — Statistical Independence

Executed on 18 November 2026. No push or publication has yet been performed.

## Numerical checks: PASS

Node v24.22.3 executed `test.mjs`.

- Seven two-dimensional tables were compared against independent SciPy 1.17.0 fixtures (Pearson, no Yates correction).
- Every table's joint frequencies summed to one, row conditionals summed to one within rows and column conditionals summed to one within columns.
- Expected counts preserved row and column margins. Contributions summed to the displayed statistic. Both conditional definitions reconstructed the same joint frequencies.
- Transposing X and F preserved chi-square, p and Cramér's V.
- 126 chi-square survival probabilities, covering df 1–361 and statistics 0–1200, were checked against SciPy. Maximum relative error for reference p > 10^-300 was 1.134×10^-13 (rounded up); absolute errors passed 2×10^-12.
- Exact empirical product-table independence gave chi-square 0, p=1 and V=0. The sparse example failed the expected-count screen. A one-category variable correctly gave df=0 and null p/V.
- The independent SciPy reference data is stored in `reference.json`; it is not used to populate the lab's results.

| Example | N | Pearson chi-square | df | Asymptotic p (under assumptions) | Cramér's V |
|---|---:|---:|---:|---:|---:|
| Constructed product table | 100 | 0 | 1 | 1 | 0 |
| Constructed association | 120 | 30 | 1 | 4.32046306e-8 | 0.5 |
| NIST wafer defects | 309 | 19.17797217 | 6 | 0.00387338884 | 0.17615992 |
| Constructed sparse sample | 3 | 3 | 1 | Withheld by UI | 1 |

The sparse example's mathematically computed asymptotic value is used only in the numerical engine test. The interface/export withhold it because the expected-count screen fails.

## Data-handling checks: PASS

- Quoted commas, embedded newlines, doubled quotes, CRLF, UTF-8 BOM, semicolon/tab input and blank lines.
- Duplicate/empty headers, inconsistent field counts, malformed/unclosed quotes, invalid/negative/fractional/missing counts, empty retained data and too many categories were rejected.
- Missing category pairs and zero-count rows were counted separately and excluded.
- Raw and count-column data representing the same observations produced identical tables/statistics.
- A real CSV export was downloaded and parsed: four cells, N=100, expected=observed in each cell, statistic 0, p=1, and correct row margins.

## Browser checks: PASS in Chromium

- Root homepage link opened the nested project directory; source modules and local chart library loaded.
- Default dataset: N=120, chi-square=30, df=1, p≈4.3205e-8, V=0.5.
- NIST preset: expected table matched the numerical reference and produced the published rounded chi-square/p results.
- The inference wording switched between conditional interpretation and stated-assumption interpretation.
- Product-table example was identified as exactly empirically independent and did not claim population independence.
- Sparse-table p-value and decision were withheld with an explanation.
- Row-conditional and column-conditional table views displayed the correct denominators and margins.
- Custom four-column data allowed X/F selection; one missing pair and one zero-count row were excluded and reported correctly.
- A file with semicolon-separated counts was uploaded, parsed and analyzed, producing N=100 and chi-square=0.
- Invalid duplicate headers were rejected while the previous completed results stayed visible.
- The one-category browser case showed df=0 with undefined p and V. Loading a new dataset cleared the sampling-assumption checkbox.
- No application JavaScript errors or warnings were observed.
- All local source/asset/document links, unique HTML IDs and anchor targets passed static checks; all JavaScript modules passed syntax checks.
- The conditional chart responded to the selected X category.
- Both color themes and a 390 px mobile frame / 768 px tablet frame were checked. The corresponding document widths equaled their client widths (375 and 753 px with scrollbars), so no horizontal document overflow was observed. Tables and section navigation scroll inside their own containers.

## Scope and limits

No known blocking issue remains in the tested Chromium environment. Real iOS/Safari, Firefox, assistive-technology behavior and deployment on GitHub Pages have not yet been tested. Responsive frames check CSS layout, not physical touch behavior.

The dataset is categorical and its sampling design is not inferred from values. Complete-case exclusion can change the association. Frequency counts are not arbitrary weights. The expected-count screen is conservative; exact or Monte Carlo tests, structural-zero models and repeated-measures methods are outside scope. A test result is not a causal conclusion.

## Repository scope

New independent `hw-statistical-independence/` directory, plus a homepage card and a README entry. Previous homework directories were verified unchanged against ccad9ff8881b7dcd4707833eb7ab160ea83eac39. No shared cross-homework menu was added.
