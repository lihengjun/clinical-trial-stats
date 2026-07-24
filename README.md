# clinical-trial-stats

中文 | [English](README.en.md)

临床试验样本量计算与统计分析工具库。

## 功能

- **样本量计算** — 非劣效、优效、等效 (TOST)、单组、配对 (McNemar)、多组 (Bonferroni)
- **结果验证** — 假设检验，支持 Farrington-Manning RMLE、Miettinen-Nurminen、Wilson Score CI
- **置信区间估算** — 率的 CI (Wilson Score)、均值的 CI (正态近似)
- **效应量** — 连续终点 Cohen's d、率终点 Cohen's h（反正弦变换）
- **敏感性分析** — 参数扫描，观察样本量随参数变化的趋势
- **双终点支持** — 每种方法均支持率终点和连续终点
- **效能反推** — 给定样本量反推检验效能 (Power)
- **最小可检测效应量 (MDE)** — 给定样本量反推最小可检测差异
- **诊断试验** — 敏感性/特异性精度估计与比较，支持患病率校正
- **相关性分析** — Pearson 相关系数检验样本量 (Fisher Z 变换)
- **零依赖** — 纯 JavaScript，可运行于 Node.js、浏览器或任何 JS 环境

## 开发进度

| 模块 | 率终点 | 连续终点 | 测试 | 对照验证 |
|------|:------:|:--------:|:----:|----------|
| **样本量计算** | | | | |
| 非劣效（两组） | ✅ | ✅ | ✅ | Chow & Liu / Julious 文献值 |
| 优效（两组） | ✅ | ✅ | ✅ | Chow & Liu / Julious 文献值 |
| 等效 / TOST（两组） | ✅ | ✅ | ✅ | Chow & Liu / Julious 文献值 |
| 单组试验 | ✅ | ✅ | 🔲 | — |
| 配对设计 | ✅ | ✅ | 🔲 | — |
| 多组比较 | ✅ | ✅ | 🔲 | — |
| **结果验证** | | | | |
| 两组（Wald / FM / MN） | ✅ | ✅ | 🔲 | — |
| 单组 | ✅ | ✅ | 🔲 | — |
| 配对 | ✅ | ✅ | 🔲 | — |
| 多组 | ✅ | ✅ | 🔲 | — |
| **其他模块** | | | | |
| 率的置信区间 (Wilson Score) | ✅ | — | 🔲 | — |
| 均值置信区间 | — | ✅ | 🔲 | — |
| 效应量 (Cohen's d / h) | ✅ | ✅ | ✅ | — |
| 敏感性分析 | ✅ | ✅ | 🔲 | — |
| 内部依赖：正态分布函数、浮点精度处理 | — | — | ✅ | R pnorm/qnorm |
| **效能分析** | | | | |
| 效能反推 (两组/单组/配对) | ✅ | ✅ | ✅ | — |
| 最小可检测效应量 MDE | ✅ | ✅ | 🔲 | — |
| **专项设计** | | | | |
| 诊断试验 (敏感性/特异性) | ✅ | — | ✅ | Flahault 2005 文献值 |
| 相关性分析 (Fisher Z) | — | — | ✅ | Cohen 1988 文献值 |

✅ 已完成 &emsp; 🔲 待补充 &emsp; **对照验证**：用于交叉验证的第三方软件（如 R、SAS、PASS），每完成一项正式测试后更新

## 安装

> 尚未发布到 npm registry，当前通过 GitHub 安装：

```bash
npm install github:lihengjun/clinical-trial-stats
```

## 快速开始

```javascript
import {
  calculateNISampleSize,
  calculateSupSampleSize,
  calculateEqSampleSize
} from 'clinical-trial-stats'

// 非劣效试验（率终点）
// 对照组: 85%, 试验组: 85%, 界值: 10%, Alpha: 2.5%（单侧）, 效能: 80%
const ni = calculateNISampleSize(0.85, 0.85, 0.1, 0.025, 0.8, 1)
// => { n1: 284, n2: 284 }

// 优效试验（率终点）
// 对照组: 70%, 试验组: 85%, Alpha: 2.5%, 效能: 80%
const sup = calculateSupSampleSize(0.70, 0.85, 0.025, 0.8, 1)
// => { n1: 71, n2: 71 }

// 等效试验（TOST，率终点）
// 两组均为: 30%, 等效界值: 5%, Alpha: 2.5%, 效能: 80%
const eq = calculateEqSampleSize(0.3, 0.3, 0.05, 0.025, 0.8, 1)
// => { n1: 832, n2: 832 }
```

```javascript
import { calculatePower, calculateDiagnosticSampleSize } from 'clinical-trial-stats'

// 效能反推：已有 200 例，能达到多少效能？
const pw = calculatePower({
  designType: 'two-group',
  studyType: 'non-inferiority',
  endpointType: 'proportion',
  n1: 200, p1: 0.85, p2: 0.85,
  delta: 0.1, alpha: 0.025, ratio: 1
})
// => { power: 0.63, z_beta: 0.33 }

// 诊断试验：评估敏感性 85%，精度 ±5%
const dx = calculateDiagnosticSampleSize({
  expectedValue: 0.85, precision: 0.05,
  confidenceLevel: 0.95, measureType: 'sensitivity'
})
// => { n: 196, ... }
```

## API

### 样本量计算

| 函数 | 说明 |
|------|------|
| `calculateNISampleSize(p1, p2, delta, alpha, power, ratio)` | 非劣效，率终点 |
| `calculateNISampleSizeContinuous(sigma, delta, alpha, power, ratio, meanDiff)` | 非劣效，连续终点 |
| `calculateSupSampleSize(p1, p2, alpha, power, ratio)` | 优效，率终点 |
| `calculateSupSampleSizeContinuous(sigma, meanDiff, alpha, power, ratio)` | 优效，连续终点 |
| `calculateEqSampleSize(p1, p2, delta, alpha, power, ratio)` | 等效 (TOST)，率终点 |
| `calculateEqSampleSizeContinuous(sigma, delta, alpha, power, ratio, meanDiff)` | 等效 (TOST)，连续终点 |
| `calculateOneSampleSize(p0, p1, alpha, power)` | 单组，率终点 |
| `calculateOneSampleSizeContinuous(mu0, mu1, sigma, alpha, power)` | 单组，连续终点 |
| `calculatePairedSampleSize(p10, p01, delta, alpha, power, studyType)` | 配对 (McNemar)，率终点 |
| `calculatePairedSampleSizeContinuous(sigma_diff, mean_diff, delta, alpha, power, studyType)` | 配对 t 检验，连续终点 |
| `calculateMultigroupSampleSize(p0, p_groups, delta, alpha, power, studyType, allocations, strategy)` | 多组，率终点 |
| `calculateMultigroupSampleSizeContinuous(mean0, mean_groups, sd, delta, alpha, power, studyType, allocations, strategy)` | 多组，连续终点 |

### 结果验证（假设检验）

| 函数 | 说明 |
|------|------|
| `calculateNIResult(n1, x1, n2, x2, delta, alpha)` | 非劣效检验 |
| `calculateSupResult(n1, x1, n2, x2, alpha)` | 优效检验 |
| `calculateEqResult(n1, x1, n2, x2, delta, alpha)` | 等效检验 |
| `calculateOneSampleResult(n, s, p0, alpha, useContinuity)` | 单组检验 |
| `calculatePairedResult(n10, n01, delta, alpha, useContinuity, studyType)` | 配对检验 (McNemar) |
| `calculateMultigroupResult(n0, x0, n_groups, x_groups, delta, alpha, studyType, allocations, strategy)` | 多组检验 |

所有结果验证函数均有连续终点版本（函数名末尾加 `Continuous`）。

### 置信区间估算

| 函数 | 说明 |
|------|------|
| `calculateRateCISampleSize(p, width, alpha)` | 率的 CI 所需样本量 |
| `calculateRateCI(n, x, alpha)` | 率的置信区间 (Wilson Score) |
| `calculateMeanCISampleSize(sigma, width, alpha)` | 均值 CI 所需样本量 |
| `calculateMeanCI(n, mean, sd, alpha)` | 均值置信区间 |

### 效应量

| 函数 | 说明 |
|------|------|
| `calculateCohenD(meanDiff, sigma)` | 连续终点效应量 (Cohen's d) |
| `calculateCohenH(p1, p2)` | 率终点效应量 (Cohen's h) |
| `interpretCohenD(d)` | 效应量等级解读 |
| `getEffectSizeInfo(meanDiff, sigma)` | 完整效应量报告 |

### 敏感性分析

| 函数 | 说明 |
|------|------|
| `runSensitivityAnalysis(mode, baseParams, config)` | 参数扫描分析 |

### 效能反推 (Power Analysis)

| 函数 | 说明 |
|------|------|
| `calculatePower({ designType, studyType, endpointType, n1, ... })` | 统一入口：反推检验效能 |
| `calculatePowerNI(n1, p1, p2, delta, alpha, ratio)` | 两组非劣效，率终点 |
| `calculatePowerSup(n1, p1, p2, alpha, ratio)` | 两组优效，率终点 |
| `calculatePowerEq(n1, p1, p2, delta, alpha, ratio)` | 两组等效，率终点 |
| `calculatePowerOneSample(n, p0, p1, alpha)` | 单组，率终点 |
| `calculatePowerPaired(n, p10, p01, delta, alpha, studyType)` | 配对，率终点 |

所有函数均有连续终点版本（函数名末尾加 `Continuous`）。

返回：`{ power: number, z_beta: number }`

### 最小可检测效应量 (MDE)

| 函数 | 说明 |
|------|------|
| `calculateMDE({ designType, studyType, endpointType, n1, ... })` | 统一入口：反推最小可检测差异 |
| `calculateMDE_NI(n1, p1, delta, alpha, power, ratio)` | 两组非劣效，率终点 |
| `calculateMDE_Sup(n1, p1, alpha, power, ratio)` | 两组优效，率终点 |
| `calculateMDE_Eq(n1, p1, p2, alpha, power, ratio)` | 两组等效，率终点 |
| `calculateMDE_OneSample(n, p0, alpha, power)` | 单组，率终点 |
| `calculateMDE_Paired(n, p10, delta, alpha, power, studyType)` | 配对，率终点 |

所有函数均有连续终点版本（函数名末尾加 `Continuous`）。

返回：`{ mde: number, converged: boolean, ... }`

### 诊断试验 (Diagnostic Test)

| 函数 | 说明 |
|------|------|
| `calculateDiagnosticSampleSize({ expectedValue, precision, confidenceLevel, measureType, prevalence })` | 敏感性/特异性精度估计 |
| `calculateDiagnosticComparison({ p1, p2, alpha, power, alternative })` | 两组诊断性能比较 |

### 相关性分析 (Correlation)

| 函数 | 说明 |
|------|------|
| `calculateCorrelationSampleSize({ expectedR, alpha, power, alternative })` | 检验 ρ=0 |
| `calculateCorrelationComparisonSampleSize({ r0, r1, alpha, power, alternative })` | 检验 ρ=ρ₀ |
| `calculateCorrelationPower({ n, expectedR, alpha, alternative })` | 相关性效能反推 |

### 核心工具

| 函数 | 说明 |
|------|------|
| `normalCDF(x)` | 标准正态分布累积分布函数 |
| `normalInverse(p)` | 正态分布逆函数（分位数函数） |

## 参数说明

所有率参数使用**小数制** (0-1)，而非百分比：

- `p1 = 0.85` 表示 85%
- `alpha = 0.025` 表示单侧 2.5%
- `power = 0.8` 表示 80%
- `delta = 0.1` 表示 10% 界值
- `ratio` = 分配比例 n2/n1（默认 1:1 等比分配）

## 公式

### 非劣效（两组比较）

**率终点：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{[(p_2 - p_1) + \delta]^2}$$

**连续终点：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma^2 \cdot (1 + 1/k)}{[(\mu_2 - \mu_1) + |\delta|]^2}$$

> Chow et al. (2017) Chapter 4; Julious & Campbell (2012) *Stat Med* 31:2904-2936

### 优效（两组比较）

**率终点：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{(p_2 - p_1)^2}$$

**连续终点：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma^2 \cdot (1 + 1/k)}{(\mu_2 - \mu_1)^2}$$

> Chow et al. (2017) Chapter 4

### 等效 — TOST（两组比较）

根据预期差异是否为零，动态选择 Z 值：

**当 p₁ = p₂（对称 TOST）：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta/2})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{\delta^2}$$

