# TODO — clinical-trial-stats

> 待办单一信源。来源：2026-07-02 停滞恢复审计（`docs/audit/AUDIT_20260702_stagnation.md`，问题编号 CTS-xx 见该报告）+ 停滞前既有排期（STATISTICS_AUDIT_REPORT §九、P0_API_MEMO）。
> 项目停滞于 2026-02-01；本清单按恢复开发的推荐顺序排列，每组附推进思路。
> 最后更新：2026-07-02

---

## 第一批：发布阻断修复（半天量级，恢复第一个 session 做完）

- [ ] **CTS-01 修 ESM 导入**：全部相对导入补 `.js` 扩展名
  **推进思路**：不要手改——wxapp_device-helper 的 fe0d546 已做过同一修复，`diff -r` 两侧 src 后直接把 B 侧 import 行回灌（已确认除 import 外零差异）；补一个最小冒烟测试 `node -e "import('clinical-trial-stats')"` 进 CI 防回归
- [ ] **CTS-07 package.json 加 `"files": ["src", "README*", "LICENSE"]`**（现在 npm pack 会带上 54KB 审计报告和全部测试）
- [ ] **CTS-09 加 GitHub Actions CI**：`npm ci && npm test`，node 24 对齐 .nvmrc
  **推进思路**：这三项做完才有资格发布；wxapp 的教训（重构后 67 个测试漂移无人拦截）证明无 CI 的测试等于没有
- [ ] **CTS-06 README 双语进度表纠错**：MDE 行测试列 ✅→🔲（虚标）；"对照验证"列回填已有依据（normal-distribution←R pnorm/qnorm、diagnostic←Flahault 2005、correlation←Cohen 1988、two-group←Chow/Julious）
- [ ] **CTS-08 决策发布**：修完上述后 npm publish 0.1.x，或先改 README 为 git 安装说明

## 第二批：算法层 P1 修复（先补测试再修，顺序不能反）

- [ ] **CTS-05a 补 result-validation 测试（12 函数，全库最高风险无测试区）**
  **推进思路**：先写"锁定现状"的回归测试（含 CTS-03 的 fm==wald CI 现状），再修 bug——这样修复的 diff 会让测试从"锁定错误"翻到"锁定正确"，可审查。golden values 用 DATA_SOURCES.md 排好的 R 包（DescTools / ratesci 有 FM/MN score CI 实现）
- [ ] **CTS-03 修 FM 置信区间**：从 Wald SE 改为反演 FM score 统计量（复用 MN 二分反演骨架，two-group.js 里就有现成模式）
- [ ] **CTS-02 统一 α 语义**：CI/诊断类改 `confidenceLevel` 入参（或内部 `alpha/2`），全库 JSDoc 标注单/双侧
  **推进思路**：这是 API 破坏性变更，趁 npm 未发布/无用户时做掉，发布后就要背兼容包袱——**这是"先修再发"而不是"先发再修"的决定性理由**
- [ ] **CTS-04 修敏感性分析 `n0`→`n2`** + 补测试（一行修复）
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

- [ ] **决策同步机制**：终态推荐 npm 依赖化（B 删除 `src/utils/statistics/` 改依赖本包）；过渡期先建单向复制脚本 A→B + CI diff 校验
  **推进思路**：现状"1 分钟内手工双提交"已产生首例单侧漂移（CTS-01 本身）。npm 化的前置是本仓第一批修完 + 发布；在那之前哪怕先加一个 `diff -r` 校验脚本进两仓 CI，也能把漂移从"静默"变"报警"。docs/audit 三份文档同样在漂移范围内（B 侧 docs/statistics-audit/ 是第三份副本），同步机制要一并覆盖文档
