/**
 * 效应量反推计算模块 (MDE - Minimum Detectable Effect)
 * Effect Size Calculation (Reverse) Module
 *
 * 功能: 给定样本量、α 和效能，反推最小可检测效应量
 * 适用: 两组比较、单组试验、配对设计，各支持率终点和连续终点
 * 方法: 二分法迭代求解（因为样本量公式中效应量和方差都依赖效应量，无法代数反解）
 * 依赖: 现有样本量计算函数 + normal-distribution.js
 *
 * @module utils/statistics/power-analysis/effect-size-calculation
 * @requires ../sample-size/two-group
 * @requires ../sample-size/one-sample
 * @requires ../sample-size/paired
 * @requires ../core/normal-distribution
 * @requires ../core/safe-math
 *
 * @references 公式来源
 *
 * [1] Chow SC, Shao J, Wang H, Lokhnygina Y. Sample Size Calculations in Clinical Research.
 *     3rd ed. Chapman and Hall/CRC; 2017.
 *     (样本量公式的反向求解)
 *
 * [2] Cohen J. Statistical Power Analysis for the Behavioral Sciences.
 *     2nd ed. Lawrence Erlbaum Associates; 1988.
 *     (效应量理论基础)
 *
 * [3] Lenth RV. Some Practical Guidelines for Effective Sample Size Determination.
 *     The American Statistician. 2001;55(3):187-193. DOI: 10.1198/000313001317098149
 *     (MDE 的实际应用指南)
 *
 * @note 求解方法说明
 *
 * 直接代数反解不可行的原因:
 * - 率终点: 方差 p(1-p) 本身依赖于率 p，而 p 又由效应量决定
 * - 非劣效/等效: 效应量定义涉及 delta，与方差项交叉
 *
 * 二分法策略:
 * - 设定效应量搜索范围 [low, high]
 * - 每次取中点 mid，代入正向公式计算所需 n
 * - 若 n_calc ≤ n_given → 效应量可以更小（mid 更精确）
 * - 若 n_calc > n_given → 效应量需要更大
 * - 收敛条件: |high - low| < tolerance
 *
 * 迭代性能:
 * - 通常 20-30 次即收敛（精度 1e-6）
 * - 最多 50 次迭代，超出返回当前最优估计
 * - 借助 normalInverse 的 LRU 缓存，性能开销极低
 */

import { safeNumber } from '../core/safe-math'
import { normalInverse } from '../core/normal-distribution'
import { calculateNISampleSize } from '../sample-size/two-group/non-inferiority'
import { calculateSupSampleSize } from '../sample-size/two-group/superiority'
import { calculateEqSampleSize } from '../sample-size/two-group/equivalence'
import { calculateOneSampleSize } from '../sample-size/one-sample'
import { calculatePairedSampleSize } from '../sample-size/paired'

/** 二分法最大迭代次数 */
const MAX_ITERATIONS = 50

/** 二分法收敛精度 */
const TOLERANCE = 1e-6

// ========================================================
// 两组比较 - 效应量反推
// Two-Group Comparison - MDE Calculation
// ========================================================

/**
 * 两组比较 MDE - 率终点 - 非劣效
 *
 * @description 给定 n1, p1, alpha, power, ratio → 求最小可检测的试验组率 p2
 *   即: 在给定样本量下，试验组率至少需要多高才能证明非劣效？
 *
 * @note 搜索变量是 p2（试验组率），范围 [p1 - delta, 1]
 *   非劣效公式中效应量 = (p2 - p1) + delta
 *   当 p2 = p1 - delta 时效应量为 0（无法证明非劣效的边界）
 *   因此搜索下界为 p1 - delta + epsilon
 *
 * @reference Chow et al. (2017) Chapter 4
 * @reference Lenth (2001) Am Stat. 55(3):187-193
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} p1 - 对照组预期率 (0-1)
 * @param {number} delta - 非劣效界值（正数）
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能 (0-1)
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{ mde: number, p2Min: number, effectSize: number, converged: boolean }}
 *   mde: 最小率差 (p2-p1)
 *   p2Min: 最小试验组率
 *   effectSize: 对应效应量 (p2-p1)+delta
 *   converged: 是否收敛
 */
