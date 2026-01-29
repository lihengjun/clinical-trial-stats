/**
 * 优效试验样本量计算模块
 * Superiority Trial Sample Size Calculator
 *
 * 功能: 优效试验的样本量计算
 * 终点: 支持率终点和连续终点
 * 依赖: normal-distribution.js, safe-math.js
 *
 * @module utils/statistics/sample-size/two-group/superiority
 * @requires ../core/normal-distribution
 * @requires ../core/safe-math
 *
 * @references 公式来源
 *
 * [1] Chow SC, Shao J, Wang H, Lokhnygina Y. Sample Size Calculations in Clinical Research.
 *     3rd ed. Chapman and Hall/CRC; 2017. (优效公式)
 *
 * [2] Julious SA. Sample Sizes for Clinical Trials. Chapman and Hall/CRC; 2009.
 *     (优效公式基础)
 *
 * [3] Julious SA, Campbell MJ. Tutorial in biostatistics: sample sizes for parallel
 *     group clinical trials with binary data. Stat Med. 2012;31:2904-2936.
 *     DOI: 10.1002/sim.5381
 *
 * @validated 验证状态 (2026-01-25)
 * - 率终点: 与婴儿败血症治疗率试验完美匹配
 * - 连续终点: 与疼痛评分改善试验完美匹配
 */

import { safeNumber, safeDivide } from '../../core/safe-math'
import { normalInverse } from '../../core/normal-distribution'

/**
 * 优效试验样本量计算 - 率终点
 *
 * @formula n₁ = (Z_{1-α} + Z_{1-β})² × [p₁(1-p₁) + p₂(1-p₂)/k] / (p₂-p₁)²
 *
 * @hypothesis H₀: p₂ - p₁ ≤ 0, H₁: p₂ - p₁ > 0
 *
 * @reference Chow et al. (2017) Chapter 4
 * @reference Julious & Campbell (2012) Stat Med. 31:2904-2936
 * @validated 与以下临床试验数据验证一致：
 *   - 婴儿败血症治疗率试验 (Perspect Clin Res 2010) - 完美匹配
 *   - 偏头痛安慰剂对照试验 (Stat Med Tutorial) - 差4例
 *
 * @param {number} p1 - 对照组预期率
 * @param {number} p2 - 试验组预期率
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{n1: number, n2: number}} 各组样本量
 */
function calculateSupSampleSize(p1, p2, alpha, power, ratio) {
  // 输入清洗
  p1 = safeNumber(p1, 0)
  p2 = safeNumber(p2, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)

  const z_alpha = normalInverse(1 - alpha)
  const z_beta = normalInverse(power)

  // 检查z值是否有效（alpha=0 或 power=100% 时无效）
  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n1: NaN, n2: NaN }
  }

  // 优效试验要求 p1 ≠ p2，否则无法证明优效（未定义）
  const effectSize = p2 - p1
  if (Math.abs(effectSize) < 1e-10) {
    return { n1: NaN, n2: NaN }
  }

  // Formula: n1 = (z_α + z_β)² × [p1(1-p1) + p2(1-p2)/k] / (p2-p1)²
  const numer =
    Math.pow(z_alpha + z_beta, 2) * (p1 * (1 - p1) + safeDivide(p2 * (1 - p2), ratio, 0))
  const denom = Math.pow(effectSize, 2)

  const n1_raw = numer / denom

  // 计算结果检查
  if (n1_raw < 0) {
    return { n1: NaN, n2: NaN }
  }
  if (!isFinite(n1_raw)) {
    return { n1: Infinity, n2: Infinity }
  }

  // 先对n1取整，然后n2严格按比例计算
  const n1 = Math.ceil(n1_raw)
  const n2 = Math.ceil(n1 * ratio) // 严格保持比例关系

  return { n1, n2 }
}

/**
 * 优效试验样本量计算 - 连续终点
 *
 * @formula n₁ = (Z_{1-α} + Z_{1-β})² × σ² × (1 + 1/k) / (μ₂-μ₁)²
 *
 * @reference Chow et al. (2017) Chapter 4
 * @reference Julious (2009) Sample Sizes for Clinical Trials
 * @validated 与以下临床试验数据验证一致：
 *   - 降压药物比较试验 (Dtsch Arztebl Int 2010) - 差1例
 *   - 疼痛评分改善试验 (Perspect Clin Res 2010) - 完美匹配
 *   - LDL胆固醇素食试验 - 差3例
 *
 * @param {number} sigma - 标准差
 * @param {number} meanDiff - 预期均值差（试验组-对照组）
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{n1: number, n2: number}} 各组样本量
 */
function calculateSupSampleSizeContinuous(sigma, meanDiff, alpha, power, ratio) {
  sigma = safeNumber(sigma, 1)
  meanDiff = safeNumber(meanDiff, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)

  const z_alpha = normalInverse(1 - alpha)
  const z_beta = normalInverse(power)

  // 检查z值是否有效（alpha=0 或 power=100% 时无效）
  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n1: NaN, n2: NaN }
  }

  // 优效试验要求 meanDiff ≠ 0，否则无法证明优效（未定义）
  if (Math.abs(meanDiff) < 1e-10) {
    return { n1: NaN, n2: NaN }
  }

  const numer = Math.pow(z_alpha + z_beta, 2) * Math.pow(sigma, 2) * (1 + 1 / ratio)
  const denom = Math.pow(meanDiff, 2)

  const n1_raw = numer / denom

  // 计算结果检查
  if (n1_raw < 0) {
    return { n1: NaN, n2: NaN }
  }
  if (!isFinite(n1_raw)) {
    return { n1: Infinity, n2: Infinity }
  }

  // 先对n1取整，然后n2严格按比例计算
  const n1 = Math.ceil(n1_raw)
  const n2 = Math.ceil(n1 * ratio) // 严格保持比例关系

  return { n1, n2 }
}

export { calculateSupSampleSize, calculateSupSampleSizeContinuous }
