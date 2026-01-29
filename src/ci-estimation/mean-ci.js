/**
 * @module ci-estimation/mean-ci
 * @description 均值置信区间估计
 * @author Device Helper Team
 * @date 2026-01-18
 */

import { normalInverse } from '../core/normal-distribution'

// ========================================================
// 均值置信区间估计 (Mean Confidence Interval Estimation)
// ========================================================

/**
 * 均值置信区间样本量计算
 * @param {number} sigma - 总体标准差
 * @param {number} width - 置信区间半宽
 * @param {number} alpha - 显著性水平 (单侧)
 * @returns {object} - {n: 样本量}
 */
function calculateMeanCISampleSize(sigma, width, alpha) {
  // 参数无效时返回NaN，表示未定义
  if (sigma <= 0 || width <= 0) {
    return { n: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  // 检查z值是否有效（alpha=0 时无效）
  if (!isFinite(z_alpha)) {
    return { n: NaN }
  }

  // n = (z * σ / w)^2
  const n = Math.ceil(Math.pow((z_alpha * sigma) / width, 2))

  // 返回真实计算结果，不强制最小值
  return { n }
}

/**
 * 计算均值的置信区间
 * @param {number} n - 样本量
 * @param {number} mean - 样本均值
 * @param {number} sd - 样本标准差
 * @param {number} alpha - 显著性水平 (单侧)
 * @returns {object} - 置信区间结果
 */
function calculateMeanCI(n, mean, sd, alpha) {
  if (n <= 0 || sd < 0) {
    return {
      mean: mean,
      ci_lower: mean,
      ci_upper: mean,
      width: 0
    }
  }

  // 使用t分布（当n较大时近似于正态分布）
  // 这里使用正态近似，对于小样本应使用t分布
  const z = normalInverse(1 - alpha)
  if (!isFinite(z)) {
    return { mean, ci_lower: mean, ci_upper: mean, width: 0 }
  }

  const se = sd / Math.sqrt(n)
  const margin = z * se

  const ci_lower = mean - margin
  const ci_upper = mean + margin
  const width = margin

  return { mean, ci_lower, ci_upper, width }
}

export { calculateMeanCISampleSize, calculateMeanCI }