function calculateMDE_NI(n1, p1, delta, alpha, power, ratio) {
  n1 = safeNumber(n1, 0)
  p1 = safeNumber(p1, 0)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)

  if (n1 <= 0 || !isFinite(n1)) {
    return { mde: NaN, p2Min: NaN, effectSize: NaN, converged: false }
  }

  // ═══════════════════════════════════════════════════════════
  // 二分法搜索 p2
  // 搜索范围: [p1 - delta + ε, min(1, p1 + 0.5)]
  // 对于非劣效，p2 通常 ≥ p1 - delta
  // ═══════════════════════════════════════════════════════════
  const searchLow = Math.max(0.001, p1 - delta + 0.001)
  const searchHigh = Math.min(0.999, p1 + 0.5)

  // 边界检查: 搜索范围无效
  if (searchLow >= searchHigh) {
    return { mde: NaN, p2Min: NaN, effectSize: NaN, converged: false }
  }

  let low = searchLow
  let high = searchHigh

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2
    const result = calculateNISampleSize(p1, mid, delta, alpha, power, ratio)

    if (isNaN(result.n1) || !isFinite(result.n1)) {
      // 无法计算，效应量太小，需要增大 p2
      low = mid
      continue
    }

    if (result.n1 <= n1) {
      // n_calc ≤ n_given: 当前 p2 足够，可以尝试更小
      high = mid
    } else {
      // n_calc > n_given: 需要更大的 p2
      low = mid
    }

    if (high - low < TOLERANCE) break
  }

  const p2Min = (low + high) / 2
  const mde = p2Min - p1
  const effectSize = mde + delta
  const converged = (high - low) < TOLERANCE * 10

  return { mde, p2Min, effectSize, converged }
}

/**
 * 两组比较 MDE - 率终点 - 优效
 *
 * @description 给定 n1, p1, alpha, power, ratio → 求最小可检测的率差 |p2-p1|
 *
 * @note 搜索变量是 p2，范围 [p1 + ε, min(0.999, p1 + 0.5)]
 *   优效公式中效应量 = p2 - p1
 *
 * @reference Chow et al. (2017) Chapter 4
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} p1 - 对照组预期率 (0-1)
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能 (0-1)
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{ mde: number, p2Min: number, converged: boolean }}
 */
function calculateMDE_Sup(n1, p1, alpha, power, ratio) {
  n1 = safeNumber(n1, 0)
  p1 = safeNumber(p1, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)

  if (n1 <= 0 || !isFinite(n1)) {
    return { mde: NaN, p2Min: NaN, converged: false }
  }

  // 搜索 p2 ∈ (p1, min(0.999, p1+0.5)]
  let low = p1 + 0.001
  let high = Math.min(0.999, p1 + 0.5)

  // 扩展搜索上界直到找到可行区间
  while (high < 0.999) {
    const result = calculateSupSampleSize(p1, high, alpha, power, ratio)
    if (!isNaN(result.n1) && isFinite(result.n1) && result.n1 <= n1) break
    high = Math.min(0.999, high + 0.1)
  }

  if (low >= high) {
    return { mde: NaN, p2Min: NaN, converged: false }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2
    const result = calculateSupSampleSize(p1, mid, alpha, power, ratio)

    if (isNaN(result.n1) || !isFinite(result.n1)) {
      low = mid
      continue
    }

    if (result.n1 <= n1) {
      high = mid
    } else {
      low = mid
    }

    if (high - low < TOLERANCE) break
  }

  const p2Min = (low + high) / 2
  const mde = p2Min - p1
  const converged = (high - low) < TOLERANCE * 10

  return { mde, p2Min, converged }
}

/**
 * 两组比较 MDE - 率终点 - 等效
 *
 * @description 给定 n1, p1, p2, alpha, power, ratio → 求最小可检测的等效界值 delta
 *
 * @note 搜索变量是 delta（等效界值），范围 [|p2-p1| + ε, 0.5]
 *   等效公式中 delta 必须 > |p2-p1|
 *
 * @reference Julious (2009) Chapter 6
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} p1 - 对照组预期率 (0-1)
 * @param {number} p2 - 试验组预期率 (0-1)
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能 (0-1)
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{ mde: number, deltaMin: number, converged: boolean }}
 *   mde: 同 deltaMin
 *   deltaMin: 最小可检测的等效界值
 */
