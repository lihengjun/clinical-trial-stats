/**
 * @file sensitivity-specificity.test.js
 * @description 诊断试验样本量计算测试
 *
 * 验证数据来源:
 * - Flahault A et al. J Clin Epidemiol. 2005;58(8):859-862. (Table 1)
 * - Buderer NMF. Acad Emerg Med. 1996;3(9):895-900. (患病率校正)
 * - 标准 Wald 公式验算: n = Z² × p × (1-p) / d²
 */

import { describe, it, expect } from 'vitest'
import {
  calculateDiagnosticSampleSize,
  calculateDiagnosticComparison
} from '../../src/diagnostic/sensitivity-specificity'

describe('诊断试验样本量', () => {
  // ========================================================
  // 单组精度估计
  // ========================================================
  describe('单组精度估计', () => {
    it('Flahault (2005) Table 1: Se=0.85, d=0.05, 95% CI → n≈196', () => {
      // 文献验证: Flahault et al. (2005), Table 1
      // Z=1.96, n = 1.96² × 0.85 × 0.15 / 0.05² = 195.92 → ceil = 196
      const result = calculateDiagnosticSampleSize({
        expectedValue: 0.85,
        precision: 0.05,
        confidenceLevel: 0.95,
        measureType: 'sensitivity'
      })
      expect(result.n).toBe(196)
      expect(result.measureType).toBe('sensitivity')
      expect(result.sampleDescription).toBe('确诊阳性患者')
    })

    it('标准验算: Se=0.90, d=0.05, 95% CI → n≈139', () => {
      // n = 1.96² × 0.90 × 0.10 / 0.05² = 138.30 → ceil = 139
      const result = calculateDiagnosticSampleSize({
        expectedValue: 0.90,
        precision: 0.05,
        confidenceLevel: 0.95
      })
      expect(result.n).toBe(139)
    })

    it('标准验算: Se=0.70, d=0.10, 95% CI → n≈81', () => {
      // n = 1.96² × 0.70 × 0.30 / 0.10² = 80.67 → ceil = 81
      const result = calculateDiagnosticSampleSize({
        expectedValue: 0.70,
        precision: 0.10,
        confidenceLevel: 0.95
      })
      expect(result.n).toBe(81)
    })

    it('特异性计算: Sp=0.95, d=0.03, 95% CI', () => {
      // n = 1.96² × 0.95 × 0.05 / 0.03² = 202.75 → ceil = 203
      const result = calculateDiagnosticSampleSize({
        expectedValue: 0.95,
        precision: 0.03,
        confidenceLevel: 0.95,
        measureType: 'specificity'
      })
      expect(result.n).toBe(203)
      expect(result.sampleDescription).toBe('确诊阴性患者')
    })

    it('考虑患病率的总样本量（敏感性）', () => {
      // Se=0.85, d=0.05, 95% CI → n=196（阳性患者）
      // 患病率 20% → 总样本 = 196 / 0.20 = 980
      const result = calculateDiagnosticSampleSize({
        expectedValue: 0.85,
        precision: 0.05,
        confidenceLevel: 0.95,
        measureType: 'sensitivity',
        prevalence: 0.20
      })
      expect(result.n).toBe(196)
      expect(result.nTotal).toBe(980)
    })

    it('考虑患病率的总样本量（特异性）', () => {
      // Sp=0.90, d=0.05, 95% CI → n=139（阴性患者）
      // 患病率 30% → 阴性比例 70% → 总样本 = 139 / 0.70 = 199
      const result = calculateDiagnosticSampleSize({
        expectedValue: 0.90,
        precision: 0.05,
        confidenceLevel: 0.95,
        measureType: 'specificity',
        prevalence: 0.30
      })
      expect(result.n).toBe(139)
      expect(result.nTotal).toBe(199)
    })

    it('边界: p=0 或 p=1 返回 NaN', () => {
      expect(calculateDiagnosticSampleSize({
        expectedValue: 0, precision: 0.05, confidenceLevel: 0.95
      }).n).toBeNaN()
      expect(calculateDiagnosticSampleSize({
        expectedValue: 1, precision: 0.05, confidenceLevel: 0.95
      }).n).toBeNaN()
    })

    it('边界: precision=0 返回 NaN', () => {
      expect(calculateDiagnosticSampleSize({
        expectedValue: 0.85, precision: 0, confidenceLevel: 0.95
      }).n).toBeNaN()
    })
  })

  // ========================================================
  // 两组诊断性能比较
  // ========================================================
  describe('两组诊断性能比较', () => {
    it('基本计算: 80% vs 90%', () => {
      const result = calculateDiagnosticComparison({
        p1: 0.80, p2: 0.90,
        alpha: 0.05, power: 0.80
      })
      expect(result.n).toBeGreaterThan(100)
      expect(result.n).toBeLessThan(300)
      expect(result.nTotal).toBe(2 * result.n)
    })

    it('p1=p2 时需要无穷大样本量', () => {
      const result = calculateDiagnosticComparison({
        p1: 0.85, p2: 0.85,
        alpha: 0.05, power: 0.80
      })
      expect(result.n).toBe(Infinity)
    })

    it('单侧检验样本量更小', () => {
      const twoSided = calculateDiagnosticComparison({
        p1: 0.80, p2: 0.90, alpha: 0.05, power: 0.80, alternative: 'two-sided'
      })
      const oneSided = calculateDiagnosticComparison({
        p1: 0.80, p2: 0.90, alpha: 0.05, power: 0.80, alternative: 'one-sided'
      })
      expect(oneSided.n).toBeLessThan(twoSided.n)
    })
  })
})
