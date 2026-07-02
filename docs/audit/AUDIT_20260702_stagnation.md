# 停滞恢复审计报告（2026-07-02）

> 背景：项目停滞于 2026-02-01（最后 commit 68ad62a，工作树干净、与 origin 同步），距今 5 个月。本审计目标：查清代码问题、核实文档声称、重建停滞现场，**只记录不修复**。行动项与推进思路见项目根 `TODO.md`。
>
> 审计方式：算法正确性（全 24 个 src 文件通读 + 10 个有公开标准答案的经典算例 node 实跑 spot-check）+ 测试实跑（vitest）+ 工程质量 + 与关联项目 wxapp_device-helper 的双源漂移分析。关键发现均经独立复核（node 实跑 / 静态读行确认）。

---

## 总判定

**核心算法可信**：10/10 spot-check 通过（Cohen、Chow、Flahault、Julious、Wilson 经典数值全对齐），116/116 测试全绿，无"对合法标准输入算出错误样本量"的公式错误。问题集中在：**包级 ESM 损坏（P0）**、**API α 语义不统一（P1）**、**FM 方法 CI 名不副实（P1）**、36 个导出函数零测试、npm 未发布但 README 教人安装。

---

## P0（发布阻断）

### CTS-01 纯 Node ESM 环境下包不可用（ERR_MODULE_NOT_FOUND）
- **位置**：src/ 全部相对导入无 `.js` 扩展名；package.json `"type": "module"` + `"main": "src/index.js"`
- **问题**：Node 原生 ESM 要求显式扩展名——`import 'clinical-trial-stats'` 直接 ERR_MODULE_NOT_FOUND（已实跑复核确认）。vitest 走自己的解析器能吞无扩展名导入，所以 116 个测试全绿**掩盖**了这一点
- **讽刺的是修复已存在**：关联项目 wxapp_device-helper 的 fe0d546（2026-02-01"ESM 兼容"）给同一份代码全部补了 `.js` 扩展名，但从未回灌本仓——npm 权威侧反而是坏的那边（见 § 双源漂移）
- **方案**：从 wxapp 侧回灌 `.js` 扩展名修复（23 个文件、纯 import 行差异，diff 已确认无其他改动）；补一个"node 直接 import 冒烟测试"防回归

## P1（特定用法下产生错误结果）

### CTS-02 跨模块 α 语义不统一，CI 估计层最危险
- **位置**：`src/ci-estimation/proportion-ci.js:29`、`mean-ci.js:27`（`normalInverse(1-alpha)` 单侧语义）vs `result-validation/two-group.js:735,876` 等效层（`1-alpha/2` 双侧语义）vs 设计层 NI/Sup/Eq（单侧，传 0.025）vs 诊断层（confidenceLevel）
- **问题**：用户按"95% CI 传 α=0.05"的直觉调用 `calculateMeanCISampleSize(σ=10, w=2, α=0.05)` 得 **68**，正确 95% CI 值是 **97**（实拿 90% CI 的 z=1.645）——样本量低估 30%（已实跑复核）。同一 α 值在等效设计层（0.025）与等效验证层（0.05）之间复用即错配检验水平
- **方案**：统一入口语义——CI/诊断类改用 `confidenceLevel`，或 CI 估计层内部改 `alpha/2`；所有函数 JSDoc 显式标注单/双侧；这是 STATISTICS_AUDIT_REPORT §九 P0"统一参数验证器"的一部分，应合并实施

### CTS-03 `method='fm'` 的置信区间实为 Wald 区间
- **位置**：`src/result-validation/two-group.js:293-298`（已静态复核：注释自述"使用观测比例计算置信区间的标准误"）
- **问题**：FM 的 p 值确实用 RMLE（H0 约束方差，正确），但 CI 用观测比例 Wald SE——实测 fm 与 wald 的 CI 完全相同，而 mn 是真正的 score 反演。`isNonInferior` 由 CI 下限驱动 → "FM 方法"的非劣决策实际等同 Wald，与文档"FM 推荐用于非劣"意图不符
- **方案**：FM CI 改为反演 FM score 统计量（可复用 MN 的二分反演骨架）；补 result-validation 测试（该 12 函数区目前零测试，见 CTS-05）

