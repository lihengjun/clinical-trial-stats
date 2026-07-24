/**
 * @file effect-size-calculation.test.js
 * @description MDE（最小可检测效应量）反推算法测试
 *
 * 验证策略 —— 正反回代闭环（round-trip）:
 *   用样本量正向函数构造闭环: calculateXSampleSize(效应量δ, ...) = n，
 *   再验证 calculateMDE_X(n, ...) ≈ δ。不依赖外部 golden 值，全部用
 *   本库自身的正向样本量函数生成 n，形成自洽闭环。
 *
 * 容差依据（实测脚本 measure-mde.mjs, 2026-07-24）:
 *   - 率终点（二分搜索）: 回代偏差来自正向函数 ceil(n) 上取整 + 二分收敛
 *     阈值 1e-6。因 n 被 ceil 放大，反推 mde 恒略小于原 δ。实测最大绝对偏差
 *     约 0.0043（配对 NI），故取绝对容差 P_TOL=0.01（>2x 余量）。
 *   - 连续终点（代数反解）: mde = effectSize - |delta|，effectSize ∝ 1/√n，
 *     ceil(n) 上取整放大相对偏差，n 越小偏差越大。实测最大相对偏差约 5.2%
 *     （NIcont, n=33），故取相对容差 C_REL_TOL=0.10（约 2x 余量）。
 *   - n≤0 / sigma≤0 等无解场景: 如实锁定现状（返回 NaN），不修 src。
 *
 * @references
 * [1] Chow SC et al. Sample Size Calculations in Clinical Research. 3rd ed. 2017.
 * [2] Cohen J. Statistical Power Analysis for the Behavioral Sciences. 2nd ed. 1988.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateMDE,
  calculateMDE_NI,
  calculateMDE_Sup,
  calculateMDE_Eq,
  calculateMDE_NIContinuous,
  calculateMDE_SupContinuous,
  calculateMDE_EqContinuous,
  calculateMDE_OneSample,
  calculateMDE_OneSampleContinuous,
  calculateMDE_Paired,
  calculateMDE_PairedContinuous
} from '../../src/power-analysis/effect-size-calculation'
import {
  calculateNISampleSize,
  calculateNISampleSizeContinuous
} from '../../src/sample-size/two-group/non-inferiority'
import {
  calculateSupSampleSize,
  calculateSupSampleSizeContinuous
} from '../../src/sample-size/two-group/superiority'
import {
  calculateEqSampleSize,
  calculateEqSampleSizeContinuous
} from '../../src/sample-size/two-group/equivalence'
import {
  calculateOneSampleSize,
  calculateOneSampleSizeContinuous
} from '../../src/sample-size/one-sample'
import {
  calculatePairedSampleSize,
  calculatePairedSampleSizeContinuous
} from '../../src/sample-size/paired'

// 率终点（二分搜索）绝对容差
const P_TOL = 0.01
// 连续终点（代数反解）相对容差
const C_REL_TOL = 0.1

/** 断言率终点回代闭合: |mde - target| < P_TOL */
function expectPropClose(mde, target) {
  expect(Math.abs(mde - target)).toBeLessThan(P_TOL)
}

/** 断言连续终点回代闭合: 相对偏差 < C_REL_TOL */
function expectContClose(mde, target) {
  expect(Math.abs(mde - target) / Math.abs(target)).toBeLessThan(C_REL_TOL)
}

