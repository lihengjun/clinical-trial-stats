# clinical-trial-stats

Clinical trial sample size calculation and statistical analysis library.

临床试验样本量计算与统计分析工具库。

## Features

- **Sample Size Calculation** — Non-inferiority, superiority, equivalence (TOST), one-sample, paired (McNemar), multi-group (Bonferroni)
- **Result Validation** — Hypothesis testing with Farrington-Manning RMLE, Miettinen-Nurminen, Wilson Score CI
- **Confidence Interval Estimation** — Proportion CI (Wilson Score), Mean CI (Normal approximation)
- **Effect Size** — Cohen's d (continuous), Cohen's h (proportion, arcsine transformation)
- **Sensitivity Analysis** — Parameter sweep across trial design parameters
- **Both Endpoints** — Each method supports both proportion and continuous endpoints
- **Zero Dependencies** — Pure JavaScript, runs in Node.js, browser, or any JS environment

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

## References

- Chow SC, Shao J, Wang H, Lokhnygina Y. *Sample Size Calculations in Clinical Research*. 3rd ed. Chapman and Hall/CRC; 2017.
- Julious SA. *Sample Sizes for Clinical Trials*. Chapman and Hall/CRC; 2009.
- Flight L, Julious SA. Practical guide to sample size calculations. *Pharm Stat*. 2016;15(1):80-89.
- NMPA. 药物临床试验样本量估计指导原则 (2023).

## Test

```bash
npm test
```

Tests are validated against published literature results and established statistical software (R, SAS).

## License

[MIT](LICENSE)
