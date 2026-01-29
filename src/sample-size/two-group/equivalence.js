/**
 * 等效试验样本量计算模块
 * Equivalence Trial Sample Size Calculator
 *
 * 功能: 等效试验的样本量计算 (TOST 双侧检验)
 * 终点: 支持率终点和连续终点
 * 依赖: normal-distribution.js, safe-math.js
 *
 * @module utils/statistics/sample-size/two-group/equivalence
 * @requires ../core/normal-distribution
 * @requires ../core/safe-math
 *
 * @references 公式来源
 *
 * [1] Julious SA. Sample Sizes for Clinical Trials. Chapman and Hall/CRC; 2009.
 *     (等效公式基础)
 *
 * [2] Flight L, Julious SA. Practical guide to sample size calculations: non-inferiority
 *     and equivalence trials. Pharm Stat. 2016;15(1):80-89. DOI: 10.1002/pst.1716
 *     (等效公式验证案例)
 *
 * [3] PowerAndSampleSize.com - https://powerandsamplesize.com/
 *     (在线公式验证参考)
 *
 * [4] Helmut Schütz. Sample Size Estimation for Equivalence Studies in a Parallel Design.
 *     bebac.at, 2023. https://bebac.at/articles/Sample-Size-Estimation-for-Equivalence-Studies-in-a-Parallel-Design.phtml
 *     (等效公式 Z_{1-β/2} vs Z_{1-β} 选择依据)
 *
 * [5] Phillips KF. Power of the Two One-Sided Tests Procedure in Bioequivalence.
 *     J Pharmacokinet Biopharm. 1990;18(2):137-144. DOI: 10.1007/BF01063556
 *     (TOST检验功效理论基础)
 *
 * @note 公式选择说明
 * - 等效 (TOST双侧检验)：
 *   • 当预期差异 Δ=0 (对称场景): 使用 Z_{1-β/2}，确保联合功效达到指定水平
 *   • 当预期差异 Δ≠0 (非对称场景): 使用 Z_{1-β}，功效由最近边界决定
 *   • 参考 [4] 中的公式推导: "For θ₀ = 1 use Z_{1-β/2}; otherwise use Z_{1-β}"
 *
 * @validated 验证状态 (2026-01-25)
 * - 均值终点 Δ=0: Julious (2004) 完美匹配 (832 vs 832, 偏差 0%)
 * - 均值终点 Δ≠0: 自动切换公式，逻辑验证通过
 * - 率终点: Wald方法实现，与部分文献存在方法差异
 */

import { safeNumber, safeDivide, floatGte, floatLte } from '../../core/safe-math'
import { normalInverse } from '../../core/normal-distribution'

/**
 * 等效试验样本量计算 - 率终点
 *
 * @formula
 *   当 p1=p2 时: n₁ = (Z_{1-α} + Z_{1-β/2})² × [p₁(1-p₁) + p₂(1-p₂)/k] / δ²
 *   当 p1≠p2 时: n₁ = (Z_{1-α} + Z_{1-β})² × [p₁(1-p₁) + p₂(1-p₂)/k] / [δ - |p₂-p₁|]²
 *
 * @hypothesis H₀: |p₂ - p₁| ≥ δ, H₁: |p₂ - p₁| < δ (TOST双侧检验)
 *
 * @reference Julious (2009) Sample Sizes for Clinical Trials, Chapter 6
 * @reference Flight & Julious (2016) Pharm Stat. 15(1):80-89. DOI: 10.1002/pst.1716
 * @reference PowerAndSampleSize.com - Compare 2 Proportions: 2-Sample Equivalence
 *
 * @note 公式选择逻辑:
 *   - 当 p1=p2 (Δ=0): 两组预期完全等效，TOST两个单侧检验对称，
 *     使用 Z_{1-β/2} 确保联合power达到指定水平
 *   - 当 p1≠p2 (Δ≠0): 存在预期差异，TOST两个检验不对称，
 *     使用 Z_{1-β} 更符合文献验证结果
 *
 * @validated
 *   - Δ=0 场景: 使用 Wald 方法（正态近似），与 Newcombe/Score 方法存在方法学差异
 *     (当率接近 0% 或 100% 时差异可达 30-50%；率接近 50% 时差异较小约 5-15%)
 *     (Wald 方法是标准公式，Newcombe/Score 方法在边界率时更精确但计算更复杂)
 *   - Δ≠0 场景: 自动切换至 Z_{1-β} 公式
 *   - 公式切换逻辑: 参考 bebac.at [4] 中的对称/非对称场景区分
 *
 * @param {number} p1 - 对照组预期率
 * @param {number} p2 - 试验组预期率
 * @param {number} delta - 等效界值（正数，对称界限 [-δ, δ]）
 * @param {number} alpha - 单侧显著性水平（TOST每个单侧检验使用的α，如0.025对应95% CI）
 * @param {number} power - 检验效能
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{n1: number, n2: number}} 各组样本量
 */
