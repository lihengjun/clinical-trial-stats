# clinical-trial-stats

[中文](README.md) | English

Clinical trial sample size calculation and statistical analysis library.

## Features

- **Sample Size Calculation** — Non-inferiority, superiority, equivalence (TOST), one-sample, paired (McNemar), multi-group (Bonferroni)
- **Result Validation** — Hypothesis testing with Farrington-Manning RMLE, Miettinen-Nurminen, Wilson Score CI
- **Confidence Interval Estimation** — Proportion CI (Wilson Score), Mean CI (Normal approximation)
- **Effect Size** — Cohen's d (continuous), Cohen's h (proportion, arcsine transformation)
- **Sensitivity Analysis** — Parameter sweep across trial design parameters
- **Both Endpoints** — Each method supports both proportion and continuous endpoints
- **Zero Dependencies** — Pure JavaScript, runs in Node.js, browser, or any JS environment

## Status

| Module | Proportion | Continuous | Tests | Verified Against |
|--------|:----------:|:----------:|:-----:|------------------|
| **Sample Size Calculation** | | | | |
| Non-inferiority (two-group) | ✅ | ✅ | ✅ | — |
| Superiority (two-group) | ✅ | ✅ | ✅ | — |
| Equivalence / TOST (two-group) | ✅ | ✅ | ✅ | — |
| One-sample | ✅ | ✅ | 🔲 | — |
| Paired design (McNemar) | ✅ | ✅ | 🔲 | — |
| Multi-group (Bonferroni) | ✅ | ✅ | 🔲 | — |
| **Result Validation** | | | | |
| Two-group (Wald / FM / MN) | ✅ | ✅ | 🔲 | — |
| One-sample | ✅ | ✅ | 🔲 | — |
| Paired (McNemar) | ✅ | ✅ | 🔲 | — |
| Multi-group | ✅ | ✅ | 🔲 | — |
| **Other Modules** | | | | |
| Proportion CI (Wilson Score) | ✅ | — | 🔲 | — |
| Mean CI (Normal approx.) | — | ✅ | 🔲 | — |
| Effect size (Cohen's d / h) | ✅ | ✅ | ✅ | — |
| Sensitivity analysis | ✅ | ✅ | 🔲 | — |
| Internal: normal distribution, floating-point precision | — | — | ✅ | — |

✅ Done &emsp; 🔲 Planned &emsp; **Verified Against**: third-party software used for cross-validation (e.g. R, SAS, PASS) — updated after each formal test

## Install

```bash
npm install clinical-trial-stats
```

## Quick Start

```javascript
import {
  calculateNISampleSize,
  calculateSupSampleSize,
  calculateEqSampleSize
} from 'clinical-trial-stats'

// Non-inferiority trial (proportion endpoint)
// Control: 85%, Treatment: 85%, Margin: 10%, Alpha: 2.5% (one-sided), Power: 80%
const ni = calculateNISampleSize(0.85, 0.85, 0.1, 0.025, 0.8, 1)
// => { n1: 284, n2: 284 }

// Superiority trial (proportion endpoint)
// Control: 70%, Treatment: 85%, Alpha: 2.5%, Power: 80%
const sup = calculateSupSampleSize(0.70, 0.85, 0.025, 0.8, 1)
// => { n1: 71, n2: 71 }

// Equivalence trial (TOST, proportion endpoint)
// Both groups: 30%, Margin: 5%, Alpha: 2.5%, Power: 80%
const eq = calculateEqSampleSize(0.3, 0.3, 0.05, 0.025, 0.8, 1)
// => { n1: 832, n2: 832 }
```

## API

### Sample Size Calculation

| Function | Description |
|----------|-------------|
| `calculateNISampleSize(p1, p2, delta, alpha, power, ratio)` | Non-inferiority, proportion |
| `calculateNISampleSizeContinuous(sigma, delta, alpha, power, ratio, meanDiff)` | Non-inferiority, continuous |
| `calculateSupSampleSize(p1, p2, alpha, power, ratio)` | Superiority, proportion |
| `calculateSupSampleSizeContinuous(sigma, meanDiff, alpha, power, ratio)` | Superiority, continuous |
| `calculateEqSampleSize(p1, p2, delta, alpha, power, ratio)` | Equivalence (TOST), proportion |
| `calculateEqSampleSizeContinuous(sigma, delta, alpha, power, ratio, meanDiff)` | Equivalence (TOST), continuous |
| `calculateOneSampleSize(p0, p1, alpha, power)` | One-sample, proportion |
| `calculateOneSampleSizeContinuous(mu0, mu1, sigma, alpha, power)` | One-sample, continuous |
| `calculatePairedSampleSize(p10, p01, delta, alpha, power, studyType)` | Paired (McNemar), proportion |
| `calculatePairedSampleSizeContinuous(sigma_diff, mean_diff, delta, alpha, power, studyType)` | Paired t-test, continuous |
| `calculateMultigroupSampleSize(p0, p_groups, delta, alpha, power, studyType, allocations, strategy)` | Multi-group, proportion |
| `calculateMultigroupSampleSizeContinuous(mean0, mean_groups, sd, delta, alpha, power, studyType, allocations, strategy)` | Multi-group, continuous |

### Result Validation (Hypothesis Testing)

| Function | Description |
|----------|-------------|
| `calculateNIResult(n1, x1, n2, x2, delta, alpha)` | Non-inferiority test |
| `calculateSupResult(n1, x1, n2, x2, alpha)` | Superiority test |
| `calculateEqResult(n1, x1, n2, x2, delta, alpha)` | Equivalence test |
| `calculateOneSampleResult(n, s, p0, alpha, useContinuity)` | One-sample test |
| `calculatePairedResult(n10, n01, delta, alpha, useContinuity, studyType)` | Paired test (McNemar) |
| `calculateMultigroupResult(n0, x0, n_groups, x_groups, delta, alpha, studyType, allocations, strategy)` | Multi-group test |

Continuous variants available for all result validation functions (append `Continuous` to function name).

### Confidence Interval Estimation

| Function | Description |
|----------|-------------|
| `calculateRateCISampleSize(p, width, alpha)` | Sample size for proportion CI |
| `calculateRateCI(n, x, alpha)` | Proportion CI (Wilson Score) |
| `calculateMeanCISampleSize(sigma, width, alpha)` | Sample size for mean CI |
| `calculateMeanCI(n, mean, sd, alpha)` | Mean CI (Normal approximation) |

### Effect Size

| Function | Description |
|----------|-------------|
| `calculateCohenD(meanDiff, sigma)` | Cohen's d for continuous endpoints |
| `calculateCohenH(p1, p2)` | Cohen's h for proportion endpoints |
| `interpretCohenD(d)` | Interpret effect size level |
| `getEffectSizeInfo(meanDiff, sigma)` | Full effect size report |

### Sensitivity Analysis

| Function | Description |
|----------|-------------|
| `runSensitivityAnalysis(mode, baseParams, config)` | Parameter sweep analysis |

### Core Utilities

| Function | Description |
|----------|-------------|
| `normalCDF(x)` | Standard normal CDF |
| `normalInverse(p)` | Inverse normal (quantile function) |

## Parameters

All proportion parameters use **decimal scale** (0-1), not percentages:

- `p1 = 0.85` means 85%
- `alpha = 0.025` means 2.5% (one-sided)
- `power = 0.8` means 80%
- `delta = 0.1` means 10% margin
- `ratio` = allocation ratio n2/n1 (default: 1 for equal allocation)

## Formulas

### Non-Inferiority (Two-Group)

**Proportion endpoint:**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{[(p_2 - p_1) + \delta]^2}$$

**Continuous endpoint:**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma^2 \cdot (1 + 1/k)}{[(\mu_2 - \mu_1) + |\delta|]^2}$$

