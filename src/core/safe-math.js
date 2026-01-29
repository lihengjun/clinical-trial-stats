/**
 * @module core/safe-math
 * @description 安全数学运算函数 - 提供安全的数值转换、除法运算和浮点数比较
 * @author Device Helper Team
 * @date 2026-01-18
 */

// ========================================================
// 浮点数精度常量
// ========================================================

/**
 * 浮点数比较容差
 * 用于处理 JavaScript 浮点数精度问题（如 0.95-0.85=0.09999999999999998）
 * 选择 1e-9 是因为：
 * - 足够小，不影响正常的统计计算精度
 * - 足够大，能覆盖典型的浮点误差（通常在 1e-15 到 1e-10 之间）
 */
const FLOAT_EPSILON = 1e-9

// ========================================================
// 浮点数比较函数
// ========================================================

/**
 * 浮点数近似相等比较
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @param {number} epsilon - 容差，默认 FLOAT_EPSILON
 * @returns {boolean} 是否近似相等
 */
function floatEqual(a, b, epsilon = FLOAT_EPSILON) {
  return Math.abs(a - b) <= epsilon
}

/**
 * 浮点数大于等于比较 (a >= b)
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @param {number} epsilon - 容差，默认 FLOAT_EPSILON
 * @returns {boolean} a 是否大于等于 b
 */
function floatGte(a, b, epsilon = FLOAT_EPSILON) {
  return a >= b - epsilon
}

/**
 * 浮点数小于等于比较 (a <= b)
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @param {number} epsilon - 容差，默认 FLOAT_EPSILON
 * @returns {boolean} a 是否小于等于 b
 */
function floatLte(a, b, epsilon = FLOAT_EPSILON) {
  return a <= b + epsilon
}

/**
 * 浮点数大于比较 (a > b)
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @param {number} epsilon - 容差，默认 FLOAT_EPSILON
 * @returns {boolean} a 是否严格大于 b
 */
function floatGt(a, b, epsilon = FLOAT_EPSILON) {
  return a > b + epsilon
}

/**
 * 浮点数小于比较 (a < b)
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @param {number} epsilon - 容差，默认 FLOAT_EPSILON
 * @returns {boolean} a 是否严格小于 b
 */
function floatLt(a, b, epsilon = FLOAT_EPSILON) {
  return a < b - epsilon
}

// ========================================================
// 数值安全转换
// ========================================================

// 安全数值转换 - 确保输入是有效数字，防止任何类型的异常输入导致崩溃
function safeNumber(value, fallback = 0) {
  // 检查是否为数字类型且有限（排除NaN、Infinity）
  if (typeof value === 'number' && isFinite(value)) {
    return value
  }
  // 尝试转换为数字
  const num = Number(value)
  return typeof num === 'number' && isFinite(num) ? num : fallback
}

// 安全除法 - 防止除以0或其他异常情况导致崩溃
function safeDivide(numerator, denominator, fallback = 0) {
  const a = safeNumber(numerator, 0)
  const b = safeNumber(denominator, 0)

  // 分母为0或过小时返回fallback
  if (Math.abs(b) < 1e-10) {
    return fallback
  }

  const result = a / b
  // 确保结果有效
  return isFinite(result) ? result : fallback
}

export {
  // 浮点数比较
  FLOAT_EPSILON,
  floatEqual,
  floatGte,
  floatLte,
  floatGt,
  floatLt,
  // 数值安全转换
  safeNumber,
  safeDivide
}
