# TODO — clinical-trial-stats

> 待办单一信源。来源：2026-07-02 停滞恢复审计（`docs/audit/AUDIT_20260702_stagnation.md`，问题编号 CTS-xx 见该报告）+ 停滞前既有排期（STATISTICS_AUDIT_REPORT §九、P0_API_MEMO）。
> 项目停滞于 2026-02-01；本清单按恢复开发的推荐顺序排列，每组附推进思路。
> 外部引用文档在 B 侧仓 `~/Repos/wxapp_device-helper/docs/` 下：`VALIDATION_STRATEGY.md`、`P0_API_MEMO.md`、`STATISTICAL_METHODS_EXPANSION_SPEC.md`、`test-framework/`（811 快照用例）——四处路径 2026-07-10 均已实证存在。
> 最后更新：2026-07-10（两轮核对：① 状态核对——b2cb7ad 后无新提交、工作区干净、npm registry 实测 404 未发布；② 逐条实证核查——24 个条目逐条对照代码/文档/环境实况，全部确认未完成，无一"其实已经做了"；核查发现的修复定位细节已回注 CTS-01/03/04 条目）

---

## 第一批：发布阻断修复（半天量级，恢复第一个 session 做完）

- [x] **CTS-01 修 ESM 导入**（2026-07-24）：按既定思路以 B 仓文件全量灌装（B 侧先把 lru-cache 移入 statistics/utils/ 使两仓 src 目录 1:1 同构；规范化比对确认除 import 外零算法差异后 rsync 灌装，顺带统一为 B 仓 prettier 格式）。验证：本仓 npm test 116/116 通过 + ESM 冒烟 `import('./src/index.js')` 成功（65 个导出）；冒烟已固化进 CI
- [x] **CTS-07 package.json 加 files 字段**（2026-07-24）：`["src", "README*", "LICENSE"]`
- [x] **CTS-09 加 GitHub Actions CI**（2026-07-24）：`.github/workflows/ci.yml`（npm ci + ESM 冒烟 + npm test，node 版本读 .nvmrc）——⚠️ 实际生效待 push GitHub 后在 Actions 页确认
- [x] **CTS-06 README 双语进度表纠错**（2026-07-24）：MDE 行测试列 ✅→🔲（tests/ 实证无 MDE 测试文件）；"对照验证"列回填 4 项（two-group←Chow/Julious、normal-distribution←R pnorm/qnorm、diagnostic←Flahault 2005、correlation←Cohen 1988——4 个测试文件均 grep 实证含对应文献引用）
- [ ] **CTS-08 决策发布**：修完上述后 npm publish 0.1.x，或先改 README 为 git 安装说明（**需用户拍板**；CI 远端生效确认后再发更稳）

## 第二批：算法层 P1 修复（先补测试再修，顺序不能反）

- [ ] **CTS-05a 补 result-validation 测试（12 函数，全库最高风险无测试区）**
  **推进思路**：先写"锁定现状"的回归测试（含 CTS-03 的 fm==wald CI 现状），再修 bug——这样修复的 diff 会让测试从"锁定错误"翻到"锁定正确"，可审查。golden values 用 DATA_SOURCES.md 排好的 R 包（DescTools / ratesci 有 FM/MN score CI 实现）
- [ ] **CTS-03 修 FM 置信区间**：从 Wald SE 改为反演 FM score 统计量（复用 MN 二分反演骨架，two-group.js 里就有现成模式）
  （2026-07-10 核查定位：Wald CI 在 `calculateFMResult` result-validation/two-group.js:292-298；另发现 `calculateEqResult` 的 `method='fm'` 分支〔:752-772〕根本没调用 calculateFMResult、连 p 值都是纯 Wald，需一并修）
- [ ] **CTS-02 统一 α 语义**：CI/诊断类改 `confidenceLevel` 入参（或内部 `alpha/2`），全库 JSDoc 标注单/双侧
  **推进思路**：这是 API 破坏性变更，趁 npm 未发布/无用户时做掉，发布后就要背兼容包袱——**这是"先修再发"而不是"先发再修"的决定性理由**
