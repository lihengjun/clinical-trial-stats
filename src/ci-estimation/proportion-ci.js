/**
 * @module ci-estimation/proportion-ci
 * @description 率置信区间估计 - Wilson Score方法
 * @author Device Helper Team
 * @date 2026-01-18
 */

import { safeDivide } from '../core/safe-math'
import { normalInverse } from '../core/normal-distribution'

// ========================================================
// 率置信区间估计 (Rate Confidence Interval Estimation)
// ========================================================

/**
 * 率置信区间样本量计算
 * 基于Wilson Score方法
 * @param {number} p - 预期率 (0-1)
 * @param {number} width - 置信区间半宽 (0-1)
 * @param {number} alpha - 显著性水平 (单侧)
 * @returns {object} - {n: 样本量}
 */
function calculateRateCISampleSize(p, width, alpha) {
  // 参数无效时返回NaN，表示未定义
  if (p <= 0 || p >= 1 || width <= 0 || width >= 1) {
    return { n: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  // 检查z值是否有效（alpha=0 时无效）
  if (!isFinite(z_alpha)) {
    return { n: NaN }
  }

  // Wilson Score方法的样本量计算
  // n ≈ (z^2 * p * (1-p)) / w^2
  const n = Math.ceil((z_alpha * z_alpha * p * (1 - p)) / (width * width))

  // 返回真实计算结果，不强制最小值
  return { n }
}

/**
 * 计算率的置信区间 (Wilson Score方法)
 * @param {number} n - 样本量
 * @param {number} x - 成功次数
 * @param {number} alpha - 显著性水平 (单侧)
 * @returns {object} - 置信区间结果
 */
function calculateRateCI(n, x, alpha) {
  if (n <= 0 || x < 0 || x > n) {
    return {
      p: 0,
      ci_lower: 0,
      ci_upper: 1,
      width: 1
    }
  }

  const p = safeDivide(x, n, 0)
  const z = normalInverse(1 - alpha)

  if (!isFinite(z)) {
    return { p, ci_lower: 0, ci_upper: 1, width: 1 }
  }

  // Wilson Score置信区间
  const z2 = z * z
  const denominator = 1 + z2 / n
  const center = (p + z2 / (2 * n)) / denominator
  const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))

  const ci_lower = Math.max(0, center - margin)
  const ci_upper = Math.min(1, center + margin)
  const width = (ci_upper - ci_lower) / 2

  return { p, ci_lower, ci_upper, width }
}

export { calculateRateCISampleSize, calculateRateCI }