**当 p₁ ≠ p₂（非对称 TOST）：**

$$n_1 = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot [p_1(1-p_1) + p_2(1-p_2)/k]}{[\delta - |p_2 - p_1|]^2}$$

> Julious (2009) Chapter 6; Flight & Julious (2016) *Pharm Stat* 15(1):80-89; Phillips (1990) *J Pharmacokinet Biopharm* 18(2):137-144

### 单组试验

**率终点：**

$$n = \frac{[Z_{1-\alpha}\sqrt{p_0(1-p_0)} + Z_{1-\beta}\sqrt{p_1(1-p_1)}]^2}{(p_1 - p_0)^2}$$

**连续终点：**

$$n = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma^2}{(\mu_1 - \mu_0)^2}$$

### 配对设计

**率终点（McNemar 检验）：**

$$n = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot (p_{10} + p_{01})}{(p_{10} - p_{01} - \delta)^2}$$

其中 p₁₀ 和 p₀₁ 为不一致配对的比例。

**连续终点（配对 t 检验）：**

$$n = \frac{(Z_{1-\alpha} + Z_{1-\beta})^2 \cdot \sigma_{diff}^2}{\text{effect size}^2}$$

### 多组比较（Bonferroni 校正）

对多重比较进行 Bonferroni 校正：