- [ ] **CTS-04 修敏感性分析 `n0`→`n2`** + 补测试（一行修复；2026-07-10 核查定位：sensitivity/analysis.js:175 `result.n0 + result.n1`，而样本量函数返回 `{n1, n2}`，两组模式 totalSampleSize 恒为 NaN）
- [ ] **CTS-12 ratio>0 入口校验**（并入下一批的统一参数验证器亦可）
- [ ] **CTS-05b 补 MDE 测试（11 函数，README 曾虚标）**
  **推进思路**：低成本高置信的写法是正反回代——`calculateXSampleSize(δ)=n` 后验证 `calculateMDE(n)≈δ`，不需要外部 golden values

## 第三批：停滞前既有排期（STATISTICS_AUDIT_REPORT §九 整改表，17 项中真实未做的）

- [ ] **P0 统一参数验证器**（src/param-validator.js 不存在；与 CTS-02/CTS-10/CTS-12 是同一件事的不同侧面，合并做）
- [ ] P1：非中心 t 分布、FM/MN 设计阶段路径、连续性校正选项、RR/OR 效应量尺度
- [ ] P2：精确二项功效、logGamma、Brent 求解器、精度驱动样本量、反正弦变换
- [ ] 顺手：§九表"反向功效 P0 ❌"改 ✅（01-31 已实现，表未更新）；DATA_SOURCES 功能矩阵同步
  **推进思路**：P1/P2 项在 R 对照验证（下一批）跑通之前不急——对照验证会客观暴露哪些近似真的不够用，避免凭直觉排优先级

## 第四批：R 对照验证（VALIDATION_STRATEGY.md 的 5 个未勾项）

- [ ] 装 R 环境（pwr / TrialSize / DescTools / gsDesign，DATA_SOURCES.md 已列好包与源文件路径）
- [ ] 试点：两组-率-非劣效一条链跑通（R 脚本产出 golden JSON → vitest fixture 消费）
- [ ] 扩展全量：按 README 进度表逐行补"对照验证"列
  **推进思路**：产出物固定为 `tests/fixtures/golden-<module>.json`（每个值注明 R 命令），让对照验证成为可重跑的资产而不是一次性报告；McNemar 与等效率终点这两个本次审计"未验证"项优先排入
- [ ] wxapp 侧的 docs/test-framework 811 快照用例可搬来做广度回归（该资产只在 B 侧）

## 第五批：功能扩展与发布运营（停滞前的原定方向）

- [ ] **Log-rank 生存分析**（P0_API_MEMO 排的下一个模块；wxapp 的 STATISTICAL_METHODS_EXPANSION_SPEC §4.2 有 5 天量级的需求稿）
- [ ] McNemar 独立模块 / Kappa / AUC 比较（同 spec 第二批）
- [ ] **JOSS 投稿**（P0_API_MEMO 的目标；前置 = 第一、二、四批全部完成——JOSS 审稿会查测试、CI、安装可用性，正是目前的短板清单）
- [ ] CTS-10/11/13~18 规范收尾（错误处理统一、API 风格收敛、normalCDF 精度、陈旧元数据清理等，见审计报告 P2 表）

## 双源同步（与 wxapp_device-helper 共同决策，两仓 TODO 互为镜像）

> 2026-07-10 镜像核对：B 侧 `wxapp_device-helper/TODO.md` 同名段存在（B 侧拆 3 条，本仓打包 1 条），实质决策一致、无矛盾漂移；B 侧 WX-13a 声明 statistics 测试写在本仓侧（对应 CTS-05a），两仓互认。

- [x] **过渡期同步机制**（2026-07-24）：B 仓 `scripts/sync-statistics.sh` 落地——A→B 单向（src 全量镜像 + 共享文档 3 件：AUDIT_PLAYBOOK/DATA_SOURCES/STATISTICS_AUDIT_REPORT），`--check` 校验模式实测通过。范围裁定：两侧 docs README 各自描述各自目录不同步；A 的停滞审计、B 的 references/iteration-logs 各自私有。**约定：算法改动必须先落本仓（含测试），再由脚本带回 B——禁止手工双提交**。⚠️ 校验进两仓 CI 待两仓都 push 后启用（CI 中需 clone 对侧 GitHub 版，本地远端未同步前会误报）
- [ ] **终态 npm 依赖化**：B 删除 `src/utils/statistics/` 改依赖本包（前置：CTS-08 发布决策落地）
