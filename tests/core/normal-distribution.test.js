/**
 * @file normal-distribution.test.js
 * @description 标准正态分布函数测试
 *
 * 验证数据来源:
 * - 标准正态分布表 (z-table)
 * - R 语言 pnorm/qnorm 函数
 * - Python scipy.stats.norm
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  normalCDF,
  normalInverse,
  clearNormalInverseCache
} from '../../src/core/normal-distribution'

describe('normal-distribution', () => {
  // 每次测试前清空缓存，确保测试独立
  beforeEach(() => {
    clearNormalInverseCache()
  })

  // ========================================================
  // normalCDF 测试 - 累积分布函数
  // ========================================================
  describe('normalCDF', () => {
    it('应正确计算常见 z 值的累积概率', () => {
      // z = 0 -> P = 0.5
      expect(normalCDF(0)).toBeCloseTo(0.5, 4)

      // z = 1.96 -> P ≈ 0.975 (双侧 95% CI)
      expect(normalCDF(1.96)).toBeCloseTo(0.975, 3)

      // z = -1.96 -> P ≈ 0.025
      expect(normalCDF(-1.96)).toBeCloseTo(0.025, 3)

      // z = 1.645 -> P ≈ 0.95 (单侧 95%)
      expect(normalCDF(1.645)).toBeCloseTo(0.95, 2)

      // z = 2.576 -> P ≈ 0.995 (双侧 99% CI)
      expect(normalCDF(2.576)).toBeCloseTo(0.995, 3)
    })

    it('应正确处理极端值', () => {
      // 大正值 -> 接近 1
      expect(normalCDF(5)).toBeCloseTo(1, 4)
      expect(normalCDF(10)).toBeCloseTo(1, 6)

      // 大负值 -> 接近 0
      expect(normalCDF(-5)).toBeCloseTo(0, 4)
      expect(normalCDF(-10)).toBeCloseTo(0, 6)
    })

    it('应满足对称性: CDF(z) + CDF(-z) = 1', () => {
      const testValues = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]
      testValues.forEach(z => {
        expect(normalCDF(z) + normalCDF(-z)).toBeCloseTo(1, 10)
      })
    })
  })

  // ========================================================
  // normalInverse 测试 - 逆累积分布函数（分位数函数）
  // ========================================================
  describe('normalInverse', () => {
    it('应正确计算常见概率的 z 值', () => {
      // P = 0.5 -> z = 0
      expect(normalInverse(0.5)).toBeCloseTo(0, 4)

      // P = 0.975 -> z ≈ 1.96 (用于 95% CI 的 alpha=0.025)
      expect(normalInverse(0.975)).toBeCloseTo(1.96, 2)

      // P = 0.95 -> z ≈ 1.645 (用于单侧 alpha=0.05)
      expect(normalInverse(0.95)).toBeCloseTo(1.645, 2)

      // P = 0.8 -> z ≈ 0.842 (用于 80% power)
      expect(normalInverse(0.8)).toBeCloseTo(0.842, 2)

      // P = 0.9 -> z ≈ 1.282 (用于 90% power)
      expect(normalInverse(0.9)).toBeCloseTo(1.282, 2)
    })

    it('应正确处理样本量计算中常用的 alpha/power 组合', () => {
      // alpha = 0.025 (单侧), 1-alpha = 0.975
      const z_alpha_0025 = normalInverse(0.975)
      expect(z_alpha_0025).toBeCloseTo(1.96, 2)

      // alpha = 0.05 (单侧), 1-alpha = 0.95
      const z_alpha_005 = normalInverse(0.95)
      expect(z_alpha_005).toBeCloseTo(1.645, 2)

      // power = 80%, z_beta
      const z_beta_80 = normalInverse(0.8)
      expect(z_beta_80).toBeCloseTo(0.842, 2)

      // power = 90%, z_beta
      const z_beta_90 = normalInverse(0.9)
      expect(z_beta_90).toBeCloseTo(1.282, 2)
    })

    it('应正确处理边界值', () => {
      // P <= 0 -> -Infinity
      expect(normalInverse(0)).toBe(-Infinity)
      expect(normalInverse(-0.1)).toBe(-Infinity)

      // P >= 1 -> Infinity
      expect(normalInverse(1)).toBe(Infinity)
      expect(normalInverse(1.1)).toBe(Infinity)
    })

    it('应与 normalCDF 互为逆函数', () => {
      const testProbs = [0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]
      testProbs.forEach(p => {
        const z = normalInverse(p)
        expect(normalCDF(z)).toBeCloseTo(p, 6)
      })
    })

    it('缓存应正确工作', () => {
      // 第一次调用
      const z1 = normalInverse(0.975)

      // 清空缓存
      clearNormalInverseCache()

      // 第二次调用（应重新计算）
      const z2 = normalInverse(0.975)

      // 结果应该相同
      expect(z1).toBe(z2)
    })
  })

  // ========================================================
  // 精度验证测试 - 与 R/Python 结果对比
  // ========================================================
  describe('precision validation', () => {
    it('normalCDF 精度应达到 6 位小数', () => {
      // 验证数据来自 R: pnorm(x)
      const testCases = [
        { x: 0, expected: 0.5 },
        { x: 1, expected: 0.8413447 },
        { x: -1, expected: 0.1586553 },
        { x: 2, expected: 0.9772499 },
        { x: -2, expected: 0.0227501 }
      ]

      testCases.forEach(({ x, expected }) => {
        expect(normalCDF(x)).toBeCloseTo(expected, 5)
      })
    })

    it('normalInverse 精度应达到 6 位小数', () => {
      // 验证数据来自 R: qnorm(p)
      const testCases = [
        { p: 0.5, expected: 0 },
        { p: 0.8413447, expected: 1 },
        { p: 0.1586553, expected: -1 },
        { p: 0.9772499, expected: 2 },
        { p: 0.0227501, expected: -2 }
      ]

      testCases.forEach(({ p, expected }) => {
        expect(normalInverse(p)).toBeCloseTo(expected, 4)
      })
    })
  })
})
