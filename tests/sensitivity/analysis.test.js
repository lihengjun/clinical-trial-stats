/**
 * @file analysis.test.js
 * @description 敏感性分析 (sensitivity/analysis) 测试
 *
 * 重点回归项 (CTS-04):
 *   两组模式的 totalSampleSize 此前误用不存在的 result.n0 键
 *   (`result.n0 + result.n1`)，两组样本量函数实际返回 {n1, n2}，
 *   故两组模式 totalSampleSize 恒为 NaN。修复后应为 n1 + n2 的有限正数。
 *
 * 数值锁定为当前实现的实际输出 (2026-07-24 实测)，用于防止回归。
 */

import { describe, it, expect } from 'vitest'
import { runSensitivityAnalysis } from '../../src/sensitivity/analysis.js'

describe('sensitivity/analysis - runSensitivityAnalysis', () => {
  // ========================================================
  // ① 两组模式参数扫描 - totalSampleSize 有限正数 + 单调性
  // ========================================================
  describe('两组模式 (two-proportion) 参数扫描', () => {
    const base = {
      p1: 0.7,
      p0: 0.7,
      delta: 0.1,
      alpha: 0.025,
      power: 0.8,
      ratio: 1,
      studyType: 'non-inferiority'
    }

    it('扫描 delta: 每个点的 totalSampleSize 均为有限正数 (回归: 不再是 NaN)', () => {
      const out = runSensitivityAnalysis('two-proportion', base, {
        parameter: 'delta',
        min: 0.1,
        max: 0.2,
        step: 0.05
      })

      expect(out.error).toBeUndefined()
      expect(out.results).toHaveLength(3)

      for (const point of out.results) {
        // 核心回归断言: totalSampleSize 是有限正数，绝不是 NaN
        expect(Number.isNaN(point.totalSampleSize)).toBe(false)
        expect(Number.isFinite(point.totalSampleSize)).toBe(true)
        expect(point.totalSampleSize).toBeGreaterThan(0)
        // ratio=1 时 total = n1 + n2 = 2 × 每组样本量
        expect(point.totalSampleSize).toBe(point.sampleSize * 2)
      }
    })

    it('扫描 delta: delta 增大 → 样本量减小 (单调递减)', () => {
      const out = runSensitivityAnalysis('two-proportion', base, {
        parameter: 'delta',
        min: 0.1,
        max: 0.2,
        step: 0.05
      })

      const totals = out.results.map(r => r.totalSampleSize)
      // delta 越大, 非劣效界越宽松, 所需样本量越小
      expect(totals[0]).toBeGreaterThan(totals[1])
      expect(totals[1]).toBeGreaterThan(totals[2])
    })

    // ========================================================
    // ② 数值锁定断言 (当前修复后的实际输出)
    // ========================================================
    it('数值锁定: two-proportion 非劣效扫描 delta', () => {
      const out = runSensitivityAnalysis('two-proportion', base, {
        parameter: 'delta',
        min: 0.1,
        max: 0.2,
        step: 0.05
      })

      expect(out.results).toEqual([
        { paramValue: 0.1, sampleSize: 330, totalSampleSize: 660, alpha_adjusted: undefined },
        { paramValue: 0.15, sampleSize: 147, totalSampleSize: 294, alpha_adjusted: undefined },
        { paramValue: 0.2, sampleSize: 83, totalSampleSize: 166, alpha_adjusted: undefined }
      ])
      expect(out.baseValue).toBe(0.1)
    })

    it('数值锁定: two-proportion 优效扫描 p0 (试验组率)', () => {
      const supBase = {
        p1: 0.5,
        p0: 0.7,
        alpha: 0.025,
        power: 0.8,
        ratio: 1,
        studyType: 'superiority'
      }
      const out = runSensitivityAnalysis('two-proportion', supBase, {
        parameter: 'p0',
        min: 0.6,
        max: 0.7,
        step: 0.05
      })

      expect(out.results).toEqual([
        { paramValue: 0.6, sampleSize: 385, totalSampleSize: 770, alpha_adjusted: undefined },
        { paramValue: 0.65, sampleSize: 167, totalSampleSize: 334, alpha_adjusted: undefined },
        { paramValue: 0.7, sampleSize: 91, totalSampleSize: 182, alpha_adjusted: undefined }
      ])
    })
  })

  // ========================================================
  // ②b 两组连续终点 (two-mean) 三种 studyType 扫描
  //     回归 (FIX2R): two-mean 分支曾按 (mean1, mean0, sd, ...) 顺序传参,
  //     与真实签名 (sigma, meanDiff/delta, alpha, ...) 错配 → sd 落入 alpha 槽,
  //     normalInverse(1-sd) 非法 → totalSampleSize 恒为 NaN。
  //     修复后按真实签名传参, totalSampleSize 应为有限正数。
  //     数值锁定为修复后实测 (2026-07-24), 参数取仲裁复现脚本同参。
  // ========================================================
  describe('两组连续终点 (two-mean) 三种 studyType 扫描', () => {
    it('非劣效 (non-inferiority): 扫描 sd → totalSampleSize 有限正数 + 数值锁定', () => {
      const base = {
        mean1: 10,
        mean0: 10,
        sd: 3,
        delta: 2,
        alpha: 0.025,
        power: 0.8,
        ratio: 1,
        studyType: 'non-inferiority'
      }
      const out = runSensitivityAnalysis('two-mean', base, {
        parameter: 'sd',
        min: 2,
        max: 4,
        step: 1
      })

      expect(out.error).toBeUndefined()
      expect(out.results).toHaveLength(3)
      for (const point of out.results) {
        // 核心回归断言: totalSampleSize 是有限正数, 绝不是 NaN
        expect(Number.isNaN(point.totalSampleSize)).toBe(false)
        expect(Number.isFinite(point.totalSampleSize)).toBe(true)
        expect(point.totalSampleSize).toBeGreaterThan(0)
        // ratio=1 时 total = n1 + n2 = 2 × 每组样本量
        expect(point.totalSampleSize).toBe(point.sampleSize * 2)
      }

      expect(out.results).toEqual([
        { paramValue: 2, sampleSize: 16, totalSampleSize: 32, alpha_adjusted: undefined },
        { paramValue: 3, sampleSize: 36, totalSampleSize: 72, alpha_adjusted: undefined },
        { paramValue: 4, sampleSize: 63, totalSampleSize: 126, alpha_adjusted: undefined }
      ])
    })

    it('优效 (superiority): 扫描 sd → totalSampleSize 有限正数 + 数值锁定', () => {
      const base = {
        mean1: 12,
        mean0: 10,
        sd: 3,
        alpha: 0.025,
        power: 0.8,
        ratio: 1,
        studyType: 'superiority'
      }
      const out = runSensitivityAnalysis('two-mean', base, {
        parameter: 'sd',
        min: 2,
        max: 4,
        step: 1
      })

      expect(out.error).toBeUndefined()
      expect(out.results).toHaveLength(3)
      for (const point of out.results) {
        expect(Number.isNaN(point.totalSampleSize)).toBe(false)
        expect(Number.isFinite(point.totalSampleSize)).toBe(true)
        expect(point.totalSampleSize).toBeGreaterThan(0)
        expect(point.totalSampleSize).toBe(point.sampleSize * 2)
      }

      expect(out.results).toEqual([
        { paramValue: 2, sampleSize: 16, totalSampleSize: 32, alpha_adjusted: undefined },
        { paramValue: 3, sampleSize: 36, totalSampleSize: 72, alpha_adjusted: undefined },
        { paramValue: 4, sampleSize: 63, totalSampleSize: 126, alpha_adjusted: undefined }
      ])
    })

    it('等效 (equivalence): 扫描 sd → totalSampleSize 有限正数 + 数值锁定', () => {
      const base = {
        mean1: 10,
        mean0: 10,
        sd: 3,
        delta: 2,
        alpha: 0.05,
        power: 0.8,
        ratio: 1,
        studyType: 'equivalence'
      }
      const out = runSensitivityAnalysis('two-mean', base, {
        parameter: 'sd',
        min: 2,
        max: 4,
        step: 1
      })

      expect(out.error).toBeUndefined()
      expect(out.results).toHaveLength(3)
      for (const point of out.results) {
        expect(Number.isNaN(point.totalSampleSize)).toBe(false)
        expect(Number.isFinite(point.totalSampleSize)).toBe(true)
        expect(point.totalSampleSize).toBeGreaterThan(0)
        expect(point.totalSampleSize).toBe(point.sampleSize * 2)
      }

      expect(out.results).toEqual([
        { paramValue: 2, sampleSize: 18, totalSampleSize: 36, alpha_adjusted: undefined },
        { paramValue: 3, sampleSize: 39, totalSampleSize: 78, alpha_adjusted: undefined },
        { paramValue: 4, sampleSize: 69, totalSampleSize: 138, alpha_adjusted: undefined }
      ])
    })
  })

  // ========================================================
  // ③ 多组模式 totalSampleSize 行为锁定 (修复不得破坏多组路径)
  // ========================================================
  describe('多组模式 (multi-proportion)', () => {
    const base = {
      p0: 0.5,
      p_groups: [0.5, 0.5],
      delta: 0.1,
      alpha: 0.025,
      power: 0.8,
      studyType: 'non-inferiority',
      strategy: 'any'
    }

    it('多组 totalSampleSize 为有限正数, 且等于各组样本量之和', () => {
      const out = runSensitivityAnalysis('multi-proportion', base, {
        parameter: 'delta',
        min: 0.1,
        max: 0.15,
        step: 0.05
      })

      expect(out.error).toBeUndefined()
      for (const point of out.results) {
        expect(Number.isFinite(point.totalSampleSize)).toBe(true)
        expect(point.totalSampleSize).toBeGreaterThan(0)
        // 默认等比例 2 试验组 + 1 对照组 = 3 组, total = 3 × base_n
        expect(point.totalSampleSize).toBe(point.sampleSize * 3)
      }
    })

    it('数值锁定: multi-proportion 扫描 delta (含 Bonferroni 校正 alpha)', () => {
      const out = runSensitivityAnalysis('multi-proportion', base, {
        parameter: 'delta',
        min: 0.1,
        max: 0.15,
        step: 0.05
      })

      expect(out.results).toEqual([
        { paramValue: 0.1, sampleSize: 476, totalSampleSize: 1428, alpha_adjusted: 0.0125 },
        { paramValue: 0.15, sampleSize: 212, totalSampleSize: 636, alpha_adjusted: 0.0125 }
      ])
    })
  })

  // ========================================================
  // ④ 边界: 无效扫描配置 / NaN 结果如实锁定
  // ========================================================
  describe('边界与无效输入', () => {
    const base = {
      p1: 0.7,
      p0: 0.7,
      delta: 0.1,
      alpha: 0.025,
      power: 0.8,
      ratio: 1,
      studyType: 'non-inferiority'
    }

    it('配置不完整 → 返回错误对象', () => {
      const out = runSensitivityAnalysis('two-proportion', base, {
        parameter: null,
        min: 0.1,
        max: 0.2,
        step: 0.05
      })
      expect(out).toEqual({ error: '敏感性分析配置不完整' })
    })

    it('min >= max → 返回错误对象', () => {
      const out = runSensitivityAnalysis('two-proportion', base, {
        parameter: 'delta',
        min: 0.2,
        max: 0.1,
        step: 0.05
      })
      expect(out).toEqual({ error: '最小值必须小于最大值' })
    })

    it('step <= 0 → 返回错误对象', () => {
      const out = runSensitivityAnalysis('two-proportion', base, {
        parameter: 'delta',
        min: 0.1,
        max: 0.2,
        step: 0
      })
      expect(out).toEqual({ error: '步长必须大于0' })
    })

    it('探索点数过多 (>50) → 返回错误对象', () => {
      const out = runSensitivityAnalysis('two-proportion', base, {
        parameter: 'delta',
        min: 0,
        max: 1,
        step: 0.01
      })
      expect(out).toEqual({ error: '探索点数过多(最多50个),请增大步长' })
    })

    it('不支持的计算模式 → 返回错误对象', () => {
      const out = runSensitivityAnalysis('unknown-mode', base, {
        parameter: 'delta',
        min: 0.1,
        max: 0.2,
        step: 0.05
      })
      expect(out).toEqual({ error: '不支持的计算模式' })
    })

    it('效应量为零的扫描点: totalSampleSize 如实为 NaN, 有效点仍为有限正数', () => {
      // 优效试验中 p0 == p1 时效应量为 0 → 样本量函数返回 {n1: NaN, n2: NaN}
      const supBase = {
        p1: 0.5,
        p0: 0.5,
        alpha: 0.025,
        power: 0.8,
        ratio: 1,
        studyType: 'superiority'
      }
      const out = runSensitivityAnalysis('two-proportion', supBase, {
        parameter: 'p0',
        min: 0.5,
        max: 0.6,
        step: 0.05
      })

      expect(out.results).toHaveLength(3)
      // 首点 p0=0.5 == p1: 效应量为 0 → totalSampleSize 如实为 NaN, sampleSize 缺省
      expect(out.results[0].paramValue).toBe(0.5)
      expect(Number.isNaN(out.results[0].totalSampleSize)).toBe(true)
      expect(out.results[0].sampleSize).toBeUndefined()
      // 后续有效点为有限正数
      expect(Number.isFinite(out.results[1].totalSampleSize)).toBe(true)
      expect(out.results[1].totalSampleSize).toBeGreaterThan(0)
      expect(Number.isFinite(out.results[2].totalSampleSize)).toBe(true)
      expect(out.results[2].totalSampleSize).toBeGreaterThan(0)
    })
  })
})
