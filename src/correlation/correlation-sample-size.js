/**
 * 相关性分析样本量计算模块
 * Correlation Analysis Sample Size Calculation Module
 *
 * 功能: 基于 Fisher Z 变换计算检验相关系数所需的样本量
 * 场景: 探索性研究、生物标志物相关性、一致性验证
 * 依赖: normal-distribution.js
 *
 * @module utils/statistics/correlation/correlation-sample-size
 * @requires ../core/normal-distribution
 *
 * @references 公式来源
 *
 * [1] Fisher RA. On the "probable error" of a coefficient of correlation
 *     deduced from a small sample.
 *     Metron. 1921;1:3-32.
 *     (Fisher Z 变换的原始论文)
 *
 * [2] Cohen J. Statistical Power Analysis for the Behavioral Sciences.
 *     2nd ed. Lawrence Erlbaum Associates; 1988. Chapter 3.
 *     (相关系数的检验效能分析)
 *
 * [3] Hulley SB, Cummings SR, Browner WS, Grady DG, Newman TB.
 *     Designing Clinical Research. 4th ed. Lippincott Williams & Wilkins; 2013.
 *     Appendix 6C.
 *     (临床研究样本量表，含相关系数)
 *
 * [4] Bonett DG, Wright TA. Sample size requirements for estimating
 *     Pearson, Kendall and Spearman correlations.
 *     Psychometrika. 2000;65(1):23-28. DOI: 10.1007/BF02294183
 *     (不同相关系数类型的样本量估算)
 *
 * @formula 核心公式
 *
 * Fisher Z 变换:
 *   Z_r = 0.5 × ln((1+r)/(1-r)) = arctanh(r)
 *
 * 变换后 Z_r 近似服从正态分布:
 *   Z_r ~ N(ζ, 1/(n-3))
 *   其中 ζ = arctanh(ρ)，ρ 为总体相关系数
 *
 * 检验 H₀: ρ = ρ₀ (通常 ρ₀ = 0):
 *
 * 当 ρ₀ = 0 时:
 *   n = (Z_{1-α} + Z_{1-β})² / [arctanh(r)]² + 3
 *
 * 当 ρ₀ ≠ 0 时 (一般情形):
 *   n = (Z_{1-α} + Z_{1-β})² / [arctanh(r₁) - arctanh(r₀)]² + 3
 *
 * @validated 验证说明
 * - r=0.3, α=0.05(双侧), power=0.80 → n ≈ 85 (Cohen 1988, Table 3.3.2)
 * - r=0.5, α=0.05(双侧), power=0.80 → n ≈ 29 (Cohen 1988)
 * - r=0.1, α=0.05(双侧), power=0.80 → n ≈ 782 (Cohen 1988)
 */

import { normalInverse } from '../core/normal-distribution'

// ═══════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════

/**
 * Fisher Z 变换 (反双曲正切函数)
 *
 * @formula Z_r = 0.5 × ln((1+r)/(1-r)) = arctanh(r)
 *
 * @param {number} r - 相关系数 (-1 < r < 1)
 * @returns {number} 变换后的 Z 值
 *
 * @see Fisher (1921) - 原始定义
 */
function fisherZ(r) {
  // 边界保护：|r| >= 1 时 arctanh 趋向无穷
  if (r <= -1 || r >= 1) return NaN

  // arctanh(r) = 0.5 * ln((1+r)/(1-r))
  return 0.5 * Math.log((1 + r) / (1 - r))
}

// ═══════════════════════════════════════════════════════════
// 检验 H₀: ρ = 0（最常用场景）
// ═══════════════════════════════════════════════════════════

/**
 * 检验相关系数是否为零的样本量
 *
 * 最常用场景：探索性研究中检验两变量是否存在相关。
 * H₀: ρ = 0 vs H₁: ρ = r (r ≠ 0)
 *
 * @formula n = (Z_{1-α} + Z_{1-β})² / [arctanh(r)]² + 3
 *
 * @param {Object} params - 计算参数
 * @param {number} params.expectedR - 预期相关系数 (0 < |r| < 1)
 * @param {number} params.alpha - 显著性水平 (0-1)
 * @param {number} params.power - 检验效能 (0-1)
 * @param {'two-sided'|'one-sided'} [params.alternative='two-sided'] - 检验方向
 * @returns {Object} 计算结果
 * @returns {number} returns.n - 所需样本量
 * @returns {number} returns.fisherZValue - Fisher Z 变换值
 *
 * @example
 * // 检测 r=0.3 的相关性，双侧检验
 * calculateCorrelationSampleSize({
 *   expectedR: 0.3,
 *   alpha: 0.05,
 *   power: 0.80,
 *   alternative: 'two-sided'
 * })
 * // => { n: 85, fisherZValue: 0.3095 }
 *
 * @see Cohen (1988) Chapter 3 - 相关系数的效能分析
 */
