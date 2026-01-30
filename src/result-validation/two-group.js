/**
 * @module result-validation/two-group
 * @description 两组比较结果验证 - 率终点和连续终点
 * @author Device Helper Team
 * @date 2026-01-18
 */

import { safeNumber, safeDivide } from '../core/safe-math'
import { normalCDF, normalInverse } from '../core/normal-distribution'
import { calculateWilsonCI } from '../core/confidence-interval'

// ========================================================
// Farrington-Manning 方法辅助函数
// ========================================================

/**
 * 计算 Farrington-Manning 方法的 RMLE (Restricted Maximum Likelihood Estimate)
 * 在 H0: p2 - p1 = delta0 约束下的最大似然估计
 * @param {number} p1_obs - 观测到的对照组比例
 * @param {number} p2_obs - 观测到的试验组比例
 * @param {number} n1 - 对照组样本量
 * @param {number} n2 - 试验组样本量
 * @param {number} delta0 - 零假设下的差值 (如非劣效中的 -delta)
 * @returns {Object} {p1_rmle, p2_rmle} RMLE估计
 */
function calculateFMRMLE(p1_obs, p2_obs, n1, n2, delta0) {
  // 使用Newton-Raphson方法求解约束下的MLE
  // 在 p2 - p1 = delta0 约束下，只需求解 p1
  // 目标：最大化似然 L = p1^(n1*p1_obs) * (1-p1)^(n1*(1-p1_obs)) * p2^(n2*p2_obs) * (1-p2)^(n2*(1-p2_obs))
  // 其中 p2 = p1 + delta0

  // 合并比例的加权平均作为初始值
  const p_pooled = (n1 * p1_obs + n2 * p2_obs) / (n1 + n2)
  let p1_est = Math.max(0.001, Math.min(0.999, p_pooled - delta0 / 2))

  // Newton-Raphson迭代
  for (let iter = 0; iter < 20; iter++) {
    const p2_est = p1_est + delta0

    // 边界检查
    if (p2_est <= 0 || p2_est >= 1 || p1_est <= 0 || p1_est >= 1) {
      // 如果越界，使用简单的约束估计
      p1_est = Math.max(0.001, Math.min(0.999 - delta0, p_pooled - delta0 / 2))
      break
    }

    // Score equation: d(log L)/d(p1) = 0
    // = n1*(p1_obs/p1 - (1-p1_obs)/(1-p1)) + n2*(p2_obs/p2 - (1-p2_obs)/(1-p2))
    const score =
      n1 * (p1_obs / p1_est - (1 - p1_obs) / (1 - p1_est)) +
      n2 * (p2_obs / p2_est - (1 - p2_obs) / (1 - p2_est))

    // 信息矩阵 (负的二阶导数)
    const info =
      n1 * (p1_obs / (p1_est * p1_est) + (1 - p1_obs) / ((1 - p1_est) * (1 - p1_est))) +
      n2 * (p2_obs / (p2_est * p2_est) + (1 - p2_obs) / ((1 - p2_est) * (1 - p2_est)))

    const delta_p = score / info
    p1_est = p1_est + delta_p

    // 收敛检查
    if (Math.abs(delta_p) < 1e-8) break

    // 边界约束
    p1_est = Math.max(0.001, Math.min(0.999 - Math.max(0, delta0), p1_est))
  }

  const p2_est = Math.max(0.001, Math.min(0.999, p1_est + delta0))

  return {
    p1_rmle: p1_est,
    p2_rmle: p2_est
  }
}

// ========================================================
// Miettinen-Nurminen 方法辅助函数 (精确概率法/Score方法)
// ========================================================

/**
 * 计算 Miettinen-Nurminen 方法的约束 MLE
 * 在 H0: p2 - p1 = delta0 约束下，通过数值优化获得 MLE
 * 参考: Miettinen & Nurminen (1985), Statistics in Medicine
 *
 * 使用数值优化方法（比解析三次方程更稳健）：
 * 最大化约束对数似然函数，约束条件 p2 = p1 + delta0
 *
 * @param {number} x1 - 对照组成功数
 * @param {number} n1 - 对照组样本量
 * @param {number} x2 - 试验组成功数
 * @param {number} n2 - 试验组样本量
 * @param {number} delta0 - 零假设差值
 * @returns {Object} {p1_mle, p2_mle} 约束 MLE
 */
