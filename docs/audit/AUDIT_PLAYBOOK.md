# 统计算法审计工作手册（Playbook）

> 本文档记录审计流程中的经验教训、工具链说明和操作指南。
> 目的：下次开展算法审计时可快速复现，避开已知陷阱。

---

## 一、审计工作概览

### 1.1 审计范围

本次审计对标 8 个数据源，审查本项目 `src/utils/statistics/` 下的全部样本量计算代码：

| # | 数据源 | 获取方式 | 质量评级 |
|---|--------|---------|---------|
| 1 | statsmodels (Python) | GitHub WebFetch 抓取源码 | ⭐⭐⭐ 完整可读 |
| 2 | pwr (R) | GitHub WebFetch 抓取源码 | ⭐⭐⭐ 完整可读 |
| 3 | G\*Power 3.1 | PDF 手册+论文（本地转 txt）| ⭐⭐ 见下方详述 |
| 4 | TrialSize (R) | GitHub WebFetch 抓取源码 | ⭐⭐⭐ 完整可读 |
| 5 | gsDesign (R) | GitHub WebFetch 抓取源码 | ⭐⭐⭐ 完整可读，**最有价值** |
| 6 | SampleSize4ClinicalTrials (R) | GitHub WebFetch 抓取源码 | ⭐⭐⭐ 完整可读 |
| 7 | precisely (R) | GitHub WebFetch 抓取源码 | ⭐⭐⭐ 完整可读 |
| 8 | Gemini 独立审计 | 用户提供截图 | ⭐⭐ 补充视角 |

### 1.2 产出文件

| 文件 | 说明 |
|------|------|
| `STATISTICS_AUDIT_REPORT.md` | 主审计报告（含 2 个附录） |
| `DATA_SOURCES.md` | 数据源清单与关键文件索引 |
| `AUDIT_PLAYBOOK.md` | 本文件：操作手册 |
| `references/GPowerManual.txt` | G\*Power 手册 PDF 转文本（258KB） |
| `references/GPower3-BRM-Paper.txt` | G\*Power 论文 PDF 转文本（84KB） |

---

## 二、G\*Power PDF 处理经验

### 2.1 两份 PDF 概况

#### GPowerManual.pdf（技术手册）

| 属性 | 值 |
|------|-----|
| 文件大小 | 3.5 MB |
| 页数 | 85 页 |
| 内容 | G\*Power 3.1 完整用户手册，覆盖所有支持的检验族 |
| 文本提取质量 | ✅ **良好** — PyPDF2 可正常提取，文字基本完整可读 |
| 预处理文件 | `references/GPowerManual.txt`（258KB） |
| Claude 可读性 | ✅ 可通过分段读取 txt 获取完整信息 |

**手册核心章节索引**：
- 第1-3章：界面操作（可跳过）
- 第4-5章：五种分析模式（A priori / Post hoc / Sensitivity / Compromise / Criterion）
- 第6-13章：t 检验族（两独立样本、配对、单样本、相关回归）
- 第14-19章：F 检验族（ANOVA、ANCOVA、MANOVA、回归）
- 第20-24章：χ² 检验族（拟合优度、列联表、logistic 回归）
- 第25-29章：精确检验族（Fisher、McNemar、二项）
- 第30-31章：z 检验族（比例检验 8 种统计量）、四分相关

**已提取的关键信息**：
- 五种分析模式的完整定义
- 精确法 vs 近似法的切换策略
- McNemar 精确无条件功效计算
- 两组比例检验的 4 种效应量输入模式
- 精确法 N 上限阈值自动切换机制

#### GPower3-BRM-Paper.pdf（算法论文）

| 属性 | 值 |
|------|-----|
| 文件大小 | 2.9 MB |
| 页数 | 46 页（含附录） |
| 内容 | Faul et al. (2007) G\*Power 3 核心算法描述 |
| 文本提取质量 | ❌ **严重乱码** — 字体编码问题，`%` 替换 `e`，公式表格完全不可读 |
| 预处理文件 | `references/GPower3-BRM-Paper.txt`（84KB） |
| Claude 可读性 | ⚠️ 部分可读 — 标题和段落文字可辨，但公式表格（Table 7-8）完全损坏 |

**论文乱码示例**：
```
原文可能是: "effect size"
提取结果: "%ff%ct siz%"

Table 7-8（8种比例检验统计量）: 完全不可读
```