function calculateMDE_Eq(n1, p1, p2, alpha, power, ratio) {
  n1 = safeNumber(n1, 0)
  p1 = safeNumber(p1, 0)
  p2 = safeNumber(p2, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)

  if (n1 <= 0 || !isFinite(n1)) {
    return { mde: NaN, deltaMin: NaN, converged: false }
  }

  const absDiff = Math.abs(p2 - p1)

  // 搜索 delta ∈ (|p2-p1| + ε, 0.5]
  let low = absDiff + 0.001
  let high = 0.5

  if (low >= high) {
    return { mde: NaN, deltaMin: NaN, converged: false }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2
    const result = calculateEqSampleSize(p1, p2, mid, alpha, power, ratio)

    if (isNaN(result.n1) || !isFinite(result.n1)) {
      // 界值太小，需要更大
      low = mid
      continue
    }

    if (result.n1 <= n1) {
      high = mid
    } else {
      low = mid
    }

    if (high - low < TOLERANCE) break
  }

  const deltaMin = (low + high) / 2
  const converged = (high - low) < TOLERANCE * 10

  return { mde: deltaMin, deltaMin, converged }
}

/**
 * 两组比较 MDE - 连续终点 - 非劣效
 *
 * @description 给定 n1, sigma, alpha, power, ratio → 求最小可检测的均值差
 *   即: 在给定样本量下，试验组均值至少需要比对照组高多少才能证明非劣效？
 *
 * @note 非劣效连续终点可以直接代数反解:
 *   n₁ = (Z_α + Z_β)² × σ² × (1+1/k) / (meanDiff + |delta|)²
 *   → meanDiff + |delta| = (Z_α + Z_β) × σ × √(1+1/k) / √n₁
 *   → meanDiff = (Z_α + Z_β) × σ × √(1+1/k) / √n₁ - |delta|
 *
 * @reference Chow et al. (2017) Chapter 4
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} sigma - 标准差
 * @param {number} delta - 非劣效界值（负数，如 -5）
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能 (0-1)
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{ mde: number, converged: boolean }}
 *   mde: 最小可检测均值差（meanDiff 的最小值）
 */
function calculateMDE_NIContinuous(n1, sigma, delta, alpha, power, ratio) {
  n1 = safeNumber(n1, 0)
  sigma = safeNumber(sigma, 1)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)

  if (n1 <= 0 || !isFinite(n1) || sigma <= 0) {
    return { mde: NaN, converged: false }
  }

  const z_alpha = safeNumber(normalInverse(1 - alpha), NaN)
  const z_beta = safeNumber(normalInverse(power), NaN)

  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { mde: NaN, converged: false }
  }

  // 直接代数反解
  // effectSize = (Z_α + Z_β) × σ × √(1+1/k) / √n₁
  const effectSize = (z_alpha + z_beta) * sigma * Math.sqrt(1 + 1 / ratio) / Math.sqrt(n1)

  // meanDiff = effectSize - |delta|
  const mde = effectSize - Math.abs(delta)

  return { mde, converged: true }
}

/**
 * 两组比较 MDE - 连续终点 - 优效
 *
 * @description 直接代数反解:
 *   meanDiff = (Z_α + Z_β) × σ × √(1+1/k) / √n₁
 *
 * @reference Chow et al. (2017) Chapter 4
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} sigma - 标准差
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能 (0-1)
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{ mde: number, converged: boolean }}
 */
function calculateMDE_SupContinuous(n1, sigma, alpha, power, ratio) {
  n1 = safeNumber(n1, 0)
  sigma = safeNumber(sigma, 1)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)

  if (n1 <= 0 || !isFinite(n1) || sigma <= 0) {
    return { mde: NaN, converged: false }
  }

  const z_alpha = safeNumber(normalInverse(1 - alpha), NaN)
  const z_beta = safeNumber(normalInverse(power), NaN)

  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { mde: NaN, converged: false }
  }

  // 直接代数反解: meanDiff = (Z_α + Z_β) × σ × √(1+1/k) / √n₁
  const mde = (z_alpha + z_beta) * sigma * Math.sqrt(1 + 1 / ratio) / Math.sqrt(n1)

  return { mde, converged: true }
}