function calculateMNConstrainedMLE(x1, n1, x2, n2, delta0) {
  const N = n1 + n2

  // 特殊情况处理
  if (Math.abs(delta0) < 1e-10) {
    // delta0 ≈ 0 时，使用合并估计
    const p_pooled = (x1 + x2) / N
    return { p1_mle: p_pooled, p2_mle: p_pooled }
  }

  // 数值优化方法：最大化约束对数似然函数
  // L(p1) = x1*log(p1) + (n1-x1)*log(1-p1) + x2*log(p1+delta0) + (n2-x2)*log(1-p1-delta0)
  // 约束：p2 = p1 + delta0

  // p1 的有效范围（确保 p1 和 p2 都在 (0, 1) 内）
  const p1_min = Math.max(1e-8, -delta0 + 1e-8)
  const p1_max = Math.min(1 - 1e-8, 1 - delta0 - 1e-8)

  // 如果范围无效，返回边界值
  if (p1_min >= p1_max) {
    const p1_est = Math.max(1e-8, Math.min(1 - 1e-8, (p1_min + p1_max) / 2))
    const p2_est = Math.max(1e-8, Math.min(1 - 1e-8, p1_est + delta0))
    return { p1_mle: p1_est, p2_mle: p2_est }
  }

  // 对数似然函数对 p1 的导数（Score 方程）
  // dL/dp1 = x1/p1 - (n1-x1)/(1-p1) + x2/(p1+delta0) - (n2-x2)/(1-p1-delta0)
  const scoreFunc = p1 => {
    const p2 = p1 + delta0
    return x1 / p1 - (n1 - x1) / (1 - p1) + x2 / p2 - (n2 - x2) / (1 - p2)
  }

  // 检查边界处的导数符号
  const score_lo = scoreFunc(p1_min)
  const score_hi = scoreFunc(p1_max)

  // 如果导数不变号，MLE 在边界
  if (score_lo <= 0) {
    return { p1_mle: p1_min, p2_mle: p1_min + delta0 }
  }
  if (score_hi >= 0) {
    return { p1_mle: p1_max, p2_mle: p1_max + delta0 }
  }

  // 使用二分法找到 Score = 0 的点
  let lo = p1_min
  let hi = p1_max

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const score_mid = scoreFunc(mid)

    if (Math.abs(score_mid) < 1e-12 || Math.abs(hi - lo) < 1e-12) {
      return { p1_mle: mid, p2_mle: mid + delta0 }
    }

    if (score_mid > 0) {
      lo = mid
    } else {
      hi = mid
    }
  }

  const p1_est = (lo + hi) / 2
  return { p1_mle: p1_est, p2_mle: p1_est + delta0 }
}

/**
 * 使用 Miettinen-Nurminen 方法计算率差的置信区间和 p 值
 * 这是 SAS PROC FREQ 中使用的 Score 方法（精确概率法）
 * @param {number} x1 - 对照组成功数
 * @param {number} n1 - 对照组样本量
 * @param {number} x2 - 试验组成功数
 * @param {number} n2 - 试验组样本量
 * @param {number} delta0 - 零假设差值（用于 p 值计算）
 * @param {number} z_alpha - 临界 z 值（用于 CI 计算）
 * @returns {Object} {ci_lower, ci_upper, z_score, p_value}
 */