$$\alpha_{adjusted} = \alpha / k \quad \text{(strategy = 'any')}$$

$$n_i = \frac{(Z_{1-\alpha_{adj}} + Z_{1-\beta})^2 \cdot [p_0(1-p_0)/r_0 + p_i(1-p_i)/r_i]}{\text{effect size}^2}$$

支持通过权重数组 `[r₀, r₁, r₂, ...]` 进行不等比例分配。

### 效能反推

效能为样本量公式的代数反解：

$$\text{Power} = \Phi\left(\frac{\text{Effect Size} \times \sqrt{n}}{\text{SE}} - Z_{1-\alpha}\right)$$

> Chow et al. (2017); Cohen (1988) Chapter 2

### 诊断试验 (Wald 近似)

$$n = \frac{Z^2 \cdot p(1-p)}{d^2}$$

当提供患病率 (prevalence) 时，总样本量 $n_{total} = n / \text{prevalence}$。

> Flahault et al. (2005); Buderer (1996)

### 相关性分析 (Fisher Z 变换)

$$n = \left(\frac{Z_{1-\alpha/2} + Z_{1-\beta}}{\frac{1}{2}\ln\frac{1+r}{1-r}}\right)^2 + 3$$

> Fisher (1921); Cohen (1988) Chapter 3

