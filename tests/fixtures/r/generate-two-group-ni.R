#!/usr/bin/env Rscript
# ---------------------------------------------------------------------------
# 两组-率-非劣效 golden 生成脚本 / Two-Group Proportion Non-Inferiority Golden
#
# 目的: 为本库 calculateNISampleSize（率终点）生成 R 对照金标准（golden）值，
#       输出 tests/fixtures/golden-two-group-ni.json，供 JS fixture 测试逐条对照。
#
# 方法学 / Methodology:
#   - 主 golden (pass/fail): TrialSize::TwoSampleProportion.NIS
#       Chow, Shao, Wang & Lokhnygina (2017) 非劣效两组比例公式，unpooled 正态近似，
#       与本库 non-inferiority.js 使用的完全同一闭式公式 → 用于验证「实现保真度」
#       （本库是否正确实现了 Chow 公式）。偏差来源仅为本库取整 ⌈n⌉ vs R 连续值。
#   - 交叉参考 (informational): gsDesign::nBinomial
#       Farrington-Manning 受约束 MLE 方差（临床注册金标准，DATA_SOURCES 指定
#       「最重要的对标库」）→ 记录「本库正态近似 vs FM 方差」的方法学差异。
#       ⚠️ gsDesign 的 NI 非对称符号约定经实测存在歧义（p1≠p2 或 ratio≠1 时映射不唯一，
#          曾得到异常值），无法逐一独立复核 → fm_reference 仅对「对称 p1=p2 且 ratio=1」
#          的可无歧义映射场景计算；其余置 null。
#
# 参数映射（本库 → TrialSize NIS，已 runtime 逐点复核）:
#   本库 calculateNISampleSize(p1=对照, p2=试验, delta=NI界值>0, alpha, power, ratio=n2/n1)
#   TrialSize NIS(alpha, beta=1-power, p1=试验, p2=对照, k=ratio, delta=试验-对照, margin=-界值)
#     返回 n1 = 试验组连续样本量；对照组 = n1/k。
#   （对称场景 p1=p2、ratio=1 时两组相等，无歧义。）
#
# 可重跑资产: 全闭式、无随机数 → 确定性输出；数值统一 round(.,6) + 去尾零格式化，
#             重跑生成字节一致 JSON。再生成入口: npm run golden:two-group-ni
#
# @generated-by tests/fixtures/r/generate-two-group-ni.R
# ---------------------------------------------------------------------------

suppressMessages({
  library(TrialSize)
  library(gsDesign)
})

REL_TOL <- 0.02      # 主测试容差: 界定取整偏差（实测 max 1.60% @ n~50, median 0.23%）
METHOD_BAND <- 0.02  # FM 方法带: 实测对称场景呈双峰——6/8 例 <1.8% 一致，
                     # 2 例高基线边界 (p>=0.85) 超 2.5% → 标 known_deviation 待第三批 P1

# --- 数值格式化: round(.,6) 后去尾零, 保证 JSON 字节稳定且无浮点噪声 ---
nf <- function(x) {
  s <- formatC(round(x, 6), format = "f", digits = 6)
  s <- sub("0+$", "", s)
  s <- sub("\\.$", "", s)
  if (s == "-0") s <- "0"
  s
}

