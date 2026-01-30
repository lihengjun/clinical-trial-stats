# 算法审计报告

> 本目录包含 clinical-trial-stats 统计算法的独立审计报告，对标 8 个开源统计库。
>
> 审计目的：确保算法实现达到 NMPA/FDA 医疗器械注册申报的质量标准。

## 文档索引

| 文档 | 内容 |
|------|------|
| [STATISTICS_AUDIT_REPORT.md](STATISTICS_AUDIT_REPORT.md) | 主审计报告：缺失项分析、优先级排序、重构路线图 |
| [DATA_SOURCES.md](DATA_SOURCES.md) | 8 个对标库的源码地址、关键文件、核心价值 |
| [AUDIT_PLAYBOOK.md](AUDIT_PLAYBOOK.md) | 审计工作手册：流程模板、工具链、避坑指南 |

## 对标数据源

| # | 库 | 语言 | 核心价值 |
|---|-----|------|---------|
| 1 | [statsmodels](https://github.com/statsmodels/statsmodels) | Python | 工业级 Brent 求解器，三级回退 |
| 2 | [pwr](https://github.com/cran/pwr) | R | Cohen 效能理论标准实现，非中心 t 分布 |
| 3 | [G\*Power 3.1](https://www.psychologie.hhu.de/arbeitsgruppen/allgemeine-psychologie-und-arbeitspsychologie/gpower) | Delphi/C | 全球监管公认精度金标准 |
| 4 | [TrialSize](https://github.com/cran/TrialSize) | R | 临床样本量百科全书 |
| 5 | [gsDesign](https://github.com/keaven/gsDesign) | R | 默沙东维护，FM 受约束 MLE，竞争风险脱落 |
| 6 | [SampleSize4ClinicalTrials](https://github.com/QiHongchao/SampleSize4ClinicalTrials) | R | III 期临床 Delta 边际处理 |
| 7 | [precisely](https://github.com/malcolmbarrett/precisely) | R | CI 宽度驱动的精度计算 |

## 审计方法

- 仅对比**架构设计**和**方法论差异**，不对比计算结果（结果验证由单元测试负责）
- 审计维度：边界防御、数值稳定性、求解器精度、方差模型、效应量处理
- 包含 Gemini AI 的独立交叉审计，所有来源均已标注

---

*首次审计完成于 2026-01-30*