> Chow et al. (2017) Chapter 4; Julious & Campbell (2012) *Stat Med* 31:2904-2936

### Superiority (Two-Group)

**Proportion endpoint:**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{(p_2 - p_1)^2}$$

**Continuous endpoint:**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma^2 \cdot (1 + 1/k)}{(\mu_2 - \mu_1)^2}$$

> Chow et al. (2017) Chapter 4

### Equivalence — TOST (Two-Group)

Uses dynamic Z-value selection based on whether the expected difference is zero:

**When p₁ = p₂ (symmetric TOST):**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta/2})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{\delta^2}$$

**When p₁ ≠ p₂ (asymmetric TOST):**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{[\delta - |p_2 - p_1|]^2}$$

> Julious (2009) Chapter 6; Flight & Julious (2016) *Pharm Stat* 15(1):80-89; Phillips (1990) *J Pharmacokinet Biopharm* 18(2):137-144

### One-Sample

**Proportion endpoint:**

$$n = \frac{[Z_{1-\alpha}\sqrt{p_0(1-p_0)} + Z_{1-\beta}\sqrt{p_1(1-p_1)}]^2}{(p_1 - p_0)^2}$$

**Continuous endpoint:**

$$n = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma^2}{(\mu_1 - \mu_0)^2}$$