// ══════════════════════════════════════════════════════════════
// 两组比较 - 率终点 - 非劣效
// 反推变量: p2；闭环 calculateNISampleSize(p1,p2,delta,α,power,k)=n1
// 函数签名: calculateMDE_NI(n1, p1, delta, alpha, power, ratio)
// ══════════════════════════════════════════════════════════════
describe('calculateMDE_NI - 两组非劣效率终点', () => {
  it('回代闭环①: p1=0.7 p2=0.75 delta=0.1 → p2Min≈0.75', () => {
    const f = calculateNISampleSize(0.7, 0.75, 0.1, 0.025, 0.8, 1)
    const r = calculateMDE_NI(f.n1, 0.7, 0.1, 0.025, 0.8, 1)
    expect(r.converged).toBe(true)
    expectPropClose(r.p2Min, 0.75)
    expectPropClose(r.mde, 0.05)
  })

  it('回代闭环②: p1=0.6 p2=0.6 delta=0.15 k=2 → p2Min≈0.60', () => {
    const f = calculateNISampleSize(0.6, 0.6, 0.15, 0.05, 0.9, 2)
    const r = calculateMDE_NI(f.n1, 0.6, 0.15, 0.05, 0.9, 2)
    expect(r.converged).toBe(true)
    expectPropClose(r.p2Min, 0.6)
  })

  it('边界: n1=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_NI(0, 0.7, 0.1, 0.025, 0.8, 1)
    expect(r.mde).toBeNaN()
    expect(r.p2Min).toBeNaN()
    expect(r.converged).toBe(false)
  })

  it('边界: n1 极大(1e9) → p2Min 触及搜索下界 p1-delta+ε≈0.601（现状锁定）', () => {
    const r = calculateMDE_NI(1e9, 0.7, 0.1, 0.025, 0.8, 1)
    // 极大样本可检测极小效应，p2Min 被搜索下界 max(0.001, p1-delta+0.001) 钳制
    expect(Math.abs(r.p2Min - 0.601)).toBeLessThan(0.002)
    expect(r.effectSize).toBeGreaterThan(0)
    expect(r.effectSize).toBeLessThan(0.01)
  })
})

// ══════════════════════════════════════════════════════════════
// 两组比较 - 率终点 - 优效
// 反推变量: p2；闭环 calculateSupSampleSize(p1,p2,α,power,k)=n1
// 函数签名: calculateMDE_Sup(n1, p1, alpha, power, ratio)
// ══════════════════════════════════════════════════════════════
describe('calculateMDE_Sup - 两组优效率终点', () => {
  it('回代闭环①: p1=0.5 p2=0.65 → p2Min≈0.65', () => {
    const f = calculateSupSampleSize(0.5, 0.65, 0.025, 0.8, 1)
    const r = calculateMDE_Sup(f.n1, 0.5, 0.025, 0.8, 1)
    expect(r.converged).toBe(true)
    expectPropClose(r.p2Min, 0.65)
    expectPropClose(r.mde, 0.15)
  })

  it('回代闭环②: p1=0.3 p2=0.45 k=2 → p2Min≈0.45', () => {
    const f = calculateSupSampleSize(0.3, 0.45, 0.05, 0.9, 2)
    const r = calculateMDE_Sup(f.n1, 0.3, 0.05, 0.9, 2)
    expect(r.converged).toBe(true)
    expectPropClose(r.p2Min, 0.45)
  })

  it('边界: n1=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_Sup(0, 0.5, 0.025, 0.8, 1)
    expect(r.mde).toBeNaN()
    expect(r.p2Min).toBeNaN()
    expect(r.converged).toBe(false)
  })

  it('边界: n1=1 且 p1=0.99（可行区间极窄）→ p2Min 触及上界≈0.999（现状锁定）', () => {
    const r = calculateMDE_Sup(1, 0.99, 0.025, 0.8, 1)
    expect(r.p2Min).toBeGreaterThan(0.99)
    expect(r.p2Min).toBeLessThanOrEqual(0.999)
  })
})

