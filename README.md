# clinical-trial-stats

Clinical trial sample size calculation and statistical analysis library.

临床试验样本量计算与统计分析工具库。

## Features | 功能

- **Sample Size Calculation | 样本量计算** — Non-inferiority, superiority, equivalence (TOST), one-sample, paired (McNemar), multi-group (Bonferroni) | 非劣效、优效、等效 (TOST)、单组、配对 (McNemar)、多组 (Bonferroni)
- **Result Validation | 结果验证** — Hypothesis testing with Farrington-Manning RMLE, Miettinen-Nurminen, Wilson Score CI | 假设检验，支持 FM、MN、Wilson Score 等方法
- **Confidence Interval Estimation | 置信区间估算** — Proportion CI (Wilson Score), Mean CI (Normal approximation) | 率的 CI (Wilson Score)、均值的 CI (正态近似)
- **Effect Size | 效应量** — Cohen's d (continuous), Cohen's h (proportion, arcsine transformation) | 连续终点 Cohen's d、率终点 Cohen's h
- **Sensitivity Analysis | 敏感性分析** — Parameter sweep across trial design parameters | 参数扫描，观察样本量随参数变化的趋势
- **Both Endpoints | 双终点支持** — Each method supports both proportion and continuous endpoints | 每种方法均支持率终点和连续终点
- **Zero Dependencies | 零依赖** — Pure JavaScript, runs in Node.js, browser, or any JS environment | 纯 JavaScript，可运行于 Node.js、浏览器或任何 JS 环境

## Status | 开发进度

