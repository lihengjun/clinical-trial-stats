/**
 * @file effect-size.test.js
 * @description 效应量计算测试
 *
 * Cohen's 标准:
 * - < 0.2: 极小 (negligible)
 * - 0.2 - 0.5: 小 (small)
 * - 0.5 - 0.8: 中 (medium)
 * - >= 0.8: 大 (large)
 */

import { describe, it, expect } from 'vitest'
import {
  calculateCohenD,
  interpretCohenD,
  getEffectSizeInfo,
  calculateCohenH,
  interpretCohenH,
  getEffectSizeInfoProportion
} from '../../src/core/effect-size'

describe('effect-size', () => {
  // ========================================================
  // Cohen's d 测试 (连续终点)
  // ========================================================
  describe("Cohen's d (continuous endpoint)", () => {
    describe('calculateCohenD', () => {
      it('应正确计算 Cohen d', () => {
        // d = meanDiff / sigma
        expect(calculateCohenD(10, 10)).toBe(1.0) // 大效应
        expect(calculateCohenD(5, 10)).toBe(0.5) // 中效应
        expect(calculateCohenD(2, 10)).toBe(0.2) // 小效应
        expect(calculateCohenD(0, 10)).toBe(0) // 无效应
      })

      it('应正确处理负差值', () => {
        expect(calculateCohenD(-5, 10)).toBe(-0.5)
        expect(calculateCohenD(-10, 10)).toBe(-1.0)
      })

      it('应处理无效 sigma', () => {
        expect(calculateCohenD(10, 0)).toBeNaN()
        expect(calculateCohenD(10, -5)).toBeNaN()
        expect(calculateCohenD(10, null)).toBeNaN()
      })
    })

    describe('interpretCohenD', () => {
      it('应正确解释极小效应 (|d| < 0.2)', () => {
        expect(interpretCohenD(0)).toEqual({ level: 'negligible', label: '极小' })
        expect(interpretCohenD(0.1)).toEqual({ level: 'negligible', label: '极小' })
        expect(interpretCohenD(-0.15)).toEqual({ level: 'negligible', label: '极小' })
      })

      it('应正确解释小效应 (0.2 <= |d| < 0.5)', () => {
        expect(interpretCohenD(0.2)).toEqual({ level: 'small', label: '小' })
        expect(interpretCohenD(0.4)).toEqual({ level: 'small', label: '小' })
        expect(interpretCohenD(-0.3)).toEqual({ level: 'small', label: '小' })
      })

      it('应正确解释中效应 (0.5 <= |d| < 0.8)', () => {
        expect(interpretCohenD(0.5)).toEqual({ level: 'medium', label: '中' })
        expect(interpretCohenD(0.7)).toEqual({ level: 'medium', label: '中' })
        expect(interpretCohenD(-0.6)).toEqual({ level: 'medium', label: '中' })
      })

      it('应正确解释大效应 (|d| >= 0.8)', () => {
        expect(interpretCohenD(0.8)).toEqual({ level: 'large', label: '大' })
        expect(interpretCohenD(1.5)).toEqual({ level: 'large', label: '大' })
        expect(interpretCohenD(-1.0)).toEqual({ level: 'large', label: '大' })
      })

      it('应处理 NaN', () => {
        expect(interpretCohenD(NaN)).toEqual({ level: 'undefined', label: '未定义' })
      })
    })

    describe('getEffectSizeInfo', () => {
      it('应返回完整的效应量信息', () => {
        const result = getEffectSizeInfo(5, 10)
        expect(result).toEqual({
          d: 0.5,
          dStr: '0.50',
          level: 'medium',
          label: '中'
        })
      })

      it('应正确格式化字符串', () => {
        const result = getEffectSizeInfo(8, 10)
        expect(result.dStr).toBe('0.80')
      })

      it('应处理无效输入', () => {
        const result = getEffectSizeInfo(5, 0)
        expect(result.d).toBeNaN()
        expect(result.dStr).toBe('-')
        expect(result.level).toBe('undefined')
      })
    })
  })

  // ========================================================
  // Cohen's h 测试 (率终点)
  // ========================================================
  describe("Cohen's h (proportion endpoint)", () => {
    describe('calculateCohenH', () => {
      it('应正确计算 Cohen h', () => {
        // h = 2 * (arcsin(sqrt(p1)) - arcsin(sqrt(p2)))
        // 相同率 -> h = 0
        expect(calculateCohenH(0.5, 0.5)).toBeCloseTo(0, 6)

        // 不同率
        const h1 = calculateCohenH(0.5, 0.3)
        expect(h1).toBeGreaterThan(0) // p1 > p2 时 h > 0
      })

      it('应满足反对称性: h(p1, p2) = -h(p2, p1)', () => {
        const h1 = calculateCohenH(0.7, 0.3)
        const h2 = calculateCohenH(0.3, 0.7)
        expect(h1).toBeCloseTo(-h2, 10)
      })

      it('应处理边界率', () => {
        // p = 0 和 p = 1
        expect(calculateCohenH(0, 0.5)).toBeCloseTo(-Math.PI / 2, 4)
        expect(calculateCohenH(1, 0.5)).toBeCloseTo(Math.PI / 2, 4)
      })

      it('应处理无效输入', () => {
        expect(calculateCohenH(-0.1, 0.5)).toBeNaN()
        expect(calculateCohenH(0.5, 1.1)).toBeNaN()
        expect(calculateCohenH(-0.1, 1.1)).toBeNaN()
      })
    })

    describe('interpretCohenH', () => {
      it('应使用与 Cohen d 相同的解释标准', () => {
        expect(interpretCohenH(0.1)).toEqual({ level: 'negligible', label: '极小' })
        expect(interpretCohenH(0.3)).toEqual({ level: 'small', label: '小' })
        expect(interpretCohenH(0.6)).toEqual({ level: 'medium', label: '中' })
        expect(interpretCohenH(1.0)).toEqual({ level: 'large', label: '大' })
      })
    })

    describe('getEffectSizeInfoProportion', () => {
      it('应返回完整的效应量信息', () => {
        const result = getEffectSizeInfoProportion(0.7, 0.3)
        expect(result.h).toBeGreaterThan(0)
        expect(result.hStr).toMatch(/^\d+\.\d{2}$/)
        expect(result.level).toBeDefined()
        expect(result.label).toBeDefined()
      })

      it('应处理相同率', () => {
        const result = getEffectSizeInfoProportion(0.5, 0.5)
        expect(result.h).toBeCloseTo(0, 6)
        expect(result.level).toBe('negligible')
      })

      it('应处理无效输入', () => {
        const result = getEffectSizeInfoProportion(-0.1, 0.5)
        expect(result.h).toBeNaN()
        expect(result.hStr).toBe('-')
      })
    })
  })

  // ========================================================
  // 实际案例验证
  // ========================================================
  describe('real-world cases', () => {
    it('降压药物试验: 收缩压下降 10mmHg, SD=15mmHg', () => {
      const result = getEffectSizeInfo(10, 15)
      expect(result.d).toBeCloseTo(0.67, 2)
      expect(result.level).toBe('medium')
    })

    it('新药有效率 85% vs 对照 70%', () => {
      const result = getEffectSizeInfoProportion(0.85, 0.7)
      expect(result.h).toBeCloseTo(0.36, 2) // 小效应
      expect(['small', 'medium']).toContain(result.level)
    })

    it('新药有效率 90% vs 对照 50%', () => {
      const result = getEffectSizeInfoProportion(0.9, 0.5)
      expect(result.h).toBeGreaterThan(0.8) // 大效应
      expect(result.level).toBe('large')
    })
  })
})
