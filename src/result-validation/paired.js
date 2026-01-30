/**
 * @module result-validation/paired
 * @description 配对设计结果验证 - 率终点和连续终点
 * @author Device Helper Team
 * @date 2026-01-18
 */

import { safeDivide } from '../core/safe-math'
import { normalCDF, normalInverse } from '../core/normal-distribution'

// ========================================================
// 配对设计 - 率终点 (Paired Design - Proportion, McNemar Test)
// ========================================================

/**
 * 配对设计结果计算 (McNemar检验)
 * @param {number} n10 - 治疗前成功/治疗后失败的例数
 * @param {number} n01 - 治疗前失败/治疗后成功的例数
 * @param {number} delta - 非劣效界值
 * @param {number} alpha - 显著性水平
 * @param {boolean} useContinuity - 是否使用连续性校正
 * @param {string} studyType - 检验类型
 * @returns {object} - 检验结果
 */
function calculatePairedResult(
  n10,
  n01,
  delta,
  alpha,
  useContinuity = false,
  studyType = 'non-inferiority'
) {
  const n_total = n10 + n01
  if (n_total === 0) {
    return {
      diff: 0,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      isNonInferior: false
    }
  }

  // 率差
  const diff = (n01 - n10) / n_total

  // McNemar检验统计量
  let chi2
  if (useContinuity && Math.abs(n01 - n10) > 0) {
    // 连续性校正
    chi2 = (Math.abs(n01 - n10) - 1) ** 2 / (n01 + n10)
  } else {
    chi2 = (n01 - n10) ** 2 / (n01 + n10)
  }

  // 计算p值 (使用正态近似)
  const z_score = Math.sqrt(chi2) * (n01 > n10 ? 1 : -1)
  const p_value = 1 - normalCDF(Math.abs(z_score))

  // 置信区间 (使用正态近似)
  const z_alpha = normalInverse(1 - alpha)
  const se = Math.sqrt((n01 + n10) / n_total ** 2)
  const ci_lower = diff - z_alpha * se
  const ci_upper = diff + z_alpha * se

  let isNonInferior
  if (studyType === 'equivalence') {
    isNonInferior = ci_lower > -delta && ci_upper < delta
  } else if (studyType === 'superiority') {
    isNonInferior = ci_lower > 0
  } else {
    isNonInferior = ci_lower > -delta
  }

  return {
    diff, ci_lower, ci_upper, p_value, isNonInferior,
    // P0-3.0: 检验统计量元数据（McNemar χ² 检验）
    testStatistic: chi2,
    testStatisticType: 'chi2',
    df: 1,
    testStatisticLabel: `χ²(1) = ${chi2.toFixed(2)}`
  }
}

// ========================================================
// 配对设计 - 连续终点 (Paired Design - Continuous, Paired t-test)
// ========================================================

/**
 * 配对t检验结果计算
 * @param {number} n - 配对数
 * @param {number} mean_diff - 观察到的差值均值
 * @param {number} sd_diff - 观察到的差值标准差
 * @param {number} delta - 非劣效界值
 * @param {number} alpha - 显著性水平
 * @param {string} studyType - 检验类型
 * @returns {object} - 检验结果
 */
function calculatePairedResultContinuous(
  n,
  mean_diff,
  sd_diff,
  delta,
  alpha,
  studyType = 'non-inferiority'
) {
  if (n <= 0 || sd_diff < 0) {
    return {
      diff: mean_diff,
      ci_lower: mean_diff,
      ci_upper: mean_diff,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  const se = sd_diff / Math.sqrt(n)
  const z_alpha = normalInverse(1 - alpha)

  if (!isFinite(z_alpha)) {
    return {
      diff: mean_diff,
      ci_lower: mean_diff,
      ci_upper: mean_diff,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  // 置信区间
  const ci_lower = mean_diff - z_alpha * se
  const ci_upper = mean_diff + z_alpha * se

  // t统计量和p值
  const t_score = safeDivide(mean_diff, se, 0)
  const p_value = 1 - normalCDF(Math.abs(t_score))

  let isNonInferior
  if (studyType === 'equivalence') {
    isNonInferior = ci_lower > -delta && ci_upper < delta
  } else if (studyType === 'superiority') {
    isNonInferior = ci_lower > 0
  } else {
    isNonInferior = ci_lower > -delta
  }

  const df = n - 1
  return {
    diff: mean_diff, ci_lower, ci_upper, p_value, isNonInferior,
    // P0-3.0: 检验统计量元数据（配对 t 检验）
    testStatistic: t_score,
    testStatisticType: 't',
    df,
    testStatisticLabel: `t(${df}) = ${t_score.toFixed(2)}`
  }
}

export { calculatePairedResult, calculatePairedResultContinuous }