# 参数网格: 覆盖典型 + 边界（alpha 0.025/0.05, power 0.80/0.85/0.90,
# ratio 0.5/1/2, delta 0.05~0.20, p 0.30~0.90, 对称 + 非对称双向）
# 每行: id, label, p1(对照), p2(试验), delta(NI界值), alpha, power, ratio
grid <- list(
  list("ni-01-readme-symmetric", "README 快速开始: 对照=试验=0.85, delta=0.10, alpha=0.025, power=0.80, ratio=1", 0.85, 0.85, 0.10, 0.025, 0.80, 1),
  list("ni-02-classic-070",      "经典 NI: 对照=试验=0.70, delta=0.10, alpha=0.025, power=0.80, ratio=1",        0.70, 0.70, 0.10, 0.025, 0.80, 1),
  list("ni-03-power090",         "高 power 0.90: 对照=试验=0.80, delta=0.10, alpha=0.025, ratio=1",              0.80, 0.80, 0.10, 0.025, 0.90, 1),
  list("ni-04-alpha05",          "单侧 alpha=0.05: 对照=试验=0.75, delta=0.10, power=0.80, ratio=1",             0.75, 0.75, 0.10, 0.050, 0.80, 1),
  list("ni-05-tight-margin",     "窄界值 delta=0.05 (大样本): 对照=试验=0.85, alpha=0.025, power=0.80, ratio=1", 0.85, 0.85, 0.05, 0.025, 0.80, 1),
  list("ni-06-wide-margin",      "宽界值 delta=0.15 (小样本): 对照=试验=0.60, alpha=0.025, power=0.80, ratio=1", 0.60, 0.60, 0.15, 0.025, 0.80, 1),
  list("ni-07-asym-favorable",   "非对称有利 (试验0.80>对照0.75): delta=0.10, alpha=0.025, power=0.80, ratio=1", 0.75, 0.80, 0.10, 0.025, 0.80, 1),
  list("ni-08-asym-unfavorable", "非对称不利 (试验0.75<对照0.80, 界内): delta=0.10, alpha=0.025, power=0.80, ratio=1", 0.80, 0.75, 0.10, 0.025, 0.80, 1),
  list("ni-09-ratio2",           "分配比 2:1 (试验:对照): 对照=试验=0.70, delta=0.10, alpha=0.025, power=0.80",   0.70, 0.70, 0.10, 0.025, 0.80, 2),
  list("ni-10-ratio05",          "分配比 0.5 (试验:对照): 对照=试验=0.70, delta=0.10, alpha=0.025, power=0.80",  0.70, 0.70, 0.10, 0.025, 0.80, 0.5),
  list("ni-11-low-rate",         "低基线率: 对照=试验=0.30, delta=0.10, alpha=0.025, power=0.80, ratio=1",       0.30, 0.30, 0.10, 0.025, 0.80, 1),
  list("ni-12-high-rate-bound",  "高基线近边界: 对照=试验=0.90, delta=0.05, alpha=0.025, power=0.80, ratio=1",   0.90, 0.90, 0.05, 0.025, 0.80, 1),
  list("ni-13-asym-power085",    "非对称小差 + power 0.85: 对照0.65, 试验0.68, delta=0.10, alpha=0.025, ratio=1", 0.65, 0.68, 0.10, 0.025, 0.85, 1),
  list("ni-14-small-n",          "小样本边界 (宽界值+差异): 对照0.50, 试验0.55, delta=0.20, alpha=0.05, power=0.80, ratio=1", 0.50, 0.55, 0.20, 0.050, 0.80, 1)
)

# --- JSON 字符串工具（手工构造, 无外部依赖, 确定性）---
q  <- function(s) paste0('"', gsub('"', '\\\\"', s), '"')
kv <- function(k, v) paste0(q(k), ': ', v)           # v 为原样标量（数/布尔/已引号串）
kvs <- function(k, s) paste0(q(k), ': ', q(s))        # v 为字符串

records_json <- character(0)

for (row in grid) {
  id <- row[[1]]; label <- row[[2]]
  p1 <- row[[3]]; p2 <- row[[4]]; d <- row[[5]]
  a  <- row[[6]]; pw <- row[[7]]; k <- row[[8]]
  beta <- 1 - pw

  # --- 主 golden: TrialSize NIS（映射见文件头）---
  trt  <- TwoSampleProportion.NIS(alpha = a, beta = beta, p1 = p2, p2 = p1,
                                  k = k, delta = p2 - p1, margin = -d)
  ctrl <- trt / k
  golden_call <- sprintf(
    "TwoSampleProportion.NIS(alpha=%s, beta=%s, p1=%s, p2=%s, k=%s, delta=%s, margin=%s)  # p1=试验组, p2=对照组; 返回=试验组连续n, 对照组=返回/k",
    nf(a), nf(beta), nf(p2), nf(p1), nf(k), nf(p2 - p1), nf(-d))

  golden_json <- paste0(
    "{ ",
    kvs("source", "TrialSize::TwoSampleProportion.NIS"), ", ",
    kvs("method", "Chow et al. (2017) NI 两组比例, unpooled 正态近似"), ", ",
    kvs("r_call", golden_call), ", ",
    kv("n1_control",   nf(ctrl)), ", ",
    kv("n2_treatment", nf(trt)), ", ",
    kv("n1_control_ceil",   ceiling(ctrl)), ", ",
    kv("n2_treatment_ceil", ceiling(trt)),
    " }")

  # --- FM 交叉参考: 仅对称 p1=p2 且 ratio=1（无歧义映射）---
  is_sym1 <- (abs(p1 - p2) < 1e-12) && (abs(k - 1) < 1e-12)
  known_dev <- FALSE
  if (is_sym1) {
    fm_per_arm <- nBinomial(p1 = p1, p2 = p2, alpha = a, beta = beta,
                            delta0 = -d, ratio = 1, sided = 1) / 2
    lib_equiv  <- ceiling(ctrl)              # = 本库预期 n1（ceil(Chow 连续)）
    method_dev <- abs(lib_equiv - fm_per_arm) / fm_per_arm
    known_dev  <- (method_dev > METHOD_BAND)
    fm_call <- sprintf(
      "nBinomial(p1=%s, p2=%s, alpha=%s, beta=%s, delta0=%s, ratio=1, sided=1) / 2  # FM 受约束MLE方差; /2 取每臂",
      nf(p1), nf(p2), nf(a), nf(beta), nf(-d))
    fm_json <- paste0(
      "{ ",
      kvs("source", "gsDesign::nBinomial"), ", ",
      kvs("method", "Farrington-Manning 受约束 MLE 方差"), ", ",
      kvs("r_call", fm_call), ", ",
      kv("per_arm", nf(fm_per_arm)), ", ",
      kv("method_deviation", nf(method_dev)),
      " }")
  } else {
    fm_json <- "null"
  }

  dev_note <- if (known_dev) {
    q(sprintf("高基线率场景: 本库 unpooled 正态近似相对 gsDesign FM 方差偏差 %.2f%% (> 方法带 %.0f%%), 系已知方法学差异, 非实现缺陷; 待第三批 P1 精度项评估", method_dev * 100, METHOD_BAND * 100))
  } else { "null" }

  inputs_json <- paste0(
    "{ ",
    kv("p1", nf(p1)), ", ", kv("p2", nf(p2)), ", ", kv("delta", nf(d)), ", ",
    kv("alpha", nf(a)), ", ", kv("power", nf(pw)), ", ", kv("ratio", nf(k)),
    " }")

  rec <- paste0(
    "    {\n",
    "      ", kvs("id", id), ",\n",
    "      ", kvs("label", label), ",\n",
    "      ", kv("inputs", inputs_json), ",\n",
    "      ", kv("golden", golden_json), ",\n",
    "      ", kv("fm_reference", fm_json), ",\n",
    "      ", kv("known_deviation", if (known_dev) "true" else "false"), ",\n",
    "      ", kv("known_deviation_note", dev_note), "\n",
    "    }")
  records_json <- c(records_json, rec)
}

