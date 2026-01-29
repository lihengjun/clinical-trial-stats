/**
 * @module core/effect-size
 * @description 效应量计算与解释
 * @author Device Helper Team
 * @date 2026-01-22
 */

// ========================================================
// Cohen's d 效应量（连续终点）
// ========================================================

/**
 * 计算 Cohen's d 效应量
 * @param {number} meanDiff - 均值差
 * @param {number} sigma - 标准差
 * @returns {number} Cohen's d 值
 */
function calculateCohenD(meanDiff, sigma) {
  if (!sigma || sigma <= 0) return NaN
  return meanDiff / sigma
}

/**
 * 解释 Cohen's d 效应量大小
 * @param {number} d - Cohen's d 值
 * @returns {object} { level: 'negligible'|'small'|'medium'|'large', label: string }
 */
function interpretCohenD(d) {
  const absD = Math.abs(d)

  if (Number.isNaN(absD)) {
    return { level: 'undefined', label: '未定义' }
  }
  if (absD < 0.2) {
    return { level: 'negligible', label: '极小' }
  }
  if (absD < 0.5) {
    return { level: 'small', label: '小' }
  }
  if (absD < 0.8) {
    return { level: 'medium', label: '中' }
  }
  return { level: 'large', label: '大' }
}

/**
 * 计算并解释 Cohen's d
 * @param {number} meanDiff - 均值差
 * @param {number} sigma - 标准差
 * @returns {object} { d: number, dStr: string, level: string, label: string }
 */
function getEffectSizeInfo(meanDiff, sigma) {
  const d = calculateCohenD(meanDiff, sigma)
  const interpretation = interpretCohenD(d)

  return {
    d,
    dStr: Number.isNaN(d) ? '-' : d.toFixed(2),
    level: interpretation.level,
    label: interpretation.label
  }
}

// ========================================================
// Cohen's h 效应量（率终点）
// ========================================================

/**
 * 计算 Cohen's h 效应量（基于反正弦转换）
 * h = 2 * (arcsin(√p1) - arcsin(√p2))
 * @param {number} p1 - 率1 (0-1)
 * @param {number} p2 - 率2 (0-1)
 * @returns {number} Cohen's h 值
 */
function calculateCohenH(p1, p2) {
  if (p1 < 0 || p1 > 1 || p2 < 0 || p2 > 1) return NaN
  const phi1 = 2 * Math.asin(Math.sqrt(p1))
  const phi2 = 2 * Math.asin(Math.sqrt(p2))
  return phi1 - phi2
}

/**
 * 解释 Cohen's h 效应量大小（标准与 Cohen's d 相同）
 * @param {number} h - Cohen's h 值
 * @returns {object} { level: string, label: string }
 */
function interpretCohenH(h) {
  return interpretCohenD(h) // 解释标准相同
}

/**
 * 计算并解释 Cohen's h（率终点）
 * @param {number} p1 - 率1 (0-1)
 * @param {number} p2 - 率2 (0-1)
 * @returns {object} { h: number, hStr: string, level: string, label: string }
 */
function getEffectSizeInfoProportion(p1, p2) {
  const h = calculateCohenH(p1, p2)
  const interpretation = interpretCohenH(h)

  return {
    h,
    hStr: Number.isNaN(h) ? '-' : h.toFixed(2),
    level: interpretation.level,
    label: interpretation.label
  }
}

export {
  // 连续终点
  calculateCohenD,
  interpretCohenD,
  getEffectSizeInfo,
  // 率终点
  calculateCohenH,
  interpretCohenH,
  getEffectSizeInfoProportion
}
