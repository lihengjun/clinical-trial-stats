/**
 * @module core/confidence-interval
 * @description 置信区间计算函数 - Wilson Score方法
 * @author Device Helper Team
 * @date 2026-01-18
 */

import { safeNumber, safeDivide } from './safe-math'

// Wilson Score单个比例的置信区间
function calculateWilsonCI(x, n, z) {
  x = safeNumber(x, 0)
  n = safeNumber(n, 1)

  if (n === 0) {
    return { lower: 0, upper: 0 }
  }

  const p = safeDivide(x, n, 0)
  const z2 = z * z
  const denom = 1 + safeDivide(z2, n, 0)

  const center = safeDivide(p + z2 / (2 * n), denom, p)

  // 计算margin时检查数值稳定性
  const sqrtTerm = (p * (1 - p)) / n + z2 / (4 * n * n)
  // 确保开方项非负
  const safeSqrtTerm = Math.max(0, sqrtTerm)
  const margin = safeDivide(z * Math.sqrt(safeSqrtTerm), denom, 0)

  // 额外检查: margin不应超过1(这会导致CI超出[0,1])
  const safeMargin = Math.min(margin, 1)

  const lower = Math.max(0, center - safeMargin)
  const upper = Math.min(1, center + safeMargin)

  return { lower, upper }
}

export { calculateWilsonCI }
