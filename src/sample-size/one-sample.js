/**
 * @module sample-size/one-sample
 * @description 单组试验样本量计算 - 率终点和连续终点
 * @author Device Helper Team
 * @date 2026-01-18
 */

import { safeNumber, safeDivide } from '../core/safe-math'
import { normalInverse } from '../core/normal-distribution'

// ========================================================
// 单组试验 (Single-Arm Trial / One-Sample Test)
// ========================================================

// Sample Size Calculation for Single-Arm Trial (Proportion)
// H0: p ≤ p0, H1: p > p0
// p0: 历史对照率, p1: 预期试验组率
function calculateOneSampleSize(p0, p1, alpha, power) {
  p0 = safeNumber(p0, 0)
  p1 = safeNumber(p1, 0)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)

  const z_alpha = normalInverse(1 - alpha)
  const z_beta = normalInverse(power)

  // 检查z值是否有效（alpha=0 或 power=100% 时无效）
  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n1: NaN, n2: NaN }
  }

  // 单组试验要求 p1 ≠ p0，否则无法证明差异（未定义）
  const effectSize = p1 - p0
  if (Math.abs(effectSize) < 1e-10) {
    return { n1: NaN, n2: NaN }
  }

  // Formula: n = (z_α√[p0(1-p0)] + z_β√[p1(1-p1)])² / (p1-p0)²
  const numer = Math.pow(z_alpha * Math.sqrt(p0 * (1 - p0)) + z_beta * Math.sqrt(p1 * (1 - p1)), 2)
  const denom = Math.pow(effectSize, 2)

  const n_raw = numer / denom

  // 计算结果检查
  if (n_raw < 0) {
    return { n1: NaN, n2: NaN }
  }
  if (!isFinite(n_raw)) {
    return { n1: Infinity, n2: Infinity }
  }

  const n1 = Math.ceil(n_raw)

  return { n1, n2: 0 } // 单组试验没有n2
}

// Sample Size Calculation for Single-Arm Trial (Continuous)
// H0: μ ≤ μ0, H1: μ > μ0
function calculateOneSampleSizeContinuous(mu0, mu1, sigma, alpha, power) {
  mu0 = safeNumber(mu0, 0)
  mu1 = safeNumber(mu1, 0)
  sigma = safeNumber(sigma, 1)
  alpha = safeNumber(alpha, 0)
  power = safeNumber(power, 0)

  const z_alpha = normalInverse(1 - alpha)
  const z_beta = normalInverse(power)

  // 检查z值是否有效（alpha=0 或 power=100% 时无效）
  if (!isFinite(z_alpha) || !isFinite(z_beta)) {
    return { n1: NaN, n2: NaN }
  }

  // 单组试验要求 mu1 ≠ mu0，否则无法证明差异（未定义）
  const effectSize = mu1 - mu0
  if (Math.abs(effectSize) < 1e-10) {
    return { n1: NaN, n2: NaN }
  }

  // Formula: n = (z_α + z_β)² × σ² / (μ1-μ0)²
  const numer = Math.pow(z_alpha + z_beta, 2) * Math.pow(sigma, 2)
  const denom = Math.pow(effectSize, 2)

  const n_raw = numer / denom

  // 计算结果检查
  if (n_raw < 0) {
    return { n1: NaN, n2: NaN }
  }
  if (!isFinite(n_raw)) {
    return { n1: Infinity, n2: Infinity }
  }

  const n1 = Math.ceil(n_raw)

  return { n1, n2: 0 }
}

export { calculateOneSampleSize, calculateOneSampleSizeContinuous }
