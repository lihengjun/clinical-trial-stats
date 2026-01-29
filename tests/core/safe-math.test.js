/**
 * @file safe-math.test.js
 * @description 安全数学运算函数测试
 */

import { describe, it, expect } from 'vitest'
import {
  FLOAT_EPSILON,
  floatEqual,
  floatGte,
  floatLte,
  floatGt,
  floatLt,
  safeNumber,
  safeDivide
} from '../../src/core/safe-math'

describe('safe-math', () => {
  // ========================================================
  // safeNumber 测试
  // ========================================================
  describe('safeNumber', () => {
    it('应正确处理有效数字', () => {
      expect(safeNumber(42)).toBe(42)
      expect(safeNumber(0)).toBe(0)
      expect(safeNumber(-10)).toBe(-10)
      expect(safeNumber(3.14159)).toBe(3.14159)
    })

    it('应正确处理字符串数字', () => {
      expect(safeNumber('42')).toBe(42)
      expect(safeNumber('3.14')).toBe(3.14)
      expect(safeNumber('-10')).toBe(-10)
    })

    it('应正确处理无效输入并返回 fallback', () => {
      expect(safeNumber(NaN)).toBe(0)
      expect(safeNumber(Infinity)).toBe(0)
      expect(safeNumber(-Infinity)).toBe(0)
      expect(safeNumber(null)).toBe(0)
      expect(safeNumber(undefined)).toBe(0)
      expect(safeNumber('abc')).toBe(0)
      expect(safeNumber({})).toBe(0)
      expect(safeNumber([])).toBe(0)
    })

    it('应正确使用自定义 fallback', () => {
      expect(safeNumber(NaN, 99)).toBe(99)
      expect(safeNumber('invalid', -1)).toBe(-1)
      expect(safeNumber(undefined, 0.5)).toBe(0.5)
    })
  })

  // ========================================================
  // safeDivide 测试
  // ========================================================
  describe('safeDivide', () => {
    it('应正确执行正常除法', () => {
      expect(safeDivide(10, 2)).toBe(5)
      expect(safeDivide(7, 2)).toBe(3.5)
      expect(safeDivide(-10, 2)).toBe(-5)
      expect(safeDivide(10, -2)).toBe(-5)
    })

    it('应处理除以零的情况', () => {
      expect(safeDivide(10, 0)).toBe(0)
      expect(safeDivide(10, 0, -1)).toBe(-1)
      expect(safeDivide(0, 0)).toBe(0)
    })

    it('应处理除以极小值的情况', () => {
      expect(safeDivide(10, 1e-11)).toBe(0)
      expect(safeDivide(10, 1e-11, 999)).toBe(999)
    })

    it('应处理无效输入', () => {
      expect(safeDivide(NaN, 2)).toBe(0)
      expect(safeDivide(10, NaN)).toBe(0)
      expect(safeDivide('10', '2')).toBe(5)
    })
  })

  // ========================================================
  // 浮点数比较函数测试
  // ========================================================
  describe('floatEqual', () => {
    it('应正确比较相等的浮点数', () => {
      expect(floatEqual(0.1 + 0.2, 0.3)).toBe(true)
      expect(floatEqual(1.0, 1.0)).toBe(true)
      expect(floatEqual(0, 0)).toBe(true)
    })

    it('应正确比较不相等的浮点数', () => {
      expect(floatEqual(1.0, 2.0)).toBe(false)
      expect(floatEqual(0.1, 0.2)).toBe(false)
    })

    it('应处理经典的浮点精度问题', () => {
      // JavaScript 经典问题: 0.95 - 0.85 = 0.09999999999999998
      const result = 0.95 - 0.85
      expect(floatEqual(result, 0.1)).toBe(true)
    })
  })

  describe('floatGte', () => {
    it('应正确判断大于等于', () => {
      expect(floatGte(1.0, 1.0)).toBe(true)
      expect(floatGte(2.0, 1.0)).toBe(true)
      expect(floatGte(0.5, 1.0)).toBe(false)
    })

    it('应处理浮点精度边界', () => {
      const result = 0.95 - 0.85 // 0.09999999999999998
      expect(floatGte(result, 0.1)).toBe(true)
    })
  })

  describe('floatLte', () => {
    it('应正确判断小于等于', () => {
      expect(floatLte(1.0, 1.0)).toBe(true)
      expect(floatLte(0.5, 1.0)).toBe(true)
      expect(floatLte(2.0, 1.0)).toBe(false)
    })
  })

  describe('floatGt', () => {
    it('应正确判断严格大于', () => {
      expect(floatGt(2.0, 1.0)).toBe(true)
      expect(floatGt(1.0, 1.0)).toBe(false)
      expect(floatGt(0.5, 1.0)).toBe(false)
    })

    it('应处理边界情况', () => {
      // 1.0 + EPSILON/2 不应该严格大于 1.0
      expect(floatGt(1.0 + FLOAT_EPSILON / 2, 1.0)).toBe(false)
      // 1.0 + 2*EPSILON 应该严格大于 1.0
      expect(floatGt(1.0 + FLOAT_EPSILON * 2, 1.0)).toBe(true)
    })
  })

  describe('floatLt', () => {
    it('应正确判断严格小于', () => {
      expect(floatLt(0.5, 1.0)).toBe(true)
      expect(floatLt(1.0, 1.0)).toBe(false)
      expect(floatLt(2.0, 1.0)).toBe(false)
    })
  })
})