function calculateEqSampleSize(p1, p2, delta, alpha, power, ratio) {
  // 输入清洗
  p1 = safeNumber(p1, 0)
  p2 = safeNumber(p2, 0)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)

  // alpha已经是单侧定义（TOST每个检验使用的显著性水平）
  const z_alpha = normalInverse(1 - alpha)

  // ═══════════════════════════════════════════════════════════
  // Step 1: 检测预期差异，选择对应公式
  // ───────────────────────────────────────────────────────────
  // 当 Δ=0 时使用 Z_{1-β/2}（对称 TOST）
  // 当 Δ≠0 时使用 Z_{1-β}（非对称 TOST）
  // 参考: bebac.at 中的公式推导
  // ═══════════════════════════════════════════════════════════
  const absDiff = Math.abs(p2 - p1)
  const isZeroDiff = absDiff < 1e-10 // 浮点精度判断

  const z_beta = isZeroDiff
    ? normalInverse((1 + power) / 2) // Z_{1-β/2} for symmetric TOST
    : normalInverse(power) // Z_{1-β} for asymmetric TOST

  // 检查z值是否有效（alpha=0 或 power=100% 时无效）
  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n1: NaN, n2: NaN }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 2: 边界检查 - 预期差异 ≥ 界值时无法等效
  // ───────────────────────────────────────────────────────────
  // 使用核心层浮点比较函数处理精度问题
  // 如 0.95-0.85=0.09999999999999998
  // ═══════════════════════════════════════════════════════════
  if (floatGte(absDiff, delta)) {
    return { n1: Infinity, n2: Infinity }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 3: 计算样本量
  // Formula: n1 = (z_α + z_β)² × [p1(1-p1) + p2(1-p2)/k] / [δ - |p2-p1|]²
  // ═══════════════════════════════════════════════════════════
  const numer =
    Math.pow(z_alpha + z_beta, 2) * (p1 * (1 - p1) + safeDivide(p2 * (1 - p2), ratio, 0))
  const denom = Math.pow(delta - absDiff, 2)

  const n1_raw = safeDivide(numer, denom, 0)

  if (n1_raw < 0 || !isFinite(n1_raw)) {
    return { n1: Infinity, n2: Infinity }
  }

  // 先对n1取整，然后n2严格按比例计算
  const n1 = Math.ceil(n1_raw)
  const n2 = Math.ceil(n1 * ratio) // 严格保持比例关系

  return { n1, n2 }
}

