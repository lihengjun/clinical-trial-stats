/**
 * @module sample-size/paired
 * @description 配对设计样本量计算 - 率终点和连续终点
 * @author Device Helper Team
 * @date 2026-01-18
 */

import { normalInverse } from '../core/normal-distribution'

// ========================================================
// 配对设计 - 率终点 (Paired Design - Proportion, McNemar Test)
// ========================================================

/**
 * 配对设计样本量计算 (McNemar检验)
 * @param {number} p10 - 治疗前成功/治疗后失败的比例
 * @param {number} p01 - 治疗前失败/治疗后成功的比例
 * @param {number} delta - 非劣效界值 (率差)
 * @param {number} alpha - 显著性水平
 * @param {number} power - 检验效能
 * @param {string} studyType - 'non-inferiority', 'superiority', 'equivalence'
 * @returns {object} - {n: 配对样本量}
 */
function calculatePairedSampleSize(p10, p01, delta, alpha, power, studyType = 'non-inferiority') {
  // 参数无效时返回 NaN（未定义）
  if (p10 < 0 || p01 < 0 || p10 + p01 > 1) {
    return { n: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  const z_beta = normalInverse(power)

  // 检查z值是否有效（alpha=0 或 power=100% 时无效）
  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n: NaN }
  }

  const diff = p01 - p10
  const variance = p01 + p10
  let effectSize
  let n_raw

  if (studyType === 'equivalence') {
    // TOST等效检验
    effectSize = delta - Math.abs(diff)
    // 当预期差异 ≥ 界值时，返回 Infinity
    if (effectSize <= 0) {
      return { n: Infinity }
    }
    n_raw = ((z_alpha + z_beta) ** 2 * variance) / effectSize ** 2
  } else if (studyType === 'superiority') {
    // 优效检验：要求 diff ≠ 0
    effectSize = diff
    if (Math.abs(effectSize) < 1e-10) {
      return { n: NaN } // 优效试验中 p01=p10 无法计算
    }
    n_raw = ((z_alpha + z_beta) ** 2 * variance) / effectSize ** 2
  } else {
    // 非劣效检验
    effectSize = diff + delta
    if (Math.abs(effectSize) < 1e-10) {
      return { n: NaN } // 效应量为零无法计算
    }
    n_raw = ((z_alpha + z_beta) ** 2 * variance) / effectSize ** 2
  }

  // 计算结果检查
  if (n_raw < 0) {
    return { n: NaN }
  }
  if (!isFinite(n_raw)) {
    return { n: Infinity }
  }

  return { n: Math.ceil(n_raw) }
}

// ========================================================
// 配对设计 - 连续终点 (Paired Design - Continuous, Paired t-test)
// ========================================================

/**
 * 配对t检验样本量计算
 * @param {number} sigma_diff - 差值的标准差
 * @param {number} mean_diff - 预期差值均值
 * @param {number} delta - 非劣效界值
 * @param {number} alpha - 显著性水平
 * @param {number} power - 检验效能
 * @param {string} studyType - 检验类型
 * @returns {object} - {n: 配对数}
 */
function calculatePairedSampleSizeContinuous(
  sigma_diff,
  mean_diff,
  delta,
  alpha,
  power,
  studyType = 'non-inferiority'
) {
  // 标准差无效时返回 NaN（未定义）
  if (sigma_diff <= 0) {
    return { n: NaN }
  }

  const z_alpha = normalInverse(1 - alpha)
  const z_beta = normalInverse(power)

  // 检查z值是否有效（alpha=0 或 power=100% 时无效）
  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n: NaN }
  }

  let effectSize
  let n_raw

  if (studyType === 'equivalence') {
    effectSize = delta - Math.abs(mean_diff)
    // 当预期差异 ≥ 界值时，返回 Infinity
    if (effectSize <= 0) {
      return { n: Infinity }
    }
    n_raw = ((z_alpha + z_beta) ** 2 * sigma_diff ** 2) / effectSize ** 2
  } else if (studyType === 'superiority') {
    // 优效检验：要求 mean_diff ≠ 0
    effectSize = mean_diff
    if (Math.abs(effectSize) < 1e-10) {
      return { n: NaN } // 优效试验中预期差值为0无法计算
    }
    n_raw = ((z_alpha + z_beta) ** 2 * sigma_diff ** 2) / effectSize ** 2
  } else {
    // 非劣效检验
    effectSize = mean_diff + delta
    if (Math.abs(effectSize) < 1e-10) {
      return { n: NaN } // 效应量为零无法计算
    }
    n_raw = ((z_alpha + z_beta) ** 2 * sigma_diff ** 2) / effectSize ** 2
  }

  // 计算结果检查
  if (n_raw < 0) {
    return { n: NaN }
  }
  if (!isFinite(n_raw)) {
    return { n: Infinity }
  }

  return { n: Math.ceil(n_raw) }
}

export { calculatePairedSampleSize, calculatePairedSampleSizeContinuous }
