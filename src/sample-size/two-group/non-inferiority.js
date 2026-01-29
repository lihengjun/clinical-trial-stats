/**
 * 非劣效试验样本量计算模块
 * Non-Inferiority Trial Sample Size Calculator
 *
 * 功能: 非劣效试验的样本量计算
 * 终点: 支持率终点和连续终点
 * 依赖: normal-distribution.js, safe-math.js
 *
 * @module utils/statistics/sample-size/two-group/non-inferiority
 * @requires ../core/normal-distribution
 * @requires ../core/safe-math
 *
 * @references 公式来源
 *
 * [1] Chow SC, Shao J, Wang H, Lokhnygina Y. Sample Size Calculations in Clinical Research.
 *     3rd ed. Chapman and Hall/CRC; 2017. (非劣效公式)
 *
 * [2] Julious SA. Sample Sizes for Clinical Trials. Chapman and Hall/CRC; 2009.
 *     (非劣效公式基础)
 *
 * [3] Julious SA, Campbell MJ. Tutorial in biostatistics: sample sizes for parallel
 *     group clinical trials with binary data. Stat Med. 2012;31:2904-2936.
 *     DOI: 10.1002/sim.5381
 *
 * @validated 验证状态 (2026-01-25)
 * - 率终点: 与 NMPA 鼻用糖皮质激素非劣效试验完美匹配
 * - 连续终点: 与 ICORG 05-03 放疗试验完美匹配
 */

import { safeNumber, safeDivide } from '../../core/safe-math'
import { normalInverse } from '../../core/normal-distribution'

/**
 * 非劣效试验样本量计算 - 率终点
 *
 * @formula n₁ = (Z_{1-α} + Z_{1-β})² × [p₁(1-p₁) + p₂(1-p₂)/k] / [(p₂-p₁)+δ]²
 *
 * @reference Chow et al. (2017) Chapter 4, Page 90-92
 * @reference Julious & Campbell (2012) Stat Med. 31:2904-2936
 * @validated 与以下临床试验数据验证一致：
 *   - 鼻用糖皮质激素非劣效试验 (NMPA)
 *   - 复方嗜酸乳杆菌非劣效试验
 *   - 布地奈德雾化非劣效试验
 *   - ICORG 05-03 (连续终点)
 *
 * @param {number} p1 - 对照组预期率
 * @param {number} p2 - 试验组预期率
 * @param {number} delta - 非劣效界值（正数）
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能
 * @param {number} ratio - 分配比例 k = n2/n1
 * @returns {{n1: number, n2: number}} 各组样本量
 */
function calculateNISampleSize(p1, p2, delta, alpha, power, ratio) {
  // 输入清洗 - 确保所有参数都是有效数字
  p1 = safeNumber(p1, 0)
  p2 = safeNumber(p2, 0)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)

  const z_alpha = normalInverse(1 - alpha)
  const z_beta = normalInverse(power)

  // 检查z值是否有效（alpha=0 或 power=100% 时无效）
  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n1: NaN, n2: NaN }
  }

  // Formula: n1 = (z_α + z_β)² × [p1(1-p1) + p2(1-p2)/k] / [(p2-p1)+δ]²
  const numer =
    Math.pow(z_alpha + z_beta, 2) * (p1 * (1 - p1) + safeDivide(p2 * (1 - p2), ratio, 0))
  const effectSize = p2 - p1 + delta
  const denom = Math.pow(effectSize, 2)

  // 效应量为零时无法计算（参数组合无意义）
  if (Math.abs(effectSize) < 1e-10) {
    return { n1: NaN, n2: NaN }
  }

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
 * 非劣效试验样本量计算 - 连续终点
 *
 * @formula n₁ = (Z_{1-α} + Z_{1-β})² × σ² × (1 + 1/k) / [(μ₂-μ₁)+δ]²
 *
 * @reference Chow et al. (2017) Chapter 4
 * @reference Julious (2009) Sample Sizes for Clinical Trials
 * @validated 与以下临床试验数据验证一致：
 *   - ICORG 05-03 放疗试验 (完美匹配)
 *   - 关节腔几丁糖非劣效试验
 *
 * @param {number} sigma - 标准差
 * @param {number} delta - 非劣效界值（正数，输入时为负数取绝对值）
 * @param {number} alpha - 单侧显著性水平
 * @param {number} power - 检验效能
 * @param {number} ratio - 分配比例 k = n2/n1
 * @param {number} meanDiff - 预期均值差（试验组-对照组）
 * @returns {{n1: number, n2: number}} 各组样本量
 */
function calculateNISampleSizeContinuous(sigma, delta, alpha, power, ratio, meanDiff) {
  // 输入清洗
  sigma = safeNumber(sigma, 1)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)
  ratio = safeNumber(ratio, 1)
  meanDiff = safeNumber(meanDiff, 0) // 预期均值差，默认0（两组相等）

  const z_alpha = normalInverse(1 - alpha)
  const z_beta = normalInverse(power)

  // 检查z值是否有效（alpha=0 或 power=100% 时无效）
  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n1: NaN, n2: NaN }
  }

  // 效应量 = (μ2-μ1) + |δ|
  // 非劣效假设：H0: μ2-μ1 ≤ -δ, H1: μ2-μ1 > -δ
  // delta 现在是负数（如 -5），取绝对值后加到 meanDiff
  const effectSize = meanDiff + Math.abs(delta)

  // 效应量为零时无法计算（参数组合无意义）
  if (Math.abs(effectSize) < 1e-10) {
    return { n1: NaN, n2: NaN }
  }

  // 公式：n1 = (z_α + z_β)² × σ² × (1 + 1/k) / effect²
  const numer = Math.pow(z_alpha + z_beta, 2) * Math.pow(sigma, 2) * (1 + 1 / ratio)
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

export { calculateNISampleSize, calculateNISampleSizeContinuous }