| Module | Proportion | Continuous | Tests | Verified Against | 模块 |
|--------|:----------:|:----------:|:-----:|------------------|------|
| **Sample Size Calculation** | | | | | **样本量计算** |
| Non-inferiority (two-group) | ✅ | ✅ | ✅ | — | 非劣效（两组） |
| Superiority (two-group) | ✅ | ✅ | ✅ | — | 优效（两组） |
| Equivalence / TOST (two-group) | ✅ | ✅ | ✅ | — | 等效（两组） |
| One-sample | ✅ | ✅ | 🔲 | — | 单组试验 |
| Paired design (McNemar) | ✅ | ✅ | 🔲 | — | 配对设计 |
| Multi-group (Bonferroni) | ✅ | ✅ | 🔲 | — | 多组比较 |
| **Result Validation** | | | | | **结果验证** |
| Two-group (Wald / FM / MN) | ✅ | ✅ | 🔲 | — | 两组（Wald / FM / MN） |
| One-sample | ✅ | ✅ | 🔲 | — | 单组 |
| Paired (McNemar) | ✅ | ✅ | 🔲 | — | 配对 |
| Multi-group | ✅ | ✅ | 🔲 | — | 多组 |
| **Other Modules** | | | | | **其他模块** |
| Proportion CI (Wilson Score) | ✅ | — | 🔲 | — | 率的置信区间 |
| Mean CI (Normal approx.) | — | ✅ | 🔲 | — | 均值置信区间 |
| Effect size (Cohen's d / h) | ✅ | ✅ | ✅ | — | 效应量 |
| Sensitivity analysis | ✅ | ✅ | 🔲 | — | 敏感性分析 |
| Internal: normal distribution, floating-point precision | — | — | ✅ | — | 内部依赖：正态分布函数、浮点精度处理 |

✅ Done | 已完成 &emsp; 🔲 Planned | 待补充 &emsp; **Verified Against**: third-party software used for cross-validation (e.g. R, SAS, PASS) — to be updated after each formal test | **对照验证**：用于交叉验证的第三方软件（如 R、SAS、PASS），每完成一项正式测试后更新

## Install | 安装

```bash
npm install clinical-trial-stats
```

## Quick Start | 快速开始

```javascript
import {
  calculateNISampleSize,
  calculateSupSampleSize,
  calculateEqSampleSize
} from 'clinical-trial-stats'

// Non-inferiority trial (proportion endpoint)
// 非劣效试验（率终点）
// Control: 85%, Treatment: 85%, Margin: 10%, Alpha: 2.5% (one-sided), Power: 80%
const ni = calculateNISampleSize(0.85, 0.85, 0.1, 0.025, 0.8, 1)
// => { n1: 284, n2: 284 }

// Superiority trial (proportion endpoint)
// 优效试验（率终点）
// Control: 70%, Treatment: 85%, Alpha: 2.5%, Power: 80%
const sup = calculateSupSampleSize(0.70, 0.85, 0.025, 0.8, 1)
// => { n1: 71, n2: 71 }

// Equivalence trial (TOST, proportion endpoint)
// 等效试验（TOST，率终点）
// Both groups: 30%, Margin: 5%, Alpha: 2.5%, Power: 80%
const eq = calculateEqSampleSize(0.3, 0.3, 0.05, 0.025, 0.8, 1)
// => { n1: 832, n2: 832 }
```

## API

### Sample Size Calculation | 样本量计算

| Function | Description | 说明 |
|----------|-------------|------|
| `calculateNISampleSize(p1, p2, delta, alpha, power, ratio)` | Non-inferiority, proportion | 非劣效，率终点 |
| `calculateNISampleSizeContinuous(sigma, delta, alpha, power, ratio, meanDiff)` | Non-inferiority, continuous | 非劣效，连续终点 |
| `calculateSupSampleSize(p1, p2, alpha, power, ratio)` | Superiority, proportion | 优效，率终点 |
| `calculateSupSampleSizeContinuous(sigma, meanDiff, alpha, power, ratio)` | Superiority, continuous | 优效，连续终点 |
| `calculateEqSampleSize(p1, p2, delta, alpha, power, ratio)` | Equivalence (TOST), proportion | 等效 (TOST)，率终点 |
| `calculateEqSampleSizeContinuous(sigma, delta, alpha, power, ratio, meanDiff)` | Equivalence (TOST), continuous | 等效 (TOST)，连续终点 |
| `calculateOneSampleSize(p0, p1, alpha, power)` | One-sample, proportion | 单组，率终点 |
| `calculateOneSampleSizeContinuous(mu0, mu1, sigma, alpha, power)` | One-sample, continuous | 单组，连续终点 |
| `calculatePairedSampleSize(p10, p01, delta, alpha, power, studyType)` | Paired (McNemar), proportion | 配对 (McNemar)，率终点 |
| `calculatePairedSampleSizeContinuous(sigma_diff, mean_diff, delta, alpha, power, studyType)` | Paired t-test, continuous | 配对 t 检验，连续终点 |
| `calculateMultigroupSampleSize(p0, p_groups, delta, alpha, power, studyType, allocations, strategy)` | Multi-group, proportion | 多组，率终点 |
| `calculateMultigroupSampleSizeContinuous(mean0, mean_groups, sd, delta, alpha, power, studyType, allocations, strategy)` | Multi-group, continuous | 多组，连续终点 |

### Result Validation (Hypothesis Testing) | 结果验证（假设检验）

| Function | Description | 说明 |
|----------|-------------|------|
| `calculateNIResult(n1, x1, n2, x2, delta, alpha)` | Non-inferiority test | 非劣效检验 |
| `calculateSupResult(n1, x1, n2, x2, alpha)` | Superiority test | 优效检验 |
| `calculateEqResult(n1, x1, n2, x2, delta, alpha)` | Equivalence test | 等效检验 |
| `calculateOneSampleResult(n, s, p0, alpha, useContinuity)` | One-sample test | 单组检验 |
| `calculatePairedResult(n10, n01, delta, alpha, useContinuity, studyType)` | Paired test (McNemar) | 配对检验 (McNemar) |
| `calculateMultigroupResult(n0, x0, n_groups, x_groups, delta, alpha, studyType, allocations, strategy)` | Multi-group test | 多组检验 |

Continuous variants available for all result validation functions (append `Continuous` to function name).

所有结果验证函数均有连续终点版本（函数名末尾加 `Continuous`）。

### Confidence Interval Estimation | 置信区间估算

| Function | Description | 说明 |
|----------|-------------|------|
| `calculateRateCISampleSize(p, width, alpha)` | Sample size for proportion CI | 率的 CI 所需样本量 |
| `calculateRateCI(n, x, alpha)` | Proportion CI (Wilson Score) | 率的置信区间 |
| `calculateMeanCISampleSize(sigma, width, alpha)` | Sample size for mean CI | 均值 CI 所需样本量 |
| `calculateMeanCI(n, mean, sd, alpha)` | Mean CI (Normal approximation) | 均值置信区间 |

### Effect Size | 效应量

| Function | Description | 说明 |
|----------|-------------|------|
| `calculateCohenD(meanDiff, sigma)` | Cohen's d for continuous endpoints | 连续终点效应量 |
| `calculateCohenH(p1, p2)` | Cohen's h for proportion endpoints | 率终点效应量 |
| `interpretCohenD(d)` | Interpret effect size level | 效应量等级解读 |
| `getEffectSizeInfo(meanDiff, sigma)` | Full effect size report | 完整效应量报告 |

### Sensitivity Analysis | 敏感性分析

| Function | Description | 说明 |
|----------|-------------|------|
| `runSensitivityAnalysis(mode, baseParams, config)` | Parameter sweep analysis | 参数扫描分析 |

### Core Utilities | 核心工具

| Function | Description | 说明 |
|----------|-------------|------|
| `normalCDF(x)` | Standard normal CDF | 标准正态分布累积分布函数 |
| `normalInverse(p)` | Inverse normal (quantile function) | 正态分布逆函数（分位数函数） |

## Parameters | 参数说明

All proportion parameters use **decimal scale** (0-1), not percentages:

所有率参数使用**小数制** (0-1)，而非百分比：

- `p1 = 0.85` means 85% | 表示 85%
- `alpha = 0.025` means 2.5% (one-sided) | 表示单侧 2.5%
- `power = 0.8` means 80% | 表示 80%
- `delta = 0.1` means 10% margin | 表示 10% 界值
- `ratio` = allocation ratio n2/n1 (default: 1 for equal allocation) | 分配比例 n2/n1（默认 1:1 等比分配）

## Formulas | 公式

### Non-Inferiority (Two-Group) | 非劣效（两组比较）

**Proportion endpoint | 率终点：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{[(p_2 - p_1) + \delta]^2}$$

**Continuous endpoint | 连续终点：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma^2 \cdot (1 + 1/k)}{[(\mu_2 - \mu_1) + |\delta|]^2}$$

