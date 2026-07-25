/**
 * @file param-wiring-type-invalid.test.js
 * @description W8CR 回归：类型无效关键参数（NaN/undefined）必须被拒绝返回 NaN 形态，
 *   不得被 safeNumber 强转默认值吞掉后返回假合法样本量/效能/结论。
 *
 * 覆盖 W8CR 修正的 8 个接线入口（validate 消费原始入参 / isFinite 前置守卫）：
 * - sample-size/multigroup: 率终点 + 连续终点（safeNumber 先于 validate，默认 0.025 域内吞 NaN）
 * - sample-size/paired: 率终点 p10/p01 + 连续终点 sigma_diff（不进共享 validator，本地 guard 对 NaN 失效）
 * - power-analysis/paired: 率终点 p10/p01 + 连续终点 sigma_diff（safeNumber 洗成 0/1 后本地 guard 放行）
 * - result-validation/multigroup: 率终点 + 连续终点（safeNumber 默认 0.025 域内吞 NaN → 假 overall_success）
 *
 * 病根：先前缺"类型无效 → NaN 形态"这一测试形态，导致上述漏网。
 */

import { describe, it, expect } from 'vitest'
import {
  calculateMultigroupSampleSize,
  calculateMultigroupSampleSizeContinuous
} from '../../src/sample-size/multigroup.js'
import {
  calculatePairedSampleSize,
  calculatePairedSampleSizeContinuous
} from '../../src/sample-size/paired.js'
import {
  calculatePowerPaired,
  calculatePowerPairedContinuous
} from '../../src/power-analysis/power-calculation.js'
import {
  calculateMultigroupResult,
  calculateMultigroupResultContinuous
} from '../../src/result-validation/multigroup.js'

