/**
 * 诊断试验样本量计算模块
 * Diagnostic Test Sample Size Calculation Module
 *
 * 功能: 计算评估敏感性/特异性所需的样本量
 * 场景: 诊断准确性研究、新标志物验证、检测试剂盒评估
 * 依赖: normal-distribution.js
 *
 * @module utils/statistics/diagnostic/sensitivity-specificity
 * @requires ../core/normal-distribution
 *
 * @references 公式来源
 *
 * [1] Flahault A, Cadilhac M, Thomas G. Sample size calculation should be performed
 *     for design accuracy in diagnostic test studies.
 *     J Clin Epidemiol. 2005;58(8):859-862. DOI: 10.1016/j.jclinepi.2004.12.009
 *     (诊断试验样本量公式的系统阐述)
 *
 * [2] Buderer NMF. Statistical Methodology: I. Incorporating the Prevalence of
 *     Disease into the Sample Size Calculation for Sensitivity and Specificity.
 *     Acad Emerg Med. 1996;3(9):895-900. DOI: 10.1111/j.1553-2712.1996.tb03538.x
 *     (考虑患病率的总样本量估算)
 *
 * [3] Hajian-Tilaki K. Sample sizes for estimating the diagnostic accuracy in
 *     different prevalences: two-sided confidence interval methods.
 *     Stat Methods Med Res. 2014;23(4):356-367.
 *     (不同患病率下的样本量估算方法)
 *
 * [4] Machin D, Campbell MJ, Tan SB, Tan SH. Sample Size Tables for Clinical
 *     Studies. 3rd ed. Wiley-Blackwell; 2009.
 *     (两组诊断性能比较的样本量公式)
 *
 * @formula 核心公式
 *
 * 单组精度估计（Wald 近似）:
 *   n = Z²_{1-α/2} × p × (1-p) / d²
 *
 * 其中:
 *   p = 预期敏感性或特异性
 *   d = 允许的误差幅度 (如 0.05 表示 ±5%)
 *   Z_{1-α/2} = 正态分位数 (95% CI 时 α/2 = 0.025, Z = 1.96)
 *
 * 总样本量（考虑患病率）:
 *   N_total = n / prevalence      (敏感性)
 *   N_total = n / (1 - prevalence) (特异性)
 *
 * 两组比较（独立样本 Z 检验）:
 *   n = [Z_α √(2p̄(1-p̄)) + Z_β √(p₁(1-p₁) + p₂(1-p₂))]² / (p₁ - p₂)²
 *   其中 p̄ = (p₁ + p₂) / 2
 *
 * @validated 验证说明
 * - 单组公式: 与 Buderer (1996) 表格数据对照
 * - p=0.85, d=0.05, 95% CI → n ≈ 196 (Flahault 2005, Table 1)
 * - p=0.90, d=0.05, 95% CI → n ≈ 139 (标准验算)
 */

import { normalInverse } from '../core/normal-distribution'

// ═══════════════════════════════════════════════════════════
// 常量定义
// ═══════════════════════════════════════════════════════════

/**
 * 预期值有效范围的下界和上界
 * 敏感性/特异性接近 0 或 1 时方差趋近于 0，公式退化
 */
const P_LOWER_BOUND = 1e-6
const P_UPPER_BOUND = 1 - 1e-6

// ═══════════════════════════════════════════════════════════
// 单组精度估计
// ═══════════════════════════════════════════════════════════

/**
 * 诊断性能单组精度估计样本量
 *
 * 基于 Wald 近似的置信区间半宽度，计算评估敏感性或特异性
 * 所需的阳性/阴性样本数量。
 *
 * @formula n = Z²_{1-α/2} × p × (1-p) / d²
 *
 * @param {Object} params - 计算参数
 * @param {number} params.expectedValue - 预期敏感性或特异性 (0-1)
 * @param {number} params.precision - 允许的误差幅度 d (0-1，如 0.05 表示 ±5%)
 * @param {number} params.confidenceLevel - 置信水平 (0-1，如 0.95)
 * @param {'sensitivity'|'specificity'} [params.measureType='sensitivity'] - 测量类型
 * @param {number} [params.prevalence] - 患病率 (0-1)，提供时计算总样本量
 * @returns {Object} 计算结果
 * @returns {number} returns.n - 所需目标样本量（阳性或阴性患者数）
 * @returns {number|null} returns.nTotal - 总样本量（考虑患病率时）
 * @returns {string} returns.measureType - 测量类型
 * @returns {string} returns.sampleDescription - 样本描述（"阳性患者"或"阴性患者"）
 *
 * @example
 * // 评估敏感性 85%，精度 ±5%，95% 置信水平
 * calculateDiagnosticSampleSize({
 *   expectedValue: 0.85,
 *   precision: 0.05,
 *   confidenceLevel: 0.95,
 *   measureType: 'sensitivity'
 * })
 * // => { n: 196, nTotal: null, measureType: 'sensitivity', sampleDescription: '确诊阳性患者' }
 *
 * @see Flahault et al. (2005) - 诊断试验样本量标准方法
 * @see Buderer (1996) - 考虑患病率的样本量公式
 */
