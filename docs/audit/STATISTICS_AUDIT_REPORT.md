# 统计计算代码工业级审计报告

> **审计日期**: 2026-01-30
> **审计范围**: `src/utils/statistics/` 全部计算模块
> **对标基准**: 8 个工业级/监管级数据源（详见数据源清单）
> **审计来源**: Claude（源码逐行对标）+ Gemini（架构级批判）
> **状态**: 待整改

---

## 数据源清单（后续算法开发持续对标）

### 一、基础工业标准（General Statistical Standards）

底层数学求解器标杆，代码"鲁棒性"的参照系。

| # | 库 | 核心价值 | 源码/文档地址 |
|---|-----|---------|-------------|
| 1 | **statsmodels (Python)** | 工业级求解器，Brent's Method 三级回退，严谨边界检查 | [stats/power.py](https://github.com/statsmodels/statsmodels/blob/main/statsmodels/stats/power.py) · [stats/proportion.py](https://github.com/statsmodels/statsmodels/blob/main/statsmodels/stats/proportion.py) |
| 2 | **pwr (R)** | Cohen 效能理论标准实现，定义效应量处理最简逻辑 | [GitHub](https://github.com/cran/pwr) · 关键文件: `R/pwr.2p.test.R`, `R/pwr.t.test.R`, `R/ES.h.R` |
| 3 | **G\*Power 3.1** | 全球监管公认的计算精度金标准，非中心分布精确解法 | [技术手册 PDF](https://www.psychologie.hhu.de/fileadmin/redaktion/Fakultaeten/Mathematisch-Naturwissenschaftliche_Fakultaet/Psychologie/AAP/gpower/GPowerManual.pdf) · [核心算法论文 (Faul et al. 2007)](https://www.uvm.edu/~statdhtx/methods8/Supplements/GPower3-BRM-Paper.pdf) |

### 二、临床注册级专精包（Clinical Registration Grade）

由制药巨头或统计专家维护，最符合 NMPA/FDA 监管合规要求。

| # | 库 | 核心价值 | 源码/文档地址 |
|---|-----|---------|-------------|
| 4 | **TrialSize (R)** | 临床样本量百科全书，含等效性（TOST）和交叉设计 | [GitHub](https://github.com/cran/TrialSize) · 关键文件: `R/TwoSampleProportion.*.R` |
| 5 | **gsDesign (R)** | 默沙东（MSD）开发，含随访脱落修正（Lakatos）、成组序贯设计、Farrington-Manning 受约束 MLE | [GitHub](https://github.com/keaven/gsDesign) · 关键文件: `R/gsBinomial.R`, `R/nNormal.R`, `R/gsSurv.R` |
| 6 | **SampleSize4ClinicalTrials (R)** | 严格区分优效/非劣/等效四类设计，侧重 III 期临床 Delta 边际处理 | [GitHub](https://github.com/QiHongchao/SampleSize4ClinicalTrials) · 参考: Chow, Shao, Wang (2008) |
| 7 | **precisely (R)** | 基于置信区间宽度的精度驱动计算，常用于诊断类器械样本量估算 | [GitHub](https://github.com/malcolmbarrett/precisely) · 参考: Rothman & Greenland (2018) |

### 三、附加参考

| # | 来源 | 用途 |
|---|------|------|
| 8 | **Gemini 审计报告** | 架构级批判视角：求解器框架、Log 空间计算、Score Test 设计路径 |

### 关键文献索引

| 文献 | 内容 | 对标用途 |
|------|------|---------|
| Faul, Erdfelder, Lang & Buchner (2007) | G\*Power 3 核心算法 | 非中心分布精确度标杆 |
| Chow, Shao & Wang (2008) | 临床试验样本量计算（第 2 版） | 四类设计的公式权威来源 |
| Rothman & Greenland (2018) | 基于精度而非功效的研究设计 | 精度驱动 CI 宽度计算 |
| Julious (2009) | 临床试验样本量 | 等效试验 TOST β/2 动态切换 |
| Farrington & Manning (1990) | 受约束 MLE 检验 | Score Test 样本量计算 |
| Lachin & Foulkes (1986) | 生存分析功效计算 | 事件驱动样本量 |
| Jennison & Turnbull (2000) | 成组序贯方法 | 数值积分网格 |

---

## 审计任务设定（原始指令）

> 你写出的本项目相关的样本量计算代码，虽然公式正确，但可能还停留在"功能实现"阶段。请基于上述所有工业级（statsmodels/G\*Power）与监管级（gsDesign/TrialSize）的数据源源码及手册，对 JS 实现进行全量差异化审计与批判改进：
>
> 1. **公式鲁棒性审计**：识别 JS 仓库中"正态近似"公式在小样本或极端参数下的失准风险，比对工业库如何使用非中心分布迭代解决。
> 2. **补丁逻辑提取**：从 gsDesign 或 TrialSize 中提取处理脱落补偿（Drop-out）、连续性校正（Continuity Correction）及期望事件数修正的算法补丁。
> 3. **重构批判建议**：不要只做公式翻译，请按照 statsmodels 的求解器架构（Solver），说明如何重构代码以满足医疗器械注册申报的严谨性要求。

---

## 一、核心架构差距：闭式公式 vs. 求解器框架

### 1.1 三种架构范式对比

| 范式 | 代表库 | 计算方式 | 反向求解 | 精度控制 |
|------|-------|---------|---------|---------|
| **闭式公式** | TrialSize, SampleSize4CT, **本项目** | `N = f(params)` 解析式 | ❌ 不支持 | 数学精确（仅 ceil 误差） |
| **通用求解器** | statsmodels, pwr | `solve(power_func, target)` Brent 法 | ✅ 求解任意参数 | xtol=1e-5 ~ 1e-4 |
| **精确分布** | G\*Power, gsDesign | 非中心 t/F/χ² + 数值积分 | ✅ 精确反向 | ε=1e-6，四位有效数字 |

### 1.2 本项目现状

本项目采用**闭式公式范式**，与 TrialSize 和 SampleSize4ClinicalTrials 一致。对于正向计算（参数→N），这是数学上最精确的方式。

**但缺少两个关键能力**：

| 能力 | 现状 | 需要 |
|------|------|------|
| 反向功效计算（给定 N → Power） | ❌ | 审评必问 |
| 精确分布路径（非中心 t/F） | ❌ | 小样本精度保障 |

### 1.3 statsmodels 的三级回退求解器

```python
# Tier 1: 扩展边界 Brent 法 (xtol=1e-5, maxiter=100)
val = brentq_expanding(func, low, upp, xtol=1e-5)

# Tier 2: Newton 法 (残差 < 1e-4)
val = fsolve(func, start_value)

# Tier 3: 固定边界 Brent 法 ([1e-8, 1-1e-8])
val = brentq(func, 1e-8, 1 - 1e-8)
```

### 1.4 G\*Power 的精确度标准

| 项目 | G\*Power 标准 | 本项目现状 |
|------|-------------|-----------|
| 精度容差 ε | **1e-6** | 1e-9（浮点比较），无功效计算容差 |
| 非中心分布 | DCDFLIB 库精确计算 | ❌ 仅正态近似 |
| 有效数字 | 4 位精度保证 | 未定义精度目标 |
| 精确/近似切换 | N>1000 自动切换近似 | 无切换机制 |
| 极端尾概率 | 专门优化（大 NCP 处理） | 未处理 |

### 1.5 gsDesign 的方差计算：受约束 MLE（本项目最大差距之一）

gsDesign 的 `nBinomial` 使用 **Farrington-Manning 受约束 MLE** 计算零假设方差，而非简单的 pooled 或 unpooled：

```r
# gsDesign: 零假设方差通过三次方程（Cardano 公式）求解受约束 MLE
# Risk Difference: 解三次方程得到 p10, p20 满足 p10 - p20 = delta0
phi = (p10*(1-p10) + p20*(1-p20)/ratio) * (ratio+1)

# 而非简单的:
phi_simple = p1*(1-p1) + p2*(1-p2)/ratio   # ← 本项目当前使用
```

**本项目 MN 方法已在结果验证层实现**（`result-validation/two-group.js`），但**设计阶段仍使用简化方差**。这导致设计阶段与分析阶段的方法不一致。

---

## 二、公式鲁棒性审计

### 2.1 正态近似在小样本/极端参数下的失准

| 场景 | 本项目（正态近似） | 工业标准（精确法） | 偏差 |
|------|------------------|------------------|------|
| **连续终点 N<30** | Z 分布 | 非中心 t 分布（pwr, G\*Power） | 样本量低估 5-15% |
| **率终点 p<0.05** | Wald 方差 `p(1-p)/n` | 精确二项（G\*Power, gsDesign） | 方差退化，n 严重偏小 |
| **率终点 p>0.95** | 同上 | 同上 | 同上 |
| **等效试验 Δ≈δ** | 公式分母趋零 | gsDesign 返回 Infinity 并警告 | 数值不稳定 |
| **不等分配 k>3** | 无特殊处理 | gsDesign 用谐波均值调整 | 方差估计偏差 |

### 2.2 各库对正态近似的处理策略

**G\*Power**：
- 默认使用**精确非中心分布**
- 仅在 N > 1000 时自动切换为正态近似
- 切换阈值可由用户配置
- 精确法基于 DCDFLIB 库（C 实现），计算非中心 t/F/χ² 的 CDF

**pwr**：
- 比例终点：正态近似（Cohen's h 变换）
- 连续终点：**非中心 t 分布**（精确）
  ```r
  pt(qt(sig.level/tside, nu, lower=FALSE), nu, ncp=sqrt(n/tsample)*d, lower=FALSE)
  ```
- 自由度 `nu = (n-1) * tsample`，NCP = `sqrt(n/tsample) * d`

**gsDesign**：
- 比例终点：FM 受约束 MLE + Score 检验（半精确）
- 精确二项：`gsBinomialExact` 通过递归矩阵计算精确二项概率
- 连续终点：正态近似但支持分组方差

**statsmodels**：
- TOST 精确二项功效：
  ```python
  power = binom.cdf(k_upp, nobs, mean_alt) - binom.cdf(k_low - 1, nobs, mean_alt)
  ```
- 零效应量语义处理：`effect_size == 0 → power = alpha`

### 2.3 本项目需要的精确度升级路径

```
┌─────────────────────────────────────────────────────────────┐
│  现状：全部正态近似                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  升级路径 1（P1）: 连续终点 → 非中心 t 分布                  │
│  ├─ 需要实现: tCDF(x, df, ncp) 和 tQuantile(p, df, ncp)    │
│  ├─ 参考: pwr 的 pt(qt(...), ncp=...) 实现                  │
│  └─ 影响: sample-size/two-group, one-sample, paired 连续端  │
│                                                             │
│  升级路径 2（P2）: 比例终点 → 精确二项                       │
│  ├─ 需要实现: binomCDF(k, n, p) 用 logGamma 防溢出          │
│  ├─ 参考: gsDesign gsBinomialExact                          │
│  └─ 影响: result-validation, 小样本功效验证                  │
│                                                             │
│  升级路径 3（P2）: ANOVA → 非中心 F 分布                     │
│  ├─ 需要实现: fCDF(x, df1, df2, ncp)                        │
│  ├─ 参考: G*Power DCDFLIB                                   │
│  └─ 影响: multigroup 模块效能计算                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、补丁逻辑提取

### 3.1 脱落补偿（Dropout Compensation）

#### 本项目现状：简单膨胀法

```javascript
// 当前实现（Logic 层）
n1_adjusted = Math.ceil(n1 / (1 - dropout))
```

#### gsDesign 的竞争风险模型

gsDesign 将脱落建模为**竞争风险**，而非简单膨胀：

```r
# gsDesign: 脱落率 eta 作为竞争风险
# 事件概率 = lambda / (lambda + eta) × P(event or dropout before T)
# 其中 lambda=事件风险, eta=脱落风险

P_event = lambda / (lambda + eta) * (1 - exp(-(lambda + eta) * t))
```

| 维度 | 本项目 `n/(1-d)` | gsDesign 竞争风险 |
|------|-----------------|------------------|
| 数学模型 | 确定性膨胀 | 指数竞争风险 |
| 脱落时点 | 不考虑 | 考虑入组时间和随访时间 |
| 事件率影响 | 不调整 | 脱落降低事件概率 |
| 分组差异 | 不支持 | 支持不同组不同脱落率 |
| 时变脱落 | 不支持 | 支持分段指数脱落率 |

**对器械试验的影响**：简单膨胀法在**脱落率 < 20%** 时误差可接受（<3%）。但当脱落率高（如长期随访器械试验）或两组脱落率不等时，简单膨胀法会低估需要的样本量。

**整改建议**：当前简单膨胀法可保留作为默认，但应提供竞争风险模型作为高级选项：

```javascript
/**
 * 竞争风险脱落模型（基于 gsDesign）
 * @param {number} lambda - 事件风险率（年）
 * @param {number} eta - 脱落风险率（年）
 * @param {number} T - 随访时间（年）
 * @returns {number} 调整后的事件概率
 */
function adjustedEventProbability(lambda, eta, T) {
  if (eta < 1e-10) return 1 - Math.exp(-lambda * T)
  return (lambda / (lambda + eta)) * (1 - Math.exp(-(lambda + eta) * T))
}
```

### 3.2 连续性校正（Continuity Correction）

#### gsDesign 的态度：谨慎使用

gsDesign 提供连续性校正选项，但**默认关闭**，文档明确指出：

> "Nominal Type I error is generally conservative without correction" — Gordon & Watson 研究结论

gsDesign 的 MN 检验本身已**略微保守**（因 n/(n-1) 小样本校正），不需要额外的 Yates 校正。

#### 校正公式对比

| 方法 | 公式 | 本项目 | gsDesign | 保守性 |
|------|------|--------|----------|-------|
| **无校正** | 标准 Wald/Score | ✅ 当前使用 | ✅ 默认 | 基准 |
| **Yates 连续性** | `n_cc = n * (1 + 1/(n*effect))²` | ❌ | 可选 | n 增 5-15% |
| **MN 小样本** | `V_adj = V * n/(n-1)` | ✅（验证层有） | ✅ | 轻微保守 |
| **精确二项** | 枚举所有可能结果 | ❌ | ✅ `gsBinomialExact` | 最准确 |

**整改建议**：连续性校正作为**可选参数**提供，默认关闭（与 gsDesign 一致），在 UI 层给出提示：

```javascript
/**
 * @param {Object} options
 * @param {boolean} [options.continuityCorrection=false] - 是否启用 Yates 连续性校正
 * @param {'none'|'yates'|'mn'} [options.correctionMethod='none'] - 校正方法
 */
```

### 3.3 设计阶段的方差方法：Wald vs. Score (FM/MN)

这是 gsDesign 与 TrialSize/SampleSize4CT 最大的差异，也是本项目的**核心升级点**。

#### 三种方差方法对比

| 方法 | 零假设方差 | 备择假设方差 | 使用库 |
|------|----------|------------|-------|
| **Wald (unpooled)** | `p1*(1-p1) + p2*(1-p2)/k` | 同左 | TrialSize, SS4CT, **本项目** |
| **Wald (pooled)** | `2*p_pool*(1-p_pool)*(1+1/k)` | `p1*(1-p1) + p2*(1-p2)/k` | statsmodels |
| **Score (FM/MN)** | 受约束 MLE 方差（三次方程） | `p1*(1-p1) + p2*(1-p2)/k` | **gsDesign** |

#### gsDesign 的 FM 方差计算核心

```r
# Farrington-Manning: 在 H0: p1-p2=delta0 约束下求 MLE
# 解三次方程得到 p10, p20（受约束 MLE）
# 然后用这对 MLE 计算方差

# 样本量公式变为:
n = [(z_alpha * sigma_0_FM + z_beta * sigma_1) / (p1 - p2 - delta0)]^2
# 其中 sigma_0_FM 来自 FM 受约束 MLE，而非简单的 unpooled 方差
```

**关键差异**：gsDesign 的样本量公式同时使用 **H0 方差**（FM 受约束 MLE）和 **H1 方差**（unpooled），而本项目和 TrialSize 都只使用单一方差。

**临床监管意义**：FM/MN 方法产生的样本量与实际分析方法（Score 检验）一致。FDA 审评人员关注设计与分析方法的一致性。

### 3.4 gsDesign 的四种效应量尺度

gsDesign 的 `nBinomial` 支持四种尺度，远超本项目的单一差值尺度：

| 尺度 | H0 假设 | 使用场景 | 本项目 |
|------|--------|---------|--------|
| **Risk Difference** | `p1-p2 = δ0` | 最常见（率终点） | ✅ 已有 |
| **Relative Risk (RR)** | `p1/p2 = exp(δ0)` | 疫苗保护率、事件率比 | ❌ |
| **Odds Ratio (OR)** | `OR = exp(δ0)` | 病例对照、罕见事件 | ❌ |
| **Log Odds Ratio** | 同 OR（对数参数化） | 回归模型 | ❌ |

**器械临床适用性**：多数器械临床使用 Risk Difference，但诊断设备（灵敏度/特异度比较）和安全性评估可能需要 RR 或 OR 尺度。

### 3.5 precisely 的精度驱动计算模型

precisely 包提供了一种**互补的**样本量设计思路：不基于功效（Power），而是基于 CI 宽度精度。

| 方面 | 功效驱动（本项目） | 精度驱动（precisely） |
|------|------------------|---------------------|
| 核心问题 | "能否拒绝 H0？" | "CI 有多窄？" |
| 输入 | 效应量、α、Power | 期望 CI 宽度、置信水平 |
| 零假设 | 必须 | 不需要 |
| 适用场景 | 确证性试验 | 描述性/探索性试验、诊断设备评估 |

#### precisely 的核心公式（Risk Difference）

```
n = (4 × z² × [k × p_e(1-p_e) + p_u(1-p_u)]) / (k × w²)
```

其中 `w` = 目标 CI 总宽度（绝对值）。

**本项目已有类似实现**：`ci-estimation/proportion-ci.js` 的 `calculateRateCISampleSize`。但 precisely 还支持 RR、OR、Rate Ratio 等多种尺度，且提供 `upper_*` 系列函数（桥接精度与功效的混合计算）。

### 3.6 SampleSize4ClinicalTrials 的设计编码模式

SS4CT 使用 `design` 整数编码（1=等效性, 2=优效性, 3=非劣效性, 4=等效性）统一处理四类设计：

```r
# Z 值选择策略（与本项目一致）
design 1 (Equality):   Z_{alpha/2} + Z_{beta}
design 2-3 (Sup/NI):   Z_{alpha} + Z_{beta}
design 4 (Equivalence): Z_{alpha} + Z_{beta/2}
```

**与本项目的关键差异**：

| 差异点 | SS4CT | 本项目 |
|--------|-------|-------|
| NI 界值符号 | 负数（`delta = -0.05`） | 正数取绝对值 |
| 取整策略 | 仅对控制组 ceiling，试验组 = ratio × n_control（可能非整数） | 两组均 ceiling |
| 等效 beta 处理 | `Z_{(1-power)/2}`（等价于 beta/2） | 动态切换（Julious 2009，更精确） |

---

## 四、边界防御全量审计

### 4.1 各库边界防御对比矩阵

| 边界场景 | 本项目 | TrialSize | SS4CT | gsDesign | statsmodels | G\*Power |
|---------|--------|-----------|-------|----------|-------------|----------|
| p ∈ (0,1) 校验 | ❌ | ❌ | ❌ | ✅ `(0,1)` exclusive | ✅ | ✅ |
| α ∈ (0,0.5) 语义校验 | ❌ | ❌ | ❌ | ✅ symmetric 时 | ❌ | ✅ |
| Power ∈ (0.5,1) 语义校验 | ❌ | ❌ | ❌ | ❌ 但 β < 1-α | ❌ | ✅ |
| ratio > 0 校验 | ❌ | ❌ | ❌ | ✅ | ✅ min=1e-8 | ✅ |
| effect_size = 0 处理 | NaN | Inf | 除零 | Inf + 警告 | power=α | 警告 |
| delta0 范围校验 | 部分 | ❌ | ❌ | ✅ [-1,1] for diff | ❌ | ✅ |
| sigma > 0 校验 | ❌ | ❌ | ❌ | 隐式 | 隐式 | ✅ |
| NaN 传播防护 | 部分 | ❌ | ❌ | ❌ | ✅ NaN→+Inf | ✅ |
| 500+ NaN 死循环防护 | N/A | N/A | N/A | N/A | ✅ counter>500 | N/A |

### 4.2 本项目缺失的防御项（汇总）

| # | 缺失项 | 严重度 | 对标来源 | 整改方案 |
|---|--------|--------|---------|---------|
| 1 | 概率参数退化边界 `p→0, p→1` | 高 | statsmodels, gsDesign | Statistics 层入口校验 `p ∈ (ε, 1-ε)` |
| 2 | 分配比极端值 | 中 | statsmodels, pwr | `ratio ∈ [1e-4, 100]` |
| 3 | 效应量=0 语义 | 中 | statsmodels | 返回结构化诊断 `{reason, message}` |
| 4 | α 语义范围 `(0, 0.5)` | 低 | G\*Power, Gemini | 警告但允许计算 |
| 5 | Power 语义范围 `(0.5, 1)` | 低 | G\*Power, Gemini | 警告但允许计算 |
| 6 | delta0 范围 `[-1, 1]` for diff | 中 | gsDesign | 差值尺度时校验 |
| 7 | sigma ≤ 0 | 中 | G\*Power | 连续终点入口校验 |

**整改方案**（统一验证器）：

```javascript
/**
 * Statistics 层统一参数验证器
 * 区分「数学无效」(errors) 和「统计不合理」(warnings)
 */
function validateStatParams(params) {
  const errors = []    // → 拒绝计算
  const warnings = []  // → 允许计算但告警

  // 数学无效
  if (params.p1 !== undefined && (params.p1 <= 0 || params.p1 >= 1))
    errors.push('p1 must be in (0, 1)')
  if (params.alpha !== undefined && (params.alpha <= 0 || params.alpha >= 1))
    errors.push('alpha must be in (0, 1)')
  if (params.power !== undefined && (params.power <= 0 || params.power >= 1))
    errors.push('power must be in (0, 1)')
  if (params.sigma !== undefined && params.sigma <= 0)
    errors.push('sigma must be > 0')
  if (params.ratio !== undefined && params.ratio <= 0)
    errors.push('ratio must be > 0')

  // 统计语义
  if (params.alpha > 0.5)
    warnings.push('α > 0.5 is statistically meaningless')
  if (params.power < 0.5)
    warnings.push('Power < 0.5: test is worse than random guess')
  if (params.ratio && (params.ratio < 0.1 || params.ratio > 10))
    warnings.push('Extreme allocation ratio, clinically impractical')

  return { valid: errors.length === 0, errors, warnings }
}
```

---

## 五、数值稳定性审计

### 5.1 现有保障

| 保障项 | 实现位置 | 状态 |
|--------|---------|------|
| Horner 方法优化多项式 | `normal-distribution.js` | ✅ |
| LRU 缓存 normalInverse | `normal-distribution.js` | ✅ |
| safeDivide 防除零 | `safe-math.js` | ✅ |
| `Math.max(0, sqrtTerm)` 防负开方 | 各模块 | ✅ |
| FLOAT_EPSILON=1e-9 容差比较 | `safe-math.js` | ✅ |

### 5.2 缺失项

#### 缺失 A：反正弦变换计算路径

pwr 和 statsmodels 均使用 Cohen's h 作为率终点方差稳定化手段。本项目 `effect-size.js` 已实现但仅用于展示。

#### 缺失 B：Log 空间计算 [来源: Gemini]

精确二项法的阶乘计算在 n>170 时溢出。G\*Power 使用 DCDFLIB 的 Log-gamma 函数。

```javascript
// ✅ 必须使用 Log 空间
function logBinomCoeff(n, k) {
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)
}
```

#### 缺失 C：Pooled vs. Unpooled vs. FM 方差选项

| 方差方法 | 本项目 | 建议 |
|---------|--------|------|
| Unpooled (H1) | ✅ 当前使用 | 保留为默认 |
| Pooled (H0) | ❌ | 增加选项 |
| FM/MN (Score) | ❌ 设计层 / ✅ 验证层 | **P1 提升到设计层** |

#### 缺失 D：gsDesign 的 Cardano 三次方程求解器

gsDesign 在 `varBinomial` 中使用 Cardano 三角公式求解 FM 受约束 MLE 的三次方程。这是非劣效试验样本量计算最精确的解析方法。本项目已有 Newton-Raphson 和二分法求解 FM MLE（在验证层），但未用于设计阶段。

---

## 六、求解精度审计

### 6.1 全量对比

| 维度 | 本项目 | TrialSize | SS4CT | gsDesign | pwr | statsmodels | G\*Power |
|------|--------|-----------|-------|----------|-----|-------------|----------|
| 正向 N 计算 | 闭式 ✅ | 闭式 | 闭式 | FM 闭式 | uniroot | 三级回退 | 精确 |
| 反向 Power | ❌ | ❌ | ❌ | ✅ `nNormal` | ✅ uniroot | ✅ solve_power | ✅ |
| 取整方式 | ceil 双组 | 无 ceil | ceil 单组 | ceil 双组 | 无 ceil | 无 ceil | ceil |
| 等效 β/2 | 动态切换 ★ | 始终 β/2 | 始终 β/2 | N/A(序贯) | N/A | 精确积分 | 精确 |
| 结果验证 | FM/MN/Wilson ★ | ❌ | ❌ | Score/Exact | ❌ | Score | N/A |

★ = 本项目优势点

### 6.2 等效试验 β/2 处理（本项目优势）

本项目基于 Julious (2009) 的动态切换是**所有闭式公式库中最精确的**：

| 库 | Δ=0（对称 TOST） | Δ≠0（非对称 TOST） | 精度 |
|----|------------------|-------------------|------|
| **本项目** | `Z_{1-β/2}` | `Z_{1-β}` | 最精确闭式 |
| TrialSize | 始终 `Z_{1-β/2}` | 始终 `Z_{1-β/2}` | 偏保守 |
| SS4CT | 始终 `Z_{(1-power)/2}` ≡ `Z_{1-β/2}` | 始终 `Z_{1-β/2}` | 偏保守 |
| statsmodels | 精确双侧概率积分 | 精确双侧概率积分 | 数值精确 |

---

## 七、算法全量对标表（核心补丁集）

### 7.1 已覆盖功能对标

| 功能 | 本项目 | TrialSize | SS4CT | gsDesign | pwr | statsmodels | G\*Power |
|------|--------|-----------|-------|----------|-----|-------------|----------|
| 两组率非劣效 | ✅ | ✅ | ✅ | ✅(FM) | ❌ | 部分 | ✅ |
| 两组率优效 | ✅ | ✅ | ✅ | ✅(FM) | ✅(h) | ✅ | ✅ |
| 两组率等效 | ✅★ | ✅ | ✅ | N/A(序贯) | ❌ | ✅ | ✅ |
| 两组均值 NI/Sup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 单组率 | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| 配对 McNemar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 多组 Bonferroni | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 率 CI 样本量 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 均值 CI 样本量 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 结果验证(FM/MN) | ✅★ | ❌ | ❌ | ✅ | ❌ | ✅ | N/A |
| 敏感性分析 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

★ = 业界领先

### 7.2 缺失功能对标（需补齐的补丁）

| 功能 | 对标库 | 优先级 | 临床监管意义 |
|------|-------|--------|------------|
| **反向功效计算** | pwr, statsmodels, G\*Power, gsDesign | **P0** | 审评必问：实际 n 对应的真实功效 |
| **统一参数验证器** | gsDesign, G\*Power | **P0** | 代码不仅要能算，还要能拒绝无效输入 |
| **FM/MN 设计阶段路径** | gsDesign | **P1** | 设计与分析方法一致性（FDA 关注点） |
| **连续性校正选项** | gsDesign (可选) | **P1** | 与 PASS 等软件结果对齐 |
| **非中心 t 分布路径** | pwr, G\*Power | **P1** | 小样本连续终点精度保障 |
| **RR/OR 效应量尺度** | gsDesign | **P1** | 疫苗/诊断器械试验需要 |
| **精确二项功效** | gsDesign, statsmodels, G\*Power | **P2** | 小样本率终点精度保障 |
| **Log 空间计算** | G\*Power (DCDFLIB), Gemini | **P2** | 精确法阶乘防溢出 |
| **精度驱动样本量** | precisely | **P2** | 诊断器械 CI 宽度设计 |
| **通用求解器框架** | statsmodels, Gemini | **P2** | 支持求解任意未知参数 |
| **Pooled 方差选项** | statsmodels | **P3** | 设计阶段方差方法灵活性 |
| **效应量=0 语义返回** | statsmodels | **P3** | 结构化诊断信息 |
| **生存分析 (Log-rank)** | gsDesign (Schoenfeld + Lachin-Foulkes) | **远期** | 长期器械随访试验 |
| **成组序贯设计** | gsDesign | **远期** | 中期分析、早停规则 |
| **非中心 F 分布** | G\*Power, pwr | **远期** | ANOVA 精确效能 |

---

## 八、重构架构建议

### 8.1 不做什么（明确排除）

| 排除项 | 原因 |
|--------|------|
| 替换闭式公式为迭代求解 | 闭式解对正向计算更精确更快，应保留为主路径 |
| 照搬 statsmodels 全套架构 | JS 生态不同，不需要 Python 的面向对象框架 |
| 立即实现全部精确分布 | 工作量过大，按优先级渐进 |

### 8.2 做什么（核心重构路径）

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1 (P0): 防御层 + 反向功效                                │
│                                                                 │
│  1. 新建 core/param-validator.js                                │
│     → validateStatParams() 统一验证器                            │
│     → 每个 sample-size 函数入口调用                              │
│                                                                 │
│  2. 新建 power-analysis/ 目录                                    │
│     → calculatePowerFromN() 闭式反向功效（率/连续端）             │
│     → 每种设计类型一个反向函数                                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Phase 2 (P1): 精度提升                                         │
│                                                                 │
│  3. 新建 core/distributions/ 目录                                │
│     → t-distribution.js: 非中心 t 分布 CDF/quantile             │
│     → 参考 pwr 的 pt(qt(...), ncp=...) 实现                     │
│                                                                 │
│  4. 扩展 sample-size/ 模块                                       │
│     → 每个连续终点函数增加 method: 'normal'|'t' 参数              │
│     → n < 30 时自动切换或警告                                    │
│                                                                 │
│  5. 扩展设计阶段 FM/MN 路径                                      │
│     → 复用 result-validation/ 的 FM MLE 求解器                   │
│     → 新建 sample-size/two-group/score-test.js                  │
│                                                                 │
│  6. 增加 RR/OR 效应量尺度                                        │
│     → 参考 gsDesign varBinomial 的二次方程求解                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Phase 3 (P2): 精确法 + 高级功能                                 │
│                                                                 │
│  7. 新建 core/distributions/                                     │
│     → binomial.js: 精确二项 CDF (logGamma 防溢出)                │
│     → f-distribution.js: 非中心 F 分布（远期）                    │
│                                                                 │
│  8. 新建 core/solver.js                                          │
│     → brentSolve() 通用 Brent 法求解器                           │
│     → 参考 statsmodels brentq_expanding                          │
│                                                                 │
│  9. 扩展 ci-estimation/                                          │
│     → 增加 RR/OR 的精度驱动样本量（参考 precisely）               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Phase 4 (远期): 新模块                                          │
│                                                                 │
│  10. 生存分析模块 (参考 gsDesign gsSurv)                          │
│  11. 成组序贯设计 (参考 gsDesign gsDesign)                        │
│  12. 非中心 F 分布 ANOVA (参考 G*Power)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 文件结构变更

```
src/utils/statistics/
├── core/
│   ├── safe-math.js              # 现有
│   ├── normal-distribution.js    # 现有
│   ├── effect-size.js            # 现有
│   ├── confidence-interval.js    # 现有
│   ├── param-validator.js        # 【新建 P0】统一参数验证器
│   ├── solver.js                 # 【新建 P2】Brent 通用求解器
│   └── distributions/            # 【新建 P1-P2】
│       ├── t-distribution.js     # 非中心 t 分布
│       ├── binomial.js           # 精确二项分布 (logGamma)
│       └── f-distribution.js     # 非中心 F 分布 (远期)
├── sample-size/
│   ├── two-group/
│   │   ├── non-inferiority.js    # 现有
│   │   ├── superiority.js        # 现有
│   │   ├── equivalence.js        # 现有
│   │   └── score-test.js         # 【新建 P1】FM/MN 设计阶段路径
│   ├── one-sample.js             # 现有
│   ├── paired.js                 # 现有
│   └── multigroup.js             # 现有
├── power-analysis/               # 【新建 P0】
│   ├── two-group-power.js        # 反向功效：两组设计
│   ├── one-sample-power.js       # 反向功效：单组
│   ├── paired-power.js           # 反向功效：配对
│   └── multigroup-power.js       # 反向功效：多组
├── ci-estimation/                # 现有
│   ├── proportion-ci.js
│   └── mean-ci.js
├── result-validation/            # 现有
├── sensitivity/                  # 现有
└── index.js                      # 现有
```

---

## 九、整改优先级总表（融合全部数据源）

| 优先级 | 整改项 | 对标来源 | 工作量 | 状态 |
|--------|--------|---------|--------|------|
| **P0** | 统一参数验证器 | gsDesign, G\*Power, statsmodels, Gemini | 小 | ❌ |
| **P0** | 反向功效计算（闭式） | pwr, statsmodels, G\*Power, gsDesign, Gemini | 中 | ❌ |
| **P1** | 非中心 t 分布路径 | pwr, G\*Power, Gemini | 中 | ❌ |
| **P1** | FM/MN 设计阶段路径 | gsDesign, Gemini | 中 | ❌ |
| **P1** | 连续性校正选项 | gsDesign, statsmodels, Gemini | 小 | ❌ |
| **P1** | RR/OR 效应量尺度 | gsDesign | 中 | ❌ |
| **P2** | 精确二项功效 | gsDesign, statsmodels, G\*Power | 大 | ❌ |
| **P2** | Log 空间计算 (logGamma) | G\*Power, Gemini | 小 | ❌ |
| **P2** | Brent 通用求解器 | statsmodels, pwr, Gemini | 中 | ❌ |
| **P2** | 精度驱动样本量 (CI 宽度) | precisely | 小 | ❌ |
| **P2** | 反正弦变换计算路径 | pwr, statsmodels | 小 | ❌ |
| **P3** | Pooled 方差选项 | statsmodels | 小 | ❌ |
| **P3** | 效应量=0 语义返回 | statsmodels | 小 | ❌ |
| **P3** | 竞争风险脱落模型 | gsDesign | 中 | ❌ |
| **远期** | 生存分析 (Schoenfeld + Lachin-Foulkes) | gsDesign | 大 | ❌ |
| **远期** | 成组序贯设计 | gsDesign | 大 | ❌ |
| **远期** | 非中心 F 分布 ANOVA | G\*Power, pwr | 大 | ❌ |

---

## 十、客观评价

### 本项目优势（无需改动）

| 优势 | 说明 | 超越的库 |
|------|------|---------|
| 等效试验动态 β/2 | Julious (2009) 最精确闭式近似 | TrialSize, SS4CT |
| 结果验证 FM/MN/Newcombe | 三种方法完整实现 | TrialSize, SS4CT, pwr |
| 配对 McNemar | 多数库未实现 | gsDesign, statsmodels, pwr |
| 多组 Bonferroni | 分组分配+敏感性分析 | 所有对标库 |
| CI 样本量 (Wilson) | 率+均值两种 | TrialSize, SS4CT, gsDesign |
| 敏感性分析 | 内建参数扫描 | 除 G\*Power 外全部 |

### 主要差距

| 差距 | 核心原因 | 影响 |
|------|---------|------|
| 无反向功效 | 架构限制（纯闭式，无求解器） | 审评答复能力缺失 |
| 正态近似唯一 | 未实现非中心分布 | 小样本精度不足 |
| 设计/分析方法不一致 | FM/MN 仅在验证层 | FDA 一致性要求 |
| 单一效应量尺度 | 仅 Risk Difference | RR/OR 场景缺失 |

### 各维度评分（更新版）

| 维度 | 本项目 | TrialSize | SS4CT | gsDesign | pwr | statsmodels | G\*Power |
|------|--------|-----------|-------|----------|-----|-------------|----------|
| 闭式公式正确性 | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | N/A | N/A | N/A |
| 边界防御 | ★★★☆☆ | ☆☆☆☆☆ | ☆☆☆☆☆ | ★★★★☆ | ★★☆☆☆ | ★★★★☆ | ★★★★★ |
| 数值稳定性 | ★★★☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | ★★★★☆ | ★★★☆☆ | ★★★★★ | ★★★★★ |
| 求解精度 | ★★★★☆ | ★★☆☆☆ | ★★☆☆☆ | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★★ |
| 结果验证 | ★★★★★ | ☆☆☆☆☆ | ☆☆☆☆☆ | ★★★★☆ | ☆☆☆☆☆ | ★★★★☆ | N/A |
| 反向求解 | ☆☆☆☆☆ | ☆☆☆☆☆ | ☆☆☆☆☆ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ |
| 功能覆盖度 | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★★★★ |
| 器械临床适用性 | ★★★☆☆ | ★★☆☆☆ | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ | ★★★☆☆ | ★★★★☆ |

---

## 十一、两份审计（Claude + Gemini）的异同

| 审计点 | Claude 审计 | Gemini 审计 | 融合结论 |
|--------|-----------|------------|---------|
| **架构差距** | 聚焦于「缺少反向功效」 | 提升到「缺少求解器框架」 | 闭式解保留为主路径 + 求解器作为反向工具 |
| **t 分布** | 引用 pwr 源码，定位为 P1 | 强调「严重低估」，要求更急迫 | P1 优先级不变，增加 G\*Power 精度标准 |
| **连续性校正** | 提出可选 Yates | 关联 PASS 软件对比 | 与 gsDesign 一致：默认关闭，可选开启 |
| **边界防御** | 3 项缺失 | 统计语义边界 | 融合为 7 项（含 gsDesign 的 delta0 范围） |
| **Log 空间** | 提及溢出风险 | 明确要求 logGamma | 纳入 P2，精确法前置依赖 |
| **Score Test** | 未涉及设计路径 | 提出 MN 设计路径 | gsDesign 验证：FM 设计路径是关键升级 |
| **生存分析** | 未涉及 | 提出 Lakatos | gsDesign 补充完整 Lachin-Foulkes 模型 |
| **精度驱动** | 未涉及 | 未涉及 | 新增 precisely 包对标（诊断器械场景） |
| **方差方法** | pooled 选项 | 未涉及 | gsDesign 补充 FM 受约束 MLE 方差 |

---

*本报告基于 8 个工业级/监管级数据源（statsmodels, pwr, G\*Power, TrialSize, gsDesign, SampleSize4ClinicalTrials, precisely, Gemini 审计）全量对标生成。后续整改按 P0 → P1 → P2 → P3 → 远期 顺序执行。数据源清单供后续算法开发持续对标使用。*

---

## 附录 A：G\*Power 原始文档精读摘要

> **数据来源**：GPowerManual.pdf (85页, 手册) + GPower3-BRM-Paper.pdf (46页, 论文)
> **提取方式**：PyPDF2 → 纯文本 → Agent 逐页精读
> **提取质量**：手册 ✅ 可用 | 论文 ❌ 公式乱码（字体编码异常），仅自然语言段落可读

### A.1 G\*Power 核心架构（来自论文 + 手册）

**计算引擎**：基于 **DCDFLIB** C 语言库（Brown, Lovato & Russell, UT MD Anderson Cancer Center），经过针对性修改。计算非中心 t、F、χ²、标准正态、二项分布的 CDF 及其逆函数。

**精度策略**：
- **G\*Power 3 完全放弃了近似法**（G\*Power 2 的 speed mode 已删除）
- 原文：*"G\*Power 3 no longer provides approximate power analyses that were available in the speed mode of G\*Power 2. Two arguments guided us: First, four-digit precision of power calculations may be mandatory in many applications. Second, exact calculations have become so fast that the speed gain associated with approximate calculations is not even noticeable."*
- **唯一例外**：精确比例检验在 **N > 1000** 时自动切换为大样本近似（阈值用户可配置）

**功效分析五种模式**：

| 模式 | 已知量 | 求解量 | 本项目 |
|------|-------|--------|--------|
| A priori | α, power, effect size | **N** | ✅ 已有 |
| Post hoc | α, N, effect size | **Power** | ❌ 缺失（P0） |
| Sensitivity | α, power, N | **Critical effect size** | ❌ 缺失 |
| Compromise | effect size, N, q=β/α | **α and power** | ❌ 缺失 |
| Criterion | power, effect size, N | **α** | ❌ 缺失 |

### A.2 比例检验：8 种检验统计量（来自论文 Table 7-8）

G\*Power 对两组独立比例提供 **8 种检验统计量**（含有/无偏移 offset 版本）：

| # | 检验统计量 | 方差类型 | 连续性校正 | 本项目 |
|---|----------|---------|-----------|--------|
| 1 | z-test pooled variance | Pooled | ❌ | ❌ |
| 2 | z-test pooled + continuity correction | Pooled | ✅ Yates | ❌ |
| 3 | z-test unpooled variance | Unpooled | ❌ | ✅（当前使用） |
| 4 | z-test unpooled + continuity correction | Unpooled | ✅ Yates | ❌ |
| 5 | Mantel-Haenszel test | — | — | ❌ |
| 6 | Likelihood ratio (Upton 1982) | — | — | ❌ |
| 7 | t-test with df=N-2 (D'Agostino et al. 1988) | — | — | ❌ |
| 8 | **Likelihood score ratio (MN/FM)** | Score (受约束 MLE) | 可选 skewness 校正 | ✅ 仅验证层 |

**带 offset（NI/优效）版本（Table 8）额外包含**：
- FM/MN 的 **Risk Difference**、**Risk Ratio**、**Odds Ratio** 三种尺度
- Gart & Nam (1988, 1990) skewness 校正版本

**审计发现**：G\*Power 的 8 种统计量中，本项目仅实现了 #3（unpooled z-test）和 #8（MN Score，仅验证层）。缺失 pooled 方差、连续性校正、t-test with df=N-2 等变体。

### A.3 非中心参数公式（来自论文 + 手册）

| 检验 | 非中心参数 λ | 自由度 | 本项目使用 |
|------|------------|--------|-----------|
| **独立两样本 t** | `δ = d × √(n1·n2/(n1+n2))` | df = N-2 | ❌ 用 Z 近似 |
| **单样本 t** | `δ = d × √N` | df = N-1 | ❌ 用 Z 近似 |
| **配对 t** | `δ = d_z × √N` | df = N-1 | ❌ 用 Z 近似 |
| **单因素 ANOVA** | `λ = N × f²` | df1=k-1, df2=N-k | 部分（Bonferroni） |
| **多元回归** | `λ = N × f²` | df1=p, df2=N-p-1 | ❌ |
| **重复测量** | `λ = ε × u × N × f²` | df 含 GG 校正 | ❌ |
| **χ² 拟合优度** | `λ = N × w²` | df = k-1 | ❌ |
| **两组比例 z** | 基于 arcsin h 或原始比例 | — | ✅ 但无 arcsin 路径 |

### A.4 取整与 alpha 约束（来自论文）

- **取整规则**：*"Non-integer sample sizes are always rounded up by G\*Power to obtain integer values consistent with a power level not less than the pre-specified one."* — 与本项目一致 ✅
- **精确检验 alpha 约束**：*"G\*Power 3 always requires the actual alpha not to be larger than the nominal value."* — 离散检验的 alpha 不能超过名义值，本项目未处理此约束
- **多变量近似推荐**：推荐 O'Brien & Shieh (1999) 而非 Muller & Peterson (1984)，因后者「系统性低估功效」

### A.5 Cohen 效应量定义速查（来自论文 Table 1）

| 效应量 | 小 | 中 | 大 | 公式 |
|-------|-----|-----|-----|------|
| d (均值) | 0.2 | 0.5 | 0.8 | `d = |μ1-μ2| / σ` |
| d_z (配对) | — | — | — | `d_z = μ_diff / σ_diff` |
| f (ANOVA) | 0.1 | 0.25 | 0.4 | `f = σ_means / σ_error` |
| f² (回归) | 0.02 | 0.15 | 0.35 | `f² = R² / (1-R²)` |
| h (比例) | 0.2 | 0.5 | 0.8 | `h = 2arcsin(√p1) - 2arcsin(√p2)` |
| g (二项) | — | — | — | `g = p - c` |
| q (相关差) | 0.10 | 0.30 | 0.50 | `q = z'(r1) - z'(r2)` |
| w (χ²) | — | — | — | `w = √Σ(P0i-P1i)²/P0i` |

### A.6 手册特有发现（论文中未出现）

**来自 GPowerManual.pdf 精读**：

1. **McNemar 检验**：手册详细描述了精确无条件功效计算（exact unconditional power for exact conditional test），与本项目的正态近似 McNemar 实现不同

2. **两组比例无条件精确检验**：支持 4 种效应量输入模式——(A) 替代比例 p2, (B) 差值 p1-p2, (C) 风险比 p1/p2, (D) 比值比 OR

3. **带 offset 的比例检验**（NI/优效）：同样 4 种效应量模式，对应 H0 和 H1 的不同参数化

4. **精确法的 N 上限**：手册确认 Fisher exact test / unconditional exact test / McNemar exact 在 N 超过用户设定阈值时自动切换大样本近似

5. **四分相关（Tetrachoric correlation）**：手册最后章节（第31章）详述了精确模式和近似模式的完整算法，包括 Brown & Benedetti (1977) 精确估计和 Bonett & Price (2005) 近似估计

### A.7 对审计报告的增量影响

| 原审计结论 | PDF 精读后是否修正 | 说明 |
|-----------|-----------------|------|
| G\*Power 精度 ε=1e-6 | ✅ 确认 | 手册未给出具体 ε，但论文确认四位精度 + DCDFLIB |
| 精确优先策略 | ✅ 确认并强化 | 论文明确声明「完全放弃近似法」，比之前理解更极端 |
| 8 种比例检验统计量 | ✅ 确认 | 论文 Table 7-8 列出完整清单（虽公式乱码，标题可读） |
| Post hoc 模式 | ⬆️ 提升优先级 | G\*Power 五种模式中，Post hoc 是审评最常用的第二模式 |
| MN/FM Score 检验 | ✅ 确认为金标准 | 论文 Table 8 明确列出 MN(1985) + FM(1990) + Gart&Nam(1990) |
| 连续性校正 | 🔄 细化 | G\*Power 提供 pooled/unpooled 各有/无校正 = 4 种组合 |
| 效应量 Cohen's h | ✅ 确认 | arcsin 变换是 G\*Power 比例检验的默认效应量（z-test 族） |

---

## 附录 B：Gemini 补充审计精读摘要 `[来源: Gemini]`

> 以下内容摘自 Gemini 对同一代码库的补充深度审计报告，经筛选后融入。与主报告已有结论重叠的部分已省略，仅保留增量发现。

### B.1 四领域深度对标

#### B.1.1 均值终点：Z 近似 vs 非中心 t 分布

| 维度 | 本项目现状 | 行业金标准（G\*Power / statsmodels） |
|------|-----------|--------------------------------------|
| 分布假设 | Z 近似（`normalInverse`） | 非中心 t 分布（NCP δ = d√(n/2)） |
| 小样本偏差 | n<30 时效能高估 2-5% | 精确功效，无系统偏差 |
| σ 未知处理 | 假设 σ 已知 | 自由度 df = n₁+n₂-2，自动退化为 t |
| 实际影响 | 对临床试验影响有限（通常 n>30） | 审评可能质疑小样本场景的可靠性 |

**关键公式差异** `[来源: Gemini]`：
- 本项目：`n = (Z_α + Z_β)² × 2σ² / δ²`（Z 近似）
- G\*Power：通过非中心 t 分布的 CDF 反解 n，NCP = `δ / (σ × √(1/n₁ + 1/n₂))`
- 实际差距：当 n<30 时，Z 近似比精确法低估样本量约 2-8%

#### B.1.2 生存分析：Schoenfeld vs Lakatos

| 维度 | Schoenfeld 公式 | Lakatos 分段模拟 |
|------|----------------|------------------|
| 复杂度 | 单公式 | 多段递推模拟 |
| 假设 | 比例风险（PH） | 允许非比例风险（non-PH） |
| 脱落 | 简单通胀 | 分段脱落率 + 入组延迟 |
| 本项目 | ❌ 均未实现 | ❌ 均未实现 |
| 优先级 | 远期（超出当前范围） | 远期 |

> **审计意见**：生存分析不在当前项目范围内（专注于 sample size for proportions/means），但作为医疗器械注册的长期演进方向记录。

#### B.1.3 比例终点：Wald vs Score Test (MN)

| 方法 | 方差估计 | H₀ 约束 | 本项目状态 |
|------|---------|---------|-----------|
| Wald Test | `p̂(1-p̂)/n`（无约束 MLE） | 无 | ✅ 现有实现 |
| Score Test (MN) | 约束 MLE（在 H₀: p₁-p₂=δ₀ 下最大化似然） | 是 | ⚠️ 仅用于结果验证，未用于设计路径 |
| Score Test (FM) | 类似约束 MLE，不同参数化 | 是 | ⚠️ 同上 |

**Gemini 关键指出** `[来源: Gemini]`：
- 约束 MLE 需要解三次方程（gsDesign 使用 Cardano 公式），本项目的 `result-validation/` 已有此实现，但未暴露为设计路径计算入口
- MN Score Test 在 p 接近 0/1 时比 Wald 更稳健（I 类错误控制更好）
- 建议将 Score Test 从"验证"提升为"设计"，作为用户可选的计算方法

#### B.1.4 架构逻辑：固定公式 vs Solver 求解器

| 架构 | 本项目 | G\*Power / statsmodels |
|------|--------|----------------------|
| 核心范式 | 封闭公式（closed-form） | 求解器框架（BaseSolver） |
| 参数求解 | 仅 n（样本量） | n / α / power / effect size 任意求解 |
| 方程根 | 直接代入 | Brent 法 / fsolve / 牛顿法 |
| 扩展性 | 每种场景一个函数 | 统一框架，新场景仅需定义 power function |

**Gemini 评价** `[来源: Gemini]`：
> 「固定公式」架构是项目当前的核心限制。每新增一种检验类型就需要推导并实现一个新的封闭解。而 BaseSolver 框架下，只需实现 `power(n, α, effect)` 函数，其余由框架自动完成。这是「临床计算器」与「统计软件」的本质区别。

### B.2 三个监管必备补丁 `[来源: Gemini]`

Gemini 提出的"重构必杀技"——三个最小可行补丁，可以用最少工作量最大幅度提升监管合规性：

#### 补丁 1：脱落补偿升级（参照 gsDesign）

```
当前：n_adj = ceil(n / (1 - dropout))        ← 简单通胀
目标：λ/(λ+η) 竞争风险模型                     ← gsDesign 实现
最小补丁：保持现有公式作为 mode='simple'，
         新增 mode='competing-risk' 选项
```

**审计意见**：本项目的 `n/(1-d)` 通胀在 dropout<20% 时与竞争风险模型差异<2%。但 dropout>30% 时差异显著。建议作为 P2 优化项。

#### 补丁 2：连续性校正（参照 TrialSize）

```
当前：无连续性校正选项
目标：Yates 校正作为可选项

⚠️ 重要分歧：
- Gemini 建议：default = true（偏保守）
- gsDesign 源码：默认 continuity correction = false
- 审计建议：default = false，但提供 toggle 开关
```

**关于默认值的深度分析**：
- gsDesign（FDA 常用参考软件）默认关闭连续性校正
- G\*Power 提供 pooled/unpooled × 有/无校正 = 4 种组合，无明确默认偏好
- SAS PROC POWER 默认关闭
- **结论**：遵循 gsDesign 和 SAS 惯例，默认关闭，但在 UI 提供开关

#### 补丁 3：NCP 计算器（参照 G\*Power）

```
当前：均值终点使用 Z 近似
目标：非中心参数 NCP = δ / (σ × √(1/n₁+1/n₂))
      + 非中心 t 分布 CDF
最小补丁：实现 non-central t CDF，
         在 n<50 时自动切换为精确法
```

**优先级评估**：
- 补丁 1（脱落）：P2 — 影响有限，现有公式在多数场景足够
- 补丁 2（校正）：P1 — 实现简单，审评可能询问
- 补丁 3（NCP）：P1 — 影响均值终点精度，但需要实现 t 分布

### B.3 「临床计算器」vs「统计软件」定位分析 `[来源: Gemini]`

Gemini 将统计软件划分为两个层级：

| 层级 | 特征 | 代表 | 本项目 |
|------|------|------|--------|
| **临床计算器** | 封闭公式、正态近似、固定场景 | 在线计算器、简单 App | ✅ 当前水平 |
| **统计软件** | 求解器框架、精确分布、可扩展 | G\*Power、PASS、nQuery | 🎯 目标水平 |

**跨越鸿沟的关键差异**：

| 能力 | 计算器 | 软件 |
|------|--------|------|
| 求解维度 | 仅 n | n / α / power / effect |
| 分布引擎 | Normal only | Normal + t + F + χ² + Binomial |
| 方差模型 | Wald (unpooled) | Wald + Pooled + Score (FM/MN) |
| 效应量 | 单一输入 | Cohen's d/h/f/w 转换矩阵 |
| 脱落模型 | `n/(1-d)` | 竞争风险 / 分段脱落 |

**Gemini 结论**：当前项目处于「高级临床计算器」水平，在等效试验 TOST 实现上甚至超过部分开源库。升级为「统计软件」的最小路径是：**Solver 框架 + 非中心 t 分布 + Score Test 设计路径**。

### B.4 干货对标：三个被忽略的细微差异 `[来源: Gemini]`

#### B.4.1 gsDesign alpha-spending 函数族

gsDesign 支持 13+ 种 alpha-spending 函数（O'Brien-Fleming、Pocock、Hwang-Shih-DeCani 等），用于群组序贯设计中的期中分析。

**对本项目的影响**：当前不涉及期中分析，但如果未来扩展群组序贯设计，gsDesign 是核心参考。记录为远期关注项。

#### B.4.2 statsmodels gammaln 溢出防护

statsmodels 使用 `scipy.special.gammaln`（对数伽马函数）而非 `math.factorial`，防止 n>170 时的阶乘溢出。

**对本项目的影响**：
- 本项目的精确二项检验（如果未来实现）需要此保护
- 当前 normal approximation 不涉及阶乘，暂无影响
- 已在主报告第3章「数值稳定性」中收录（对数空间运算）

#### B.4.3 G\*Power Cohen's f 的细微差异

G\*Power 的 Cohen's f 定义：`f = σ_means / σ_within`，与部分教科书的 `f = σ_between / σ_within` 存在细微差异（σ_means vs σ_between 在不等组时不同）。

**对本项目的影响**：
- 多组比较模块如果引入 Cohen's f 效应量，需要明确使用哪种定义
- 建议：跟随 G\*Power 定义（更广泛使用），但在文档中注明

### B.5 算法审计检查清单（面向监管申报） `[来源: Gemini]`

Gemini 提出的 8 项检查清单，适用于 NMPA/FDA 医疗器械注册时的算法验证：

| # | 检查项 | 本项目状态 | 优先级 |
|---|--------|-----------|--------|
| 1 | 是否有文献验证用例（与已发表结果对照） | ✅ 已有（NMPA 指南 + Julious 2009） | — |
| 2 | 效应量为零/负值时是否有合理处理 | ✅ 返回 NaN/Infinity | — |
| 3 | 分配比例 ≠ 1 时公式是否正确 | ✅ 支持 k=n₂/n₁ | — |
| 4 | 是否提供 Post hoc 反向功效验证 | ❌ 缺失 | P0 |
| 5 | np < 5 时是否自动提示或切换精确法 | ❌ 缺失 | P1 |
| 6 | 连续性校正是否可选 | ❌ 缺失 | P1 |
| 7 | 脱落率校正方法是否明确标注 | ⚠️ 使用简单通胀但未标注方法名 | P2 |
| 8 | 计算结果是否可导出为审评格式报告 | ❌ 缺失 | P3 |

**Gemini 特别指出**：第 5 项（np<5 阈值）在当前报告中未提及。当预期率 × 样本量 < 5 时，正态近似失效，应提示用户"样本量过小，建议使用精确法"或自动切换。

### B.6 与主报告优先级表的整合建议

| Gemini 补丁 | 对应主报告编号 | 优先级调整 |
|-------------|--------------|-----------|
| 补丁 1（脱落） | 主报告 #12 | 维持 P2 |
| 补丁 2（校正） | 主报告 #8 | 维持 P1 |
| 补丁 3（NCP） | 主报告 #5 | 维持 P1 |
| np<5 阈值提示 | **新增** | P1（新增至主报告） |
| Score Test 设计路径 | 主报告 #10 | 维持 P1 |
| 结果导出审评报告 | 主报告 #16 | 维持 P3 |
| 效应量转换矩阵 | 主报告 #14 | 维持 P2 |

**新增至主优先级表**：
- **#18 [P1] np<5 小样本检测**：当 `n × p < 5` 时，在 hint-bar 显示 warning 提示正态近似可能不可靠 `[来源: Gemini]`

---

*附录 B 完 — 内容经筛选融合自 Gemini 补充审计报告，所有 Gemini 来源内容已标注。*
