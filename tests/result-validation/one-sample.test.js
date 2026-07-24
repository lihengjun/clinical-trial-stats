/**
 * @file one-sample.test.js
 * @description 单组试验结果验证 - 锁定现状回归测试 (characterization tests)
 *
 * 说明：本文件为"锁定现状"回归测试。每个期望值均取自当前实现的实际输出，
 *      用途是为后续算法修复提供可审查的 diff 基线。凡标注"现状锁定，待核"的断言，
 *      锁定的是当前（可能存疑）行为，⛔ 未在本波修改，待后续核对。
 *
 * 被测导出（src/result-validation/one-sample.js）：
 *   - calculateOneSampleResult(n, s, p0, alpha, useContinuity)          // 率终点
 *   - calculateOneSampleResultContinuous(n, mean, sd, mu0, alpha)       // 连续终点
 */

import { describe, it, expect } from 'vitest'
import {
  calculateOneSampleResult,
  calculateOneSampleResultContinuous
} from '../../src/result-validation/one-sample'

describe('result-validation/one-sample', () => {
  // ========================================================
  // calculateOneSampleResult — 率终点 (single-arm proportion)
  // ========================================================
  describe('calculateOneSampleResult (proportion)', () => {
    it('典型临床场景：n=100 观察成功 s=85 (p=0.85)，目标 p0=0.75，alpha=0.025', () => {
      // 单臂器械试验：观察成功率 85%，需证明优于目标值 75%
      const r = calculateOneSampleResult(100, 85, 0.75, 0.025, false)

      expect(r.p).toBeCloseTo(0.85, 10)
      expect(r.p0).toBe(0.75)
      expect(r.diff).toBeCloseTo(0.1, 6)
      // 现状锁定，待核：CI 使用观察比例标准误 se=sqrt(p(1-p)/n)，
      //   而 Z 检验统计量使用 H0 标准误 se0=sqrt(p0(1-p0)/n)——CI 与检验统计量标准误口径不一致
      expect(r.ci_lower).toBeCloseTo(0.780015, 5)
      expect(r.ci_upper).toBeCloseTo(0.919985, 5)
      expect(r.p_value).toBeCloseTo(0.010461, 5)
      expect(r.testStatistic).toBeCloseTo(2.309401, 5)
      // 现状锁定，待核：字段名 isNonInferior，但判据 ci_lower > p0 实为对 p0 的优效检验
      //   （无 delta 界值参数），命名与语义不符
      expect(r.isNonInferior).toBe(true)
      expect(r.testStatisticType).toBe('Z')
      expect(r.df).toBeNull()
      expect(r.testStatisticLabel).toBe('Z = 2.31')
    })

    it('连续性校正：useContinuity=true 时 p=(s+0.5)/(n+1)', () => {
      const r = calculateOneSampleResult(100, 85, 0.75, 0.025, true)

      expect(r.p).toBeCloseTo(0.846535, 5)
      expect(r.diff).toBeCloseTo(0.096535, 5)
      expect(r.ci_lower).toBeCloseTo(0.775891, 5)
      expect(r.ci_upper).toBeCloseTo(0.917179, 5)
      expect(r.p_value).toBeCloseTo(0.012895, 5)
      expect(r.testStatistic).toBeCloseTo(2.229372, 5)
      expect(r.isNonInferior).toBe(true)
      expect(r.testStatisticLabel).toBe('Z = 2.23')
    })

    it('边界-零效应/se=0：s=0 → p=0 → se=0，走提前返回分支', () => {
      const r = calculateOneSampleResult(100, 0, 0.5, 0.025, false)

      expect(r.p).toBe(0)
      expect(r.p0).toBe(0.5)
      expect(r.diff).toBe(-0.5)
      expect(r.ci_lower).toBe(0)
      expect(r.ci_upper).toBe(0)
      expect(r.p_value).toBe(1)
      expect(r.testStatistic).toBe(0)
      expect(r.isNonInferior).toBe(false)
      // 现状锁定，待核：提前返回对象缺失 testStatisticType/df/testStatisticLabel 元数据字段，
      //   与正常返回对象结构不一致
      expect(r.testStatisticType).toBeUndefined()
      expect(r.testStatisticLabel).toBeUndefined()
    })

    it('边界-alpha=0：normalInverse(1)=Infinity，走 z_alpha 无效分支', () => {
      const r = calculateOneSampleResult(100, 85, 0.75, 0, false)

      expect(r.p).toBeCloseTo(0.85, 10)
      expect(r.diff).toBeCloseTo(0.1, 6)
      expect(r.ci_lower).toBe(0)
      expect(r.ci_upper).toBe(0)
      expect(r.p_value).toBe(1)
      expect(r.testStatistic).toBe(0)
      expect(r.isNonInferior).toBe(false)
      expect(r.testStatisticType).toBeUndefined()
    })
  })

  // ========================================================
  // calculateOneSampleResultContinuous — 连续终点 (single-arm mean)
  // ========================================================
  describe('calculateOneSampleResultContinuous (continuous)', () => {
    it('典型临床场景：n=50，均值 10.5，SD=3，目标 mu0=9，alpha=0.025', () => {
      const r = calculateOneSampleResultContinuous(50, 10.5, 3, 9, 0.025)

      expect(r.mean).toBe(10.5)
      expect(r.mu0).toBe(9)
      expect(r.diff).toBe(1.5)
      expect(r.ci_lower).toBeCloseTo(9.668458, 5)
      expect(r.ci_upper).toBeCloseTo(11.331542, 5)
      expect(r.p_value).toBeCloseTo(0.0002035, 6)
      expect(r.testStatistic).toBeCloseTo(3.535534, 5)
      expect(r.isNonInferior).toBe(true)
      // 现状锁定，待核：统计量标注 t(df) 且给出 df，但 p 值经 normalCDF（正态近似）计算，
      //   并非 t 分布——小样本下会低估尾部概率
      expect(r.testStatisticType).toBe('t')
      expect(r.df).toBe(49)
      expect(r.testStatisticLabel).toBe('t(49) = 3.54')
    })

    it('边界-sd=0 → se=0，走提前返回分支', () => {
      const r = calculateOneSampleResultContinuous(50, 10.5, 0, 9, 0.025)

      expect(r.mean).toBe(10.5)
      expect(r.diff).toBe(1.5)
      expect(r.ci_lower).toBe(0)
      expect(r.ci_upper).toBe(0)
      expect(r.p_value).toBe(1)
      expect(r.testStatistic).toBe(0)
      expect(r.isNonInferior).toBe(false)
      // 现状锁定，待核：提前返回缺失 testStatisticType/df/testStatisticLabel 元数据
      expect(r.testStatisticType).toBeUndefined()
    })

    it('边界-alpha=0：normalInverse(1)=Infinity，走 z_alpha 无效分支', () => {
      const r = calculateOneSampleResultContinuous(50, 10.5, 3, 9, 0)

      expect(r.diff).toBe(1.5)
      expect(r.ci_lower).toBe(0)
      expect(r.ci_upper).toBe(0)
      expect(r.p_value).toBe(1)
      expect(r.testStatistic).toBe(0)
      expect(r.isNonInferior).toBe(false)
      expect(r.testStatisticType).toBeUndefined()
    })
  })
})