export function calculateDiagnosticSampleSize(params) {
  const {
    expectedValue,
    precision,
    confidenceLevel = 0.95,
    measureType = 'sensitivity',
    prevalence
  } = params

  // ═══════════════════════════════════════════════════════════
  // Step 1: 参数验证
  // ═══════════════════════════════════════════════════════════
  if (expectedValue <= 0 || expectedValue >= 1) {
    return { n: NaN, nTotal: null, measureType, sampleDescription: '' }
  }
  if (precision <= 0 || precision >= 1) {
    return { n: NaN, nTotal: null, measureType, sampleDescription: '' }
  }
  if (confidenceLevel <= 0 || confidenceLevel >= 1) {
    return { n: NaN, nTotal: null, measureType, sampleDescription: '' }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 2: 计算正态分位数
  // α 为双侧检验的显著性水平，Z 取 Z_{1-α/2}
  // ═══════════════════════════════════════════════════════════
  const alpha = 1 - confidenceLevel
  const z = normalInverse(1 - alpha / 2)

  if (!isFinite(z)) {
    return { n: NaN, nTotal: null, measureType, sampleDescription: '' }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 3: Wald 近似公式
  // n = Z² × p × (1-p) / d²
  // ═══════════════════════════════════════════════════════════
  const p = Math.max(P_LOWER_BOUND, Math.min(P_UPPER_BOUND, expectedValue))
  const n = Math.ceil((z * z * p * (1 - p)) / (precision * precision))

  // ═══════════════════════════════════════════════════════════
  // Step 4: 总样本量（考虑患病率）
  // 敏感性需要阳性患者: N_total = n / prevalence
  // 特异性需要阴性患者: N_total = n / (1 - prevalence)
  // ═══════════════════════════════════════════════════════════
  let nTotal = null
  if (prevalence != null && prevalence > 0 && prevalence < 1) {
    if (measureType === 'sensitivity') {
      nTotal = Math.ceil(n / prevalence)
    } else {
      nTotal = Math.ceil(n / (1 - prevalence))
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 5: 构建结果
  // ═══════════════════════════════════════════════════════════
  const sampleDescription = measureType === 'sensitivity'
    ? '确诊阳性患者'
    : '确诊阴性患者'

  return {
    n,
    nTotal,
    measureType,
    sampleDescription
  }
}

// ═══════════════════════════════════════════════════════════
// 两组诊断性能比较
// ═══════════════════════════════════════════════════════════

/**
 * 两种诊断方法性能比较的样本量
 *
 * 用于比较两种方法的敏感性（或特异性）是否有显著差异。
 * 基于独立样本比例的 Z 检验（pooled variance）。
 *
 * @formula n = [Z_α √(2p̄(1-p̄)) + Z_β √(p₁(1-p₁) + p₂(1-p₂))]² / (p₁ - p₂)²
 *
 * @param {Object} params - 计算参数
 * @param {number} params.p1 - 方法 1 的预期敏感性/特异性 (0-1)
 * @param {number} params.p2 - 方法 2 的预期敏感性/特异性 (0-1)
 * @param {number} params.alpha - 显著性水平 (0-1，如 0.05 为双侧)
 * @param {number} params.power - 检验效能 (0-1，如 0.80)
 * @param {'two-sided'|'one-sided'} [params.alternative='two-sided'] - 检验方向
 * @returns {Object} 计算结果
 * @returns {number} returns.n - 每组所需样本量
 * @returns {number} returns.nTotal - 总样本量 (2n)
 *
 * @example
 * // 比较两种方法: 旧方法敏感性 80% vs 新方法 90%
 * calculateDiagnosticComparison({
 *   p1: 0.80, p2: 0.90,
 *   alpha: 0.05, power: 0.80
 * })
 * // => { n: 199, nTotal: 398 }
 *
 * @see Machin et al. (2009) - 两组比例比较样本量
 */
export function calculateDiagnosticComparison(params) {
  const {
    p1,
    p2,
    alpha,
    power,
    alternative = 'two-sided'
  } = params

  // ═══════════════════════════════════════════════════════════
  // Step 1: 参数验证
  // ═══════════════════════════════════════════════════════════
  if (p1 <= 0 || p1 >= 1 || p2 <= 0 || p2 >= 1) {
    return { n: NaN, nTotal: NaN }
  }
  if (alpha <= 0 || alpha >= 1 || power <= 0 || power >= 1) {
    return { n: NaN, nTotal: NaN }
  }

  const diff = p1 - p2
  if (Math.abs(diff) < 1e-10) {
    // 两组相同时需要无穷大样本量
    return { n: Infinity, nTotal: Infinity }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 2: 计算 Z 值
  // 双侧检验用 α/2，单侧用 α
  // ═══════════════════════════════════════════════════════════
  const effectiveAlpha = alternative === 'two-sided' ? alpha / 2 : alpha
  const z_alpha = normalInverse(1 - effectiveAlpha)
  const z_beta = normalInverse(power)

  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n: NaN, nTotal: NaN }
  }

  // ═══════════════════════════════════════════════════════════
  // Step 3: Pooled variance 法
  // p̄ = (p₁ + p₂) / 2
  // n = [Z_α √(2p̄(1-p̄)) + Z_β √(p₁(1-p₁) + p₂(1-p₂))]² / (p₁ - p₂)²
  // ═══════════════════════════════════════════════════════════
  const pBar = (p1 + p2) / 2
  const pooledSE = Math.sqrt(2 * pBar * (1 - pBar))
  const unpooledSE = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))

  const numerator = Math.pow(z_alpha * pooledSE + z_beta * unpooledSE, 2)
  const denominator = diff * diff

  const n = Math.ceil(numerator / denominator)

  return {
    n,
    nTotal: 2 * n
  }
}