> Chow et al. (2017) Chapter 4; Julious & Campbell (2012) *Stat Med* 31:2904-2936

### Superiority (Two-Group) | 优效（两组比较）

**Proportion endpoint | 率终点：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{(p_2 - p_1)^2}$$

**Continuous endpoint | 连续终点：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma^2 \cdot (1 + 1/k)}{(\mu_2 - \mu_1)^2}$$

> Chow et al. (2017) Chapter 4

### Equivalence — TOST (Two-Group) | 等效 — TOST（两组比较）

Uses dynamic Z-value selection based on whether the expected difference is zero.

根据预期差异是否为零，动态选择 Z 值。

**When p₁ = p₂ (symmetric TOST) | 当 p₁ = p₂（对称 TOST）：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta/2})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{\delta^2}$$

**When p₁ ≠ p₂ (asymmetric TOST) | 当 p₁ ≠ p₂（非对称 TOST）：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{[\delta - |p_2 - p_1|]^2}$$

> Julious (2009) Chapter 6; Flight & Julious (2016) *Pharm Stat* 15(1):80-89; Phillips (1990) *J Pharmacokinet Biopharm* 18(2):137-144

### One-Sample | 单组试验

**Proportion endpoint | 率终点：**

$$n = \frac{[Z_{1-\alpha}\sqrt{p_0(1-p_0)} + Z_{1-\beta}\sqrt{p_1(1-p_1)}]^2}{(p_1 - p_0)^2}$$

**Continuous endpoint | 连续终点：**

$$n = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma^2}{(\mu_1 - \mu_0)^2}$$

### Paired Design | 配对设计

**Proportion endpoint (McNemar test) | 率终点（McNemar 检验）：**

$$n = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot (p_{10} + p_{01})}{(p_{10} - p_{01} - \delta)^2}$$

Where p₁₀ and p₀₁ are discordant pair proportions.

其中 p₁₀ 和 p₀₁ 为不一致配对的比例。

**Continuous endpoint (paired t-test) | 连续终点（配对 t 检验）：**

$$n = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma_{diff}^2}{\text{effect size}^2}$$

### Multi-Group (Bonferroni) | 多组比较（Bonferroni 校正）

