/**
 * @file paired.test.js
 * @description 配对设计结果验证 - 锁定现状回归测试 (characterization tests)
 *
 * 说明：本文件为"锁定现状"回归测试。每个期望值均取自当前实现的实际输出，
 *      用途是为后续算法修复提供可审查的 diff 基线。凡标注"现状锁定，待核"的断言，
 *      锁定的是当前（可能存疑）行为，⛔ 未在本波修改，待后续核对。
 *
 * 被测导出（src/result-validation/paired.js）：
 *   - calculatePairedResult(n10, n01, delta, alpha, useContinuity, studyType)        // 率终点 McNemar
 *   - calculatePairedResultContinuous(n, mean_diff, sd_diff, delta, alpha, studyType) // 连续终点 配对 t
 *
 * McNemar 语义：n10 = 前成功/后失败的不一致对；n01 = 前失败/后成功的不一致对。
 *   率差 diff = (n01 - n10) / (n10 + n01)。
 */

import { describe, it, expect } from 'vitest'
import {
  calculatePairedResult,
  calculatePairedResultContinuous
} from '../../src/result-validation/paired'

describe('result-validation/paired', () => {
  // ========================================================
  // calculatePairedResult — 率终点 (McNemar)
  // ========================================================
  describe('calculatePairedResult (McNemar proportion)', () => {
    it('典型临床场景：不一致对 n10=10、n01=25，delta=0.1，alpha=0.025，非劣效', () => {
      // 治疗后改善(n01=25)多于恶化(n10=10)，35 对不一致
      const r = calculatePairedResult(10, 25, 0.1, 0.025, false, 'non-inferiority')

      expect(r.diff).toBeCloseTo(0.428571, 5)
      // 现状锁定，待核：CI 标准误 se=sqrt((n01+n10)/n_total^2)=1/sqrt(n_total)，
      //   非配对率差的标准 McNemar 方差公式（简化处理）
      expect(r.ci_lower).toBeCloseTo(0.097277, 5)
      expect(r.ci_upper).toBeCloseTo(0.759866, 5)
      expect(r.p_value).toBeCloseTo(0.005615, 5)
      expect(r.testStatistic).toBeCloseTo(6.428571, 5)
      expect(r.isNonInferior).toBe(true)
      expect(r.testStatisticType).toBe('chi2')
      expect(r.df).toBe(1)
      expect(r.testStatisticLabel).toBe('χ²(1) = 6.43')
    })

    it('连续性校正：useContinuity=true 改变 chi2/p 值，CI 不变', () => {
      const r = calculatePairedResult(10, 25, 0.1, 0.025, true, 'non-inferiority')

      expect(r.diff).toBeCloseTo(0.428571, 5)
      // 现状锁定：CI 由 diff 与 se 决定，不受连续性校正影响，与无校正用例相同
      expect(r.ci_lower).toBeCloseTo(0.097277, 5)
      expect(r.ci_upper).toBeCloseTo(0.759866, 5)
      expect(r.p_value).toBeCloseTo(0.008980, 5)
      expect(r.testStatistic).toBeCloseTo(5.6, 5)
      expect(r.isNonInferior).toBe(true)
      expect(r.testStatisticLabel).toBe('χ²(1) = 5.60')
    })

    it('等效场景：n10=18、n01=22，delta=0.3，等效判据要求 CI 完全落入 (-delta, delta)', () => {
      const r = calculatePairedResult(18, 22, 0.3, 0.025, false, 'equivalence')

      expect(r.diff).toBeCloseTo(0.1, 6)
      expect(r.ci_lower).toBeCloseTo(-0.209898, 5)
      expect(r.ci_upper).toBeCloseTo(0.409898, 5)
      expect(r.p_value).toBeCloseTo(0.263545, 5)
      expect(r.testStatistic).toBeCloseTo(0.4, 5)
      // ci_upper=0.41 > delta=0.3 → 等效不成立
      expect(r.isNonInferior).toBe(false)
    })

    it('优效场景：n10=8、n01=30，判据 ci_lower > 0', () => {
      const r = calculatePairedResult(8, 30, 0.1, 0.025, false, 'superiority')

      expect(r.diff).toBeCloseTo(0.578947, 5)
      expect(r.ci_lower).toBeCloseTo(0.260999, 5)
      expect(r.ci_upper).toBeCloseTo(0.896896, 5)
      expect(r.p_value).toBeCloseTo(0.000179, 6)
      expect(r.testStatistic).toBeCloseTo(12.736842, 5)
      expect(r.isNonInferior).toBe(true)
    })

    it('边界-零不一致对：n10=0、n01=0 → n_total=0，走提前返回分支', () => {
      const r = calculatePairedResult(0, 0, 0.1, 0.025, false, 'non-inferiority')

      expect(r.diff).toBe(0)
      expect(r.ci_lower).toBe(0)
      expect(r.ci_upper).toBe(0)
      expect(r.p_value).toBe(1)
      expect(r.isNonInferior).toBe(false)
      // 现状锁定，待核：提前返回缺失 testStatistic/testStatisticType/df/testStatisticLabel 元数据
      expect(r.testStatistic).toBeUndefined()
      expect(r.testStatisticType).toBeUndefined()
    })
  })

  // ========================================================
  // calculatePairedResultContinuous — 连续终点 (配对 t 检验)
  // ========================================================
  describe('calculatePairedResultContinuous (continuous)', () => {
    it('典型临床场景：n=30，差值均值=2，差值 SD=5，delta=1，alpha=0.025，非劣效', () => {
      const r = calculatePairedResultContinuous(30, 2, 5, 1, 0.025, 'non-inferiority')

      expect(r.diff).toBe(2)
      expect(r.ci_lower).toBeCloseTo(0.210806, 5)
      expect(r.ci_upper).toBeCloseTo(3.789194, 5)
      expect(r.p_value).toBeCloseTo(0.014230, 5)
      expect(r.testStatistic).toBeCloseTo(2.190890, 5)
      expect(r.isNonInferior).toBe(true)
      // 现状锁定，待核：统计量标注 t(29) 且给出 df，但 p 值经 normalCDF（正态近似）计算，非 t 分布
      expect(r.testStatisticType).toBe('t')
      expect(r.df).toBe(29)
      expect(r.testStatisticLabel).toBe('t(29) = 2.19')
    })

    it('优效场景：相同输入 studyType=superiority，判据 ci_lower > 0', () => {
      const r = calculatePairedResultContinuous(30, 2, 5, 1, 0.025, 'superiority')

      // 现状锁定：CI/统计量与非劣效用例相同（判据不同但此输入两者均成立）
      expect(r.ci_lower).toBeCloseTo(0.210806, 5)
      expect(r.ci_upper).toBeCloseTo(3.789194, 5)
      expect(r.p_value).toBeCloseTo(0.014230, 5)
      expect(r.testStatistic).toBeCloseTo(2.190890, 5)
      expect(r.isNonInferior).toBe(true)
    })

    it('边界-n<=0：走提前返回分支，CI 退化为 mean_diff', () => {
      const r = calculatePairedResultContinuous(0, 2, 5, 1, 0.025, 'non-inferiority')

      // 现状锁定，待核：n<=0 时 CI 上下界均返回 mean_diff(=2)，而非 0
      expect(r.diff).toBe(2)
      expect(r.ci_lower).toBe(2)
      expect(r.ci_upper).toBe(2)
      expect(r.p_value).toBe(1)
      expect(r.testStatistic).toBe(0)
      expect(r.isNonInferior).toBe(false)
      // 现状锁定：提前返回缺失 testStatisticType/df/testStatisticLabel 元数据
      expect(r.testStatisticType).toBeUndefined()
    })

    it('边界-负标准差：sd_diff<0 走同一保护分支', () => {
      const r = calculatePairedResultContinuous(30, 2, -1, 1, 0.025, 'non-inferiority')

      expect(r.diff).toBe(2)
      expect(r.ci_lower).toBe(2)
      expect(r.ci_upper).toBe(2)
      expect(r.p_value).toBe(1)
      expect(r.testStatistic).toBe(0)
      expect(r.isNonInferior).toBe(false)
    })
  })
})
