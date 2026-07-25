# TODO 归档 — clinical-trial-stats（已完成条目）

> **已完成条目归档**。出处：项目根 `TODO.md`（待办单一信源）。本文件按**原批次分节**，条目**原文照搬不删减**（完成日期 / commit / 验证计数 / 产线账注记全部保留）。
> 建档：2026-07-25（产线 w10 交接整理，从根 TODO.md 搬移 15 条已完成条目）。
> 用法：活跃待办仍以根 `TODO.md` 为唯一信源；本文件只读留档、**不是**待办清单，不在此新增条目。

---

## 第一批：发布阻断修复（半天量级，恢复第一个 session 做完）

> ✅ 全批完成 2026-07-24（5 条，无遗留）。

- [x] **CTS-01 修 ESM 导入**（2026-07-24）：按既定思路以 B 仓文件全量灌装（B 侧先把 lru-cache 移入 statistics/utils/ 使两仓 src 目录 1:1 同构；规范化比对确认除 import 外零算法差异后 rsync 灌装，顺带统一为 B 仓 prettier 格式）。验证：本仓 npm test 116/116 通过 + ESM 冒烟 `import('./src/index.js')` 成功（65 个导出）；冒烟已固化进 CI
- [x] **CTS-07 package.json 加 files 字段**（2026-07-24）：`["src", "README*", "LICENSE"]`
- [x] **CTS-09 加 GitHub Actions CI**（2026-07-24）：`.github/workflows/ci.yml`（npm ci + ESM 冒烟 + npm test，node 版本读 .nvmrc）——⚠️ 实际生效待 push GitHub 后在 Actions 页确认
- [x] **CTS-06 README 双语进度表纠错**（2026-07-24）：MDE 行测试列 ✅→🔲（tests/ 实证无 MDE 测试文件）；"对照验证"列回填 4 项（two-group←Chow/Julious、normal-distribution←R pnorm/qnorm、diagnostic←Flahault 2005、correlation←Cohen 1988——4 个测试文件均 grep 实证含对应文献引用）
- [x] **CTS-08 发布决策**（2026-07-24 用户拍板）：npm 暂不发布，先 GitHub——README 双语安装说明已改为 `npm install github:lihengjun/clinical-trial-stats`；npm publish 待后续另行拍板

## 第二批：算法层 P1 修复（先补测试再修，顺序不能反）

> ✅ 全批完成 2026-07-24/25（6 条，无遗留）。

- [x] **CTS-05a 补 result-validation 测试**（2026-07-24 产线 w1）：4 文件 12/12 函数锁定现状测试 66 用例（tests/result-validation/）；CTS-03 两处 bug 现状已锁定并注记待修。审计：主审 PASS×2 + 抽样复核两次均为复核环境假阴性（仲裁 OVERTURNED，产物无属实指控）；npm test 223/223。产线账：PROGRESS.tsv w1。R golden 对照仍归第四批
- [x] **CTS-03 修 FM 置信区间**（2026-07-24 产线 w2）：calculateFMResult CI 改 FM score 统计量二分反演 + calculateEqResult fm 分支接通 TOST；锁定现状测试翻转 3 用例。审计含数学核查（CI 边界回代 score≈临界值）PASS 封版；npm test 238/238。产线账：PROGRESS.tsv w2 FIX1
- [x] **CTS-02 统一 α 语义**（2026-07-24 产线 w3，跨仓）：CI 估算 4 函数入参 alpha→confidenceLevel（等价自检逐字节一致），全库 11 文件 JSDoc 按实际内部用法标注单双侧；B 仓消费端全仓 6 调用点适配（ci-logic 4 + 审计抓出的 simulation-logic 残留 2，后者补 7 用例锁定原无覆盖区）。npm test A 238/238 + B 188/188。产线账：PROGRESS.tsv w3（审 FAIL→补修闭合封版）
- [x] **CTS-04 修敏感性分析 totalSampleSize 恒 NaN**（2026-07-24 产线 w2）：原定位的率终点键名错已修；抽样复核+仲裁另实证连续终点分支三处传参错配（sd 落 alpha 槽，analysis.js:104/:114/:123）一并闭合；新增 15 用例（含 two-mean 三 studyType 数值锁定）。npm test 238/238。产线账：PROGRESS.tsv w2 FIX2（复核 FAIL→仲裁 UPHELD→补修闭合）
- [x] **CTS-12 ratio>0 入口校验**（2026-07-25 随 w8 统一参数验证器闭合，含 sigma/sd 等全域防御，slip-through 4 路径 runtime 验证闭合）
- [x] **CTS-05b 补 MDE 测试**（2026-07-24 产线 w1）：11/11 函数正反回代闭环 41 用例（tests/power-analysis/effect-size-calculation.test.js），主审 PASS 封版。README 进度表 MDE 测试列可回 ✅（随下次 README 更新）

## 第三批：停滞前既有排期（STATISTICS_AUDIT_REPORT §九 整改表，17 项中真实未做的）

> 本批未完成项（P1 / P2 / 顺手表回更）仍在根 TODO.md 活跃组③。

- [x] **P0 统一参数验证器**（2026-07-25 产线 w8，commit 9c6d7e0）：src/core/param-validator.js（{valid,errors,warnings} 结构体，硬拒线=数学域、域内反常归 warnings，对外保持 NaN 哲学零 throw）+ 38 入口接线（审计抓出 8 处 validate 次序错误已修）+ 4 条除零静默算错路径闭合 + 2 处旧兜底断言审定翻转；npm test 302/302。CTS-10 错误契约与 CTS-12 随之闭合。产线账：PROGRESS.tsv w8

## 第四批：R 对照验证（VALIDATION_STRATEGY.md 的 5 个未勾项）

> 本批未完成项（扩展全量 / 811 快照搬迁）仍在根 TODO.md 活跃组① 与组②。

- [x] 装 R 环境（2026-07-25 产线 w9）：R 4.6.1 + TrialSize/gsDesign（试点最小集；pwr/DescTools 随扩展全量按需装）
- [x] 试点：两组-率-非劣效链跑通（2026-07-25 产线 w9，commit 5f87980）：14 组 golden（每值含完整 R 调用命令，可重跑）+ fixture 消费测试；max 相对偏差 1.60%，2 条超容差入已知偏差清单（近似薄弱区，供第三批 P1 精度项排序用）。审计含 golden 逐字重放验真；npm test 327/327

## 双源同步（与 wxapp_device-helper 共同决策，两仓 TODO 互为镜像）

> 本段未完成项「终态 npm 依赖化」仍在根 TODO.md 活跃组⑤。

- [x] **过渡期同步机制**（2026-07-24）：B 仓 `scripts/sync-statistics.sh` 落地——A→B 单向（src 全量镜像 + 共享文档 3 件：AUDIT_PLAYBOOK/DATA_SOURCES/STATISTICS_AUDIT_REPORT），`--check` 校验模式实测通过。范围裁定：两侧 docs README 各自描述各自目录不同步；A 的停滞审计、B 的 references/iteration-logs 各自私有。**约定：算法改动必须先落本仓（含测试），再由脚本带回 B——禁止手工双提交**。校验已进 B 仓 CI（clone 本仓 GitHub 版跑 `--check`；B 仓 run 30096708051 实测 success，2026-07-24）——方向裁定：A→B 单向流，校验放 B 侧即可，本仓 CI 不加