### Paired Design

**Proportion endpoint (McNemar test):**

$$n = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot (p_{10} + p_{01})}{(p_{10} - p_{01} - \delta)^2}$$

Where p₁₀ and p₀₁ are discordant pair proportions.

**Continuous endpoint (paired t-test):**

$$n = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma_{diff}^2}{\text{effect size}^2}$$

### Multi-Group (Bonferroni)

Applies Bonferroni correction for multiple comparisons:

$$\alpha_{adjusted} = \alpha / k \quad \text{(strategy = 'any')}$$

$$n_i = \frac{(Z_{1-\alpha_{adj}} + Z_{1-\beta})^2 \cdot [p_0(1-p_0)/r_0 + p_i(1-p_i)/r_i]}{\text{effect size}^2}$$

Supports unequal allocation via weights array `[r₀, r₁, r₂, ...]`.

### Confidence Interval

**Proportion (Wilson Score):**

$$n \approx \frac{Z^2 \cdot p(1-p)}{w^2}$$

**Mean:**

$$n = \left(\frac{Z \cdot \sigma}{w}\right)^2$$

### Effect Size

**Cohen's d** (continuous): $\quad d = \dfrac{\mu_1 - \mu_2}{\sigma}$

**Cohen's h** (proportion): $\quad h = 2[\arcsin(\sqrt{p_1}) - \arcsin(\sqrt{p_2})]$

Interpretation: negligible (<0.2), small (0.2–0.5), medium (0.5–0.8), large (≥0.8)

### Result Validation

Hypothesis testing supports three methods for two-group proportion comparisons:

| Method | Description | Reference |
|--------|-------------|-----------|
| **Wald** | Normal approximation with observed rates | Classic |
| **Farrington-Manning** | RMLE under H₀, Newton-Raphson iteration | Farrington & Manning (1990) |
| **Miettinen-Nurminen** | Score method, matches SAS PROC FREQ | Miettinen & Nurminen (1985) *Stat Med* |

## References

1. Chow SC, Shao J, Wang H, Lokhnygina Y. *Sample Size Calculations in Clinical Research*. 3rd ed. Chapman and Hall/CRC; 2017.
2. Julious SA. *Sample Sizes for Clinical Trials*. Chapman and Hall/CRC; 2009.
3. Flight L, Julious SA. Practical guide to sample size calculations: non-inferiority and equivalence trials. *Pharm Stat*. 2016;15(1):80-89.
4. Julious SA, Campbell MJ. Tutorial in biostatistics: sample sizes for parallel group clinical trials with binary data. *Stat Med*. 2012;31:2904-2936.
5. Phillips KF. Power of the Two One-Sided Tests Procedure in Bioequivalence. *J Pharmacokinet Biopharm*. 1990;18(2):137-144.
6. Miettinen O, Nurminen M. Comparative analysis of two rates. *Stat Med*. 1985;4(2):213-226.
7. Farrington CP, Manning G. Test statistics and sample size formulae for comparative binomial trials with null hypothesis of non-zero risk difference or non-unity relative risk. *Stat Med*. 1990;9(12):1447-1454.
8. Newcombe RG. Interval estimation for the difference between independent proportions. *Stat Med*. 1998;17(8):873-890.
9. NMPA. 药物临床试验样本量估计指导原则 (2023).

## Test

```bash
npm test
```

Tests are validated against published literature results and established statistical software (R, SAS).

## About

This library is created by **李恒骏** ([lihj.net](https://lihj.net)) and [Claude Code](https://claude.ai/claude-code) (Anthropic).

Built through human-AI collaboration. The author provides clinical trial domain expertise, makes all design decisions, and validates calculations against peer-reviewed literature. Claude Code implements the algorithms and writes the test suite.

## License

[MIT](LICENSE)