**已提取的关键信息**（从可读部分）：
- DCDFLIB 底层数值库的使用确认
- 精确法优先策略（"完全放弃近似法"）
- 四位有效数字保证
- Cohen 效应量分类表（Table 1，部分可读）

### 2.2 下次需要论文公式时的操作指南

如果未来需要 GPower3-BRM-Paper.pdf 中的**具体公式**（特别是 Table 7-8 的 8 种比例检验统计量），txt 提取无法满足。建议：

**方案 A：用户协助（推荐）**

用户将以下指令发送到 Claude Web 端（支持直接上传 PDF）：

```
请阅读附件 GPower3-BRM-Paper.pdf，提取以下信息：

1. Table 7 (Approximate Power Analyses for z Tests on Proportions)
   - 列出所有 8 种统计量的名称和完整公式
   - 特别注意 pooled/unpooled 方差的区别
   - 连续性校正项的具体形式

2. Table 8 (Exact Power Analyses)
   - 列出所有精确检验的非中心参数 (NCP) 公式
   - FM (Farrington-Manning) 和 MN (Miettinen-Nurminen) 的参数化差异

3. Section 3.2 (Proportions: z Tests)
   - 完整摘录该节的数学推导过程

4. 附录中的 DCDFLIB 函数映射
   - 哪些 C 函数对应哪些分布的 CDF/逆函数

请将提取结果整理为 Markdown 格式，每个公式用 LaTeX 或纯文本标记。
```

**方案 B：替代信息源**

gsDesign 的 R 源码 `R/gsBinomial.R` + `R/varBinomial.R` 已包含 FM/MN 方差的**可执行实现**，在多数场景下比论文公式更直接有用。优先使用此源码，仅在需要理论推导或 8 种统计量完整列表时才回退到论文 PDF。

**方案 C：OCR 重新提取**

使用更高质量的 PDF 提取工具（如 `pdfplumber`、Adobe Acrobat 导出、或 `tesseract` OCR）重新提取。但性价比不如方案 A。

### 2.3 PDF 预处理工具链

本次使用的预处理命令：

```bash
# 安装
pip3 install PyPDF2

# 转换脚本（Python 3）
python3 -c "
import PyPDF2
reader = PyPDF2.PdfReader('references/GPowerManual.pdf')
with open('references/GPowerManual.txt', 'w', encoding='utf-8') as f:
    for i, page in enumerate(reader.pages):
        f.write(f'\n===== PAGE {i+1} =====\n')
        f.write(page.extract_text() or '[empty]')
"
```

**注意事项**：
- PyPDF2 对纯文字 PDF 效果好，对扫描件或复杂字体编码的 PDF 效果差
- GPowerManual.pdf 是原生文字 PDF → 提取良好
- GPower3-BRM-Paper.pdf 使用了特殊字体编码 → 提取严重乱码
- 每份 PDF 需要单独测试提取质量，不能假设都能正常提取

### 2.4 Claude 对话中读取大文件的经验

| 方法 | 结果 | 说明 |
|------|------|------|
| 直接读取 PDF | ❌ 失败 | 文件过大，对话被中断 |
| Agent 读取 PDF | ❌ 失败 | Agent 也会超限 |
| Agent 读取 txt | ⚠️ 需分段 | 258KB 文件需分 4-5 段读取 |
| 主对话分段读取 txt | ⚠️ 占用大量上下文 | 不推荐在主对话中读取 |
| Agent 分段读取 + 摘要返回 | ✅ **最佳方案** | Agent 内部分段读取，仅返回摘要 |

**最佳实践**：
1. 将 PDF 转为 txt（预处理）
2. 启动 Agent（Task 工具），让 Agent 在子进程中分段读取 txt
3. Agent 仅返回精炼摘要，不将全文带回主对话
4. 主对话仅保留摘要结果，避免上下文膨胀

---

## 三、各数据源代码获取方法

### 3.1 GitHub WebFetch 获取 R/Python 源码

对于 GitHub 上的开源库，使用 `raw.githubusercontent.com` 直接抓取源码文件：

```
URL 模式：
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}

示例：
https://raw.githubusercontent.com/keaven/gsDesign/main/R/gsBinomial.R
https://raw.githubusercontent.com/statsmodels/statsmodels/main/statsmodels/stats/power.py
```

**注意**：
- 优先使用 `main` 分支，部分老库使用 `master`
- 单个文件不超过 1MB 通常可直接获取
- 如果文件过大，可先获取目录结构（GitHub API），再逐个获取关键文件

### 3.2 关键文件清单（可直接复用）

