/**
 * @module sample-size/multigroup
 * @description 多组比较样本量计算 - 率终点和连续终点
 * @author Device Helper Team
 * @date 2026-01-18
 */

import { safeNumber, safeDivide } from '../core/safe-math.js'
import { normalInverse } from '../core/normal-distribution.js'
import { validateStatParams } from '../core/param-validator.js'

// ========================================================
// 多组比较 (Multigroup Comparison)
// 使用Bonferroni校正控制family-wise error rate
// ========================================================

/**
 * 多组比较样本量计算 - 率终点
 * 检验目标: 至少一组非劣效/优效
 * 统计方法: Bonferroni校正
 *
 * @param {number} p0 - 对照组预期率 (0-1)
 * @param {number[]} p_groups - 各试验组预期率数组 (0-1)
 * @param {number} delta - 非劣效界值 (0-1)
 * @param {number} alpha - 原始显著性水平 (单侧)
 * @param {number} power - 检验效能 (0-1)
 * @param {string} studyType - 试验类型: 'non-inferiority', 'superiority'
 * @returns {object} - {n_per_group: 每组样本量, alpha_adjusted: 调整后alpha, k: 组数}
 */
function calculateMultigroupSampleSize(
  p0,
  p_groups,
  delta,
  alpha,
  power,
  studyType,
  allocations = null,
  strategy = 'any'
) {
  // 统一参数验证（W8CR）：validate 消费**原始入参**，须在任何 safeNumber 兜底之前执行 ——
  // 否则类型无效（NaN/undefined）被 safeNumber 洗成合法默认值（0.5/0.025/0.8）后 validator 判 valid，
  // 函数返回假合法样本量。p_groups 为数组、delta 无域约束，均不参与此校验。
  const validation = validateStatParams({ p0, alpha, power })

  // 安全转换（数值清洗；validate 已挡住无效输入，默认值不再承担"无效输入兜底"职责）
  p0 = safeNumber(p0, 0.5)
  delta = safeNumber(delta, 0.1)
  alpha = safeNumber(alpha, 0.025)
  power = safeNumber(power, 0.8)

  // Alpha校正: "所有组成功"策略不需要Bonferroni校正
  const k = p_groups.length
  const alpha_adjusted = strategy === 'all' ? alpha : alpha / k

  // 如果未提供 allocations,默认等比例
  if (!allocations) {
    allocations = Array(k + 1).fill(1)
  }

  // 获取调整后的z值
  const z_alpha = normalInverse(1 - alpha_adjusted)
  const z_beta = normalInverse(power)

  // 类型无效 / 数学域外 → 拒绝计算（与 z 无效同一 NaN 形态）；validation 已在 safeNumber 之前对原始入参求值
  if (!validation.valid || !isFinite(z_alpha) || !isFinite(z_beta)) {
    const n_per_group_array = allocations.map(() => NaN)
    return {
      base_n: NaN,
      n_per_group: NaN,
      n_per_group_array,
      allocations,
      alpha_adjusted,
      k
    }
  }

  // 计算每组所需样本量（取所有组中最大值）
  let max_n = NaN // 初始为NaN，表示尚未计算出有效值

  for (let i = 0; i < k; i++) {
    const p1 = safeNumber(p_groups[i], 0.5)

    // 根据试验类型确定效应量
    let effectSize
    if (studyType === 'non-inferiority') {
      // 非劣效: 真实差值 = p1-p0, 效应 = (p1-p0) + delta
      effectSize = p1 - p0 + delta
    } else if (studyType === 'superiority') {
      // 优效: 真实差值 = p1-p0
      effectSize = p1 - p0
    } else if (studyType === 'equivalence') {
      // 等效: TOST方法, 效应 = delta - |p1-p0|
      // 假设p1-p0接近0(等效), 效应量为delta
      effectSize = delta
    } else {
      effectSize = p1 - p0
    }

    // 避免效应量为0
    if (Math.abs(effectSize) < 1e-10) {
      continue
    }

    // 不等分配的方差公式
    const r0 = allocations[0]
    const ri = allocations[i + 1]

    // 方差 = p0(1-p0)/r0 + p1(1-p1)/ri
    const variance = (p0 * (1 - p0)) / r0 + (p1 * (1 - p1)) / ri

    // 基础样本量: base_n = (z_α + z_β)² × variance / effectSize²
    const numer = Math.pow(z_alpha + z_beta, 2) * variance
    const denom = Math.pow(effectSize, 2)

    const n = safeDivide(numer, denom, 0)

    // 更新最大值（处理NaN初始值）
    if (Number.isNaN(max_n) || n > max_n) {
      max_n = n
    }
  }

  // 所有组效应量为0时，max_n 仍为 NaN（未定义）
  if (Number.isNaN(max_n)) {
    const n_per_group_array = allocations.map(() => NaN)
    return {
      base_n: NaN,
      n_per_group: NaN,
      n_per_group_array,
      allocations,
      alpha_adjusted,
      k
    }
  }

  // 计算结果检查
  if (max_n < 0) {
    const n_per_group_array = allocations.map(() => NaN)
    return {
      base_n: NaN,
      n_per_group: NaN,
      n_per_group_array,
      allocations,
      alpha_adjusted,
      k
    }
  }
  if (!isFinite(max_n)) {
    const n_per_group_array = allocations.map(() => Infinity)
    return {
      base_n: Infinity,
      n_per_group: Infinity,
      n_per_group_array,
      allocations,
      alpha_adjusted,
      k
    }
  }

  const base_n = Math.ceil(max_n)

  // 计算各组实际样本量
  const n_per_group_array = allocations.map(r => Math.ceil(base_n * r))

  return {
    base_n,
    n_per_group: base_n, // 保持向后兼容
    n_per_group_array,
    allocations,
    alpha_adjusted,
    k
  }
}