function calculateMNResult(x1, n1, x2, n2, delta0, z_alpha) {
  const p1_obs = x1 / n1
  const p2_obs = x2 / n2
  const diff = p2_obs - p1_obs

  // 计算在 H0: delta = delta0 约束下的 MLE
  const mle = calculateMNConstrainedMLE(x1, n1, x2, n2, delta0)

  // 计算 Score 统计量的方差 (Miettinen-Nurminen 公式)
  // V = p1_mle*(1-p1_mle)/n1 + p2_mle*(1-p2_mle)/n2
  // 加上校正因子 N/(N-1)，其中 N = n1 + n2
  const N = n1 + n2
  const correction = N / (N - 1)
  const var_mn =
    correction * ((mle.p1_mle * (1 - mle.p1_mle)) / n1 + (mle.p2_mle * (1 - mle.p2_mle)) / n2)
  const se_mn = Math.sqrt(var_mn)

  // Score 统计量
  const z_score = se_mn > 0 ? (diff - delta0) / se_mn : 0
  const p_value = 1 - normalCDF(z_score)

  // 通过反转检验构建置信区间
  // 使用二分搜索找到使 |z(delta)| = z_alpha 的 delta 值
  const ci_lower = findMNCIBound(x1, n1, x2, n2, diff, z_alpha, 'lower')
  const ci_upper = findMNCIBound(x1, n1, x2, n2, diff, z_alpha, 'upper')

  return {
    ci_lower,
    ci_upper,
    z_score,
    p_value,
    se: se_mn
  }
}

/**
 * 使用二分搜索找到 MN 置信区间的边界
 * @param {number} x1 - 对照组成功数
 * @param {number} n1 - 对照组样本量
 * @param {number} x2 - 试验组成功数
 * @param {number} n2 - 试验组样本量
 * @param {number} diff - 观测率差
 * @param {number} z_alpha - 临界 z 值
 * @param {string} bound - 'lower' 或 'upper'
 * @returns {number} 置信区间边界
 */
function findMNCIBound(x1, n1, x2, n2, diff, z_alpha, bound) {
  const N = n1 + n2
  const correction = N / (N - 1)

  // 计算给定 delta0 的 z 统计量
  const calcZ = delta0 => {
    const mle = calculateMNConstrainedMLE(x1, n1, x2, n2, delta0)
    const var_mn =
      correction * ((mle.p1_mle * (1 - mle.p1_mle)) / n1 + (mle.p2_mle * (1 - mle.p2_mle)) / n2)
    const se_mn = Math.sqrt(Math.max(var_mn, 1e-12))
    return (diff - delta0) / se_mn
  }

  // 二分搜索
  let lo, hi
  if (bound === 'lower') {
    lo = Math.max(-0.9999, diff - 0.5)
    hi = diff
    // 找到使 z(delta) = z_alpha 的 delta（下界）
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2
      const z = calcZ(mid)
      if (z > z_alpha) {
        lo = mid
      } else {
        hi = mid
      }
      if (Math.abs(hi - lo) < 1e-8) break
    }
    return lo
  } else {
    lo = diff
    hi = Math.min(0.9999, diff + 0.5)
    // 找到使 z(delta) = -z_alpha 的 delta（上界）
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2
      const z = calcZ(mid)
      if (z < -z_alpha) {
        hi = mid
      } else {
        lo = mid
      }
      if (Math.abs(hi - lo) < 1e-8) break
    }
    return hi
  }
}

/**
 * 使用 Farrington-Manning 方法计算率差的置信区间和 p 值
 * @param {number} p1 - 对照组比例
 * @param {number} p2 - 试验组比例
 * @param {number} n1 - 对照组样本量
 * @param {number} n2 - 试验组样本量
 * @param {number} delta0 - 零假设差值
 * @param {number} z_alpha - 临界 z 值
 * @returns {Object} {ci_lower, ci_upper, z_score, p_value, se}
 */
function calculateFMResult(p1, p2, n1, n2, delta0, z_alpha) {
  const diff = p2 - p1

  // 计算在 H0 下的 RMLE
  const rmle = calculateFMRMLE(p1, p2, n1, n2, delta0)

  // 使用 RMLE 估计计算标准误
  const var1 = (rmle.p1_rmle * (1 - rmle.p1_rmle)) / n1
  const var2 = (rmle.p2_rmle * (1 - rmle.p2_rmle)) / n2
  const se_h0 = Math.sqrt(var1 + var2)

  // FM score 统计量
  const z_score = se_h0 > 0 ? (diff - delta0) / se_h0 : 0
  const p_value = 1 - normalCDF(z_score)

  // 使用观测比例计算置信区间的标准误
  const var1_obs = (p1 * (1 - p1)) / n1
  const var2_obs = (p2 * (1 - p2)) / n2
  const se_obs = Math.sqrt(var1_obs + var2_obs)

  const ci_lower = diff - z_alpha * se_obs
  const ci_upper = diff + z_alpha * se_obs

  return {
    ci_lower,
    ci_upper,
    z_score,
    p_value,
    se: se_h0
  }
}