known_count <- sum(vapply(strsplit(records_json, "\n"), function(x)
  any(grepl('"known_deviation": true', x)), logical(1)))

meta_json <- paste0(
  "  ", kv("meta", paste0("{\n",
    "    ", kvs("description", "两组-率-非劣效 R 对照 golden；本库 calculateNISampleSize 逐条对照"), ",\n",
    "    ", kvs("generated_by", "tests/fixtures/r/generate-two-group-ni.R"), ",\n",
    "    ", kvs("regenerate", "npm run golden:two-group-ni"), ",\n",
    "    ", kvs("r_version", paste0(R.version$major, ".", R.version$minor)), ",\n",
    "    ", kv("r_packages", paste0("{ ",
        kvs("TrialSize", as.character(packageVersion("TrialSize"))), ", ",
        kvs("gsDesign", as.character(packageVersion("gsDesign"))), " }")), ",\n",
    "    ", kvs("library_function", "calculateNISampleSize (率终点)"), ",\n",
    "    ", kvs("primary_golden", "TrialSize::TwoSampleProportion.NIS — Chow unpooled 正态近似（与本库同一公式, 验证实现保真度）"), ",\n",
    "    ", kvs("fm_reference", "gsDesign::nBinomial — Farrington-Manning FM 方差（交叉方法参考; 仅对称 ratio=1 场景, 因 FM 非对称符号约定歧义）"), ",\n",
    "    ", kv("rel_tolerance", nf(REL_TOL)), ",\n",
    "    ", kvs("rel_tolerance_basis", "界定取整偏差: 本库 ⌈n⌉ vs R 连续值; 实测 max 1.60% (n~50), median 0.23%; 2% 留裕度"), ",\n",
    "    ", kv("method_band", nf(METHOD_BAND)), ",\n",
    "    ", kvs("method_band_basis", "正态近似 vs FM 方差一致带; 实测对称场景双峰: 6/8 例 <1.8%, 2 例高基线边界 (p>=0.85) >2.5%"), ",\n",
    "    ", kv("known_deviation_count", known_count), "\n",
    "  }")))

out <- paste0(
  "{\n",
  meta_json, ",\n",
  "  ", q("records"), ": [\n",
  paste(records_json, collapse = ",\n"), "\n",
  "  ]\n",
  "}\n")

out_path <- file.path(dirname(sub("--file=", "",
  grep("--file=", commandArgs(FALSE), value = TRUE)[1])), "..", "golden-two-group-ni.json")
# 回退: 若无法从 --file 推断（交互式），用相对 CWD 的固定路径
if (is.na(out_path) || !nzchar(out_path)) {
  out_path <- "tests/fixtures/golden-two-group-ni.json"
}
out_path <- normalizePath(out_path, mustWork = FALSE)

writeLines(out, out_path)

cat(sprintf("[generate-two-group-ni] wrote %d records -> %s\n", length(records_json), out_path))
cat(sprintf("[generate-two-group-ni] known_deviation (FM 方法差异 > %.0f%%) = %d\n", METHOD_BAND * 100, known_count))