### 置信区间

**率（Wilson Score 法）：**

$$n \approx \frac{Z^2 \cdot p(1-p)}{w^2}$$

**均值：**

$$n = \left(\frac{Z \cdot \sigma}{w}\right)^2$$

### 效应量

**Cohen's d**（连续终点）: $\quad d = \dfrac{\mu_1 - \mu_2}{\sigma}$

**Cohen's h**（率终点）: $\quad h = 2[\arcsin(\sqrt{p_1}) - \arcsin(\sqrt{p_2})]$

解读：极小 (<0.2)、小 (0.2–0.5)、中 (0.5–0.8)、大 (≥0.8)

### 结果验证

两组率终点的假设检验支持三种方法：

| 方法 | 说明 | 参考文献 |
|------|------|----------|
| **Wald** | 基于观测率的正态近似 | 经典方法 |
| **Farrington-Manning** | H₀ 约束下的 RMLE，Newton-Raphson 迭代 | Farrington & Manning (1990) |
| **Miettinen-Nurminen** | Score 法，与 SAS PROC FREQ 结果一致 | Miettinen & Nurminen (1985) *Stat Med* |

## 参考文献

1. Chow SC, Shao J, Wang H, Lokhnygina Y. *Sample Size Calculations in Clinical Research*. 3rd ed. Chapman and Hall/CRC; 2017.
2. Julious SA. *Sample Sizes for Clinical Trials*. Chapman and Hall/CRC; 2009.
3. Flight L, Julious SA. Practical guide to sample size calculations: non-inferiority and equivalence trials. *Pharm Stat*. 2016;15(1):80-89.
4. Julious SA, Campbell MJ. Tutorial in biostatistics: sample sizes for parallel group clinical trials with binary data. *Stat Med*. 2012;31:2904-2936.
5. Phillips KF. Power of the Two One-Sided Tests Procedure in Bioequivalence. *J Pharmacokinet Biopharm*. 1990;18(2):137-144.
6. Miettinen O, Nurminen M. Comparative analysis of two rates. *Stat Med*. 1985;4(2):213-226.
7. Farrington CP, Manning G. Test statistics and sample size formulae for comparative binomial trials with null hypothesis of non-zero risk difference or non-unity relative risk. *Stat Med*. 1990;9(12):1447-1454.
8. Newcombe RG. Interval estimation for the difference between independent proportions. *Stat Med*. 1998;17(8):873-890.
9. NMPA. 药物临床试验样本量估计指导原则 (2023).
10. Cohen J. *Statistical Power Analysis for the Behavioral Sciences*. 2nd ed. Lawrence Erlbaum; 1988.
11. Flahault A, Cadilhac M, Thomas G. Sample size calculation should be performed for design accuracy in diagnostic test studies. *J Clin Epidemiol*. 2005;58(8):859-862.
12. Buderer NMF. Statistical methodology: I. Incorporating the prevalence of disease into the sample size calculation for sensitivity and specificity. *Acad Emerg Med*. 1996;3(9):895-900.
13. Fisher RA. On the "probable error" of a coefficient of correlation deduced from a small sample. *Metron*. 1921;1:3-32.
14. Lenth RV. Some practical guidelines for effective sample size determination. *Am Stat*. 2001;55(3):187-193.