// ══════════════════════════════════════════════════════════════
// 两组比较 - 率终点 - 等效
// 反推变量: delta；闭环 calculateEqSampleSize(p1,p2,delta,α,power,k)=n1
// 函数签名: calculateMDE_Eq(n1, p1, p2, alpha, power, ratio)
// ══════════════════════════════════════════════════════════════
describe('calculateMDE_Eq - 两组等效率终点', () => {
  it('回代闭环①(对称 Δ=0): p1=p2=0.5 delta=0.1 → deltaMin≈0.1', () => {
    const f = calculateEqSampleSize(0.5, 0.5, 0.1, 0.025, 0.8, 1)
    const r = calculateMDE_Eq(f.n1, 0.5, 0.5, 0.025, 0.8, 1)
    expect(r.converged).toBe(true)
    expectPropClose(r.deltaMin, 0.1)
    expect(r.mde).toBe(r.deltaMin)
  })

  it('回代闭环②(非对称 Δ≠0): p1=0.5 p2=0.55 delta=0.15 → deltaMin≈0.15', () => {
    const f = calculateEqSampleSize(0.5, 0.55, 0.15, 0.025, 0.8, 1)
    const r = calculateMDE_Eq(f.n1, 0.5, 0.55, 0.025, 0.8, 1)
    expect(r.converged).toBe(true)
    expectPropClose(r.deltaMin, 0.15)
  })

  it('边界: n1=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_Eq(0, 0.5, 0.5, 0.025, 0.8, 1)
    expect(r.mde).toBeNaN()
    expect(r.deltaMin).toBeNaN()
    expect(r.converged).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 两组比较 - 连续终点 - 非劣效（代数反解）
// 闭环 calculateNISampleSizeContinuous(σ,delta,α,power,k,meanDiff)=n1
// 反推 mde ≈ meanDiff（= effectSize - |delta|）
// 函数签名: calculateMDE_NIContinuous(n1, sigma, delta, alpha, power, ratio)
// ══════════════════════════════════════════════════════════════
describe('calculateMDE_NIContinuous - 两组非劣效连续终点', () => {
  it('回代闭环①: σ=10 delta=5 meanDiff=2 → mde≈2', () => {
    const f = calculateNISampleSizeContinuous(10, 5, 0.025, 0.8, 1, 2)
    const r = calculateMDE_NIContinuous(f.n1, 10, 5, 0.025, 0.8, 1)
    expect(r.converged).toBe(true)
    expectContClose(r.mde, 2)
  })

  it('回代闭环②: σ=15 delta=3 meanDiff=4 k=2 → mde≈4', () => {
    const f = calculateNISampleSizeContinuous(15, 3, 0.025, 0.8, 2, 4)
    const r = calculateMDE_NIContinuous(f.n1, 15, 3, 0.025, 0.8, 2)
    expect(r.converged).toBe(true)
    expectContClose(r.mde, 4)
  })

  it('边界: n1=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_NIContinuous(0, 10, 5, 0.025, 0.8, 1)
    expect(r.mde).toBeNaN()
    expect(r.converged).toBe(false)
  })

  it('边界: sigma=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_NIContinuous(50, 0, 5, 0.025, 0.8, 1)
    expect(r.mde).toBeNaN()
    expect(r.converged).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 两组比较 - 连续终点 - 优效（代数反解）
// 闭环 calculateSupSampleSizeContinuous(σ,meanDiff,α,power,k)=n1
// 反推 mde ≈ meanDiff
// 函数签名: calculateMDE_SupContinuous(n1, sigma, alpha, power, ratio)
// ══════════════════════════════════════════════════════════════
describe('calculateMDE_SupContinuous - 两组优效连续终点', () => {
  it('回代闭环①: σ=10 meanDiff=5 → mde≈5', () => {
    const f = calculateSupSampleSizeContinuous(10, 5, 0.025, 0.8, 1)
    const r = calculateMDE_SupContinuous(f.n1, 10, 0.025, 0.8, 1)
    expect(r.converged).toBe(true)
    expectContClose(r.mde, 5)
  })

  it('回代闭环②: σ=8 meanDiff=3 → mde≈3', () => {
    const f = calculateSupSampleSizeContinuous(8, 3, 0.025, 0.8, 1)
    const r = calculateMDE_SupContinuous(f.n1, 8, 0.025, 0.8, 1)
    expect(r.converged).toBe(true)
    expectContClose(r.mde, 3)
  })

  it('边界: n1=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_SupContinuous(0, 10, 0.025, 0.8, 1)
    expect(r.mde).toBeNaN()
    expect(r.converged).toBe(false)
  })

  it('边界: n1 极大(1e9) → mde 极小正数（现状锁定）', () => {
    const r = calculateMDE_SupContinuous(1e9, 10, 0.025, 0.8, 1)
    expect(r.mde).toBeGreaterThan(0)
    expect(r.mde).toBeLessThan(0.01)
  })
})

// ══════════════════════════════════════════════════════════════
// 两组比较 - 连续终点 - 等效（代数反解）
// 闭环 calculateEqSampleSizeContinuous(σ,delta,α,power,k,meanDiff)=n1
// 反推 deltaMin ≈ delta（= effectSize + |meanDiff|）
// 函数签名: calculateMDE_EqContinuous(n1, sigma, alpha, power, ratio, meanDiff)
// ══════════════════════════════════════════════════════════════
describe('calculateMDE_EqContinuous - 两组等效连续终点', () => {
  it('回代闭环①(对称 meanDiff=0): σ=10 delta=5 → deltaMin≈5', () => {
    const f = calculateEqSampleSizeContinuous(10, 5, 0.025, 0.8, 1, 0)
    const r = calculateMDE_EqContinuous(f.n1, 10, 0.025, 0.8, 1, 0)
    expect(r.converged).toBe(true)
    expectContClose(r.deltaMin, 5)
    expect(r.mde).toBe(r.deltaMin)
  })

  it('回代闭环②(非对称 meanDiff=3): σ=10 delta=8 → deltaMin≈8', () => {
    const f = calculateEqSampleSizeContinuous(10, 8, 0.025, 0.8, 1, 3)
    const r = calculateMDE_EqContinuous(f.n1, 10, 0.025, 0.8, 1, 3)
    expect(r.converged).toBe(true)
    expectContClose(r.deltaMin, 8)
  })

  it('边界: n1=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_EqContinuous(0, 10, 0.025, 0.8, 1, 0)
    expect(r.mde).toBeNaN()
    expect(r.deltaMin).toBeNaN()
    expect(r.converged).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 单组试验 - 率终点
// 反推变量: p1；闭环 calculateOneSampleSize(p0,p1,α,power)=n
// 函数签名: calculateMDE_OneSample(n, p0, alpha, power)
// ══════════════════════════════════════════════════════════════
describe('calculateMDE_OneSample - 单组率终点', () => {
  it('回代闭环①: p0=0.5 p1=0.6 → p1Min≈0.6', () => {
    const f = calculateOneSampleSize(0.5, 0.6, 0.025, 0.8)
    const r = calculateMDE_OneSample(f.n1, 0.5, 0.025, 0.8)
    expect(r.converged).toBe(true)
    expectPropClose(r.p1Min, 0.6)
    expectPropClose(r.mde, 0.1)
  })

  it('回代闭环②: p0=0.3 p1=0.45 → p1Min≈0.45', () => {
    const f = calculateOneSampleSize(0.3, 0.45, 0.05, 0.9)
    const r = calculateMDE_OneSample(f.n1, 0.3, 0.05, 0.9)
    expect(r.converged).toBe(true)
    expectPropClose(r.p1Min, 0.45)
  })

  it('边界: n=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_OneSample(0, 0.5, 0.025, 0.8)
    expect(r.mde).toBeNaN()
    expect(r.p1Min).toBeNaN()
    expect(r.converged).toBe(false)
  })

  it('边界: n=1（极小样本）→ p1Min 触及上界≈0.999（现状锁定）', () => {
    const r = calculateMDE_OneSample(1, 0.5, 0.025, 0.8)
    expect(r.p1Min).toBeGreaterThan(0.99)
    expect(r.p1Min).toBeLessThanOrEqual(0.999)
  })
})

// ══════════════════════════════════════════════════════════════
// 单组试验 - 连续终点（代数反解）
// 闭环 calculateOneSampleSizeContinuous(μ0,μ1,σ,α,power)=n
// 反推 mde ≈ |μ1-μ0|
// 函数签名: calculateMDE_OneSampleContinuous(n, sigma, alpha, power)
// ══════════════════════════════════════════════════════════════
describe('calculateMDE_OneSampleContinuous - 单组连续终点', () => {
  it('回代闭环①: μ0=50 μ1=55 σ=10 → mde≈5', () => {
    const f = calculateOneSampleSizeContinuous(50, 55, 10, 0.025, 0.8)
    const r = calculateMDE_OneSampleContinuous(f.n1, 10, 0.025, 0.8)
    expect(r.converged).toBe(true)
    expectContClose(r.mde, 5)
  })

  it('回代闭环②: μ0=0 μ1=3 σ=8 → mde≈3', () => {
    const f = calculateOneSampleSizeContinuous(0, 3, 8, 0.025, 0.8)
    const r = calculateMDE_OneSampleContinuous(f.n1, 8, 0.025, 0.8)
    expect(r.converged).toBe(true)
    expectContClose(r.mde, 3)
  })

  it('边界: n=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_OneSampleContinuous(0, 10, 0.025, 0.8)
    expect(r.mde).toBeNaN()
    expect(r.converged).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 配对设计 - 率终点 (McNemar)
// 反推变量: p01（NI/Sup）或 delta（Eq）
// 闭环 calculatePairedSampleSize(p10,p01,delta,α,power,studyType)=n
// 函数签名: calculateMDE_Paired(n, p10, delta, alpha, power, studyType)
// ══════════════════════════════════════════════════════════════
describe('calculateMDE_Paired - 配对率终点 (McNemar)', () => {
  it('回代闭环①(非劣效): p10=0.15 p01=0.30 delta=0.15 → p01Min≈0.30', () => {
    const f = calculatePairedSampleSize(0.15, 0.3, 0.15, 0.025, 0.8, 'non-inferiority')
    const r = calculateMDE_Paired(f.n, 0.15, 0.15, 0.025, 0.8, 'non-inferiority')
    expect(r.converged).toBe(true)
    // 配对 NI 回代偏差较大（实测~0.004），仍在 P_TOL=0.01 内
    expectPropClose(r.p01Min, 0.3)
  })

  it('回代闭环②(优效): p10=0.10 p01=0.25 → p01Min≈0.25', () => {
    const f = calculatePairedSampleSize(0.1, 0.25, 0, 0.025, 0.8, 'superiority')
    const r = calculateMDE_Paired(f.n, 0.1, 0, 0.025, 0.8, 'superiority')
    expect(r.converged).toBe(true)
    expectPropClose(r.p01Min, 0.25)
  })

  it('回代闭环③(等效): p10=0.15 delta=0.1 → deltaMin≈0.1', () => {
    // 等效分支以 p01=p10（diff=0）搜索 delta
    const f = calculatePairedSampleSize(0.15, 0.15, 0.1, 0.025, 0.8, 'equivalence')
    const r = calculateMDE_Paired(f.n, 0.15, 0.1, 0.025, 0.8, 'equivalence')
    expect(r.converged).toBe(true)
    expectPropClose(r.deltaMin, 0.1)
  })

  it('边界: n=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_Paired(0, 0.15, 0.15, 0.025, 0.8, 'non-inferiority')
    expect(r.mde).toBeNaN()
    expect(r.p01Min).toBeNaN()
    expect(r.converged).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 配对设计 - 连续终点（代数反解）
// 闭环 calculatePairedSampleSizeContinuous(σd,mean_diff,delta,α,power,studyType)=n
// 函数签名: calculateMDE_PairedContinuous(n, sigma_diff, delta, alpha, power, studyType)
// ══════════════════════════════════════════════════════════════
describe('calculateMDE_PairedContinuous - 配对连续终点', () => {
  it('回代闭环①(非劣效): σd=10 mean_diff=2 delta=3 → mde≈2', () => {
    const f = calculatePairedSampleSizeContinuous(10, 2, 3, 0.025, 0.8, 'non-inferiority')
    const r = calculateMDE_PairedContinuous(f.n, 10, 3, 0.025, 0.8, 'non-inferiority')
    expect(r.converged).toBe(true)
    expectContClose(r.mde, 2)
  })

  it('回代闭环②(优效): σd=10 mean_diff=5 → mde≈5', () => {
    const f = calculatePairedSampleSizeContinuous(10, 5, 0, 0.025, 0.8, 'superiority')
    const r = calculateMDE_PairedContinuous(f.n, 10, 0, 0.025, 0.8, 'superiority')
    expect(r.converged).toBe(true)
    expectContClose(r.mde, 5)
  })

  it('回代闭环③(等效, mean_diff=0): σd=10 delta=4 → deltaMin≈4', () => {
    const f = calculatePairedSampleSizeContinuous(10, 0, 4, 0.025, 0.8, 'equivalence')
    const r = calculateMDE_PairedContinuous(f.n, 10, 4, 0.025, 0.8, 'equivalence')
    expect(r.converged).toBe(true)
    expectContClose(r.deltaMin, 4)
  })

  it('边界: n=0 → NaN（现状锁定）', () => {
    const r = calculateMDE_PairedContinuous(0, 10, 3, 0.025, 0.8, 'non-inferiority')
    expect(r.mde).toBeNaN()
    expect(r.converged).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 统一入口 calculateMDE —— 验证路由分派正确
// 分派结果应与直接调用对应 MDE 函数完全一致
// ══════════════════════════════════════════════════════════════
describe('calculateMDE - 统一入口路由', () => {
  it('two-group / non-inferiority / proportion 路由 → calculateMDE_NI', () => {
    const viaEntry = calculateMDE({
      designType: 'two-group',
      studyType: 'non-inferiority',
      endpointType: 'proportion',
      n1: 300, p1: 0.7, delta: 0.1, alpha: 0.025, power: 0.8, ratio: 1
    })
    const direct = calculateMDE_NI(300, 0.7, 0.1, 0.025, 0.8, 1)
    expect(viaEntry.mde).toBe(direct.mde)
    expect(viaEntry.p2Min).toBe(direct.p2Min)
  })

  it('one-sample / mean 路由 → calculateMDE_OneSampleContinuous', () => {
    const viaEntry = calculateMDE({
      designType: 'one-sample',
      studyType: 'superiority',
      endpointType: 'mean',
      n1: 50, sigma: 10, alpha: 0.025, power: 0.8
    })
    const direct = calculateMDE_OneSampleContinuous(50, 10, 0.025, 0.8)
    expect(viaEntry.mde).toBe(direct.mde)
  })

  it('paired / proportion 路由 → calculateMDE_Paired', () => {
    const viaEntry = calculateMDE({
      designType: 'paired',
      studyType: 'non-inferiority',
      endpointType: 'proportion',
      n1: 100, p10: 0.15, delta: 0.15, alpha: 0.025, power: 0.8
    })
    const direct = calculateMDE_Paired(100, 0.15, 0.15, 0.025, 0.8, 'non-inferiority')
    expect(viaEntry.mde).toBe(direct.mde)
    expect(viaEntry.p01Min).toBe(direct.p01Min)
  })

  it('未知设计类型 → mde NaN（现状锁定）', () => {
    const r = calculateMDE({ designType: 'xxx' })
    expect(r.mde).toBeNaN()
    expect(r.converged).toBe(false)
  })
})