## P2（次要功能 / 鲁棒性 / 工程）

| ID | 位置 | 问题 | 方案 |
|---|---|---|---|
| CTS-04 | sensitivity/analysis.js:175 | 两组模式 `result.n0 + result.n1`，但样本量函数返回 `{n1,n2}` 无 n0 → totalSampleSize 恒 NaN（已静态复核） | 改 `result.n1 + result.n2` + 补测试 |
| CTS-05 | tests/ | **36 个导出函数零测试**：MDE 全家 11 个（README 却虚标已测）、result-validation 全部 12 个（FM/MN 最复杂算法区，CTS-03 恰好在此）、sample-size 单组/配对/多组 6 个、CI 估计 4 个、敏感性、WilsonCI、LRUCache | 见 TODO.md 推进思路（正反回代法可低成本覆盖 MDE） |
| CTS-06 | README.md + README.en.md 进度表 | MDE 行测试列虚标 ✅（其余 18 行准确）；"对照验证"列全 "—" 过于保守——已有测试实质含 R/Cohen/Flahault/Julious golden values 可直接回填 | 改表 + 回填 |
| CTS-07 | package.json | 无 files 字段/.npmignore：npm pack 实测 44 文件 362.8KB，把 tests/、54KB 审计报告、scripts/、.vscode 全打进包 | `"files": ["src","README*","LICENSE"]` |
| CTS-08 | README 安装节 | `npm install clinical-trial-stats` 但包**从未发布**（registry 404，已复核）——对读者是死路 | 修完 CTS-01/07 后首发 0.1.x，或临时改 git 安装说明 |
| CTS-09 | 仓库根 | 无 CI（无 .github/）——116 个测试无自动防线，测试漂移风险同 wxapp 前车之鉴 | GitHub Actions: npm ci && npm test（node 24 对齐 .nvmrc） |
| CTS-10 | src/ 全局 | 错误处理三风格并存（NaN 返回 / {error:'中文'} / 无 throw），调用方无法统一判错 | 统一约定并文档化 |
| CTS-11 | src/ API | 签名风格分裂：老模块位置参数（最多 9 个）vs 新模块 options 对象 | 长期向 options 收敛，位置参数留兼容层 |
| CTS-12 | sample-size/two-group/*、multigroup.js | ratio≤0 不校验，被 safeDivide 静默吞掉 → ratio=0 返回貌似合理的 {n1:48, n2:0} | 入口校验 ratio>0（并入统一参数验证器） |
| CTS-13 | core/normal-distribution.js:40 | normalCDF 单一 Hart/A&S 近似（~1e-7 绝对误差），远尾相对误差大；correlation 模块还重复实现了一份 normalCDFApprox（漂移风险） | 远期换高精度实现；先删重复实现统一导入 |
| CTS-14 | sample-size/paired.js、result-validation/paired.js | 配对验证层 p 值检验 diff=0 而非 NI/δ 假设（决策靠 CI 不影响结论，但 p_value 语义与研究类型不匹配） | 文档标注或补 δ 偏移检验 |
| CTS-15 | src/index.js:21 | calculateWilsonCI 死导入（导入未使用未导出）；calculateRateCI 内部另有一份 Wilson 实现（数值一致但重复） | 二选一收敛 |
| CTS-16 | src/ 15 处 | `@author Device Helper Team` + `@module utils/statistics/...` 陈旧元数据（从 wxapp 抽取时残留） | 批量清理 |
| CTS-17 | result-validation/one-sample.js、sample-size/one-sample.js | 公开函数 0 个 @param（其余模块 JSDoc 完整） | 补齐 |
| CTS-18 | FM/MN 迭代求解 | 不收敛时返回区间中点且无 converged 标志（power/MDE 有该字段，FM/MN 无） | 补 converged 字段对齐 |
| CTS-19 | docs/audit/ | STATISTICS_AUDIT_REPORT §九"反向功效 P0 ❌"已过时（次日即实现）；DATA_SOURCES 功能矩阵同样过时；提到的 references/ PDF 目录在本仓不存在（在 wxapp 侧） | 回更两份文档 |

---

## 各模块实现选择摘要（审计确认的口径，供后续开发对照）

| 模块 | 方差 | 单/双侧 α | 备注 |
|---|---|---|---|
| sample-size NI/Sup 率 | unpooled H1 | 单侧（传 0.025） | 两组均 ceil |
| sample-size 等效 | unpooled | 单侧；Δ=0 用 Z₁₋β/₂、Δ≠0 用 Z₁₋β（Julious 动态切换，回代功效 0.8028 验证正确） | |
| sample-size 单组/配对/多组 | H0/H1 分别 / p10+p01 / unpooled+Bonferroni α/k | 单侧 | McNemar 简化式 |
| result-validation | 默认 Wald；fm=RMLE p 值+Wald CI（CTS-03）；mn=score N/(N-1) 反演；wilson=Newcombe | NI/Sup 单侧；**等效双侧（传 0.05）** | 连续端 pooled 方差、z 近似（注释已说明） |
| ci-estimation | Wilson / 正态 | **单侧语义（CTS-02）** | |
| power/MDE | 与 sample-size 同方差；二分求解 MAX_ITER 50、TOL 1e-6 | 单侧 | 收敛正常，有 converged 字段 |
| 数值核心 | normalInverse=Acklam(~1e-9)+LRU(25)，缓存 key 覆盖唯一输入无漏参 bug；normalCDF=Hart(~1e-7) | | |

## Spot-check 通过记录（10/10）

标准正态分位数/CDF、Cohen d=0.5 两组均值 63、两率优效 79、Wilson CI (0.133,0.290)、Cohen 1988 相关表 85/30/783、Flahault 诊断 196/139、单组连续 32、等效功效回代 0.8028、优效正反回路 0.8013、Fisher Z 0.3095。McNemar 与等效率终点缺权威闭式答案，未验证（不编造）。

---

## 双源漂移分析（与 wxapp_device-helper/src/utils/statistics/）

- **结构完全同构**：23 个共有文件、53 个导出函数一致；全树 diff 确认差异**仅为 import 语句**（B 侧有 `.js` 扩展名），safe-math/effect-size 两文件 byte 级相同——**当前无算法级漂移**
- **方向**：B（wxapp）先写（2026-01-19 模块化拆分），2026-01-30 抽出成本仓；之后同一工作现场**1 分钟内手工双提交**维持同步（01-31 两仓提交相隔 1 分钟）
- **已现首例单侧漂移**：即 CTS-01——B 修了 ESM，A 没有
- **权威侧结论**：以本仓（A）为权威（有独立测试、审计文档、npm/JOSS 定位，P0_API_MEMO 已明确该决策），但须先回灌 CTS-01。同步机制推荐**终态 npm 依赖化**（B 删除内置副本改依赖本包），过渡期用单向复制脚本 + diff 校验。详见两仓 TODO.md

## 停滞点重建

01-30 一天完成建仓、Initial release、双语 README、审计报告公开；01-31 落地 power/MDE/诊断/相关 4 模块（与 wxapp 双写）；02-01 02:16 最后一笔是开发环境工具（.vscode/.nvmrc/check-env.cjs）——"整理好工位准备长期开发"。原定下一步（P0_API_MEMO 明文）：**补 Log-rank 生存分析 + JOSS 投稿**；审计报告 §九 排的 17 项整改一项未动。停在"发布了 v0.1.0（实际从未 npm publish）+ 排好施工表"的前夜。

## 未验证清单

- McNemar 配对样本量、等效率终点与 Newcombe/Score 文献值的数值对照（缺权威闭式答案，留待 R 对照验证阶段）
- GitHub 远端的 issue/PR 状态（本审计未访问 GitHub）

---

*审计执行：2026-07-02，主控 + 3 个相关审计 agent（算法正确性 / 测试与工程 / 双源盘点），全程只读（本报告与 TODO.md 除外）。*
