/**
 * 效能反推计算模块
 * Power Calculation (Reverse) Module
 *
 * 功能: 给定样本量和效应量，反推检验效能 (Power)
 * 适用: 两组比较、单组试验、配对设计，各支持率终点和连续终点
 * 依赖: normal-distribution.js, safe-math.js
 *
 * @module utils/statistics/power-analysis/power-calculation
 * @requires ../core/normal-distribution
 * @requires ../core/safe-math
 *
 * @references 公式来源
 *
 * [1] Chow SC, Shao J, Wang H, Lokhnygina Y. Sample Size Calculations in Clinical Research.
 *     3rd ed. Chapman and Hall/CRC; 2017.
 *     (效能公式: 样本量公式的代数反解，Power = Φ(Z_β)，Z_β = effectSize × √n / SE - Z_α)
 *
 * [2] Julious SA. Sample Sizes for Clinical Trials. Chapman and Hall/CRC; 2009.
 *     (效能公式基础，Chapter 4-6)
 *
 * [3] Cohen J. Statistical Power Analysis for the Behavioral Sciences.
 *     2nd ed. Lawrence Erlbaum Associates; 1988.
 *     (效能分析理论基础)
 *
 * [4] Phillips KF. Power of the Two One-Sided Tests Procedure in Bioequivalence.
 *     J Pharmacokinet Biopharm. 1990;18(2):137-144. DOI: 10.1007/BF01063556
 *     (TOST 等效检验的效能计算)
 *
 * @note 公式推导说明
 *
 * 样本量公式:
 *   n₁ = (Z_{1-α} + Z_{1-β})² × Var / Effect²
 *
 * 反解效能:
 *   Z_{1-β} = Effect × √n₁ / √Var - Z_{1-α}
 *   Power = Φ(Z_{1-β})
 *
 * 等效试验 (TOST):
 *   - Δ=0 (对称): Power = 2Φ(Z_β) - 1，其中 Z_β = δ√n / √Var - Z_α
 *   - Δ≠0 (非对称): Power = Φ(Z_lower) × Φ(Z_upper)
 *     Z_lower = (δ - |Δ|) × √n / √Var - Z_α
 *     Z_upper = (δ + |Δ|) × √n / √Var - Z_α
 *     近似: Power ≈ Φ(Z_lower) (受限于较弱的一侧)
 *
 * @validated 验证说明
 * - 反向验证: 用已知样本量代入正向公式得 n，再用 n 代入效能公式应得到原始 power
 * - 文献对照: Cohen (1988) 效能表
 */

import { safeNumber, safeDivide } from '../core/safe-math'
import { normalCDF, normalInverse } from '../core/normal-distribution'

// ========================================================
// 两组比较 - 效能反推
// Two-Group Comparison - Power Calculation
// ========================================================

/**
 * 两组比较效能反推 - 率终点 - 非劣效
 *
 * @formula Z_β = [(p₂-p₁)+δ] × √n₁ / √[p₁(1-p₁) + p₂(1-p₂)/k] - Z_α
 *         Power = Φ(Z_β)
 *
 * @reference Chow et al. (2017) Chapter 4, 样本量公式的代数反解
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} p1 - 对照组预期率 (0-1)
 * @param {number} p2 - 试验组预期率 (0-1)
 * @param {number} delta - 非劣效界值（正数）
 * @param {number} alpha - 单侧显著性水平
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值
 */
