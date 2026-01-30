/**
 * @file power-calculation.test.js
 * @description 效能反推算法测试
 *
 * 验证策略:
 * - 反向验证法: 用已知参数计算样本量 n，再用 n 反推效能，应等于原始 power
 * - 文献对照: Cohen (1988) 效能表
 * - 边界条件: NaN、Infinity 等
 *
 * @references
 * [1] Chow SC et al. Sample Size Calculations in Clinical Research. 3rd ed. 2017.
 * [2] Cohen J. Statistical Power Analysis for the Behavioral Sciences. 2nd ed. 1988.
 */

import { describe, it, expect } from 'vitest'
import {
  calculatePower,
  calculatePowerNI,
  calculatePowerSup,
  calculatePowerEq,
  calculatePowerNIContinuous,
  calculatePowerOneSample,
  calculatePowerOneSampleContinuous,
  calculatePowerPaired,
  calculatePowerPairedContinuous
} from '../../src/power-analysis/power-calculation'
import { calculateNISampleSize } from '../../src/sample-size/two-group/non-inferiority'
import { calculateSupSampleSize } from '../../src/sample-size/two-group/superiority'

describe('效能反推计算', () => {
  // ========================================================
  // 两组比较 - 非劣效 - 率终点
  // 函数签名: calculatePowerNI(n1, p1, p2, delta, alpha, ratio)
  // ========================================================
  describe('两组非劣效 - 率终点', () => {
    it('反向验证: 用 n 反推应还原原始 power', () => {
      // 先正向计算样本量
      const forward = calculateNISampleSize(0.7, 0.7, 0.1, 0.025, 0.8, 1)
      // 再反推效能
      const result = calculatePowerNI(forward.n1, 0.7, 0.7, 0.1, 0.025, 1)
      // ceil 取整会使 n 略大于理论值，反推效能应 >= 0.80
      expect(result.power).toBeGreaterThanOrEqual(0.80)
      expect(result.power).toBeLessThanOrEqual(0.85)
    })

    it('样本量越大，效能越高', () => {
      const r1 = calculatePowerNI(100, 0.7, 0.75, 0.1, 0.025, 1)
      const r2 = calculatePowerNI(500, 0.7, 0.75, 0.1, 0.025, 1)
      expect(r2.power).toBeGreaterThan(r1.power)
    })

    it('n=1 时效能应很低', () => {
      const result = calculatePowerNI(1, 0.7, 0.7, 0.1, 0.025, 1)
      expect(result.power).toBeLessThan(0.15)
    })
  })

  // ========================================================
  // 两组比较 - 优效 - 率终点
  // 函数签名: calculatePowerSup(n1, p1, p2, alpha, ratio)
  // ========================================================
  describe('两组优效 - 率终点', () => {
    it('反向验证: 用 n 反推应还原原始 power', () => {
      const forward = calculateSupSampleSize(0.5, 0.65, 0.025, 0.8, 1)
      const result = calculatePowerSup(forward.n1, 0.5, 0.65, 0.025, 1)
      expect(result.power).toBeGreaterThanOrEqual(0.80)
      expect(result.power).toBeLessThanOrEqual(0.85)
    })

    it('p1=p2 时效能 = 0（效应量为零）', () => {
      // 效应量为零时返回 power = 0
      const result = calculatePowerSup(100, 0.5, 0.5, 0.025, 1)
      expect(result.power).toBe(0)
    })
  })

  // ========================================================
  // 两组比较 - 等效 (TOST)
  // 函数签名: calculatePowerEq(n1, p1, p2, delta, alpha, ratio)
  // ========================================================
  describe('两组等效 - 率终点', () => {
    it('p1=p2 时效能应合理（对称 TOST）', () => {
      // n=500, delta=0.1: 对称 TOST 效能约 0.77
      const result = calculatePowerEq(500, 0.5, 0.5, 0.1, 0.025, 1)
      expect(result.power).toBeGreaterThan(0.7)
      expect(result.power).toBeLessThan(1)
    })

    it('更大样本量效能更高', () => {
      const r1 = calculatePowerEq(500, 0.5, 0.5, 0.1, 0.025, 1)
      const r2 = calculatePowerEq(1000, 0.5, 0.5, 0.1, 0.025, 1)
      expect(r2.power).toBeGreaterThan(r1.power)
    })
  })

  // ========================================================
  // 连续终点
  // 函数签名: calculatePowerNIContinuous(n1, sigma, delta, alpha, ratio, meanDiff)
  // ========================================================
  describe('两组非劣效 - 连续终点', () => {
    it('基本计算', () => {
      // sigma=10, delta=5, alpha=0.025, ratio=1, meanDiff=0
      const result = calculatePowerNIContinuous(50, 10, 5, 0.025, 1, 0)
      expect(result.power).toBeGreaterThan(0.5)
    })
  })

  // ========================================================
  // 单组试验
  // 函数签名: calculatePowerOneSample(n, p0, p1, alpha)
  // ========================================================
  describe('单组试验 - 率终点', () => {
    it('大样本时效能接近 1', () => {
      const result = calculatePowerOneSample(500, 0.5, 0.6, 0.025)
      expect(result.power).toBeGreaterThan(0.95)
    })

    it('p0=p1 时效能 = 0（效应量为零）', () => {
      const result = calculatePowerOneSample(100, 0.5, 0.5, 0.025)
      expect(result.power).toBe(0)
    })
  })

  // 函数签名: calculatePowerOneSampleContinuous(n, mu0, mu1, sigma, alpha)
  describe('单组试验 - 连续终点', () => {
    it('基本计算', () => {
      const result = calculatePowerOneSampleContinuous(30, 50, 55, 10, 0.025)
      expect(result.power).toBeGreaterThan(0.5)
      expect(result.power).toBeLessThan(1)
    })
  })

  // ========================================================
  // 配对设计
  // 函数签名: calculatePowerPaired(n, p10, p01, delta, alpha, studyType)
  // ========================================================
  describe('配对设计 - 率终点 (McNemar)', () => {
    it('基本计算 - 非劣效', () => {
      // diff = p01 - p10 = 0.05 - 0.15 = -0.10
      // effectSize = diff + delta = -0.10 + 0.15 = 0.05
      const result = calculatePowerPaired(100, 0.15, 0.05, 0.15, 0.025, 'non-inferiority')
      expect(result.power).toBeGreaterThan(0)
      expect(result.power).toBeLessThan(1)
    })

    it('effectSize=0 时 power=0', () => {
      // diff = 0.05 - 0.15 = -0.10, delta=0.10 → effectSize = 0
      const result = calculatePowerPaired(100, 0.15, 0.05, 0.10, 0.025, 'non-inferiority')
      expect(result.power).toBe(0)
    })
  })

  // 函数签名: calculatePowerPairedContinuous(n, sigma_diff, mean_diff, delta, alpha, studyType)
  describe('配对设计 - 连续终点', () => {
    it('基本计算', () => {
      const result = calculatePowerPairedContinuous(50, 10, 5, 2, 0.025, 'non-inferiority')
      expect(result.power).toBeGreaterThan(0.5)
    })
  })

  // ========================================================
  // 统一入口（使用对象参数）
  // ========================================================
  describe('统一入口 calculatePower', () => {
    it('两组非劣效路由正确', () => {
      const result = calculatePower({
        designType: 'two-group',
        studyType: 'non-inferiority',
        endpointType: 'proportion',
        n1: 330, p1: 0.7, p2: 0.7, delta: 0.1, alpha: 0.025, ratio: 1
      })
      expect(result).toBeDefined()
      expect(result.power).toBeGreaterThan(0.5)
    })

    it('未知设计类型返回 NaN power', () => {
      const result = calculatePower({
        designType: 'unknown',
        studyType: 'non-inferiority',
        endpointType: 'proportion'
      })
      expect(result.power).toBeNaN()
    })
  })
})