/**
 * 两组比较 MDE - 连续终点 - 等效
 *
 * @description 直接代数反解:
 *   delta = (Z_α + Z_β) × σ × √(1+1/k) / √n₁ + |meanDiff|
 *   对于 Δ=0: delta = (Z_α + Z_{β/2}) × σ × √(1+1/k) / √n₁
 *
 * @reference Julious (2009) Chapter 6
 *
 * @param {number} n1 - 对照组样本量
 * @param {number} sigma - 标准差
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能 (0-1)
 * @param {number} ratio - 分配比例 k = n2/n1
 * @param {number} meanDiff - 预期均值差
 * @returns {{ mde: number, deltaMin: number, converged: boolean }}
 */
function calculateMDE_EqContinuous(n1, sigma, alpha, power, ratio, meanDiff) {
  n1 = safeNumber(n1, 0)
  sigma = safeNumber(sigma, 1)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)
  meanDiff = safeNumber(meanDiff, 0)

  if (n1 <= 0 || !isFinite(n1) || sigma <= 0) {
    return { mde: NaN, deltaMin: NaN, converged: false }
  }

  const z_alpha = safeNumber(normalInverse(1 - alpha), NaN)

  const isZeroDiff = Math.abs(meanDiff) < 1e-10
  const z_beta = isZeroDiff
    ? safeNumber(normalInverse((1 + power) / 2), NaN)
    : safeNumber(normalInverse(power), NaN)

  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { mde: NaN, deltaMin: NaN, converged: false }
  }

  // effectSize = (Z_α + Z_β) × σ × √(1+1/k) / √n₁
  const effectSize = (z_alpha + z_beta) * sigma * Math.sqrt(1 + 1 / ratio) / Math.sqrt(n1)

  // delta = effectSize + |meanDiff|
  const deltaMin = effectSize + Math.abs(meanDiff)

  return { mde: deltaMin, deltaMin, converged: true }
}

// ========================================================
// 单组试验 - 效应量反推
// One-Sample Trial - MDE Calculation
// ========================================================

/**
 * 单组试验 MDE - 率终点
 *
 * @description 给定 n, p0, alpha, power → 求最小可检测的 p1
 *   使用二分法（因为方差项依赖 p1）
 *
 * @reference Cohen (1988) Chapter 6
 *
 * @param {number} n - 样本量
 * @param {number} p0 - 历史对照率 (0-1)
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能 (0-1)
 * @returns {{ mde: number, p1Min: number, converged: boolean }}
 */
function calculateMDE_OneSample(n, p0, alpha, power) {
  n = safeNumber(n, 0)
  p0 = safeNumber(p0, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)

  if (n <= 0 || !isFinite(n)) {
    return { mde: NaN, p1Min: NaN, converged: false }
  }

  // 搜索 p1 ∈ (p0 + ε, 0.999]
  let low = p0 + 0.001
  let high = 0.999

  if (low >= high) {
    return { mde: NaN, p1Min: NaN, converged: false }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2
    const result = calculateOneSampleSize(p0, mid, alpha, power)

    if (isNaN(result.n1) || !isFinite(result.n1)) {
      low = mid
      continue
    }

    if (result.n1 <= n) {
      high = mid
    } else {
      low = mid
    }

    if (high - low < TOLERANCE) break
  }

  const p1Min = (low + high) / 2
  const mde = p1Min - p0
  const converged = (high - low) < TOLERANCE * 10

  return { mde, p1Min, converged }
}

/**
 * 单组试验 MDE - 连续终点
 *
 * @description 直接代数反解:
 *   n = (Z_α + Z_β)² × σ² / (μ₁-μ₀)²
 *   → |μ₁-μ₀| = (Z_α + Z_β) × σ / √n
 *
 * @reference Chow et al. (2017) Chapter 3
 *
 * @param {number} n - 样本量
 * @param {number} sigma - 标准差
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能 (0-1)
 * @returns {{ mde: number, converged: boolean }}
 */
function calculateMDE_OneSampleContinuous(n, sigma, alpha, power) {
  n = safeNumber(n, 0)
  sigma = safeNumber(sigma, 1)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)

  if (n <= 0 || !isFinite(n) || sigma <= 0) {
    return { mde: NaN, converged: false }
  }

  const z_alpha = safeNumber(normalInverse(1 - alpha), NaN)
  const z_beta = safeNumber(normalInverse(power), NaN)

  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { mde: NaN, converged: false }
  }

  // |μ₁-μ₀| = (Z_α + Z_β) × σ / √n
  const mde = (z_alpha + z_beta) * sigma / Math.sqrt(n)

  return { mde, converged: true }
}

