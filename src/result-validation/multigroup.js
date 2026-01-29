/**
 * @module result-validation/multigroup
 * @description 多组比较结果验证 - 率终点和连续终点
 * @author Device Helper Team
 * @date 2026-01-18
 */

import { safeNumber, safeDivide } from '../core/safe-math'
import { normalCDF, normalInverse } from '../core/normal-distribution'

// ========================================================
// 多组比较 (Multigroup Comparison)
// 使用Bonferroni校正控制family-wise error rate
// ========================================================

/**
 * 多组比较结果验证 - 率终点
 *
 * @param {number} n0 - 对照组样本量
 * @param {number} x0 - 对照组成功数
 * @param {number[]} n_groups - 各试验组样本量数组
 * @param {number[]} x_groups - 各试验组成功数数组
 * @param {number} delta - 非劣效界值 (0-1)
 * @param {number} alpha - 原始显著性水平 (单侧)
 * @param {string} studyType - 试验类型
 * @returns {object} - {results: 各组结果数组, overall_success: 至少一组成功, alpha_adjusted, k}
 */
function calculateMultigroupResult(
  n0,
  x0,
  n_groups,
  x_groups,
  delta,
  alpha,
  studyType,
  allocations = null,
  strategy = 'any'
) {
  // 安全转换
  n0 = safeNumber(n0, 1)
  x0 = safeNumber(x0, 0)
  delta = safeNumber(delta, 0.1)
  alpha = safeNumber(alpha, 0.025)

  const k = n_groups.length
  const alpha_adjusted = strategy === 'all' ? alpha : alpha / k
  const z_alpha = normalInverse(1 - alpha_adjusted)

  if (!isFinite(z_alpha)) {
    return { results: [], overall_success: false, alpha_adjusted, k }
  }

  const p0 = safeDivide(x0, n0, 0)

  const results = []

  for (let i = 0; i < k; i++) {
    const n1 = safeNumber(n_groups[i], 1)
    const x1 = safeNumber(x_groups[i], 0)
    const p1 = safeDivide(x1, n1, 0)

    // 率差
    const diff = p1 - p0

    // 标准误差 (两独立样本)
    const se = Math.sqrt((p0 * (1 - p0)) / n0 + (p1 * (1 - p1)) / n1)

    if (!isFinite(se) || se === 0) {
      results.push({
        diff: 0,
        ci_lower: 0,
        ci_upper: 0,
        p_value: 1,
        z_score: 0,
        isSuccess: false
      })
      continue
    }

    // 置信区间 (使用调整后的alpha)
    const ci_lower = diff - z_alpha * se
    const ci_upper = diff + z_alpha * se

    // Z统计量和p值
    let z_score, p_value, isSuccess

    if (studyType === 'non-inferiority') {
      // 非劣效: H0: p1-p0 <= -delta vs H1: p1-p0 > -delta
      z_score = safeDivide(diff + delta, se, 0)
      p_value = 1 - normalCDF(z_score)
      isSuccess = ci_lower > -delta // CI下界 > -delta
    } else if (studyType === 'superiority') {
      // 优效: H0: p1-p0 <= 0 vs H1: p1-p0 > 0
      z_score = safeDivide(diff, se, 0)
      p_value = 1 - normalCDF(z_score)
      isSuccess = ci_lower > 0 // CI下界 > 0
    } else if (studyType === 'equivalence') {
      // 等效: TOST方法, 需要证明 -delta < diff < +delta
      // 检验1: diff > -delta (H0: diff <= -delta)
      // 检验2: diff < +delta (H0: diff >= +delta)
      const z1 = safeDivide(diff + delta, se, 0) // 检验下界
      const z2 = safeDivide(delta - diff, se, 0) // 检验上界
      const p1 = 1 - normalCDF(z1)
      const p2 = 1 - normalCDF(z2)
      // p值取两者较大值
      p_value = Math.max(p1, p2)
      z_score = Math.min(z1, z2) // 保守取较小的z值
      // 等效成立条件: CI完全落在[-delta, +delta]内
      isSuccess = ci_lower > -delta && ci_upper < delta
    } else {
      z_score = safeDivide(diff, se, 0)
      p_value = 1 - normalCDF(z_score)
      isSuccess = false
    }

    results.push({
      diff,
      ci_lower,
      ci_upper,
      p_value,
      z_score,
      isSuccess
    })
  }

  // 根据策略判断总体成功
  const overall_success =
    strategy === 'all'
      ? results.every(r => r.isSuccess) // 所有组成功
      : results.some(r => r.isSuccess) // 至少一组成功

  return {
    results,
    overall_success,
    alpha_adjusted,
    k
  }
}