下次审计时，优先获取以下文件（按价值排序）：

```
# gsDesign (最重要)
R/gsBinomial.R          # FM 方差 + 二项样本量
R/varBinomial.R         # Cardano 三次方程
R/nNormal.R             # 连续终点
R/gsSurv.R              # 生存分析
R/gsDesign.R            # 成组序贯核心

# statsmodels
statsmodels/stats/power.py       # 求解器框架
statsmodels/stats/proportion.py  # 比例检验
statsmodels/tools/rootfinding.py # 自定义求根器

# pwr
R/pwr.t.test.R          # 非中心 t 分布
R/pwr.2p.test.R         # 两组比例
R/ES.h.R                # Cohen's h

# TrialSize
R/TwoSampleProportion.Equivalence.R
R/TwoSampleProportion.NIS.R
R/TwoSampleMean.NIS.R
```

---

## 四、审计流程模板

### 4.1 标准审计步骤

```
Step 1: 确定审计范围
  └─ 明确要审查的本项目文件（如 utils/statistics/sample-size/）

Step 2: 获取对标源码
  └─ 按 §3.2 清单获取关键文件
  └─ 如有 PDF 参考文献，按 §2.3 预处理

Step 3: 逐项对比
  └─ 维度：边界防御、数值稳定性、求解器精度、方差模型、效应量
  └─ 每项记录：本项目现状 → 行业标准 → 差距 → 优先级

Step 4: 输出报告
  └─ 更新 STATISTICS_AUDIT_REPORT.md
  └─ 更新优先级表
  └─ 记录迭代日志到 iteration-logs/

Step 5: Gemini 交叉验证（可选）
  └─ 将本项目源码发给 Gemini 进行独立审计
  └─ 合并有价值的发现，标注来源
```

### 4.2 Gemini 交叉审计指令模板

如需再次使用 Gemini 进行交叉审计，可使用以下指令：

```
请对以下统计计算代码进行深度审计，对标行业开源库（gsDesign, statsmodels, G*Power, pwr, TrialSize）：

[粘贴源代码文件]

审计维度：
1. 边界防御：除零、溢出、NaN 传播
2. 数值稳定性：浮点精度、对数空间
3. 方差模型：Wald vs Pooled vs Score (FM/MN)
4. 效应量处理：Cohen's d/h/f/w
5. 求解器架构：封闭公式 vs 迭代求解
6. 监管合规：NMPA/FDA 审评关注点

请逐项列出差距，给出优先级评估（P0-P3），并提供具体改进建议。
```

---

## 五、已知陷阱与注意事项

### 5.1 技术陷阱

| 陷阱 | 说明 | 应对 |
|------|------|------|
| PDF 字体编码 | 部分学术论文 PDF 使用特殊字体映射，PyPDF2 无法正确提取 | 预先测试提取质量，准备方案 B（Claude Web 上传） |
| 对话上下文超限 | 大文件读取会迅速耗尽对话上下文 | 使用 Agent 子进程读取，仅返回摘要 |
| GitHub raw 文件 404 | 分支名可能是 `master` 而非 `main` | 先检查仓库默认分支 |
| R 代码隐式依赖 | R 包内部函数可能调用未导出的辅助函数 | 同时获取 `R/utils.R` 或相关辅助文件 |

### 5.2 方法论注意

| 注意事项 | 说明 |
|---------|------|
| 不比对计算结果 | 审计关注架构和方法差异，不做数值结果对比（那是单元测试的职责） |
| 注意默认值差异 | 不同库的默认行为可能相反（如连续性校正：gsDesign 默认关，Gemini 建议开） |
| 区分设计路径 vs 验证路径 | gsDesign 的 FM 方差用于设计（计算 n），本项目的 FM 仅用于验证（检查结果） |
| Gemini 观点需校验 | Gemini 提供有价值的补充视角，但部分建议与源码实际行为不一致，需交叉验证 |

---

## 六、下次审计快速启动清单

```
□ 读取本文件 (AUDIT_PLAYBOOK.md) 回顾流程
□ 读取 STATISTICS_AUDIT_REPORT.md 了解上次审计结论
□ 读取 DATA_SOURCES.md 获取源码地址
□ 检查 references/ 下的 txt 预处理文件是否仍然可用
□ 确认 GitHub 仓库是否有更新（特别是 gsDesign）
□ 获取最新源码进行对比
□ 更新报告并记录迭代日志
```

---

*创建于 2026-01-30，基于首次全面审计的经验总结。*