/**
 * 多组比较样本量计算 - 连续终点
 * 检验目标: 至少一组非劣效/优效
 * 统计方法: Bonferroni校正
 *
 * @param {number} mean0 - 对照组预期均值
 * @param {number[]} mean_groups - 各试验组预期均值数组
 * @param {number} sd - 共同标准差
 * @param {number} delta - 非劣效界值
 * @param {number} alpha - 原始显著性水平 (单侧)
 * @param {number} power - 检验效能 (0-1)
 * @param {string} studyType - 试验类型: 'non-inferiority', 'superiority'
 * @returns {object} - {n_per_group: 每组样本量, alpha_adjusted: 调整后alpha, k: 组数}
 */
function calculateMultigroupSampleSizeContinuous(
  mean0,
  mean_groups,
  sd,
  delta,
  alpha,
  power,
  studyType,
  allocations = null,
  strategy = 'any'
) {
  // 统一参数验证（W8CR）：validate 消费**原始入参**，须在任何 safeNumber 兜底之前执行 ——
  // 否则 sd/alpha/power 类型无效被 safeNumber 洗成合法默认值（1/0.025/0.8）后 validator 判 valid，
  // 函数返回假合法样本量。mean0/mean_groups/delta 无域约束，均不参与此校验。
  const validation = validateStatParams({ sd, alpha, power })

  // 安全转换（数值清洗；validate 已挡住无效输入，默认值不再承担"无效输入兜底"职责）
  mean0 = safeNumber(mean0, 0)
  sd = safeNumber(sd, 1)
  delta = safeNumber(delta, 0)
  alpha = safeNumber(alpha, 0.025)
  power = safeNumber(power, 0.8)

  // Alpha校正: "所有组成功"策略不需要Bonferroni校正
  const k = mean_groups.length
  const alpha_adjusted = strategy === 'all' ? alpha : alpha / k

  // 如果未提供 allocations,默认等比例
  if (!allocations) {
    allocations = Array(k + 1).fill(1)
  }

  // 获取调整后的z值
  const z_alpha = normalInverse(1 - alpha_adjusted)
  const z_beta = normalInverse(power)

  // 类型无效 / 数学域外（含 sd≤0）→ 拒绝计算（与 z 无效同一 NaN 形态）；validation 已在 safeNumber 之前对原始入参求值
  if (!validation.valid || !isFinite(z_alpha) || !isFinite(z_beta)) {
    const n_per_group_array = allocations.map(() => NaN)
    return {
      base_n: NaN,
      n_per_group: NaN,
      n_per_group_array,
      allocations,
      alpha_adjusted,
      k
    }
  }

  // 计算每组所需样本量（取所有组中最大值）
  let max_n = NaN // 初始为NaN，表示尚未计算出有效值

  for (let i = 0; i < k; i++) {
    const mean1 = safeNumber(mean_groups[i], 0)

    // 根据试验类型确定效应量
    let effectSize
    if (studyType === 'non-inferiority') {
      // 非劣效: 效应 = (mean1 - mean0) + delta
      // 注意: 对于"越大越好"的指标, delta > 0
      //      对于"越小越好"的指标, delta < 0
      effectSize = mean1 - mean0 + delta
    } else if (studyType === 'superiority') {
      // 优效: 效应 = mean1 - mean0
      effectSize = mean1 - mean0
    } else if (studyType === 'equivalence') {
      // 等效: TOST方法, 效应量 = delta
      // 假设mean1-mean0接近0(等效), 效应量为等效界值
      effectSize = Math.abs(delta)
    } else {
      effectSize = mean1 - mean0
    }

    // 避免效应量为0
    if (Math.abs(effectSize) < 1e-10) {
      continue
    }

    // 不等分配的方差公式
    const r0 = allocations[0]
    const ri = allocations[i + 1]

    // 方差 = σ² × [1/r0 + 1/ri]
    const variance = Math.pow(sd, 2) * (1 / r0 + 1 / ri)

    // 基础样本量
    const numer = Math.pow(z_alpha + z_beta, 2) * variance
    const denom = Math.pow(effectSize, 2)

    const n = safeDivide(numer, denom, 0)

    // 更新最大值（处理NaN初始值）
    if (Number.isNaN(max_n) || n > max_n) {
      max_n = n
    }
  }

  // 所有组效应量为0时，max_n 仍为 NaN（未定义）
  if (Number.isNaN(max_n)) {
    const n_per_group_array = allocations.map(() => NaN)
    return {
      base_n: NaN,
      n_per_group: NaN,
      n_per_group_array,
      allocations,
      alpha_adjusted,
      k
    }
  }

  // 计算结果检查
  if (max_n < 0) {
    const n_per_group_array = allocations.map(() => NaN)
    return {
      base_n: NaN,
      n_per_group: NaN,
      n_per_group_array,
      allocations,
      alpha_adjusted,
      k
    }
  }
  if (!isFinite(max_n)) {
    const n_per_group_array = allocations.map(() => Infinity)
    return {
      base_n: Infinity,
      n_per_group: Infinity,
      n_per_group_array,
      allocations,
      alpha_adjusted,
      k
    }
  }

  const base_n = Math.ceil(max_n)

  // 计算各组实际样本量
  const n_per_group_array = allocations.map(r => Math.ceil(base_n * r))

  return {
    base_n,
    n_per_group: base_n, // 保持向后兼容
    n_per_group_array,
    allocations,
    alpha_adjusted,
    k
  }
}

export { calculateMultigroupSampleSize, calculateMultigroupSampleSizeContinuous }