// ========================================================
// 配对设计 - 效应量反推
// Paired Design - MDE Calculation
// ========================================================

/**
 * 配对设计 MDE - 率终点 (McNemar)
 *
 * @description 给定 n, p10, alpha, power, studyType → 求最小可检测的 p01
 *   使用二分法（因为方差项 p10+p01 依赖 p01）
 *
 * @reference Chow et al. (2017) Chapter 5
 *
 * @param {number} n - 配对样本量
 * @param {number} p10 - 成功→失败比例 (0-1)
 * @param {number} delta - 界值
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能 (0-1)
 * @param {string} studyType - 'non-inferiority' | 'superiority' | 'equivalence'
 * @returns {{ mde: number, p01Min: number, converged: boolean }}
 */
function calculateMDE_Paired(n, p10, delta, alpha, power, studyType = 'non-inferiority') {
  n = safeNumber(n, 0)
  p10 = safeNumber(p10, 0)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)

  if (n <= 0 || !isFinite(n)) {
    return { mde: NaN, p01Min: NaN, converged: false }
  }

  // 搜索 p01 范围
  const maxP01 = Math.min(0.999, 1 - p10)
  let low, high

  if (studyType === 'superiority') {
    // 优效: 需要 p01 > p10，搜索 p01 ∈ (p10+ε, maxP01]
    low = p10 + 0.001
    high = maxP01
  } else if (studyType === 'equivalence') {
    // 等效: MDE 是最小 delta，不搜索 p01
    // 转为二分法搜索 delta
    low = 0.001
    high = 0.5
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const mid = (low + high) / 2
      const result = calculatePairedSampleSize(p10, p10, mid, alpha, power, 'equivalence')
      if (isNaN(result.n) || !isFinite(result.n)) {
        low = mid
        continue
      }
      if (result.n <= n) {
        high = mid
      } else {
        low = mid
      }
      if (high - low < TOLERANCE) break
    }
    const deltaMin = (low + high) / 2
    return { mde: deltaMin, p01Min: NaN, deltaMin, converged: (high - low) < TOLERANCE * 10 }
  } else {
    // 非劣效: 搜索 p01 ∈ (max(0.001, p10-delta+ε), maxP01]
    low = Math.max(0.001, p10 - delta + 0.001)
    high = maxP01
  }

  if (low >= high) {
    return { mde: NaN, p01Min: NaN, converged: false }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2
    const result = calculatePairedSampleSize(p10, mid, delta, alpha, power, studyType)

    if (isNaN(result.n) || !isFinite(result.n)) {
      low = mid
      continue
    }

    if (result.n <= n) {
      high = mid
    } else {
      low = mid
    }

    if (high - low < TOLERANCE) break
  }

  const p01Min = (low + high) / 2
  const mde = p01Min - p10
  const converged = (high - low) < TOLERANCE * 10

  return { mde, p01Min, converged }
}

/**
 * 配对设计 MDE - 连续终点
 *
 * @description 直接代数反解:
 *   n = (Z_α + Z_β)² × σ² / effectSize²
 *   → effectSize = (Z_α + Z_β) × σ / √n
 *
 * @reference Chow et al. (2017) Chapter 5
 *
 * @param {number} n - 配对样本量
 * @param {number} sigma_diff - 差值标准差
 * @param {number} delta - 界值
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能 (0-1)
 * @param {string} studyType - 'non-inferiority' | 'superiority' | 'equivalence'
 * @returns {{ mde: number, converged: boolean }}
 *   mde: 非劣效时为最小 mean_diff; 优效时为最小 |mean_diff|; 等效时为最小 delta
 */