## 算法审计

本项目的全部计算算法已通过独立审计，对标以下 7 个开源统计库：

| 对标库 | 核心价值 |
|--------|---------|
| [gsDesign](https://github.com/keaven/gsDesign) (R) | 默沙东维护，FM 受约束 MLE 方差，竞争风险脱落模型 |
| [statsmodels](https://github.com/statsmodels/statsmodels) (Python) | 工业级 Brent 求解器，三级回退机制 |
| [G\*Power 3.1](https://www.psychologie.hhu.de/arbeitsgruppen/allgemeine-psychologie-und-arbeitspsychologie/gpower) | 全球监管公认精度金标准，非中心分布精确计算 |
| [pwr](https://github.com/cran/pwr) (R) | Cohen 效能理论标准实现，非中心 t 分布 |
| [TrialSize](https://github.com/cran/TrialSize) (R) | 临床样本量百科全书，含 TOST / McNemar |
| [SampleSize4ClinicalTrials](https://github.com/QiHongchao/SampleSize4ClinicalTrials) (R) | III 期临床 Delta 边际处理 |
| [precisely](https://github.com/malcolmbarrett/precisely) (R) | CI 宽度驱动的精度计算 |

审计维度覆盖：边界防御、数值稳定性、求解器精度、方差模型、效应量处理、监管合规性。

完整审计报告：[docs/audit/](docs/audit/)

## 测试

```bash
npm test
```

测试用例基于已发表文献结果和成熟统计软件（R、SAS）进行交叉验证。

## 关于

本项目由 **李恒骏** ([lihj.net](https://lihj.net)) 与 [Claude Code](https://claude.ai/claude-code) (Anthropic) 共同完成。

本项目通过人机协作完成。作者提供临床试验领域专业知识，主导所有设计决策，并基于同行评审文献验证计算结果的正确性。Claude Code 负责算法实现与测试编写。

## 许可证

[MIT](LICENSE)