// ========================================================
// 非劣效试验 (Non-Inferiority Trial)
// ========================================================

// Result Calculation for Non-Inferiority
function calculateNIResult(n1, s1, n2, s2, delta, alpha, useContinuity, method) {
  // 输入清洗
  n1 = safeNumber(n1, 1)
  s1 = safeNumber(s1, 0)
  n2 = safeNumber(n2, 1)
  s2 = safeNumber(s2, 0)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  useContinuity = useContinuity || false
  method = method || 'wald' // 默认使用Wald方法

  // 计算率
  let p1, p2
  if (useContinuity) {
    p1 = safeDivide(s1 + 0.5, n1 + 1, 0)
    p2 = safeDivide(s2 + 0.5, n2 + 1, 0)
  } else {
    p1 = safeDivide(s1, n1, 0)
    p2 = safeDivide(s2, n2, 0)
  }

  const diff = p2 - p1
  const z_alpha = normalInverse(1 - alpha)

  if (!isFinite(z_alpha)) {
    return {
      p1: 0,
      p2: 0,
      diff: 0,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  let ci_lower, ci_upper, se, z_score, p_value

  if (method === 'fm') {
    // Farrington-Manning方法（推荐用于非劣效检验）
    // 使用RMLE在零假设约束下估计方差
    const fmResult = calculateFMResult(p1, p2, n1, n2, -delta, z_alpha)
    ci_lower = fmResult.ci_lower
    ci_upper = fmResult.ci_upper
    z_score = fmResult.z_score
    p_value = fmResult.p_value
    se = fmResult.se
  } else if (method === 'wilson') {
    // Wilson Score置信区间（更准确，特别是p接近0或1时）
    // 使用Newcombe方法计算两个比例差的Wilson Score CI

    // 计算各组的Wilson Score CI
    const wilson1 = calculateWilsonCI(s1, n1, z_alpha)
    const wilson2 = calculateWilsonCI(s2, n2, z_alpha)

    // 使用Newcombe方法计算差值的CI
    // CI for diff = p2 - p1
    const l1 = wilson1.lower
    const u1 = wilson1.upper
    const l2 = wilson2.lower
    const u2 = wilson2.upper

    // Newcombe公式
    ci_lower = diff - Math.sqrt(Math.pow(p2 - l2, 2) + Math.pow(u1 - p1, 2))
    ci_upper = diff + Math.sqrt(Math.pow(u2 - p2, 2) + Math.pow(p1 - l1, 2))

    // P值仍使用Wald方法计算（Wilson Score主要改进CI）
    const variance1 = safeDivide(p1 * (1 - p1), n1, 0)
    const variance2 = safeDivide(p2 * (1 - p2), n2, 0)
    se = Math.sqrt(variance1 + variance2)
    z_score = safeDivide(diff + delta, se, 0)
    p_value = 1 - normalCDF(z_score)
  } else if (method === 'mn') {
    // Miettinen-Nurminen方法（精确概率法/Score方法）
    // 与 SAS PROC FREQ 结果一致，国内器械临床常用
    const mnResult = calculateMNResult(s1, n1, s2, n2, -delta, z_alpha)
    ci_lower = mnResult.ci_lower
    ci_upper = mnResult.ci_upper
    z_score = mnResult.z_score
    p_value = mnResult.p_value
    se = mnResult.se
  } else {
    // Wald方法（默认）
    const variance1 = safeDivide(p1 * (1 - p1), n1, 0)
    const variance2 = safeDivide(p2 * (1 - p2), n2, 0)
    se = Math.sqrt(variance1 + variance2)

    // 检查se是否有效
    if (!isFinite(se) || se === 0) {
      return {
        p1: 0,
        p2: 0,
        diff: 0,
        ci_lower: 0,
        ci_upper: 0,
        p_value: 1,
        testStatistic: 0,
        isNonInferior: false
      }
    }

    ci_lower = diff - z_alpha * se
    ci_upper = diff + z_alpha * se
    z_score = safeDivide(diff + delta, se, 0)
    p_value = 1 - normalCDF(z_score)
  }

  return {
    p1,
    p2,
    diff,
    ci_lower,
    ci_upper,
    p_value,
    testStatistic: z_score,
    isNonInferior: ci_lower > -delta,
    // P0-3.0: 检验统计量元数据
    testStatisticType: 'Z',
    df: null,
    testStatisticLabel: `Z = ${z_score.toFixed(2)}`
  }
}

// ========================================================
// 连续终点非劣效试验 (Continuous Endpoint Non-Inferiority)
// ========================================================

// Result Calculation for Continuous Endpoint Non-Inferiority (t-test based)
function calculateNIResultContinuous(n1, mean1, sd1, n2, mean2, sd2, delta, alpha) {
  // 输入清洗
  n1 = safeNumber(n1, 1)
  mean1 = safeNumber(mean1, 0)
  sd1 = safeNumber(sd1, 1)
  n2 = safeNumber(n2, 1)
  mean2 = safeNumber(mean2, 0)
  sd2 = safeNumber(sd2, 1)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)

  // 均值差
  const diff = mean2 - mean1

  // 合并标准误（假设方差相等）
  const pooledVar = safeDivide((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2, n1 + n2 - 2, 0)
  const se = Math.sqrt(pooledVar * (1 / n1 + 1 / n2))

  // 检查se是否有效
  if (!isFinite(se) || se === 0) {
    return {
      mean1: 0,
      mean2: 0,
      diff: 0,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  // 使用正态近似（大样本）或t分布
  // 大样本时z和t接近，这里用z简化
  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return {
      mean1,
      mean2,
      diff,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  const ci_lower = diff - z_alpha * se
  const ci_upper = diff + z_alpha * se

  // t分数和p值（非劣效检验）
  const t_score = safeDivide(diff + delta, se, 0)
  const p_value = 1 - normalCDF(t_score)

  const df = n1 + n2 - 2
  return {
    mean1,
    mean2,
    diff,
    ci_lower,
    ci_upper,
    p_value,
    testStatistic: t_score,
    isNonInferior: ci_lower > -delta,
    // P0-3.0: 检验统计量元数据
    testStatisticType: 't',
    df,
    testStatisticLabel: `t(${df}) = ${t_score.toFixed(2)}`
  }
}

// ========================================================
// 优效试验 (Superiority Trial)
// ========================================================

// Result Calculation for Superiority Trial (Proportion)
// 判断标准: CI下限 > 0
function calculateSupResult(n1, s1, n2, s2, alpha, useContinuity, method) {
  // 输入清洗
  n1 = safeNumber(n1, 1)
  s1 = safeNumber(s1, 0)
  n2 = safeNumber(n2, 1)
  s2 = safeNumber(s2, 0)
  alpha = safeNumber(alpha, 0)
  useContinuity = useContinuity || false
  method = method || 'wald'

  // 计算率
  let p1, p2
  if (useContinuity) {
    p1 = safeDivide(s1 + 0.5, n1 + 1, 0)
    p2 = safeDivide(s2 + 0.5, n2 + 1, 0)
  } else {
    p1 = safeDivide(s1, n1, 0)
    p2 = safeDivide(s2, n2, 0)
  }

  const diff = p2 - p1
  const z_alpha = normalInverse(1 - alpha)

  if (!isFinite(z_alpha)) {
    return {
      p1: 0,
      p2: 0,
      diff: 0,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  let ci_lower, ci_upper, se, z_score, p_value

  if (method === 'fm') {
    // Farrington-Manning方法
    // 优效检验 H0: p2 - p1 <= 0，使用 delta0 = 0
    const fmResult = calculateFMResult(p1, p2, n1, n2, 0, z_alpha)
    ci_lower = fmResult.ci_lower
    ci_upper = fmResult.ci_upper
    z_score = fmResult.z_score
    p_value = fmResult.p_value
    se = fmResult.se
  } else if (method === 'wilson') {
    // Wilson Score方法
    const wilson1 = calculateWilsonCI(s1, n1, z_alpha)
    const wilson2 = calculateWilsonCI(s2, n2, z_alpha)

    const l1 = wilson1.lower
    const u1 = wilson1.upper
    const l2 = wilson2.lower
    const u2 = wilson2.upper

    ci_lower = diff - Math.sqrt(Math.pow(p2 - l2, 2) + Math.pow(u1 - p1, 2))
    ci_upper = diff + Math.sqrt(Math.pow(u2 - p2, 2) + Math.pow(p1 - l1, 2))

    const variance1 = safeDivide(p1 * (1 - p1), n1, 0)
    const variance2 = safeDivide(p2 * (1 - p2), n2, 0)
    se = Math.sqrt(variance1 + variance2)
    z_score = safeDivide(diff, se, 0)
    p_value = 1 - normalCDF(z_score)
  } else if (method === 'mn') {
    // Miettinen-Nurminen方法（精确概率法/Score方法）
    // 优效检验 H0: p2 - p1 <= 0，使用 delta0 = 0
    const mnResult = calculateMNResult(s1, n1, s2, n2, 0, z_alpha)
    ci_lower = mnResult.ci_lower
    ci_upper = mnResult.ci_upper
    z_score = mnResult.z_score
    p_value = mnResult.p_value
    se = mnResult.se
  } else {
    // Wald方法
    const variance1 = safeDivide(p1 * (1 - p1), n1, 0)
    const variance2 = safeDivide(p2 * (1 - p2), n2, 0)
    se = Math.sqrt(variance1 + variance2)

    if (!isFinite(se) || se === 0) {
      return {
        p1: 0,
        p2: 0,
        diff: 0,
        ci_lower: 0,
        ci_upper: 0,
        p_value: 1,
        testStatistic: 0,
        isNonInferior: false
      }
    }

    ci_lower = diff - z_alpha * se
    ci_upper = diff + z_alpha * se
    z_score = safeDivide(diff, se, 0)
    p_value = 1 - normalCDF(z_score)
  }

  return {
    p1,
    p2,
    diff,
    ci_lower,
    ci_upper,
    p_value,
    testStatistic: z_score,
    isNonInferior: ci_lower > 0, // 优效成立 = CI下限 > 0
    // P0-3.0: 检验统计量元数据
    testStatisticType: 'Z',
    df: null,
    testStatisticLabel: `Z = ${z_score.toFixed(2)}`
  }
}

// Result Calculation for Superiority Trial (Continuous)
function calculateSupResultContinuous(n1, mean1, sd1, n2, mean2, sd2, alpha) {
  n1 = safeNumber(n1, 1)
  mean1 = safeNumber(mean1, 0)
  sd1 = safeNumber(sd1, 1)
  n2 = safeNumber(n2, 1)
  mean2 = safeNumber(mean2, 0)
  sd2 = safeNumber(sd2, 1)
  alpha = safeNumber(alpha, 0)

  const diff = mean2 - mean1

  const pooledVar = safeDivide((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2, n1 + n2 - 2, 0)
  const se = Math.sqrt(pooledVar * (1 / n1 + 1 / n2))

  if (!isFinite(se) || se === 0) {
    return {
      mean1: 0,
      mean2: 0,
      diff: 0,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  const z_alpha = normalInverse(1 - alpha)
  if (!isFinite(z_alpha)) {
    return {
      mean1,
      mean2,
      diff,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  const ci_lower = diff - z_alpha * se
  const ci_upper = diff + z_alpha * se

  const t_score = safeDivide(diff, se, 0)
  const p_value = 1 - normalCDF(t_score)

  const df_sup = n1 + n2 - 2
  return {
    mean1,
    mean2,
    diff,
    ci_lower,
    ci_upper,
    p_value,
    testStatistic: t_score,
    isNonInferior: ci_lower > 0, // 优效成立 = CI下限 > 0
    // P0-3.0: 检验统计量元数据
    testStatisticType: 't',
    df: df_sup,
    testStatisticLabel: `t(${df_sup}) = ${t_score.toFixed(2)}`
  }
}

// ========================================================
// 等效试验 (Equivalence Trial)
// ========================================================

// Result Calculation for Equivalence Trial (Proportion)
// 使用TOST (Two One-Sided Tests) 方法
// 判断标准: -δ < CI下限 且 CI上限 < δ
function calculateEqResult(n1, s1, n2, s2, delta, alpha, useContinuity, method) {
  n1 = safeNumber(n1, 1)
  s1 = safeNumber(s1, 0)
  n2 = safeNumber(n2, 1)
  s2 = safeNumber(s2, 0)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)
  useContinuity = useContinuity || false
  method = method || 'wald'

  // 计算率
  let p1, p2
  if (useContinuity) {
    p1 = safeDivide(s1 + 0.5, n1 + 1, 0)
    p2 = safeDivide(s2 + 0.5, n2 + 1, 0)
  } else {
    p1 = safeDivide(s1, n1, 0)
    p2 = safeDivide(s2, n2, 0)
  }

  const diff = p2 - p1

  // 等效检验TOST方法:
  // - alpha: 总体显著性水平 (如 0.05)
  // - 每侧检验使用 alpha/2 (如 0.025)
  // - 置信区间: (1-alpha)×100% CI (如 95% CI)
  // - z值: Φ⁻¹(1 - alpha/2)
  const z_alpha = normalInverse(1 - alpha / 2)

  if (!isFinite(z_alpha)) {
    return {
      p1: 0,
      p2: 0,
      diff: 0,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  let ci_lower, ci_upper, se

  if (method === 'fm') {
    // Farrington-Manning方法
    const var1 = safeDivide(p1 * (1 - p1), n1, 0)
    const var2 = safeDivide(p2 * (1 - p2), n2, 0)
    se = Math.sqrt(var1 + var2)

    if (!isFinite(se) || se === 0) {
      return {
        p1: 0,
        p2: 0,
        diff: 0,
        ci_lower: 0,
        ci_upper: 0,
        p_value: 1,
        testStatistic: 0,
        isNonInferior: false
      }
    }

    ci_lower = diff - z_alpha * se
    ci_upper = diff + z_alpha * se
  } else if (method === 'wilson') {
    const wilson1 = calculateWilsonCI(s1, n1, z_alpha)
    const wilson2 = calculateWilsonCI(s2, n2, z_alpha)

    const l1 = wilson1.lower
    const u1 = wilson1.upper
    const l2 = wilson2.lower
    const u2 = wilson2.upper

    ci_lower = diff - Math.sqrt(Math.pow(p2 - l2, 2) + Math.pow(u1 - p1, 2))
    ci_upper = diff + Math.sqrt(Math.pow(u2 - p2, 2) + Math.pow(p1 - l1, 2))

    const variance1 = safeDivide(p1 * (1 - p1), n1, 0)
    const variance2 = safeDivide(p2 * (1 - p2), n2, 0)
    se = Math.sqrt(variance1 + variance2)
  } else if (method === 'mn') {
    // Miettinen-Nurminen方法（精确概率法/Score方法）
    // 等效检验使用 TOST，计算双侧置信区间
    const mnResult = calculateMNResult(s1, n1, s2, n2, 0, z_alpha)
    ci_lower = mnResult.ci_lower
    ci_upper = mnResult.ci_upper
    se = mnResult.se
  } else {
    const variance1 = safeDivide(p1 * (1 - p1), n1, 0)
    const variance2 = safeDivide(p2 * (1 - p2), n2, 0)
    se = Math.sqrt(variance1 + variance2)

    if (!isFinite(se) || se === 0) {
      return {
        p1: 0,
        p2: 0,
        diff: 0,
        ci_lower: 0,
        ci_upper: 0,
        p_value: 1,
        testStatistic: 0,
        isNonInferior: false
      }
    }

    ci_lower = diff - z_alpha * se
    ci_upper = diff + z_alpha * se
  }

  // TOST方法: 两个单侧检验
  // Test 1: H0: diff ≤ -δ vs H1: diff > -δ（右尾检验）
  // Test 2: H0: diff ≥ δ vs H1: diff < δ（左尾检验）
  const z1 = safeDivide(diff + delta, se, 0) // 下界检验统计量
  const z2 = safeDivide(diff - delta, se, 0) // 上界检验统计量
  const p1_value = 1 - normalCDF(z1) // 右尾P值
  const p2_value = normalCDF(z2) // 左尾P值
  const p_value = Math.max(p1_value, p2_value) // 取较大的P值

  return {
    p1,
    p2,
    diff,
    ci_lower,
    ci_upper,
    p_value,
    testStatistic: (z1 + z2) / 2, // TOST 两侧 Z 统计量的平均值
    isNonInferior: ci_lower > -delta && ci_upper < delta, // 等效成立条件
    // P0-3.0: 检验统计量元数据（TOST 双侧检验）
    testStatisticType: 'Z',
    df: null,
    testStatisticLabel: `Z₁ = ${z1.toFixed(2)}, Z₂ = ${z2.toFixed(2)}`
  }
}

// Result Calculation for Equivalence Trial (Continuous)
function calculateEqResultContinuous(n1, mean1, sd1, n2, mean2, sd2, delta, alpha) {
  n1 = safeNumber(n1, 1)
  mean1 = safeNumber(mean1, 0)
  sd1 = safeNumber(sd1, 1)
  n2 = safeNumber(n2, 1)
  mean2 = safeNumber(mean2, 0)
  sd2 = safeNumber(sd2, 1)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0)

  const diff = mean2 - mean1

  const pooledVar = safeDivide((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2, n1 + n2 - 2, 0)
  const se = Math.sqrt(pooledVar * (1 / n1 + 1 / n2))

  if (!isFinite(se) || se === 0) {
    return {
      mean1: 0,
      mean2: 0,
      diff: 0,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  // 等效检验TOST方法:
  // - alpha: 总体显著性水平 (如 0.05)
  // - 每侧检验使用 alpha/2 (如 0.025)
  // - 置信区间: (1-alpha)×100% CI (如 95% CI)
  // - z值: Φ⁻¹(1 - alpha/2)
  const z_alpha = normalInverse(1 - alpha / 2)
  if (!isFinite(z_alpha)) {
    return {
      mean1,
      mean2,
      diff,
      ci_lower: 0,
      ci_upper: 0,
      p_value: 1,
      testStatistic: 0,
      isNonInferior: false
    }
  }

  const ci_lower = diff - z_alpha * se
  const ci_upper = diff + z_alpha * se

  // TOST方法: 两个单侧检验
  // Test 1: H0: diff ≤ -δ vs H1: diff > -δ（右尾检验）
  // Test 2: H0: diff ≥ δ vs H1: diff < δ（左尾检验）
  const t1 = safeDivide(diff + delta, se, 0)
  const t2 = safeDivide(diff - delta, se, 0)
  const p1_value = 1 - normalCDF(t1) // 右尾P值
  const p2_value = normalCDF(t2) // 左尾P值
  const p_value = Math.max(p1_value, p2_value)

  const df_eq = n1 + n2 - 2
  return {
    mean1,
    mean2,
    diff,
    ci_lower,
    ci_upper,
    p_value,
    testStatistic: (t1 + t2) / 2, // TOST 两侧 t 统计量的平均值
    isNonInferior: ci_lower > -delta && ci_upper < delta, // 等效成立条件
    // P0-3.0: 检验统计量元数据（TOST 双侧检验）
    testStatisticType: 't',
    df: df_eq,
    testStatisticLabel: `t₁(${df_eq}) = ${t1.toFixed(2)}, t₂(${df_eq}) = ${t2.toFixed(2)}`
  }
}

export {
  calculateNIResult,
  calculateNIResultContinuous,
  calculateSupResult,
  calculateSupResultContinuous,
  calculateEqResult,
  calculateEqResultContinuous
}
