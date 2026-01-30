# 统计算法对标数据源清单

> 本文档是算法开发的**持续对标索引**。实现新功能前，必须先查阅对应数据源的源码逻辑。

---

## 一、基础工业标准（General Statistical Standards）

底层数学求解器标杆，代码"鲁棒性"的参照系。

### 1. statsmodels (Python)

| 项目 | 内容 |
|------|------|
| **核心价值** | 工业级求解器，Brent's Method 三级回退，严谨边界检查，pooled/unpooled 方差分离 |
| **仓库地址** | https://github.com/statsmodels/statsmodels |
| **关键文件** | |
| 功效计算框架 | [`statsmodels/stats/power.py`](https://github.com/statsmodels/statsmodels/blob/main/statsmodels/stats/power.py) |
| 比例检验 | [`statsmodels/stats/proportion.py`](https://github.com/statsmodels/statsmodels/blob/main/statsmodels/stats/proportion.py) |
| 自定义求根器 | [`statsmodels/tools/rootfinding.py`](https://github.com/statsmodels/statsmodels/blob/main/statsmodels/tools/rootfinding.py) |
| **对标重点** | `solve_power()` 三级回退架构、`brentq_expanding` 实现、`_std_2prop_power` pooled 方差、TOST `_power_ztost` 精确二项功效、NaN 传播防护(counter>500)、效应量=0 语义处理 |
| **关键常量** | xtol=1e-5, fsolve 残差<1e-4, 固定边界 [1e-8, 1-1e-8], alpha 搜索 [1e-12, 1-1e-12], ratio 下界 1e-8 |

### 2. pwr (R)

| 项目 | 内容 |
|------|------|
| **核心价值** | Cohen 效能理论标准实现，非中心 t 分布精确计算，定义效应量处理的最简逻辑 |
| **仓库地址** | https://github.com/cran/pwr |
| **关键文件** | |
| 两组比例（等样本） | `R/pwr.2p.test.R` |
| 两组比例（不等样本） | `R/pwr.2p2n.test.R` |
| 单组比例 | `R/pwr.p.test.R` |
| t 检验（含配对） | `R/pwr.t.test.R` — **非中心 t 分布精确计算** |
| Cohen's h | `R/ES.h.R` — 反正弦变换效应量 |
| 效应量惯例 | `R/cohen.ES.R` — small/medium/large 映射 |
| **对标重点** | `pwr.t.test` 的非中心 t 分布 `pt(qt(...), ncp=sqrt(n/tsample)*d)`、uniroot 求解参数（n: [2+1e-10, 1e9], h: [1e-10, 10]）、默认容差 `.Machine$double.eps^0.25` ≈ 1.22e-4 |
| **注意** | 所有比例检验使用 Cohen's h（反正弦变换），非直接 Risk Difference；不支持 NI/Sup/Eq 边际设计 |

### 3. G\*Power 3.1

| 项目 | 内容 |
|------|------|
| **核心价值** | 全球监管公认的计算精度金标准，非中心分布精确解法，四位有效数字保证 |
| **技术手册 PDF** | https://www.psychologie.hhu.de/fileadmin/redaktion/Fakultaeten/Mathematisch-Naturwissenschaftliche_Fakultaet/Psychologie/AAP/gpower/GPowerManual.pdf |
| **核心算法论文** | https://www.uvm.edu/~statdhtx/methods8/Supplements/GPower3-BRM-Paper.pdf |
| **官方网站** | https://www.psychologie.hhu.de/arbeitsgruppen/allgemeine-psychologie-und-arbeitspsychologie/gpower |
| **本地存放** | `docs/statistics-audit/references/GPowerManual.pdf` 和 `GPower3-BRM-Paper.pdf`（需手动下载放入） |
| **底层数值库** | DCDFLIB (C) — Barry W. Brown 等人开发，非中心 t/F/χ² 精确计算 |
| **对标重点** | 精度容差 ε=1e-6、四位有效数字保证、精确/近似自动切换（N>1000 可配置）、极端尾概率优化（大 NCP 处理）、所有检验族的非中心分布精确计算 |
| **关键论文** | Faul, Erdfelder, Lang & Buchner (2007). G\*Power 3: A flexible statistical power analysis program. *Behavior Research Methods*, 39, 175-191. |
| **PDF 获取状态** | ✅ 已获取并预处理 — 见下方说明 |
| **预处理文件** | `references/GPowerManual.txt`（258KB，质量良好）、`references/GPower3-BRM-Paper.txt`（84KB，严重乱码） |
| **论文乱码说明** | Paper PDF 因字体编码问题，公式表格（Table 7-8）完全不可读。如需论文公式，参见 `AUDIT_PLAYBOOK.md` §2.2 的替代方案 |

---

## 二、临床注册级专精包（Clinical Registration Grade）

由制药巨头或统计专家维护，最符合 NMPA/FDA 监管合规要求。

### 4. TrialSize (R)

| 项目 | 内容 |
|------|------|
| **核心价值** | 临床样本量百科全书，含等效性（TOST）、交叉设计、McNemar 配对检验 |
| **仓库地址** | https://github.com/cran/TrialSize |
| **关键文件** | |
| 两组比例（等效性） | `R/TwoSampleProportion.Equivalence.R` |
| 两组比例（NI/Sup） | `R/TwoSampleProportion.NIS.R` |
| 两组比例（等效性） | `R/TwoSampleProportion.Equality.R` |
| 单组比例 | `R/OneSampleProportion.*.R` |
| 两组均值 | `R/TwoSampleMean.*.R` |
| McNemar | `R/McNemar.Test.R` |
| **对标重点** | Z 值选择模式（Equality: α/2, NIS: α, Equivalence: α + β/2）、纯闭式公式无迭代、零边界检查零取整 |
| **注意** | 所有函数返回连续值（不 ceiling），无参数验证，无脱落校正 |

### 5. gsDesign (R) — 默沙东（MSD）

| 项目 | 内容 |
|------|------|
| **核心价值** | **最重要的对标库**。FM 受约束 MLE 方差、竞争风险脱落模型、成组序贯设计、4 种效应量尺度、精确二项序贯 |
| **仓库地址** | https://github.com/keaven/gsDesign |
| **作者** | Keaven Anderson (Merck/MSD) |
| **关键文件** | |
| 二项样本量 (FM 方差) | `R/gsBinomial.R` — `nBinomial()`, `testBinomial()` |
| FM 方差计算 | `R/varBinomial.R` — Cardano 三次方程求解 |
| 连续终点 | `R/nNormal.R` — 分组方差，反向功效 |
| 生存分析 | `R/gsSurv.R` — Lachin-Foulkes, 分段指数, 竞争风险脱落 |
| 生存事件数 | `R/nEvents.R` — Schoenfeld 近似 |
| 精确二项序贯 | `R/gsBinomialExact.R` — 递归矩阵精确概率 |
| 成组序贯核心 | `R/gsDesign.R` — 13+ spending functions |
| Alpha spending | `R/gsSpending.R` — HSD, OF, Pocock, 参数化分布族 |
| 条件/预测功效 | `R/gsCP.R` — Bayesian 更新 |
| 参数验证 | `gsDErrorCheck()` — k≥1, α∈(0,1), β∈(0,1-α), timing 严格递增 |
| **对标重点（核心）** | |
| FM 方差 | 零假设方差通过三次方程（Cardano）求解受约束 MLE，非简单 unpooled |
| 4 种效应量尺度 | Risk Difference / Relative Risk / Odds Ratio / Log OR |
| 竞争风险脱落 | `λ/(λ+η) × (1 - exp(-(λ+η)t))`，非简单 `n/(1-d)` |
| 分段指数模型 | 时变风险率、时变脱落率、时变入组率（矩阵输入） |
| Lachin-Foulkes | 分离 H0/H1 方差的生存功效计算 |
| 精确二项 | 递归矩阵计算精确二项概率（小样本单臂） |
| 连续性校正 | 可选 `n/(n-1)` MN 校正，**默认关闭**（Gordon-Watson 结论） |
| **关键常量** | 数值积分 r=18 (Jennison-Turnbull 网格), 迭代 tol=1e-6, uniroot 默认容差 |

### 6. SampleSize4ClinicalTrials (R)

| 项目 | 内容 |
|------|------|
| **核心价值** | 严格区分优效/非劣/等效四类设计，侧重 III 期临床 Delta 边际处理，教科书级简洁实现 |
| **仓库地址** | https://github.com/QiHongchao/SampleSize4ClinicalTrials |
| **参考教材** | Chow, Shao, Wang (2008) *Sample Size Calculations in Clinical Research* (2nd ed.) |
| **关键文件** | |
| 均值比较 | `R/ssc_meancomp.R` — design 参数 1-4 |
| 比例比较 | `R/ssc_propcomp.R` — design 参数 1-4 |
| **对标重点** | design 编码模式（1=equality, 2=superiority, 3=NI, 4=equivalence）、NI 界值为负数（`delta=-0.05`）、等效使用 `Z_{(1-power)/2}` ≡ `Z_{1-β/2}`、仅对控制组 ceiling |
| **注意** | 仅两个函数，无 CI 估计、无单组、无配对、无生存、无连续性校正、无参数验证（仅 design 编码） |

### 7. precisely (R)

| 项目 | 内容 |
|------|------|
| **核心价值** | 基于 CI 宽度的精度驱动计算，Rothman & Greenland (2018) 框架，常用于诊断类器械样本量估算 |
| **仓库地址** | https://github.com/malcolmbarrett/precisely |
| **参考论文** | Rothman & Greenland (2018). Planning Study Size Based on Precision Rather Than Power. *Epidemiology*, 29(5):599-603. |
| **关键文件** | |
| 样本量 (5 种尺度) | `R/sample_size.R` — `n_risk_difference`, `n_risk_ratio`, `n_rate_difference`, `n_rate_ratio`, `n_odds_ratio` |
| 精度反算 | `R/precision.R` — 给定 n 算可达精度 |
| 上限概率 | `R/upper_limit.R` — 桥接精度与功效的混合计算 |
| 工具函数 | `R/utils.R` — `get_z_score()` CI→Z 转换 |
| 多场景扫描 | `R/map_precisely.R` — 参数笛卡尔积敏感性分析 |
| **对标重点** | 5 种效应量尺度（RD/RR/Rate Diff/Rate Ratio/OR）、Wald CI 公式（非 Wilson/Exact）、ratio 尺度使用 log 空间、`upper_*` 系列用 `(z_ci + z_prob)²` 桥接精度与功效 |
| **注意** | 仅 Wald CI（p 近 0/1 时覆盖率差）、无取整、无参数验证、无单组函数、无配对/诊断特异函数 |

---

## 三、功能覆盖矩阵

下表标注各库**已实现**的功能，供选择对标库时参考。

| 功能 | 本项目 | stats-models | pwr | G\*Power | Trial-Size | gs-Design | SS4CT | precisely |
|------|--------|-------------|-----|----------|-----------|----------|-------|-----------|
| 两组率 NI | ✅ | 部分 | ❌ | ✅ | ✅ | ✅(FM) | ✅ | ❌ |
| 两组率 Sup | ✅ | ✅ | ✅(h) | ✅ | ✅ | ✅(FM) | ✅ | ❌ |
| 两组率 Eq | ✅★ | ✅ | ❌ | ✅ | ✅ | N/A | ✅ | ❌ |
| 两组均值 | ✅ | ✅ | ✅(d) | ✅ | ✅ | ✅ | ✅ | ❌ |
| 单组率 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 配对 McNemar | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 多组 Bonferroni | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 率 CI 样本量 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅(RD) |
| 均值 CI 样本量 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 结果验证 FM/MN | ✅★ | ✅ | ❌ | N/A | ❌ | ✅ | ❌ | ❌ |
| 敏感性分析 | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| 反向功效 | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅(精度) |
| 非中心 t | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 精确二项 | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| RR/OR 尺度 | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| 生存分析 | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅(Rate) |
| 成组序贯 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

★ = 本项目业界领先

---

## 四、对标优先级指引

实现新功能时，按以下优先级选择对标库：

| 实现目标 | 首选对标 | 次选对标 | 原因 |
|---------|---------|---------|------|
| 参数验证器 | gsDesign `gsDErrorCheck` | G\*Power | 最完整的临床参数约束 |
| 反向功效 | pwr `uniroot` | statsmodels `solve_power` | pwr 更简洁，statsmodels 更鲁棒 |
| 非中心 t 分布 | pwr `pwr.t.test` | G\*Power DCDFLIB | pwr 源码可读性最好 |
| FM/MN 设计路径 | gsDesign `nBinomial` + `varBinomial` | — | **唯一**在设计阶段使用 FM 方差的库 |
| 精确二项 | gsDesign `gsBinomialExact` | statsmodels `binom.cdf` | gsDesign 有递归矩阵实现 |
| RR/OR 尺度 | gsDesign `nBinomial(scale=)` | precisely `n_risk_ratio` | gsDesign 含 FM 方差 |
| CI 精度驱动 | precisely `n_*` 系列 | — | 唯一专注精度的库 |
| 连续性校正 | gsDesign `adj` 参数 | statsmodels `continuity` | gsDesign 态度：默认关闭 |
| 生存分析 | gsDesign `gsSurv` + `nEvents` | — | 最完整的竞争风险+分段指数模型 |
| 通用求解器 | statsmodels `brentq_expanding` | pwr `uniroot` | statsmodels 有三级回退 |

---

## 五、文献存放说明

### 需手动下载的 PDF

以下文件需手动下载后放入 `docs/statistics-audit/references/` 目录：

| 文件名 | 下载地址 | 说明 |
|--------|---------|------|
| `GPowerManual.pdf` | https://www.psychologie.hhu.de/fileadmin/redaktion/Fakultaeten/Mathematisch-Naturwissenschaftliche_Fakultaet/Psychologie/AAP/gpower/GPowerManual.pdf | G\*Power 3.1 完整技术手册 |
| `GPower3-BRM-Paper.pdf` | https://www.uvm.edu/~statdhtx/methods8/Supplements/GPower3-BRM-Paper.pdf | Faul et al. (2007) 核心算法论文 |

### 已索引的在线论文

| 论文 | DOI/链接 | 主题 |
|------|---------|------|
| Faul et al. (2007) | [BRM 39:175-191](https://link.springer.com/article/10.3758/BF03193146) | G\*Power 3 算法框架 |
| Rothman & Greenland (2018) | PMID: 29912015 | 精度驱动研究设计 |
| Chow, Shao & Wang (2008) | ISBN: 978-1584889823 | 临床试验样本量教科书 |
| Julious (2009) | ISBN: 978-1584887393 | TOST 等效试验样本量 |
| Farrington & Manning (1990) | Stat Med 9:1447-1454 | FM 受约束 MLE 检验 |
| Lachin & Foulkes (1986) | Biometrics 42:507-519 | 生存分析功效 |
| Jennison & Turnbull (2000) | ISBN: 978-0849303166 | 成组序贯方法 |

---

*本清单随算法迭代持续更新。新增对标库时，按格式补充到对应分类中。*