/**
 * 多组比较结果验证 - 连续终点
 *
 * @param {number} n0 - 对照组样本量
 * @param {number} mean0 - 对照组均值
 * @param {number} sd0 - 对照组标准差
 * @param {number[]} n_groups - 各试验组样本量数组
 * @param {number[]} mean_groups - 各试验组均值数组
 * @param {number[]} sd_groups - 各试验组标准差数组
 * @param {number} delta - 非劣效界值
 * @param {number} alpha - 原始显著性水平 (单侧)
 * @param {string} studyType - 试验类型
 * @returns {object} - {results: 各组结果数组, overall_success: 至少一组成功, alpha_adjusted, k}
 */
function calculateMultigroupResultContinuous(
  n0,
  mean0,
  sd0,
  n_groups,
  mean_groups,
  sd_groups,
  delta,
  alpha,
  studyType,
  allocations = null,
  strategy = 'any'
) {
  // 安全转换
  n0 = safeNumber(n0, 1)
  mean0 = safeNumber(mean0, 0)
  sd0 = safeNumber(sd0, 1)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0.025)

  const k = n_groups.length
  const alpha_adjusted = strategy === 'all' ? alpha : alpha / k
  const z_alpha = normalInverse(1 - alpha_adjusted)

  if (!isFinite(z_alpha)) {
    return { results: [], overall_success: false, alpha_adjusted, k }
  }

  const results = []

  for (let i = 0; i < k; i++) {
    const n1 = safeNumber(n_groups[i], 1)
    const mean1 = safeNumber(mean_groups[i], 0)
    const sd1 = safeNumber(sd_groups[i], 1)

    // 均值差
    const diff = mean1 - mean0

    // 合并标准差 (pooled SD)
    const sp_squared = ((n0 - 1) * Math.pow(sd0, 2) + (n1 - 1) * Math.pow(sd1, 2)) / (n0 + n1 - 2)
    const sp = Math.sqrt(sp_squared)

    // 标准误差
    const se = sp * Math.sqrt(1 / n0 + 1 / n1)

    if (!isFinite(se) || se === 0) {
      results.push({
        diff: 0,
        ci_lower: 0,
        ci_upper: 0,
        p_value: 1,
        t_score: 0,
        isSuccess: false
      })
      continue
    }

    // 置信区间 (使用调整后的alpha)
    const ci_lower = diff - z_alpha * se
    const ci_upper = diff + z_alpha * se

    // t统计量和p值
    let t_score, p_value, isSuccess

    if (studyType === 'non-inferiority') {
      // 非劣效: H0: mean1-mean0 <= -delta vs H1: mean1-mean0 > -delta
      t_score = safeDivide(diff + delta, se, 0)
      p_value = 1 - normalCDF(t_score) // 使用正态近似
      isSuccess = ci_lower > -delta // CI下界 > -delta
    } else if (studyType === 'superiority') {
      // 优效: H0: mean1-mean0 <= 0 vs H1: mean1-mean0 > 0
      t_score = safeDivide(diff, se, 0)
      p_value = 1 - normalCDF(t_score)
      isSuccess = ci_lower > 0 // CI下界 > 0
    } else if (studyType === 'equivalence') {
      // 等效: TOST方法, 需要证明 -delta < diff < +delta
      // 检验1: diff > -delta (H0: diff <= -delta)
      // 检验2: diff < +delta (H0: diff >= +delta)
      const t1 = safeDivide(diff + Math.abs(delta), se, 0) // 检验下界
      const t2 = safeDivide(Math.abs(delta) - diff, se, 0) // 检验上界
      const p1 = 1 - normalCDF(t1)
      const p2 = 1 - normalCDF(t2)
      // p值取两者较大值
      p_value = Math.max(p1, p2)
      t_score = Math.min(t1, t2) // 保守取较小的t值
      // 等效成立条件: CI完全落在[-delta, +delta]内
      const abs_delta = Math.abs(delta)
      isSuccess = ci_lower > -abs_delta && ci_upper < abs_delta
    } else {
      t_score = safeDivide(diff, se, 0)
      p_value = 1 - normalCDF(t_score)
      isSuccess = false
    }

    results.push({
      diff,
      ci_lower,
      ci_upper,
      p_value,
      t_score,
      isSuccess
    })
  }

  // 根据策略判断总体成功
  const overall_success =
    strategy === 'all'
      ? results.every(r => r.isSuccess) // 所有组成功
      : results.some(r => r.isSuccess) // 至少一组成功

  return {
    results,
    overall_success,
    alpha_adjusted,
    k
  }
}

export { calculateMultigroupResult, calculateMultigroupResultContinuous }
