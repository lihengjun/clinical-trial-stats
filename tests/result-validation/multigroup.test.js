/**
 * @file multigroup.test.js
 * @description 多组比较结果验证 - 锁定现状回归测试 (characterization tests)
 *
 * 说明：本文件为"锁定现状"回归测试。每个期望值均取自当前实现的实际输出，
 *      用途是为后续算法修复提供可审查的 diff 基线。凡标注"现状锁定，待核"的断言，
 *      锁定的是当前（可能存疑）行为，⛔ 未在本波修改，待后续核对。
 *
 * 被测导出（src/result-validation/multigroup.js）：
 *   - calculateMultigroupResult(n0, x0, n_groups, x_groups, delta, alpha, studyType, allocations, strategy)          // 率终点
 *   - calculateMultigroupResultContinuous(n0, mean0, sd0, n_groups, mean_groups, sd_groups, delta, alpha, studyType, allocations, strategy) // 连续终点
 *
 * 多组用 Bonferroni 校正：strategy!=='all' 时 alpha_adjusted = alpha / k；strategy==='all' 时 = alpha。
 */

import { describe, it, expect } from 'vitest'
import {
  calculateMultigroupResult,
  calculateMultigroupResultContinuous
} from '../../src/result-validation/multigroup'

describe('result-validation/multigroup', () => {
  // ========================================================
  // calculateMultigroupResult — 率终点
  // ========================================================
  describe('calculateMultigroupResult (proportion)', () => {
    it('典型临床场景：对照 70/100，两试验组 72/100 与 75/100，delta=0.1，非劣效，strategy=any', () => {
      const r = calculateMultigroupResult(
        100, 70, [100, 100], [72, 75], 0.1, 0.025, 'non-inferiority', null, 'any'
      )

      expect(r.k).toBe(2)
      // 现状锁定：strategy=any → Bonferroni alpha_adjusted = 0.025/2 = 0.0125
      expect(r.alpha_adjusted).toBeCloseTo(0.0125, 10)
      expect(r.results).toHaveLength(2)

      // 组1：diff=0.02，CI 下界 < -delta → 非劣效不成立
      expect(r.results[0].diff).toBeCloseTo(0.02, 6)
      expect(r.results[0].ci_lower).toBeCloseTo(-0.123800, 5)
      expect(r.results[0].ci_upper).toBeCloseTo(0.163800, 5)
      expect(r.results[0].p_value).toBeCloseTo(0.030711, 5)
      expect(r.results[0].testStatistic).toBeCloseTo(1.870439, 5)
      expect(r.results[0].isSuccess).toBe(false)
      expect(r.results[0].testStatisticType).toBe('Z')
      expect(r.results[0].df).toBeNull()
      expect(r.results[0].testStatisticLabel).toBe('Z = 1.87')

      // 组2：diff=0.05，CI 下界 > -delta → 非劣效成立
      expect(r.results[1].diff).toBeCloseTo(0.05, 6)
      expect(r.results[1].ci_lower).toBeCloseTo(-0.091315, 5)
      expect(r.results[1].ci_upper).toBeCloseTo(0.191315, 5)
      expect(r.results[1].p_value).toBeCloseTo(0.008676, 5)
      expect(r.results[1].testStatistic).toBeCloseTo(2.379155, 5)
      expect(r.results[1].isSuccess).toBe(true)

      // strategy=any → 至少一组成功即总体成功
      expect(r.overall_success).toBe(true)
    })

    it('优效 + strategy=all：alpha 不做 Bonferroni 校正，要求全部组成功', () => {
      const r = calculateMultigroupResult(
        100, 60, [100, 100], [75, 80], 0.1, 0.025, 'superiority', null, 'all'
      )

      expect(r.k).toBe(2)
      // 现状锁定：strategy=all → alpha_adjusted = alpha = 0.025（不除以 k）
      expect(r.alpha_adjusted).toBeCloseTo(0.025, 10)

      expect(r.results[0].diff).toBeCloseTo(0.15, 6)
      expect(r.results[0].ci_lower).toBeCloseTo(0.021851, 5)
      expect(r.results[0].ci_upper).toBeCloseTo(0.278149, 5)
      expect(r.results[0].p_value).toBeCloseTo(0.010891, 5)
      expect(r.results[0].testStatistic).toBeCloseTo(2.294157, 5)
      expect(r.results[0].isSuccess).toBe(true)

      expect(r.results[1].diff).toBeCloseTo(0.2, 6)
      expect(r.results[1].ci_lower).toBeCloseTo(0.076041, 5)
      expect(r.results[1].ci_upper).toBeCloseTo(0.323959, 5)
      expect(r.results[1].p_value).toBeCloseTo(0.000783, 6)
      expect(r.results[1].testStatistic).toBeCloseTo(3.162278, 5)
      expect(r.results[1].isSuccess).toBe(true)

      expect(r.overall_success).toBe(true)
    })

    it('等效场景：单试验组 71/100 vs 对照 70/100，delta=0.15（TOST + CI 判据）', () => {
      const r = calculateMultigroupResult(
        100, 70, [100], [71], 0.15, 0.025, 'equivalence', null, 'any'
      )

      expect(r.k).toBe(1)
      expect(r.results[0].diff).toBeCloseTo(0.01, 6)
      expect(r.results[0].ci_lower).toBeCloseTo(-0.116399, 5)
      expect(r.results[0].ci_upper).toBeCloseTo(0.136399, 5)
      // 现状锁定，待核：p 值取 TOST 两单侧检验较大者，而 isSuccess 用单个
      //   (1-alpha_adjusted) CI 判据，两者覆盖度未对齐（经典 90% vs 95% CI 问题）
      expect(r.results[0].p_value).toBeCloseTo(0.014970, 5)
      expect(r.results[0].testStatistic).toBeCloseTo(2.170869, 5)
      expect(r.results[0].isSuccess).toBe(true)
      expect(r.overall_success).toBe(true)
    })

    it('边界-se=0：对照与试验组成功数均为 0 → p0=p1=0 → se=0，走提前返回分支', () => {
      const r = calculateMultigroupResult(
        100, 0, [100], [0], 0.1, 0.025, 'non-inferiority', null, 'any'
      )

      expect(r.k).toBe(1)
      expect(r.results[0].diff).toBe(0)
      expect(r.results[0].ci_lower).toBe(0)
      expect(r.results[0].ci_upper).toBe(0)
      expect(r.results[0].p_value).toBe(1)
      expect(r.results[0].testStatistic).toBe(0)
      expect(r.results[0].isSuccess).toBe(false)
      // 现状锁定，待核：se=0 提前返回缺失 testStatisticType/df/testStatisticLabel 元数据
      expect(r.results[0].testStatisticType).toBeUndefined()
      expect(r.overall_success).toBe(false)
    })

    it('边界-alpha=0：alpha_adjusted=0 → normalInverse(1)=Infinity，results 返回空数组', () => {
      const r = calculateMultigroupResult(
        100, 70, [100], [72], 0.1, 0, 'non-inferiority', null, 'any'
      )

      expect(r.results).toEqual([])
      expect(r.overall_success).toBe(false)
      expect(r.alpha_adjusted).toBe(0)
      expect(r.k).toBe(1)
    })
  })

  // ========================================================
  // calculateMultigroupResultContinuous — 连续终点
  // ========================================================
  describe('calculateMultigroupResultContinuous (continuous)', () => {
    it('典型临床场景：对照 mean=10/SD=3，两试验组 mean=11、12/SD=3，delta=1，非劣效，any', () => {
      const r = calculateMultigroupResultContinuous(
        50, 10, 3, [50, 50], [11, 12], [3, 3], 1, 0.025, 'non-inferiority', null, 'any'
      )

      expect(r.k).toBe(2)
      expect(r.alpha_adjusted).toBeCloseTo(0.0125, 10)

      expect(r.results[0].diff).toBe(1)
      expect(r.results[0].ci_lower).toBeCloseTo(-0.344842, 5)
      expect(r.results[0].ci_upper).toBeCloseTo(2.344842, 5)
      expect(r.results[0].p_value).toBeCloseTo(0.000429, 6)
      expect(r.results[0].testStatistic).toBeCloseTo(3.333333, 5)
      expect(r.results[0].isSuccess).toBe(true)
      // 现状锁定，待核：标注 t(98) 且给出 df，但 p 值经 normalCDF（正态近似）计算，非 t 分布
      expect(r.results[0].testStatisticType).toBe('t')
      expect(r.results[0].df).toBe(98)
      expect(r.results[0].testStatisticLabel).toBe('t(98) = 3.33')

      expect(r.results[1].diff).toBe(2)
      expect(r.results[1].ci_lower).toBeCloseTo(0.655158, 5)
      expect(r.results[1].ci_upper).toBeCloseTo(3.344842, 5)
      expect(r.results[1].p_value).toBeCloseTo(2.871e-7, 9)
      expect(r.results[1].testStatistic).toBeCloseTo(5.0, 5)
      expect(r.results[1].isSuccess).toBe(true)

      expect(r.overall_success).toBe(true)
    })

    it('优效 + strategy=all：alpha 不做 Bonferroni 校正', () => {
      const r = calculateMultigroupResultContinuous(
        50, 10, 3, [50, 50], [12, 13], [3, 3], 1, 0.025, 'superiority', null, 'all'
      )

      expect(r.alpha_adjusted).toBeCloseTo(0.025, 10)
      expect(r.results[0].diff).toBe(2)
      expect(r.results[0].ci_lower).toBeCloseTo(0.824022, 5)
      expect(r.results[0].ci_upper).toBeCloseTo(3.175978, 5)
      expect(r.results[0].p_value).toBeCloseTo(0.000429, 6)
      expect(r.results[0].testStatistic).toBeCloseTo(3.333333, 5)
      expect(r.results[0].isSuccess).toBe(true)

      expect(r.results[1].diff).toBe(3)
      expect(r.results[1].ci_lower).toBeCloseTo(1.824022, 5)
      expect(r.results[1].ci_upper).toBeCloseTo(4.175978, 5)
      expect(r.results[1].p_value).toBeCloseTo(2.871e-7, 9)
      expect(r.results[1].testStatistic).toBeCloseTo(5.0, 5)
      expect(r.results[1].isSuccess).toBe(true)

      expect(r.overall_success).toBe(true)
    })

    it('等效场景：单试验组 mean=10.2 vs 对照 mean=10，delta=2', () => {
      const r = calculateMultigroupResultContinuous(
        50, 10, 3, [50], [10.2], [3], 2, 0.025, 'equivalence', null, 'any'
      )

      expect(r.k).toBe(1)
      expect(r.results[0].diff).toBeCloseTo(0.2, 6)
      expect(r.results[0].ci_lower).toBeCloseTo(-0.975978, 5)
      expect(r.results[0].ci_upper).toBeCloseTo(1.375978, 5)
      expect(r.results[0].p_value).toBeCloseTo(0.001350, 5)
      expect(r.results[0].testStatistic).toBeCloseTo(3.0, 5)
      expect(r.results[0].isSuccess).toBe(true)
      expect(r.overall_success).toBe(true)
    })

    it('边界-se=0：对照与试验组 SD 均为 0 → sp=0 → se=0，走提前返回分支', () => {
      const r = calculateMultigroupResultContinuous(
        50, 10, 0, [50], [11], [0], 1, 0.025, 'non-inferiority', null, 'any'
      )

      expect(r.k).toBe(1)
      expect(r.results[0].diff).toBe(0)
      expect(r.results[0].ci_lower).toBe(0)
      expect(r.results[0].ci_upper).toBe(0)
      expect(r.results[0].p_value).toBe(1)
      expect(r.results[0].testStatistic).toBe(0)
      expect(r.results[0].isSuccess).toBe(false)
      // 现状锁定，待核：se=0 提前返回缺失 testStatisticType/df/testStatisticLabel 元数据
      expect(r.results[0].testStatisticType).toBeUndefined()
      expect(r.overall_success).toBe(false)
    })
  })
})