function calculatePowerNI(n1, p1, p2, delta, alpha, ratio) {
  n1 = safeNumber(n1, 0)
  p1 = safeNumber(p1, 0)
  p2 = safeNumber(p2, 0)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  ratio = safeNumber(ratio, 1)

  // n1 必须为正整数
  if (n1 <= 0 || !isFinite(n1)) {
    return { power: NaN, z_beta: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  // 效应量 = (p₂ - p₁) + δ
  const effectSize = (p2 - p1) + delta
  if (Math.abs(effectSize) < 1e-10) {
    return { power: 0, z_beta: -Infinity }
  }

  // 方差项: p₁(1-p₁) + p₂(1-p₂)/k
  const variance = p1 * (1 - p1) + safeDivide(p2 * (1 - p2), ratio, 0)
  if (variance <= 0) {
    return { power: NaN, z_beta: NaN }
  }

  // Z_β = effectSize × √n₁ / √variance - Z_α
  const z_beta = effectSize * Math.sqrt(n1) / Math.sqrt(variance) - z_alpha
  const power = normalCDF(z_beta)

  return { power, z_beta }
}

/**
 * 两组比较效能反推 - 率终点 - 优效
 *
 * @formula Z_β = (p₂-p₁) × √n₁ / √[p₁(1-p₁) + p₂(1-p₂)/k] - Z_α
 *         Power = Φ(Z_β)
 *
 * @reference Chow et al. (2017) Chapter 4
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} p1 - 对照组预期率 (0-1)
 * @param {number} p2 - 试验组预期率 (0-1)
 * @param {number} alpha - 单侧显著性水平
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值
 */
function calculatePowerSup(n1, p1, p2, alpha, ratio) {
  n1 = safeNumber(n1, 0)
  p1 = safeNumber(p1, 0)
  p2 = safeNumber(p2, 0)
  alpha = safeNumber(alpha, 0)
  ratio = safeNumber(ratio, 1)

  if (n1 <= 0 || !isFinite(n1)) {
    return { power: NaN, z_beta: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  // 优效: 效应量 = p₂ - p₁
  const effectSize = p2 - p1
  if (Math.abs(effectSize) < 1e-10) {
    return { power: 0, z_beta: -Infinity }
  }

  const variance = p1 * (1 - p1) + safeDivide(p2 * (1 - p2), ratio, 0)
  if (variance <= 0) {
    return { power: NaN, z_beta: NaN }
  }

  const z_beta = effectSize * Math.sqrt(n1) / Math.sqrt(variance) - z_alpha
  const power = normalCDF(z_beta)

  return { power, z_beta }
}

/**
 * 两组比较效能反推 - 率终点 - 等效 (TOST)
 *
 * @formula
 *   Δ=0 (对称):
 *     Z_β = δ × √n₁ / √[p₁(1-p₁) + p₂(1-p₂)/k] - Z_α
 *     Power = 2Φ(Z_β) - 1
 *
 *   Δ≠0 (非对称):
 *     Z_lower = [δ - |p₂-p₁|] × √n₁ / √Var - Z_α  (较弱一侧)
 *     Z_upper = [δ + |p₂-p₁|] × √n₁ / √Var - Z_α  (较强一侧)
 *     Power ≈ Φ(Z_lower)  (近似，受限于较弱一侧)
 *
 * @reference Phillips (1990) J Pharmacokinet Biopharm. 18(2):137-144
 * @reference Julious (2009) Chapter 6
 *
 * @note 等效 TOST 的精确效能为:
 *   Power = P(reject both H₀₁ and H₀₂)
 *   = Φ(Z_lower) + Φ(Z_upper) - 1  (当两个检验独立时)
 *   ≈ Φ(Z_lower)                    (标准近似，忽略较强一侧的贡献)
 *   近似在 Z_upper >> Z_lower 时非常准确（大多数实际场景）
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} p1 - 对照组预期率 (0-1)
 * @param {number} p2 - 试验组预期率 (0-1)
 * @param {number} delta - 等效界值（正数）
 * @param {number} alpha - 单侧显著性水平
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值（Z_β 为较弱一侧）
 */
function calculatePowerEq(n1, p1, p2, delta, alpha, ratio) {
  n1 = safeNumber(n1, 0)
  p1 = safeNumber(p1, 0)
  p2 = safeNumber(p2, 0)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  ratio = safeNumber(ratio, 1)

  if (n1 <= 0 || !isFinite(n1)) {
    return { power: NaN, z_beta: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  const absDiff = Math.abs(p2 - p1)
  const isZeroDiff = absDiff < 1e-10

  // 预期差异 ≥ 界值时，效能为 0
  if (absDiff >= delta) {
    return { power: 0, z_beta: -Infinity }
  }

  const variance = p1 * (1 - p1) + safeDivide(p2 * (1 - p2), ratio, 0)
  if (variance <= 0) {
    return { power: NaN, z_beta: NaN }
  }

  const sqrtNOverVar = Math.sqrt(n1) / Math.sqrt(variance)

  if (isZeroDiff) {
    // ═══════════════════════════════════════════════════════════
    // 对称 TOST: Power = 2Φ(Z_β) - 1
    // Z_β = δ × √n₁ / √Var - Z_α
    // 参考: Phillips (1990), Julious (2009) Chapter 6
    // ═══════════════════════════════════════════════════════════
    const z_beta = delta * sqrtNOverVar - z_alpha
    const power = Math.max(0, 2 * normalCDF(z_beta) - 1)
    return { power, z_beta }
  } else {
    // ═══════════════════════════════════════════════════════════
    // 非对称 TOST: Power ≈ Φ(Z_lower)
    // Z_lower = (δ - |Δ|) × √n₁ / √Var - Z_α  (较弱一侧)
    // 标准近似方法，在绝大多数实际场景中足够准确
    // ═══════════════════════════════════════════════════════════
    const z_lower = (delta - absDiff) * sqrtNOverVar - z_alpha
    const power = normalCDF(z_lower)
    return { power, z_beta: z_lower }
  }
}

/**
 * 两组比较效能反推 - 连续终点 - 非劣效
 *
 * @formula Z_β = [(μ₂-μ₁)+|δ|] × √n₁ / [σ × √(1+1/k)] - Z_α
 *         Power = Φ(Z_β)
 *
 * @reference Chow et al. (2017) Chapter 4
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} sigma - 标准差
 * @param {number} delta - 非劣效界值（负数，如 -5）
 * @param {number} alpha - 单侧显著性水平
 * @param {number} ratio - 分配比例 k = n2/n1
 * @param {number} meanDiff - 预期均值差（试验组-对照组）
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值
 */
function calculatePowerNIContinuous(n1, sigma, delta, alpha, ratio, meanDiff) {
  n1 = safeNumber(n1, 0)
  sigma = safeNumber(sigma, 1)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  ratio = safeNumber(ratio, 1)
  meanDiff = safeNumber(meanDiff, 0)

  if (n1 <= 0 || !isFinite(n1) || sigma <= 0) {
    return { power: NaN, z_beta: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  // 效应量 = meanDiff + |delta|
  const effectSize = meanDiff + Math.abs(delta)
  if (Math.abs(effectSize) < 1e-10) {
    return { power: 0, z_beta: -Infinity }
  }

  // SE = σ × √(1 + 1/k) / √n₁
  const se = sigma * Math.sqrt(1 + 1 / ratio)

  const z_beta = effectSize * Math.sqrt(n1) / se - z_alpha
  const power = normalCDF(z_beta)

  return { power, z_beta }
}

/**
 * 两组比较效能反推 - 连续终点 - 优效
 *
 * @formula Z_β = (μ₂-μ₁) × √n₁ / [σ × √(1+1/k)] - Z_α
 *         Power = Φ(Z_β)
 *
 * @reference Chow et al. (2017) Chapter 4
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} sigma - 标准差
 * @param {number} meanDiff - 预期均值差（试验组-对照组）
 * @param {number} alpha - 单侧显著性水平
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值
 */
function calculatePowerSupContinuous(n1, sigma, meanDiff, alpha, ratio) {
  n1 = safeNumber(n1, 0)
  sigma = safeNumber(sigma, 1)
  meanDiff = safeNumber(meanDiff, 0)
  alpha = safeNumber(alpha, 0)
  ratio = safeNumber(ratio, 1)

  if (n1 <= 0 || !isFinite(n1) || sigma <= 0) {
    return { power: NaN, z_beta: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  if (Math.abs(meanDiff) < 1e-10) {
    return { power: 0, z_beta: -Infinity }
  }

  const se = sigma * Math.sqrt(1 + 1 / ratio)
  const z_beta = meanDiff * Math.sqrt(n1) / se - z_alpha
  const power = normalCDF(z_beta)

  return { power, z_beta }
}

/**
 * 两组比较效能反推 - 连续终点 - 等效 (TOST)
 *
 * @formula 同率终点的 TOST 逻辑，方差项替换为 σ²(1+1/k)
 *
 * @reference Julious (2009) Chapter 6
 * @reference Phillips (1990) TOST 效能理论
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} sigma - 标准差
 * @param {number} delta - 等效界值（正数）
 * @param {number} alpha - 单侧显著性水平
 * @param {number} ratio - 分配比例 k = n2/n1
 * @param {number} meanDiff - 预期均值差
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值
 */
function calculatePowerEqContinuous(n1, sigma, delta, alpha, ratio, meanDiff) {
  n1 = safeNumber(n1, 0)
  sigma = safeNumber(sigma, 1)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  ratio = safeNumber(ratio, 1)
  meanDiff = safeNumber(meanDiff, 0)

  if (n1 <= 0 || !isFinite(n1) || sigma <= 0) {
    return { power: NaN, z_beta: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  const absDiff = Math.abs(meanDiff)
  const isZeroDiff = absDiff < 1e-10

  if (absDiff >= delta) {
    return { power: 0, z_beta: -Infinity }
  }

  const se = sigma * Math.sqrt(1 + 1 / ratio)
  const sqrtNOverSE = Math.sqrt(n1) / se

  if (isZeroDiff) {
    const z_beta = delta * sqrtNOverSE - z_alpha
    const power = Math.max(0, 2 * normalCDF(z_beta) - 1)
    return { power, z_beta }
  } else {
    const z_lower = (delta - absDiff) * sqrtNOverSE - z_alpha
    const power = normalCDF(z_lower)
    return { power, z_beta: z_lower }
  }
}

// ========================================================
// 单组试验 - 效能反推
// One-Sample Trial - Power Calculation
// ========================================================

/**
 * 单组试验效能反推 - 率终点
 *
 * @formula Z_β = (p₁-p₀) × √n / [Z_α×√(p₀(1-p₀)) + Z_β×√(p₁(1-p₁))] 的反解
 *
 * @note 单组率终点公式使用非池化方差（H₀ 和 H₁ 下方差不同），
 *   正向公式: n = [Z_α√(p₀(1-p₀)) + Z_β√(p₁(1-p₁))]² / (p₁-p₀)²
 *   效能反解需要迭代求解（因为 Z_β 同时出现在方程两侧），
 *   但可用近似公式:
 *     Z_β ≈ |p₁-p₀| × √n / √[p₀(1-p₀)] - Z_α × √[p₀(1-p₀)] / √[p₁(1-p₁)]
 *   当 p₀ ≈ p₁ 时近似很准确；当差距较大时略有偏差（<2%）
 *
 *   替代精确方法: 二分法搜索使 n_formula(power) = n_given 的 power
 *   这里采用精确二分法以确保一致性
 *
 * @reference Cohen (1988) Chapter 6
 * @reference Chow et al. (2017) Chapter 3
 *
 * @param {number} n - 样本量
 * @param {number} p0 - 历史对照率 (0-1)
 * @param {number} p1 - 预期试验组率 (0-1)
 * @param {number} alpha - 单侧显著性水平
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值
 */
function calculatePowerOneSample(n, p0, p1, alpha) {
  n = safeNumber(n, 0)
  p0 = safeNumber(p0, 0)
  p1 = safeNumber(p1, 0)
  alpha = safeNumber(alpha, 0)

  if (n <= 0 || !isFinite(n)) {
    return { power: NaN, z_beta: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  const effectSize = p1 - p0
  if (Math.abs(effectSize) < 1e-10) {
    return { power: 0, z_beta: -Infinity }
  }

  // ═══════════════════════════════════════════════════════════
  // 精确二分法求解
  // 目标: 找到 power 使得 calculateOneSampleSize(p0, p1, alpha, power).n1 ≤ n
  // 搜索范围: [0.001, 0.999]
  // 收敛条件: |power_high - power_low| < 1e-6
  // ═══════════════════════════════════════════════════════════
  let low = 0.001
  let high = 0.999
  const MAX_ITER = 50
  const TOLERANCE = 1e-6

  for (let i = 0; i < MAX_ITER; i++) {
    const mid = (low + high) / 2
    const z_beta_test = normalInverse(mid)

    if (!isFinite(z_beta_test)) {
      high = mid
      continue
    }

    // 正向公式: n = [Z_α√(p₀(1-p₀)) + Z_β√(p₁(1-p₁))]² / (p₁-p₀)²
    const numer = Math.pow(
      z_alpha * Math.sqrt(p0 * (1 - p0)) + z_beta_test * Math.sqrt(p1 * (1 - p1)),
      2
    )
    const n_calc = numer / Math.pow(effectSize, 2)

    if (n_calc <= n) {
      // 当前 power 够了，可以尝试更高
      low = mid
    } else {
      // 需要更多样本，降低 power
      high = mid
    }

    if (high - low < TOLERANCE) break
  }

  const power = (low + high) / 2
  const z_beta = normalInverse(power)

  return { power, z_beta }
}

/**
 * 单组试验效能反推 - 连续终点
 *
 * @formula Z_β = |μ₁-μ₀| × √n / σ - Z_α
 *         Power = Φ(Z_β)
 *
 * @note 连续终点使用池化方差（H₀ 和 H₁ 下方差相同），可直接代数反解
 *
 * @reference Chow et al. (2017) Chapter 3
 *
 * @param {number} n - 样本量
 * @param {number} mu0 - 历史对照均值
 * @param {number} mu1 - 预期试验组均值
 * @param {number} sigma - 标准差
 * @param {number} alpha - 单侧显著性水平
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值
 */
function calculatePowerOneSampleContinuous(n, mu0, mu1, sigma, alpha) {
  n = safeNumber(n, 0)
  mu0 = safeNumber(mu0, 0)
  mu1 = safeNumber(mu1, 0)
  sigma = safeNumber(sigma, 1)
  alpha = safeNumber(alpha, 0)

  if (n <= 0 || !isFinite(n) || sigma <= 0) {
    return { power: NaN, z_beta: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  const effectSize = mu1 - mu0
  if (Math.abs(effectSize) < 1e-10) {
    return { power: 0, z_beta: -Infinity }
  }

  // Z_β = |μ₁-μ₀| × √n / σ - Z_α
  const z_beta = Math.abs(effectSize) * Math.sqrt(n) / sigma - z_alpha
  const power = normalCDF(z_beta)

  return { power, z_beta }
}

// ========================================================
// 配对设计 - 效能反推
// Paired Design - Power Calculation
// ========================================================

/**
 * 配对设计效能反推 - 率终点 (McNemar 检验)
 *
 * @formula Z_β = effectSize × √n / √(p₁₀ + p₀₁) - Z_α
 *         Power = Φ(Z_β)
 *
 * @note 效应量根据 studyType 不同:
 *   - 非劣效: effectSize = (p₀₁ - p₁₀) + delta
 *   - 优效: effectSize = p₀₁ - p₁₀
 *   - 等效: effectSize = delta - |p₀₁ - p₁₀|
 *
 * @reference Chow et al. (2017) Chapter 5
 *
 * @param {number} n - 配对样本量
 * @param {number} p10 - 治疗前成功/治疗后失败的比例 (0-1)
 * @param {number} p01 - 治疗前失败/治疗后成功的比例 (0-1)
 * @param {number} delta - 界值（非劣效/等效时使用）
 * @param {number} alpha - 单侧显著性水平
 * @param {string} studyType - 'non-inferiority' | 'superiority' | 'equivalence'
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值
 */
function calculatePowerPaired(n, p10, p01, delta, alpha, studyType = 'non-inferiority') {
  n = safeNumber(n, 0)
  p10 = safeNumber(p10, 0)
  p01 = safeNumber(p01, 0)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)

  if (n <= 0 || !isFinite(n)) {
    return { power: NaN, z_beta: NaN }
  }

  // 参数有效性检查
  if (p10 < 0 || p01 < 0 || p10 + p01 > 1) {
    return { power: NaN, z_beta: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  const diff = p01 - p10
  const variance = p01 + p10

  if (variance <= 0) {
    return { power: NaN, z_beta: NaN }
  }

  let effectSize

  if (studyType === 'equivalence') {
    effectSize = delta - Math.abs(diff)
    if (effectSize <= 0) {
      return { power: 0, z_beta: -Infinity }
    }
  } else if (studyType === 'superiority') {
    effectSize = diff
    if (Math.abs(effectSize) < 1e-10) {
      return { power: 0, z_beta: -Infinity }
    }
  } else {
    // 非劣效
    effectSize = diff + delta
    if (Math.abs(effectSize) < 1e-10) {
      return { power: 0, z_beta: -Infinity }
    }
  }

  // Z_β = effectSize × √n / √variance - Z_α
  const z_beta = effectSize * Math.sqrt(n) / Math.sqrt(variance) - z_alpha
  const power = normalCDF(z_beta)

  return { power, z_beta }
}

/**
 * 配对设计效能反推 - 连续终点 (配对 t 检验)
 *
 * @formula Z_β = effectSize × √n / σ_diff - Z_α
 *         Power = Φ(Z_β)
 *
 * @reference Chow et al. (2017) Chapter 5
 *
 * @param {number} n - 配对样本量
 * @param {number} sigma_diff - 差值的标准差
 * @param {number} mean_diff - 预期差值均值
 * @param {number} delta - 界值
 * @param {number} alpha - 单侧显著性水平
 * @param {string} studyType - 'non-inferiority' | 'superiority' | 'equivalence'
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值
 */
function calculatePowerPairedContinuous(n, sigma_diff, mean_diff, delta, alpha, studyType = 'non-inferiority') {
  n = safeNumber(n, 0)
  sigma_diff = safeNumber(sigma_diff, 1)
  mean_diff = safeNumber(mean_diff, 0)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)

  if (n <= 0 || !isFinite(n) || sigma_diff <= 0) {
    return { power: NaN, z_beta: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return { power: NaN, z_beta: NaN }
  }

  let effectSize

  if (studyType === 'equivalence') {
    effectSize = delta - Math.abs(mean_diff)
    if (effectSize <= 0) {
      return { power: 0, z_beta: -Infinity }
    }
  } else if (studyType === 'superiority') {
    effectSize = mean_diff
    if (Math.abs(effectSize) < 1e-10) {
      return { power: 0, z_beta: -Infinity }
    }
  } else {
    // 非劣效
    effectSize = mean_diff + delta
    if (Math.abs(effectSize) < 1e-10) {
      return { power: 0, z_beta: -Infinity }
    }
  }

  const z_beta = effectSize * Math.sqrt(n) / sigma_diff - z_alpha
  const power = normalCDF(z_beta)

  return { power, z_beta }
}

// ========================================================
// 统一入口函数
// Unified Entry Point
// ========================================================

/**
 * 统一效能反推入口
 * 根据 designType、studyType、endpointType 路由到对应的计算函数
 *
 * @param {Object} params - 计算参数
 * @param {string} params.designType - 'two-group' | 'one-sample' | 'paired'
 * @param {string} params.studyType - 'non-inferiority' | 'superiority' | 'equivalence'
 * @param {string} params.endpointType - 'proportion' | 'mean'
 * @param {number} params.n1 - 样本量（两组: 对照组; 单组/配对: 总量）
 * @param {number} [params.p1] - 对照组率 / 历史率 p₀ (率终点)
 * @param {number} [params.p2] - 试验组率 / 预期率 p₁ (率终点)
 * @param {number} [params.p10] - 配对: 成功→失败比例
 * @param {number} [params.p01] - 配对: 失败→成功比例
 * @param {number} [params.sigma] - 标准差 (连续终点)
 * @param {number} [params.meanDiff] - 预期均值差 (连续终点)
 * @param {number} [params.mu0] - 单组: 历史对照均值
 * @param {number} [params.mu1] - 单组: 预期均值
 * @param {number} [params.sigma_diff] - 配对: 差值标准差
 * @param {number} [params.mean_diff] - 配对: 预期差值均值
 * @param {number} params.delta - 界值
 * @param {number} params.alpha - 显著性水平
 * @param {number} [params.ratio=1] - 分配比例 (两组比较)
 * @returns {{ power: number, z_beta: number }} 检验效能和 Z_β 值
 */
function calculatePower(params) {
  const {
    designType = 'two-group',
    studyType = 'non-inferiority',
    endpointType = 'proportion',
    n1, p1, p2, p10, p01,
    sigma, meanDiff, mu0, mu1,
    sigma_diff, mean_diff,
    delta, alpha,
    ratio = 1
  } = params

  // ═══════════════════════════════════════════════════════════
  // 路由: 根据设计类型和终点类型分发到具体函数
  // ═══════════════════════════════════════════════════════════

  if (designType === 'two-group') {
    if (endpointType === 'proportion') {
      if (studyType === 'non-inferiority') {
        return calculatePowerNI(n1, p1, p2, delta, alpha, ratio)
      } else if (studyType === 'superiority') {
        return calculatePowerSup(n1, p1, p2, alpha, ratio)
      } else {
        return calculatePowerEq(n1, p1, p2, delta, alpha, ratio)
      }
    } else {
      // 连续终点
      if (studyType === 'non-inferiority') {
        return calculatePowerNIContinuous(n1, sigma, delta, alpha, ratio, meanDiff)
      } else if (studyType === 'superiority') {
        return calculatePowerSupContinuous(n1, sigma, meanDiff, alpha, ratio)
      } else {
        return calculatePowerEqContinuous(n1, sigma, delta, alpha, ratio, meanDiff)
      }
    }
  }

  if (designType === 'one-sample') {
    if (endpointType === 'proportion') {
      return calculatePowerOneSample(n1, p1, p2, alpha)
    } else {
      return calculatePowerOneSampleContinuous(n1, mu0, mu1, sigma, alpha)
    }
  }

  if (designType === 'paired') {
    if (endpointType === 'proportion') {
      return calculatePowerPaired(n1, p10, p01, delta, alpha, studyType)
    } else {
      return calculatePowerPairedContinuous(n1, sigma_diff, mean_diff, delta, alpha, studyType)
    }
  }

  // 未知设计类型
  return { power: NaN, z_beta: NaN }
}

export {
  // 统一入口
  calculatePower,

  // 两组比较 - 率终点
  calculatePowerNI,
  calculatePowerSup,
  calculatePowerEq,

  // 两组比较 - 连续终点
  calculatePowerNIContinuous,
  calculatePowerSupContinuous,
  calculatePowerEqContinuous,

  // 单组试验
  calculatePowerOneSample,
  calculatePowerOneSampleContinuous,

  // 配对设计
  calculatePowerPaired,
  calculatePowerPairedContinuous
}