/**
 * 等效试验样本量计算 - 连续终点
 *
 * @formula
 *   当 meanDiff=0 时: n₁ = (Z_{1-α} + Z_{1-β/2})² × σ² × (1 + 1/k) / δ²
 *   当 meanDiff≠0 时: n₁ = (Z_{1-α} + Z_{1-β})² × σ² × (1 + 1/k) / [δ - |μ₂-μ₁|]²
 *
 * @hypothesis H₀: |μ₂ - μ₁| ≥ δ, H₁: |μ₂ - μ₁| < δ (TOST双侧检验)
 *
 * @reference Julious (2009) Sample Sizes for Clinical Trials, Chapter 6
 * @reference Flight & Julious (2016) Pharm Stat. 15(1):80-89. DOI: 10.1002/pst.1716
 *
 * @note 公式选择逻辑:
 *   - 当 meanDiff=0 (Δ=0): 两组预期完全等效，TOST两个单侧检验对称，
 *     使用 Z_{1-β/2} 确保联合power达到指定水平
 *   - 当 meanDiff≠0 (Δ≠0): 存在预期差异，TOST两个检验不对称，
 *     使用 Z_{1-β} 更符合文献验证结果
 *
 * @validated
 *   - Δ=0 场景: C-05 Julious (meanDiff=0) 计算832 vs 文献832，完美匹配
 *   - Δ≠0 场景: C-01 Flight (meanDiff=-5) 计算418 vs 文献417，偏差0.2%
 *
 * @param {number} sigma - 标准差
 * @param {number} delta - 等效界值（正数，对称界限 [-δ, δ]）
 * @param {number} alpha - 单侧显著性水平（TOST每个单侧检验使用的α，如0.025对应95% CI）
 * @param {number} power - 检验效能
 * @param {number} ratio - 分配比例 k = n2/n1
 * @param {number} meanDiff - 预期均值差（通常假设为0）
 * @returns {{n1: number, n2: number}} 各组样本量
 */
function calculateEqSampleSizeContinuous(sigma, delta, alpha, power, ratio, meanDiff) {
  sigma = safeNumber(sigma, 1)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)
  meanDiff = safeNumber(meanDiff, 0)

  // alpha已经是单侧定义（TOST每个检验使用的显著性水平）
  const z_alpha = normalInverse(1 - alpha)

  // ═══════════════════════════════════════════════════════════
  // Step 1: 检测预期差异，选择对应公式
  // ───────────────────────────────────────────────────────────
  // 当 Δ=0 时使用 Z_{1-β/2}（对称 TOST）
  // 当 Δ≠0 时使用 Z_{1-β}（非对称 TOST）
  // ═══════════════════════════════════════════════════════════
  const isZeroDiff = Math.abs(meanDiff) < 1e-10 // 浮点精度判断

  const z_beta = isZeroDiff
    ? normalInverse((1 + power) / 2) // Z_{1-β/2} for symmetric TOST
    : normalInverse(power) // Z_{1-β} for asymmetric TOST

  // 检查z值是否有效（alpha=0 或 power=100% 时无效）
  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n1: NaN, n2: NaN }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 2: 边界检查 - 预期差异 ≥ 界值时无法等效
  // ───────────────────────────────────────────────────────────
  // 使用核心层浮点比较函数处理精度问题
  // ═══════════════════════════════════════════════════════════
  const effectSize = delta - Math.abs(meanDiff)

  if (floatLte(effectSize, 0)) {
    return { n1: Infinity, n2: Infinity }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 3: 计算样本量
  // Formula: n1 = (z_α + z_β)² × σ² × (1 + 1/k) / [δ - |μ2-μ1|]²
  // ═══════════════════════════════════════════════════════════
  const numer = Math.pow(z_alpha + z_beta, 2) * Math.pow(sigma, 2) * (1 + 1 / ratio)
  const denom = Math.pow(effectSize, 2)

  const n1_raw = safeDivide(numer, denom, 0)

  if (n1_raw < 0 || !isFinite(n1_raw)) {
    return { n1: Infinity, n2: Infinity }
  }

  // 先对n1取整，然后n2严格按比例计算
  const n1 = Math.ceil(n1_raw)
  const n2 = Math.ceil(n1 * ratio) // 严格保持比例关系

  return { n1, n2 }
}

export { calculateEqSampleSize, calculateEqSampleSizeContinuous }
