/**
 * @module sensitivity/analysis
 * @description 敏感性分析 - 探索参数变化对样本量的影响
 * @author Device Helper Team
 * @date 2026-01-18
 */

import {
  calculateNISampleSize,
  calculateSupSampleSize,
  calculateEqSampleSize,
  calculateNISampleSizeContinuous,
  calculateSupSampleSizeContinuous,
  calculateEqSampleSizeContinuous
} from '../sample-size/two-group'

import {
  calculateMultigroupSampleSize,
  calculateMultigroupSampleSizeContinuous
} from '../sample-size/multigroup'

// ========================================================
// 敏感性分析 (Sensitivity Analysis)
// ========================================================

/**
 * 运行敏感性分析 - 探索参数变化对样本量的影响
 * @param {string} mode - 计算模式: 'two-proportion' | 'two-mean' | 'multi-proportion' | 'multi-mean'
 * @param {object} baseParams - 基准参数对象
 * @param {object} sensitivityConfig - 敏感性配置 { parameter: 'p1', min: 0.55, max: 0.75, step: 0.05 }
 * @returns {Array} - 参数值-样本量数组 [{paramValue: 0.55, sampleSize: 199}, ...]
 */
function runSensitivityAnalysis(mode, baseParams, sensitivityConfig) {
  const { parameter, min, max, step } = sensitivityConfig
  const results = []

  // 参数验证
  if (!parameter || min == null || max == null || step == null) {
    return { error: '敏感性分析配置不完整' }
  }

  if (min >= max) {
    return { error: '最小值必须小于最大值' }
  }

  if (step <= 0) {
    return { error: '步长必须大于0' }
  }

  // 限制最大探索点数(防止性能问题)
  const numPoints = Math.floor((max - min) / step) + 1
  if (numPoints > 50) {
    return { error: '探索点数过多(最多50个),请增大步长' }
  }

  // 循环探索参数
  for (let value = min; value <= max + 1e-10; value += step) {
    // 四舍五入到合理精度
    value = Math.round(value * 1000) / 1000

    // 复制基准参数
    const params = { ...baseParams }

    // 更新敏感性参数
    params[parameter] = value

    // 根据模式调用相应的样本量计算函数
    let result
    try {
      if (mode === 'two-proportion') {
        // 两组比较 - 率终点
        const studyType = params.studyType || 'non-inferiority'
        if (studyType === 'non-inferiority') {
          result = calculateNISampleSize(
            params.p1,
            params.p0,
            params.delta,
            params.alpha,
            params.power,
            params.ratio
          )
        } else if (studyType === 'superiority') {
          result = calculateSupSampleSize(
            params.p1,
            params.p0,
            params.alpha,
            params.power,
            params.ratio
          )
        } else if (studyType === 'equivalence') {
          result = calculateEqSampleSize(
            params.p1,
            params.p0,
            params.delta,
            params.alpha,
            params.power,
            params.ratio
          )
        }
      } else if (mode === 'two-mean') {
        // 两组比较 - 连续终点
        const studyType = params.studyType || 'non-inferiority'
        if (studyType === 'non-inferiority') {
          result = calculateNISampleSizeContinuous(
            params.mean1,
            params.mean0,
            params.sd,
            params.delta,
            params.alpha,
            params.power,
            params.ratio
          )
        } else if (studyType === 'superiority') {
          result = calculateSupSampleSizeContinuous(
            params.mean1,
            params.mean0,
            params.sd,
            params.alpha,
            params.power,
            params.ratio
          )
        } else if (studyType === 'equivalence') {
          result = calculateEqSampleSizeContinuous(
            params.mean1,
            params.mean0,
            params.sd,
            params.delta,
            params.alpha,
            params.power,
            params.ratio
          )
        }
      } else if (mode === 'multi-proportion') {
        // 多组比较 - 率终点
        result = calculateMultigroupSampleSize(
          params.p0,
          params.p_groups,
          params.delta,
          params.alpha,
          params.power,
          params.studyType,
          params.allocations,
          params.strategy
        )
      } else if (mode === 'multi-mean') {
        // 多组比较 - 连续终点
        result = calculateMultigroupSampleSizeContinuous(
          params.mean0,
          params.mean_groups,
          params.sd,
          params.delta,
          params.alpha,
          params.power,
          params.studyType,
          params.allocations,
          params.strategy
        )
      } else {
        return { error: '不支持的计算模式' }
      }

      // 提取样本量
      let sampleSize
      if (mode.startsWith('two-')) {
        // 两组比较
        sampleSize = result.n1 || result.n_per_group
      } else {
        // 多组比较
        sampleSize = result.base_n || result.n_per_group
      }

      // 计算总样本量
      let totalSampleSize
      if (mode.startsWith('two-')) {
        totalSampleSize = result.n0 + result.n1
      } else {
        totalSampleSize = result.n_per_group_array
          ? result.n_per_group_array.reduce((sum, n) => sum + n, 0)
          : sampleSize * (result.k + 1)
      }

      results.push({
        paramValue: value,
        sampleSize: sampleSize,
        totalSampleSize: totalSampleSize,
        alpha_adjusted: result.alpha_adjusted
      })
    } catch (error) {
      // 如果某个参数值导致计算错误,跳过
      results.push({
        paramValue: value,
        sampleSize: null,
        totalSampleSize: null,
        error: '计算错误'
      })
    }
  }

  return {
    parameter,
    min,
    max,
    step,
    baseValue: baseParams[parameter],
    results
  }
}

export { runSensitivityAnalysis }