Applies Bonferroni correction for multiple comparisons.

对多重比较进行 Bonferroni 校正：

$$\alpha_{adjusted} = \alpha / k \quad \text{(strategy = 'any')}$$

$$n_i = \frac{(Z_{1-\alpha_{adj}} + Z_{1-\beta})^2 \cdot [p_0(1-p_0)/r_0 + p_i(1-p_i)/r_i]}{\text{effect size}^2}$$

Supports unequal allocation via weights array `[r₀, r₁, r₂, ...]`.

支持通过权重数组 `[r₀, r₁, r₂, ...]` 进行不等比例分配。

### Confidence Interval | 置信区间

**Proportion (Wilson Score) | 率（Wilson Score 法）：**

$$n \approx \frac{Z^2 \cdot p(1-p)}{w^2}$$

**Mean | 均值：**

$$n = \left(\frac{Z \cdot \sigma}{w}\right)^2$$

### Effect Size | 效应量

**Cohen's d** (continuous | 连续终点): $\quad d = \dfrac{\mu_1 - \mu_2}{\sigma}$

**Cohen's h** (proportion | 率终点): $\quad h = 2[\arcsin(\sqrt{p_1}) - \arcsin(\sqrt{p_2})]$

Interpretation | 解读: negligible | 极小 (<0.2), small | 小 (0.2–0.5), medium | 中 (0.5–0.8), large | 大 (≥0.8)

### Result Validation | 结果验证

Hypothesis testing supports three methods for two-group proportion comparisons.

两组率终点的假设检验支持三种方法：

| Method | Description | 说明 | Reference |
|--------|-------------|------|-----------|
| **Wald** | Normal approximation with observed rates | 基于观测率的正态近似 | Classic |
| **Farrington-Manning** | RMLE under H₀, Newton-Raphson iteration | H₀ 约束下的 RMLE，Newton-Raphson 迭代 | Farrington & Manning (1990) |
| **Miettinen-Nurminen** | Score method, matches SAS PROC FREQ | Score 法，与 SAS PROC FREQ 结果一致 | Miettinen & Nurminen (1985) *Stat Med* |

## References | 参考文献

1. Chow SC, Shao J, Wang H, Lokhnygina Y. *Sample Size Calculations in Clinical Research*. 3rd ed. Chapman and Hall/CRC; 2017.
2. Julious SA. *Sample Sizes for Clinical Trials*. Chapman and Hall/CRC; 2009.
3. Flight L, Julious SA. Practical guide to sample size calculations: non-inferiority and equivalence trials. *Pharm Stat*. 2016;15(1):80-89.
4. Julious SA, Campbell MJ. Tutorial in biostatistics: sample sizes for parallel group clinical trials with binary data. *Stat Med*. 2012;31:2904-2936.
5. Phillips KF. Power of the Two One-Sided Tests Procedure in Bioequivalence. *J Pharmacokinet Biopharm*. 1990;18(2):137-144.
6. Miettinen O, Nurminen M. Comparative analysis of two rates. *Stat Med*. 1985;4(2):213-226.
7. Farrington CP, Manning G. Test statistics and sample size formulae for comparative binomial trials with null hypothesis of non-zero risk difference or non-unity relative risk. *Stat Med*. 1990;9(12):1447-1454.
8. Newcombe RG. Interval estimation for the difference between independent proportions. *Stat Med*. 1998;17(8):873-890.
9. NMPA. 药物临床试验样本量估计指导原则 (2023).

## Test | 测试

```bash
npm test
```

Tests are validated against published literature results and established statistical software (R, SAS).

测试用例基于已发表文献结果和成熟统计软件（R、SAS）进行交叉验证。

## About | 关于

This library is created by **李恒骏** ([lihj.net](https://lihj.net)) and [Claude Code](https://claude.ai/claude-code) (Anthropic).

Built through human-AI collaboration. The author provides clinical trial domain expertise, makes all design decisions, and validates calculations against peer-reviewed literature. Claude Code implements the algorithms and writes the test suite.

本项目通过人机协作完成。作者提供临床试验领域专业知识，主导所有设计决策，并基于同行评审文献验证计算结果的正确性。Claude Code 负责算法实现与测试编写。

## License | 许可证

[MIT](LICENSE)