export function calculateCorrelationSampleSize(params) {
  const {
    expectedR,
    alpha,
    power,
    alternative = 'two-sided'
  } = params

  // ═══════════════════════════════════════════════════════════
  // Step 1: 参数验证
  // ═══════════════════════════════════════════════════════════
  if (Math.abs(expectedR) <= 0 || Math.abs(expectedR) >= 1) {
    return { n: NaN, fisherZValue: NaN }
  }
  if (alpha <= 0 || alpha >= 1 || power <= 0 || power >= 1) {
    return { n: NaN, fisherZValue: NaN }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 2: Fisher Z 变换
  // ═══════════════════════════════════════════════════════════
  const zr = fisherZ(Math.abs(expectedR))
  if (!isFinite(zr) || zr <= 0) {
    return { n: NaN, fisherZValue: NaN }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 3: 计算正态分位数
  // 双侧检验用 α/2，单侧用 α
  // ═══════════════════════════════════════════════════════════
  const effectiveAlpha = alternative === 'two-sided' ? alpha / 2 : alpha
  const z_alpha = normalInverse(1 - effectiveAlpha)
  const z_beta = normalInverse(power)

  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n: NaN, fisherZValue: zr }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 4: 样本量公式
  // n = (Z_α + Z_β)² / Z_r² + 3
  // 其中 +3 是 Fisher Z 变换的自由度修正项
  // ═══════════════════════════════════════════════════════════
  const n = Math.ceil(Math.pow(z_alpha + z_beta, 2) / (zr * zr) + 3)

  return {
    n,
    fisherZValue: Number(zr.toFixed(4))
  }
}

// ═══════════════════════════════════════════════════════════
// 检验 H₀: ρ = ρ₀（一般情形）
// ═══════════════════════════════════════════════════════════

/**
 * 检验相关系数是否等于给定值的样本量
 *
 * 一般情形：检验相关系数是否等于某个非零值。
 * H₀: ρ = ρ₀ vs H₁: ρ = ρ₁ (ρ₁ ≠ ρ₀)
 *
 * @formula n = (Z_{1-α} + Z_{1-β})² / [arctanh(ρ₁) - arctanh(ρ₀)]² + 3
 *
 * @param {Object} params - 计算参数
 * @param {number} params.r0 - 原假设的相关系数 (-1 < r₀ < 1)
 * @param {number} params.r1 - 备择假设的相关系数 (-1 < r₁ < 1, r₁ ≠ r₀)
 * @param {number} params.alpha - 显著性水平 (0-1)
 * @param {number} params.power - 检验效能 (0-1)
 * @param {'two-sided'|'one-sided'} [params.alternative='two-sided'] - 检验方向
 * @returns {Object} 计算结果
 * @returns {number} returns.n - 所需样本量
 * @returns {number} returns.fisherZ0 - r₀ 的 Fisher Z 变换值
 * @returns {number} returns.fisherZ1 - r₁ 的 Fisher Z 变换值
 * @returns {number} returns.fisherZDiff - Fisher Z 差值
 *
 * @example
 * // 检验 ρ=0.5 vs ρ=0.7
 * calculateCorrelationComparisonSampleSize({
 *   r0: 0.5, r1: 0.7,
 *   alpha: 0.05, power: 0.80
 * })
 *
 * @see Cohen (1988) Chapter 3 - 非零 ρ₀ 的效能分析
 */
export function calculateCorrelationComparisonSampleSize(params) {
  const {
    r0,
    r1,
    alpha,
    power,
    alternative = 'two-sided'
  } = params

  // ═══════════════════════════════════════════════════════════
  // Step 1: 参数验证
  // ═══════════════════════════════════════════════════════════
  if (r0 <= -1 || r0 >= 1 || r1 <= -1 || r1 >= 1) {
    return { n: NaN, fisherZ0: NaN, fisherZ1: NaN, fisherZDiff: NaN }
  }
  if (alpha <= 0 || alpha >= 1 || power <= 0 || power >= 1) {
    return { n: NaN, fisherZ0: NaN, fisherZ1: NaN, fisherZDiff: NaN }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 2: Fisher Z 变换
  // ═══════════════════════════════════════════════════════════
  const z0 = fisherZ(r0)
  const z1 = fisherZ(r1)
  const zDiff = Math.abs(z1 - z0)

  if (!isFinite(z0) || !isFinite(z1) || zDiff < 1e-10) {
    return {
      n: zDiff < 1e-10 ? Infinity : NaN,
      fisherZ0: isFinite(z0) ? Number(z0.toFixed(4)) : NaN,
      fisherZ1: isFinite(z1) ? Number(z1.toFixed(4)) : NaN,
      fisherZDiff: Number(zDiff.toFixed(4))
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 3: 计算正态分位数
  // ═══════════════════════════════════════════════════════════
  const effectiveAlpha = alternative === 'two-sided' ? alpha / 2 : alpha
  const z_alpha = normalInverse(1 - effectiveAlpha)
  const z_beta = normalInverse(power)

  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return {
      n: NaN,
      fisherZ0: Number(z0.toFixed(4)),
      fisherZ1: Number(z1.toFixed(4)),
      fisherZDiff: Number(zDiff.toFixed(4))
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 4: 样本量公式（一般情形）
  // n = (Z_α + Z_β)² / (Z_r1 - Z_r0)² + 3
  // ═══════════════════════════════════════════════════════════
  const n = Math.ceil(Math.pow(z_alpha + z_beta, 2) / (zDiff * zDiff) + 3)

  return {
    n,
    fisherZ0: Number(z0.toFixed(4)),
    fisherZ1: Number(z1.toFixed(4)),
    fisherZDiff: Number(zDiff.toFixed(4))
  }
}

// ═══════════════════════════════════════════════════════════
// 效能反推（给定 n，反推 power）
// ═══════════════════════════════════════════════════════════

/**
 * 相关系数检验的效能反推
 *
 * 给定样本量和预期相关系数，反推检验效能。
 *
 * @formula
 *   Z_β = |arctanh(r)| × √(n-3) - Z_α
 *   Power = Φ(Z_β)
 *
 * @param {Object} params - 计算参数
 * @param {number} params.n - 样本量
 * @param {number} params.expectedR - 预期相关系数
 * @param {number} params.alpha - 显著性水平
 * @param {'two-sided'|'one-sided'} [params.alternative='two-sided'] - 检验方向
 * @returns {Object} 计算结果
 * @returns {number} returns.power - 检验效能
 * @returns {number} returns.z_beta - Z_β 值
 *
 * @example
 * // n=85, r=0.3, α=0.05 双侧 → power ≈ 0.80
 * calculateCorrelationPower({ n: 85, expectedR: 0.3, alpha: 0.05 })
 */
export function calculateCorrelationPower(params) {
  const {
    n,
    expectedR,
    alpha,
    alternative = 'two-sided'
  } = params

  if (n <= 3 || Math.abs(expectedR) <= 0 || Math.abs(expectedR) >= 1) {
    return { power: NaN, z_beta: NaN }
  }
  if (alpha <= 0 || alpha >= 1) {
    return { power: NaN, z_beta: NaN }
  }

  const zr = Math.abs(fisherZ(expectedR))
  if (!isFinite(zr)) {
    return { power: NaN, z_beta: NaN }
  }

  const effectiveAlpha = alternative === 'two-sided' ? alpha / 2 : alpha
  const z_alpha = normalInverse(1 - effectiveAlpha)

  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  // Z_β = |Z_r| × √(n-3) - Z_α
  const z_beta = zr * Math.sqrt(n - 3) - z_alpha

  // 需要 normalCDF，直接用已有的关系: Φ(x) = 1 - Φ(-x) 且 normalInverse 的反函数
  // 使用 normalCDF 的近似: Φ(x) ≈ 1 - normalInverse 反解
  // 更优方案：直接导入 normalCDF
  // 此处使用标准近似公式
  const power = normalCDFApprox(z_beta)

  return {
    power: Number(power.toFixed(6)),
    z_beta: Number(z_beta.toFixed(4))
  }
}

/**
 * 标准正态分布 CDF 近似
 * Hart (1966) 有理函数近似，与 core/normal-distribution.js 的 normalCDF 一致
 *
 * @param {number} x - 标准正态分位数
 * @returns {number} Φ(x) 累积概率
 */
function normalCDFApprox(x) {
  if (x >= 8) return 1
  if (x <= -8) return 0

  // 利用对称性：Φ(-x) = 1 - Φ(x)
  const isNeg = x < 0
  const absX = Math.abs(x)

  // Abramowitz & Stegun 26.2.17 近似
  const t = 1 / (1 + 0.2316419 * absX)
  const d = 0.3989422804014327 // 1/√(2π)
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const result = 1 - d * Math.exp(-0.5 * absX * absX) * poly

  return isNeg ? 1 - result : result
}
