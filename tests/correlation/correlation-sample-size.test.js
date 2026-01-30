/**
 * @file correlation-sample-size.test.js
 * @description 相关性分析样本量计算测试
 *
 * 验证数据来源:
 * - Cohen J. Statistical Power Analysis for the Behavioral Sciences. 2nd ed. 1988. Table 3.3.2.
 * - Fisher Z 变换标准公式验算
 */

import { describe, it, expect } from 'vitest'
import {
  calculateCorrelationSampleSize,
  calculateCorrelationComparisonSampleSize,
  calculateCorrelationPower
} from '../../src/correlation/correlation-sample-size'

describe('相关性分析样本量', () => {
  // ========================================================
  // 检验 ρ = 0
  // ========================================================
  describe('检验 ρ = 0（标准场景）', () => {
    it('Cohen (1988): r=0.3, α=0.05 双侧, power=0.80 → n≈85', () => {
      // 文献验证: Cohen (1988) Table 3.3.2
      // arctanh(0.3) = 0.3095
      // n = (1.96 + 0.8416)² / 0.3095² + 3 = 82.0 + 3 = 85
      const result = calculateCorrelationSampleSize({
        expectedR: 0.3,
        alpha: 0.05,
        power: 0.80,
        alternative: 'two-sided'
      })
      expect(result.n).toBeGreaterThanOrEqual(84)
      expect(result.n).toBeLessThanOrEqual(86)
    })

    it('Cohen (1988): r=0.5, α=0.05 双侧, power=0.80 → n≈29', () => {
      // arctanh(0.5) = 0.5493
      // n = (1.96 + 0.8416)² / 0.5493² + 3 = 26.0 + 3 = 29
      const result = calculateCorrelationSampleSize({
        expectedR: 0.5,
        alpha: 0.05,
        power: 0.80,
        alternative: 'two-sided'
      })
      expect(result.n).toBeGreaterThanOrEqual(28)
      expect(result.n).toBeLessThanOrEqual(30)
    })

    it('Cohen (1988): r=0.1, α=0.05 双侧, power=0.80 → n≈782', () => {
      // arctanh(0.1) = 0.1003
      // n = (1.96 + 0.8416)² / 0.1003² + 3 = 779 + 3 = 782
      const result = calculateCorrelationSampleSize({
        expectedR: 0.1,
        alpha: 0.05,
        power: 0.80,
        alternative: 'two-sided'
      })
      expect(result.n).toBeGreaterThanOrEqual(780)
      expect(result.n).toBeLessThanOrEqual(785)
    })

    it('单侧检验样本量更小', () => {
      const twoSided = calculateCorrelationSampleSize({
        expectedR: 0.3, alpha: 0.05, power: 0.80, alternative: 'two-sided'
      })
      const oneSided = calculateCorrelationSampleSize({
        expectedR: 0.3, alpha: 0.05, power: 0.80, alternative: 'one-sided'
      })
      expect(oneSided.n).toBeLessThan(twoSided.n)
    })

    it('r=0 返回 NaN', () => {
      const result = calculateCorrelationSampleSize({
        expectedR: 0, alpha: 0.05, power: 0.80
      })
      expect(result.n).toBeNaN()
    })

    it('|r|≥1 返回 NaN', () => {
      expect(calculateCorrelationSampleSize({
        expectedR: 1, alpha: 0.05, power: 0.80
      }).n).toBeNaN()
      expect(calculateCorrelationSampleSize({
        expectedR: -1, alpha: 0.05, power: 0.80
      }).n).toBeNaN()
    })

    it('负相关系数也能计算（取绝对值）', () => {
      const pos = calculateCorrelationSampleSize({
        expectedR: 0.3, alpha: 0.05, power: 0.80
      })
      const neg = calculateCorrelationSampleSize({
        expectedR: -0.3, alpha: 0.05, power: 0.80
      })
      expect(pos.n).toBe(neg.n)
    })
  })

  // ========================================================
  // 检验 ρ = ρ₀（一般情形）
  // ========================================================
  describe('检验 ρ = ρ₀（一般情形）', () => {
    it('r0=0.5, r1=0.7 基本计算', () => {
      const result = calculateCorrelationComparisonSampleSize({
        r0: 0.5, r1: 0.7,
        alpha: 0.05, power: 0.80
      })
      expect(result.n).toBeGreaterThan(50)
      expect(result.n).toBeLessThan(200)
    })

    it('r0=r1 时返回 Infinity', () => {
      const result = calculateCorrelationComparisonSampleSize({
        r0: 0.5, r1: 0.5,
        alpha: 0.05, power: 0.80
      })
      expect(result.n).toBe(Infinity)
    })
  })

  // ========================================================
  // 效能反推
  // ========================================================
  describe('效能反推', () => {
    it('n=85, r=0.3, α=0.05 双侧 → power≈0.80', () => {
      const result = calculateCorrelationPower({
        n: 85, expectedR: 0.3, alpha: 0.05, alternative: 'two-sided'
      })
      expect(result.power).toBeGreaterThanOrEqual(0.78)
      expect(result.power).toBeLessThanOrEqual(0.82)
    })

    it('n≤3 返回 NaN', () => {
      const result = calculateCorrelationPower({
        n: 3, expectedR: 0.3, alpha: 0.05
      })
      expect(result.power).toBeNaN()
    })

    it('大样本效能接近 1', () => {
      const result = calculateCorrelationPower({
        n: 1000, expectedR: 0.3, alpha: 0.05
      })
      expect(result.power).toBeGreaterThan(0.99)
    })
  })
})