describe('W8CR 类型无效关键参数 → NaN 形态（不返回假合法）', () => {
  // ========================================================
  // 1. sample-size/multigroup —— 率终点
  //    （旧: alpha=NaN 被 safeNumber(…,0.025) 吞 → validate valid → base_n≈466 假合法）
  // ========================================================
  describe('calculateMultigroupSampleSize (率终点)', () => {
    it('有效入参应算出有限 base_n（基线）', () => {
      const r = calculateMultigroupSampleSize(0.5, [0.7], 0.1, 0.025, 0.8, 'non-inferiority')
      expect(Number.isFinite(r.base_n)).toBe(true)
      expect(r.base_n).toBeGreaterThan(0)
    })
    it('alpha=NaN → base_n / n_per_group 为 NaN', () => {
      const r = calculateMultigroupSampleSize(0.5, [0.7], 0.1, NaN, 0.8, 'non-inferiority')
      expect(r.base_n).toBeNaN()
      expect(r.n_per_group).toBeNaN()
    })
    it('alpha=undefined → base_n 为 NaN', () => {
      const r = calculateMultigroupSampleSize(0.5, [0.7], 0.1, undefined, 0.8, 'non-inferiority')
      expect(r.base_n).toBeNaN()
    })
    it('power=NaN → base_n 为 NaN', () => {
      const r = calculateMultigroupSampleSize(0.5, [0.7], 0.1, 0.025, NaN, 'non-inferiority')
      expect(r.base_n).toBeNaN()
    })
    it('p0=NaN → base_n 为 NaN', () => {
      const r = calculateMultigroupSampleSize(NaN, [0.7], 0.1, 0.025, 0.8, 'non-inferiority')
      expect(r.base_n).toBeNaN()
    })
  })

  // ========================================================
  // 2. sample-size/multigroup —— 连续终点
  // ========================================================
  // 签名: (mean0, mean_groups, sd, delta, alpha, power, studyType)
  describe('calculateMultigroupSampleSizeContinuous (连续终点)', () => {
    it('有效入参应算出有限 base_n（基线）', () => {
      const r = calculateMultigroupSampleSizeContinuous(0, [5], 5, 1, 0.025, 0.8, 'non-inferiority')
      expect(Number.isFinite(r.base_n)).toBe(true)
      expect(r.base_n).toBeGreaterThan(0)
    })
    it('sd=NaN → base_n 为 NaN', () => {
      const r = calculateMultigroupSampleSizeContinuous(0, [5], NaN, 1, 0.025, 0.8, 'non-inferiority')
      expect(r.base_n).toBeNaN()
    })
    it('alpha=undefined → base_n 为 NaN', () => {
      const r = calculateMultigroupSampleSizeContinuous(0, [5], 5, 1, undefined, 0.8, 'non-inferiority')
      expect(r.base_n).toBeNaN()
    })
    it('power=NaN → base_n 为 NaN', () => {
      const r = calculateMultigroupSampleSizeContinuous(0, [5], 5, 1, 0.025, NaN, 'non-inferiority')
      expect(r.base_n).toBeNaN()
    })
  })

  // ========================================================
  // 3. sample-size/paired —— 率终点（p10/p01 不进共享 validator）
  //    （旧: p10=NaN → 本地 `p10<0` 恒 false 放行 → `!isFinite(n_raw)` 误判为 Infinity）
  // ========================================================
  describe('calculatePairedSampleSize (率终点)', () => {
    it('有效入参应算出有限 n（基线）', () => {
      const r = calculatePairedSampleSize(0.15, 0.3, 0.15, 0.025, 0.8, 'non-inferiority')
      expect(Number.isFinite(r.n)).toBe(true)
      expect(r.n).toBeGreaterThan(0)
    })
    it('p10=NaN → n 为 NaN（非 Infinity）', () => {
      const r = calculatePairedSampleSize(NaN, 0.3, 0.15, 0.025, 0.8, 'non-inferiority')
      expect(r.n).toBeNaN()
    })
    it('p01=undefined → n 为 NaN', () => {
      const r = calculatePairedSampleSize(0.15, undefined, 0.15, 0.025, 0.8, 'non-inferiority')
      expect(r.n).toBeNaN()
    })
    it('alpha=NaN → n 为 NaN', () => {
      const r = calculatePairedSampleSize(0.15, 0.3, 0.15, NaN, 0.8, 'non-inferiority')
      expect(r.n).toBeNaN()
    })
  })

  // ========================================================
  // 4. sample-size/paired —— 连续终点（sigma_diff 不进共享 validator）
  //    （旧: sigma_diff=NaN → 本地 `sigma_diff<=0` 恒 false 放行 → n_raw=NaN → 误判 Infinity）
  // ========================================================
  describe('calculatePairedSampleSizeContinuous (连续终点)', () => {
    it('有效入参应算出有限 n（基线）', () => {
      const r = calculatePairedSampleSizeContinuous(2, 2, 5, 0.025, 0.8, 'non-inferiority')
      expect(Number.isFinite(r.n)).toBe(true)
      expect(r.n).toBeGreaterThan(0)
    })
    it('sigma_diff=NaN → n 为 NaN（非 Infinity）', () => {
      const r = calculatePairedSampleSizeContinuous(NaN, 2, 5, 0.025, 0.8, 'non-inferiority')
      expect(r.n).toBeNaN()
    })
    it('sigma_diff=undefined → n 为 NaN', () => {
      const r = calculatePairedSampleSizeContinuous(undefined, 2, 5, 0.025, 0.8, 'non-inferiority')
      expect(r.n).toBeNaN()
    })
    it('alpha=NaN → n 为 NaN', () => {
      const r = calculatePairedSampleSizeContinuous(2, 2, 5, NaN, 0.8, 'non-inferiority')
      expect(r.n).toBeNaN()
    })
  })

  // ========================================================
  // 5. power-analysis/paired —— 率终点
  //    （旧: p10=NaN → safeNumber(…,0) 洗成 0 → 本地 guard 放行 → 返回有限 power 假合法）
  // ========================================================
  describe('calculatePowerPaired (率终点)', () => {
    it('有效入参应算出有限 power（基线）', () => {
      const r = calculatePowerPaired(100, 0.15, 0.3, 0.15, 0.025, 'non-inferiority')
      expect(Number.isFinite(r.power)).toBe(true)
    })
    it('p10=NaN → power 为 NaN', () => {
      const r = calculatePowerPaired(100, NaN, 0.3, 0.15, 0.025, 'non-inferiority')
      expect(r.power).toBeNaN()
      expect(r.z_beta).toBeNaN()
    })
    it('p01=undefined → power 为 NaN', () => {
      const r = calculatePowerPaired(100, 0.15, undefined, 0.15, 0.025, 'non-inferiority')
      expect(r.power).toBeNaN()
    })
    it('alpha=NaN → power 为 NaN', () => {
      const r = calculatePowerPaired(100, 0.15, 0.3, 0.15, NaN, 'non-inferiority')
      expect(r.power).toBeNaN()
    })
  })

  // ========================================================
  // 6. power-analysis/paired —— 连续终点
  //    （旧: sigma_diff=NaN → safeNumber(…,1) 洗成 1 → 本地 guard 放行 → 按 σ=1 返回假合法 power）
  // ========================================================
  describe('calculatePowerPairedContinuous (连续终点)', () => {
    it('有效入参应算出有限 power（基线）', () => {
      const r = calculatePowerPairedContinuous(100, 2, 2, 5, 0.025, 'non-inferiority')
      expect(Number.isFinite(r.power)).toBe(true)
    })
    it('sigma_diff=NaN → power 为 NaN', () => {
      const r = calculatePowerPairedContinuous(100, NaN, 2, 5, 0.025, 'non-inferiority')
      expect(r.power).toBeNaN()
      expect(r.z_beta).toBeNaN()
    })
    it('sigma_diff=undefined → power 为 NaN', () => {
      const r = calculatePowerPairedContinuous(100, undefined, 2, 5, 0.025, 'non-inferiority')
      expect(r.power).toBeNaN()
    })
    it('alpha=NaN → power 为 NaN', () => {
      const r = calculatePowerPairedContinuous(100, 2, 2, 5, NaN, 'non-inferiority')
      expect(r.power).toBeNaN()
    })
  })

  // ========================================================
  // 7. result-validation/multigroup —— 率终点
  //    （旧: alpha=NaN 被 safeNumber(…,0.025) 吞 → validate valid → 按 α=0.025 算出假 overall_success）
  //    拒绝形态 = 空 results + overall_success=false（该模块既有 fallback）
  // ========================================================
  describe('calculateMultigroupResult (率终点)', () => {
    it('有效入参应产出非空 results（基线）', () => {
      const r = calculateMultigroupResult(100, 50, [100], [70], 0.1, 0.025, 'non-inferiority')
      expect(r.results.length).toBe(1)
    })
    it('alpha=NaN → 空 results + overall_success=false（不返回假合法结论）', () => {
      const r = calculateMultigroupResult(100, 50, [100], [70], 0.1, NaN, 'non-inferiority')
      expect(r.overall_success).toBe(false)
      expect(r.results.length).toBe(0)
    })
    it('alpha=undefined → 空 results + overall_success=false', () => {
      const r = calculateMultigroupResult(100, 50, [100], [70], 0.1, undefined, 'non-inferiority')
      expect(r.overall_success).toBe(false)
      expect(r.results.length).toBe(0)
    })
  })

  // ========================================================
  // 8. result-validation/multigroup —— 连续终点
  // ========================================================
  describe('calculateMultigroupResultContinuous (连续终点)', () => {
    it('有效入参应产出非空 results（基线）', () => {
      const r = calculateMultigroupResultContinuous(100, 10, 2, [100], [11], [2], 1, 0.025, 'non-inferiority')
      expect(r.results.length).toBe(1)
    })
    it('alpha=NaN → 空 results + overall_success=false（不返回假合法结论）', () => {
      const r = calculateMultigroupResultContinuous(100, 10, 2, [100], [11], [2], 1, NaN, 'non-inferiority')
      expect(r.overall_success).toBe(false)
      expect(r.results.length).toBe(0)
    })
    it('alpha=undefined → 空 results + overall_success=false', () => {
      const r = calculateMultigroupResultContinuous(100, 10, 2, [100], [11], [2], 1, undefined, 'non-inferiority')
      expect(r.overall_success).toBe(false)
      expect(r.results.length).toBe(0)
    })
  })
})
