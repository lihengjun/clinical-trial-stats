/**
 * @module result-validation/one-sample
 * @description 单组试验结果验证 - 率终点和连续终点
 * @author Device Helper Team
 * @date 2026-01-18
 */

import { safeNumber, safeDivide } from '../core/safe-math.js'
import { normalCDF, normalInverse } from '../core/normal-distribution.js'
import { validateStatParams } from '../core/param-validator.js'

// ========================================================
// 单组试验 (Single-Arm Trial / One-Sample Test)
// ========================================================

/**
 * 单组试验结果验证 (率终点)
 * 判断标准: CI下限 > p0（更保守的判断标准）
 * @param {number} n - 样本量
 * @param {number} s - 成功次数
 * @param {number} p0 - 历史对照率 (0-1)
 * @param {number} alpha - 单侧显著性水平
 * @param {boolean} [useContinuity=false] - 是否使用连续性校正
 * @returns {object} - 检验结果 {p, p0, diff, ci_lower, ci_upper, p_value, ...}
 */
function calculateOneSampleResult(n, s, p0, alpha, useContinuity) {
  n = safeNumber(n, 1)
  s = safeNumber(s, 0)
  p0 = safeNumber(p0, 0)
  alpha = safeNumber(alpha, 0)
  useContinuity = useContinuity || false

  // 计算率
  let p
  if (useContinuity) {
    p = safeDivide(s + 0.5, n + 1, 0)
  } else {
    p = safeDivide(s, n, 0)
  }

  const diff = p - p0
  const z_alpha = normalInverse(1 - alpha)

  // 统一参数验证（W8）：alpha 数学域外与 z 不可算同判（belt-and-suspenders，行为等价，沿用既有 fallback 形态）
  if (!validateStatParams({ alpha }).valid || !isFinite(z_alpha)) {
    return {
      p,
      p0,
      diff,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  // 标准误 (使用观察到的比例)
  const se = Math.sqrt(safeDivide(p * (1 - p), n, 0))

  if (!isFinite(se) || se === 0) {
    return {
      p,
      p0,
      diff,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  const ci_lower = p - z_alpha * se
  const ci_upper = p + z_alpha * se

  // Z检验统计量 (使用H0下的标准误)
  const se0 = Math.sqrt(safeDivide(p0 * (1 - p0), n, 0))
  const z_score = safeDivide(p - p0, se0, 0)
  const p_value = 1 - normalCDF(z_score)

  return {
    p,
    p0,
    diff,
    ci_lower,
    ci_upper,
    p_value,
    testStatistic: z_score,
    isNonInferior: ci_lower > p0, // 拒绝原假设 = CI下限 > p0
    // P0-3.0: 检验统计量元数据
    testStatisticType: 'Z',
    df: null,
    testStatisticLabel: `Z = ${z_score.toFixed(2)}`
  }
}

/**
 * 单组试验结果验证 (连续终点)
 * 判断标准: CI下限 > mu0
 * @param {number} n - 样本量
 * @param {number} mean - 样本均值
 * @param {number} sd - 样本标准差
 * @param {number} mu0 - 历史对照均值
 * @param {number} alpha - 单侧显著性水平
 * @returns {object} - 检验结果 {mean, mu0, diff, ci_lower, ci_upper, p_value, ...}
 */
function calculateOneSampleResultContinuous(n, mean, sd, mu0, alpha) {
  n = safeNumber(n, 1)
  mean = safeNumber(mean, 0)
  sd = safeNumber(sd, 1)
  mu0 = safeNumber(mu0, 0)
  alpha = safeNumber(alpha, 0)

  const diff = mean - mu0
  const se = safeDivide(sd, Math.sqrt(n), 0)

  if (!isFinite(se) || se === 0) {
    return {
      mean,
      mu0,
      diff,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  const z_alpha = normalInverse(1 - alpha)
  // 统一参数验证（W8）：alpha 数学域外与 z 不可算同判（belt-and-suspenders，行为等价，沿用既有 fallback 形态）
  if (!validateStatParams({ alpha }).valid || !isFinite(z_alpha)) {
    return {
      mean,
      mu0,
      diff,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  const ci_lower = mean - z_alpha * se
  const ci_upper = mean + z_alpha * se

  const t_score = safeDivide(diff, se, 0)
  const p_value = 1 - normalCDF(t_score)

  const df = n - 1
  return {
    mean,
    mu0,
    diff,
    ci_lower,
    ci_upper,
    p_value,
    testStatistic: t_score,
    isNonInferior: ci_lower > mu0, // 拒绝原假设 = CI下限 > mu0
    // P0-3.0: 检验统计量元数据
    testStatisticType: 't',
    df,
    testStatisticLabel: `t(${df}) = ${t_score.toFixed(2)}`
  }
}

export { calculateOneSampleResult, calculateOneSampleResultContinuous }