function calculateMDE_PairedContinuous(n, sigma_diff, delta, alpha, power, studyType = 'non-inferiority') {
  n = safeNumber(n, 0)
  sigma_diff = safeNumber(sigma_diff, 1)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)

  if (n <= 0 || !isFinite(n) || sigma_diff <= 0) {
    return { mde: NaN, converged: false }
  }

  const z_alpha = safeNumber(normalInverse(1 - alpha), NaN)
  const z_beta = safeNumber(normalInverse(power), NaN)

  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { mde: NaN, converged: false }
  }

  // effectSize = (Z_α + Z_β) × σ_diff / √n
  const effectSize = (z_alpha + z_beta) * sigma_diff / Math.sqrt(n)

  if (studyType === 'superiority') {
    // 优效: effectSize = mean_diff → mde = effectSize
    return { mde: effectSize, converged: true }
  } else if (studyType === 'equivalence') {
    // 等效: effectSize = delta - |mean_diff| → deltaMin = effectSize + |mean_diff|
    // 当 mean_diff=0: deltaMin = effectSize
    return { mde: effectSize, deltaMin: effectSize, converged: true }
  } else {
    // 非劣效: effectSize = mean_diff + delta → mean_diff = effectSize - delta
    const mde = effectSize - delta
    return { mde, converged: true }
  }
}

// ========================================================
// 统一入口函数
// ========================================================

/**
 * 统一效应量反推入口
 *
 * @param {Object} params - 计算参数
 * @param {string} params.designType - 'two-group' | 'one-sample' | 'paired'
 * @param {string} params.studyType - 'non-inferiority' | 'superiority' | 'equivalence'
 * @param {string} params.endpointType - 'proportion' | 'mean'
 * @param {number} params.n1 - 样本量
 * @param {number} [params.p1] - 对照组率 / 历史率 p₀
 * @param {number} [params.p2] - 试验组预期率（等效时需要）
 * @param {number} [params.p10] - 配对: 成功→失败比例
 * @param {number} [params.sigma] - 标准差
 * @param {number} [params.sigma_diff] - 配对差值标准差
 * @param {number} [params.meanDiff] - 预期均值差（等效时需要）
 * @param {number} params.delta - 界值
 * @param {number} params.alpha - 显著性水平
 * @param {number} params.power - 检验效能
 * @param {number} [params.ratio=1] - 分配比例
 * @returns {Object} MDE 计算结果
 */
function calculateMDE(params) {
  const {
    designType = 'two-group',
    studyType = 'non-inferiority',
    endpointType = 'proportion',
    n1, p1, p2, p10,
    sigma, sigma_diff, meanDiff,
    delta, alpha, power,
    ratio = 1
  } = params

  if (designType === 'two-group') {
    if (endpointType === 'proportion') {
      if (studyType === 'non-inferiority') {
        return calculateMDE_NI(n1, p1, delta, alpha, power, ratio)
      } else if (studyType === 'superiority') {
        return calculateMDE_Sup(n1, p1, alpha, power, ratio)
      } else {
        return calculateMDE_Eq(n1, p1, p2, alpha, power, ratio)
      }
    } else {
      if (studyType === 'non-inferiority') {
        return calculateMDE_NIContinuous(n1, sigma, delta, alpha, power, ratio)
      } else if (studyType === 'superiority') {
        return calculateMDE_SupContinuous(n1, sigma, alpha, power, ratio)
      } else {
        return calculateMDE_EqContinuous(n1, sigma, alpha, power, ratio, meanDiff)
      }
    }
  }

  if (designType === 'one-sample') {
    if (endpointType === 'proportion') {
      return calculateMDE_OneSample(n1, p1, alpha, power)
    } else {
      return calculateMDE_OneSampleContinuous(n1, sigma, alpha, power)
    }
  }

  if (designType === 'paired') {
    if (endpointType === 'proportion') {
      return calculateMDE_Paired(n1, p10, delta, alpha, power, studyType)
    } else {
      return calculateMDE_PairedContinuous(n1, sigma_diff, delta, alpha, power, studyType)
    }
  }

  return { mde: NaN, converged: false }
}

export {
  // 统一入口
  calculateMDE,

  // 两组比较 - 率终点
  calculateMDE_NI,
  calculateMDE_Sup,
  calculateMDE_Eq,

  // 两组比较 - 连续终点
  calculateMDE_NIContinuous,
  calculateMDE_SupContinuous,
  calculateMDE_EqContinuous,

  // 单组试验
  calculateMDE_OneSample,
  calculateMDE_OneSampleContinuous,

  // 配对设计
  calculateMDE_Paired,
  calculateMDE_PairedContinuous
}
