/**
 * @file two-group.test.js
 * @description 两组比较「结果验证」回归测试 —— 锁定现状 (characterization / golden-master)
 *
 * ⚠️ 本文件是"锁定现状"回归测试，非"锁定正确值"：
 *   每个数值断言的期望值 = 当前实现 (src/result-validation/two-group.js) 的实际输出，
 *   用途是为后续 bug 修复提供可审查的 diff —— 修复时相关断言会从"锁定错误值"翻到"锁定正确值"。
 *   期望值由临时脚本跑实现取得后固化，勿手工"修正"为教科书理论值。
 *
 * 已知疑似 bug（本文件按现状锁定，⛔ 不在此修，标注 CTS-03 待修）：
 *   1. calculateFMResult 的置信区间用 Wald SE（观测比例）而非 FM score 反演 ——
 *      表现为 method='fm' 的 CI 与 method='wald' 完全一致（仅 p_value/z_score 因用 RMLE SE 而不同）。
 *   2. calculateEqResult 的 method='fm' 分支未调用 calculateFMResult，CI 与 p 值均为纯 Wald ——
 *      表现为 method='fm' 的输出与 method='wald' 完全一致。
 *
 * 参数复用来源（增强可解释性）:
 *   - tests/sample-size/two-group.test.js 中的婴儿败血症 / 疼痛评分 / ICORG 05-03 / Julious 场景
 *
 * 导出函数（6 个）:
 *   calculateNIResult / calculateNIResultContinuous / calculateSupResult /
 *   calculateSupResultContinuous / calculateEqResult / calculateEqResultContinuous
 *
 * 注：内部辅助 (calculateFMResult / calculateMNResult / calculateMNConstrainedMLE /
 *   findMNCIBound / calculateFMRMLE) 非导出，经 method 分支 (fm/mn) 间接锁定。
 */

import { describe, it, expect } from 'vitest'
import {
  calculateNIResult,
  calculateNIResultContinuous,
  calculateSupResult,
  calculateSupResultContinuous,
  calculateEqResult,
  calculateEqResultContinuous
} from '../../src/result-validation/two-group'
import { normalInverse } from '../../src/core/normal-distribution'

// ========================================================
// calculateNIResult —— 非劣效试验（率终点）
// 签名: (n1, s1, n2, s2, delta, alpha, useContinuity, method)
//   s1/s2 = 成功数（非比例）；method ∈ wald|fm|wilson|mn
// ========================================================
describe('calculateNIResult (非劣效-率)', () => {
  // 典型器械 NI：对照 85%(170/200)，试验 88%(176/200)，界值 delta=0.10，alpha=0.025
  it('典型场景 · Wald', () => {
    const r = calculateNIResult(200, 170, 200, 176, 0.1, 0.025, false, 'wald')
    expect(r.p1).toBeCloseTo(0.85, 10)
    expect(r.p2).toBeCloseTo(0.88, 10)
    expect(r.diff).toBeCloseTo(0.03, 6)
    expect(r.ci_lower).toBeCloseTo(-0.03691203376626771, 6)
    expect(r.ci_upper).toBeCloseTo(0.09691203376626777, 6)
    expect(r.p_value).toBeCloseTo(0.00007009573932503788, 8)
    expect(r.testStatistic).toBeCloseTo(3.8079147180858066, 5)
    expect(r.isNonInferior).toBe(true)
    expect(r.testStatisticType).toBe('Z')
    expect(r.df).toBeNull()
  })

  // CTS-03 已修：FM score 反演值 —— FM CI 由 score 统计量二分反演（RMLE 方差，无 N/(N-1) 校正），
  // 不再等于 Wald CI；与 MN CI 接近但略窄
  it('FM 分支 · CI 为 FM score 反演值（CTS-03 已修）', () => {
    const fm = calculateNIResult(200, 170, 200, 176, 0.1, 0.025, false, 'fm')
    const wald = calculateNIResult(200, 170, 200, 176, 0.1, 0.025, false, 'wald')
    // 已修：FM CI 不再等于 Wald CI
    expect(fm.ci_lower).not.toBeCloseTo(wald.ci_lower, 4)
    expect(fm.ci_upper).not.toBeCloseTo(wald.ci_upper, 4)
    expect(fm.ci_lower).toBeCloseTo(-0.0376753222942352, 6)
    expect(fm.ci_upper).toBeCloseTo(0.0982986453175545, 6)
    // p_value/z_score 用 RMLE SE（FM score，修复前后一致）
    expect(fm.p_value).toBeCloseTo(0.00013177960245458475, 8)
    expect(fm.testStatistic).toBeCloseTo(3.6487770411045464, 5)
    expect(fm.isNonInferior).toBe(true)
  })

  it('Wilson 分支 · Newcombe CI', () => {
    const r = calculateNIResult(200, 170, 200, 176, 0.1, 0.025, false, 'wilson')
    expect(r.ci_lower).toBeCloseTo(-0.03765402815323077, 6)
    expect(r.ci_upper).toBeCloseTo(0.0977331371246284, 6)
    // Wilson 的 p 值仍用 Wald，与 Wald 分支一致
    expect(r.p_value).toBeCloseTo(0.00007009573932503788, 8)
    expect(r.testStatistic).toBeCloseTo(3.8079147180858066, 5)
  })

  it('MN 分支 · Miettinen-Nurminen score CI', () => {
    const r = calculateNIResult(200, 170, 200, 176, 0.1, 0.025, false, 'mn')
    expect(r.ci_lower).toBeCloseTo(-0.03776237487792966, 6)
    expect(r.ci_upper).toBeCloseTo(0.09838699430227282, 6)
    expect(r.p_value).toBeCloseTo(0.00013413958834196382, 8)
    expect(r.testStatistic).toBeCloseTo(3.6442132156241445, 5)
    expect(r.isNonInferior).toBe(true)
  })

  it('连续性校正 · (s+0.5)/(n+1)', () => {
    const r = calculateNIResult(200, 170, 200, 176, 0.1, 0.025, true, 'wald')
    expect(r.p1).toBeCloseTo(0.8482587064676617, 8)
    expect(r.p2).toBeCloseTo(0.8781094527363185, 8)
    expect(r.diff).toBeCloseTo(0.029850746268656803, 8)
    expect(r.ci_lower).toBeCloseTo(-0.03744043142992061, 6)
    expect(r.ci_upper).toBeCloseTo(0.09714192396723421, 6)
    expect(r.testStatistic).toBeCloseTo(3.782112231671924, 5)
  })

  it('边界 · 零效应差 (p1=p2=0.5)', () => {
    const r = calculateNIResult(100, 50, 100, 50, 0.1, 0.025, false, 'wald')
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBeCloseTo(-0.1385903825467006, 6)
    expect(r.ci_upper).toBeCloseTo(0.1385903825467006, 6)
    expect(r.p_value).toBeCloseTo(0.07864965254766576, 6)
    expect(r.testStatistic).toBeCloseTo(1.4142135623730951, 6)
    expect(r.isNonInferior).toBe(false)
  })

  // 极端比例 p1=0, p2=1 → se=0 → 触发全零 fallback（现状锁定）
  it('边界 · 极端比例 p1=0/p2=1 触发全零 fallback', () => {
    const r = calculateNIResult(100, 0, 100, 100, 0.1, 0.025, false, 'wald')
    expect(r.p1).toBe(0)
    expect(r.p2).toBe(0)
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBe(0)
    expect(r.ci_upper).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.testStatistic).toBe(0)
    expect(r.isNonInferior).toBe(false)
    // fallback 对象不含检验统计量元数据
    expect(r.testStatisticType).toBeUndefined()
  })

  // n1=0 → safeNumber(0,1) 保留 0（非 fallback），p1=0，得到反常大统计量（现状锁定）
  it('边界 · n1=0 现状锁定（反常输出）', () => {
    const r = calculateNIResult(0, 0, 100, 50, 0.1, 0.025, false, 'wald')
    expect(r.p1).toBe(0)
    expect(r.p2).toBe(0.5)
    expect(r.diff).toBe(0.5)
    expect(r.ci_lower).toBeCloseTo(0.4020018006939903, 6)
    expect(r.ci_upper).toBeCloseTo(0.5979981993060097, 6)
    expect(r.p_value).toBe(0)
    expect(r.testStatistic).toBeCloseTo(11.999999999999998, 5)
    expect(r.isNonInferior).toBe(true)
  })

  it('边界 · alpha=0 → z 不可算 → 全零 fallback', () => {
    const r = calculateNIResult(200, 170, 200, 176, 0.1, 0, false, 'wald')
    expect(r.ci_lower).toBe(0)
    expect(r.ci_upper).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
  })
})

// ========================================================
// calculateNIResultContinuous —— 非劣效试验（连续终点，t 检验）
// 签名: (n1, mean1, sd1, n2, mean2, sd2, delta, alpha)
// ========================================================
describe('calculateNIResultContinuous (非劣效-连续)', () => {
  it('典型场景 · n=100/100 均值 50/52 sd 10/11 delta=5 alpha=0.025', () => {
    const r = calculateNIResultContinuous(100, 50, 10, 100, 52, 11, 5, 0.025)
    expect(r.diff).toBe(2)
    expect(r.ci_lower).toBeCloseTo(-0.9136959359931232, 6)
    expect(r.ci_upper).toBeCloseTo(4.913695935993124, 6)
    expect(r.p_value).toBeCloseTo(0.0000012479090105710355, 9)
    expect(r.testStatistic).toBeCloseTo(4.708709557974187, 5)
    expect(r.isNonInferior).toBe(true)
    expect(r.testStatisticType).toBe('t')
    expect(r.df).toBe(198)
  })

  // 复用 ICORG 05-03 参数：sigma=4，NI 界值 1.5（观测均值差 0）
  it('文献复用 · ICORG 05-03 (sigma=4, delta=1.5)', () => {
    const r = calculateNIResultContinuous(112, 0, 4, 112, 0, 4, 1.5, 0.025)
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBeCloseTo(-1.047644818068218, 6)
    expect(r.ci_upper).toBeCloseTo(1.047644818068218, 6)
    expect(r.p_value).toBeCloseTo(0.0025062044204285927, 8)
    expect(r.testStatistic).toBeCloseTo(2.806243040080456, 5)
    expect(r.df).toBe(222)
  })

  it('边界 · 零效应差（均值相等）', () => {
    const r = calculateNIResultContinuous(100, 50, 10, 100, 50, 10, 5, 0.025)
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBeCloseTo(-2.7718076509340124, 6)
    expect(r.ci_upper).toBeCloseTo(2.7718076509340124, 6)
    expect(r.testStatistic).toBeCloseTo(3.5355339059327373, 5)
    expect(r.isNonInferior).toBe(true)
  })

  it('边界 · sd=0 → se=0 → 全零 fallback（含 mean 归零）', () => {
    const r = calculateNIResultContinuous(100, 50, 0, 100, 52, 0, 5, 0.025)
    expect(r.mean1).toBe(0)
    expect(r.mean2).toBe(0)
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBe(0)
    expect(r.ci_upper).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
  })

  // alpha=0 走第二个 fallback：保留原始 mean，但 CI 归零
  it('边界 · alpha=0 → 保留 mean 的 fallback', () => {
    const r = calculateNIResultContinuous(100, 50, 10, 100, 52, 11, 5, 0)
    expect(r.mean1).toBe(50)
    expect(r.mean2).toBe(52)
    expect(r.diff).toBe(2)
    expect(r.ci_lower).toBe(0)
    expect(r.ci_upper).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
  })
})

// ========================================================
// calculateSupResult —— 优效试验（率终点）
// 签名: (n1, s1, n2, s2, alpha, useContinuity, method)
// 判定: CI 下限 > 0
// ========================================================
describe('calculateSupResult (优效-率)', () => {
  it('典型场景 · Wald（对照 50%，试验 65%）', () => {
    const r = calculateSupResult(200, 100, 200, 130, 0.025, false, 'wald')
    expect(r.p1).toBeCloseTo(0.5, 10)
    expect(r.p2).toBeCloseTo(0.65, 10)
    expect(r.diff).toBeCloseTo(0.15, 6)
    expect(r.ci_lower).toBeCloseTo(0.05423214031213036, 6)
    expect(r.ci_upper).toBeCloseTo(0.24576785968786968, 6)
    expect(r.p_value).toBeCloseTo(0.0010708390508749055, 7)
    expect(r.testStatistic).toBeCloseTo(3.069867060579906, 5)
    expect(r.isNonInferior).toBe(true)
    expect(r.testStatisticType).toBe('Z')
    expect(r.df).toBeNull()
  })

  // CTS-03 已修：FM score 反演值 —— 优效 FM CI（delta0=0）由 score 反演，不再退化为 Wald CI
  it('FM 分支 · CI 为 FM score 反演值（CTS-03 已修）', () => {
    const fm = calculateSupResult(200, 100, 200, 130, 0.025, false, 'fm')
    const wald = calculateSupResult(200, 100, 200, 130, 0.025, false, 'wald')
    // 已修：FM CI 不再等于 Wald CI
    expect(fm.ci_lower).not.toBeCloseTo(wald.ci_lower, 4)
    expect(fm.ci_upper).not.toBeCloseTo(wald.ci_upper, 4)
    expect(fm.ci_lower).toBeCloseTo(0.053275325894355796, 6)
    expect(fm.ci_upper).toBeCloseTo(0.24399916231632235, 6)
    // p 值用 RMLE SE，与 Wald 略不同（修复前后一致）
    expect(fm.p_value).toBeCloseTo(0.0012054203347062753, 7)
    expect(fm.testStatistic).toBeCloseTo(3.034330424545042, 5)
  })

  it('Wilson 分支 · Newcombe CI', () => {
    const r = calculateSupResult(200, 100, 200, 130, 0.025, false, 'wilson')
    expect(r.ci_lower).toBeCloseTo(0.05312299757970029, 6)
    expect(r.ci_upper).toBeCloseTo(0.2429736322313167, 6)
    expect(r.p_value).toBeCloseTo(0.0010708390508749055, 7)
  })

  it('MN 分支 · score CI', () => {
    const r = calculateSupResult(200, 100, 200, 130, 0.025, false, 'mn')
    expect(r.ci_lower).toBeCloseTo(0.053153523802757285, 6)
    expect(r.ci_upper).toBeCloseTo(0.24411418437957766, 6)
    expect(r.p_value).toBeCloseTo(0.0012206730706205704, 7)
    expect(r.testStatistic).toBeCloseTo(3.0305351379758654, 5)
  })

  // 复用婴儿败血症场景：p1=40%(30/75)，p2=60%(45/75)，alpha=0.05
  it('文献复用 · 婴儿败血症 (p1=40%, p2=60%, alpha=0.05)', () => {
    const r = calculateSupResult(75, 30, 75, 45, 0.05, false, 'wald')
    expect(r.p1).toBeCloseTo(0.4, 10)
    expect(r.p2).toBeCloseTo(0.6, 10)
    expect(r.diff).toBeCloseTo(0.2, 6)
    expect(r.ci_lower).toBeCloseTo(0.06841170998930404, 6)
    expect(r.ci_upper).toBeCloseTo(0.3315882900106959, 6)
    expect(r.p_value).toBeCloseTo(0.006209679853494854, 7)
    expect(r.testStatistic).toBeCloseTo(2.4999999999999996, 5)
    expect(r.isNonInferior).toBe(true)
  })

  it('边界 · 零效应差 (p1=p2=0.5)', () => {
    const r = calculateSupResult(200, 100, 200, 100, 0.025, false, 'wald')
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBeCloseTo(-0.09799819930600975, 6)
    expect(r.ci_upper).toBeCloseTo(0.09799819930600975, 6)
    expect(r.p_value).toBeCloseTo(0.49999999947519136, 6)
    expect(r.testStatistic).toBe(0)
    expect(r.isNonInferior).toBe(false)
  })

  it('边界 · 极端比例 p1=0/p2=1 触发全零 fallback', () => {
    const r = calculateSupResult(50, 0, 50, 50, 0.025, false, 'wald')
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBe(0)
    expect(r.ci_upper).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
    expect(r.testStatisticType).toBeUndefined()
  })

  it('边界 · n1=0 现状锁定（反常输出）', () => {
    const r = calculateSupResult(0, 0, 200, 130, 0.025, false, 'wald')
    expect(r.p1).toBe(0)
    expect(r.p2).toBe(0.65)
    expect(r.diff).toBe(0.65)
    expect(r.ci_lower).toBeCloseTo(0.5838966005746657, 6)
    expect(r.ci_upper).toBeCloseTo(0.7161033994253343, 6)
    expect(r.p_value).toBe(0)
    expect(r.testStatistic).toBeCloseTo(19.272482233188633, 5)
    expect(r.isNonInferior).toBe(true)
  })

  it('边界 · alpha=0 → 全零 fallback', () => {
    const r = calculateSupResult(200, 100, 200, 130, 0, false, 'wald')
    expect(r.ci_lower).toBe(0)
    expect(r.ci_upper).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
  })
})

// ========================================================
// calculateSupResultContinuous —— 优效试验（连续终点）
// 签名: (n1, mean1, sd1, n2, mean2, sd2, alpha)
// ========================================================
describe('calculateSupResultContinuous (优效-连续)', () => {
  it('典型场景 · n=60/60 均值 10/15 sd 10/10 alpha=0.025', () => {
    const r = calculateSupResultContinuous(60, 10, 10, 60, 15, 10, 0.025)
    expect(r.diff).toBe(5)
    expect(r.ci_lower).toBeCloseTo(1.4216117096807563, 6)
    expect(r.ci_upper).toBeCloseTo(8.578388290319243, 6)
    expect(r.p_value).toBeCloseTo(0.0030850037213199233, 7)
    expect(r.testStatistic).toBeCloseTo(2.7386127875258306, 5)
    expect(r.isNonInferior).toBe(true)
    expect(r.testStatisticType).toBe('t')
    expect(r.df).toBe(118)
  })

  // 复用疼痛评分场景：sigma=4，均值差 2，alpha=0.05
  it('文献复用 · 疼痛评分 (sigma=4, meanDiff=2, alpha=0.05)', () => {
    const r = calculateSupResultContinuous(50, 0, 4, 50, 2, 4, 0.05)
    expect(r.diff).toBe(2)
    expect(r.ci_lower).toBeCloseTo(0.6841170998930408, 6)
    expect(r.ci_upper).toBeCloseTo(3.315882900106959, 6)
    expect(r.p_value).toBeCloseTo(0.006209679853494854, 7)
    expect(r.testStatistic).toBeCloseTo(2.5, 5)
    expect(r.df).toBe(98)
  })

  it('边界 · 零效应差（均值相等）', () => {
    const r = calculateSupResultContinuous(60, 10, 10, 60, 10, 10, 0.025)
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBeCloseTo(-3.5783882903192437, 6)
    expect(r.ci_upper).toBeCloseTo(3.5783882903192437, 6)
    expect(r.p_value).toBeCloseTo(0.49999999947519136, 6)
    expect(r.testStatistic).toBe(0)
    expect(r.isNonInferior).toBe(false)
  })

  it('边界 · sd=0 → 全零 fallback', () => {
    const r = calculateSupResultContinuous(60, 10, 0, 60, 15, 0, 0.025)
    expect(r.mean1).toBe(0)
    expect(r.mean2).toBe(0)
    expect(r.diff).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
  })

  it('边界 · alpha=0 → 保留 mean 的 fallback', () => {
    const r = calculateSupResultContinuous(60, 10, 10, 60, 15, 10, 0)
    expect(r.mean1).toBe(10)
    expect(r.mean2).toBe(15)
    expect(r.diff).toBe(5)
    expect(r.ci_lower).toBe(0)
    expect(r.ci_upper).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
  })
})

// ========================================================
// calculateEqResult —— 等效试验（率终点，TOST）
// 签名: (n1, s1, n2, s2, delta, alpha, useContinuity, method)
// 判定: -δ < CI下限 且 CI上限 < δ；z_alpha 用 Φ⁻¹(1−α)（单侧 α，P3-1 修）
// ========================================================
describe('calculateEqResult (等效-率)', () => {
  it('典型场景 · Wald（对照 50%，试验 52%，delta=0.15，alpha=0.05）', () => {
    const r = calculateEqResult(200, 100, 200, 104, 0.15, 0.05, false, 'wald')
    expect(r.p1).toBeCloseTo(0.5, 10)
    expect(r.p2).toBeCloseTo(0.52, 10)
    expect(r.diff).toBeCloseTo(0.02, 6)
    expect(r.ci_lower).toBeCloseTo(-0.06220977760213468, 6)
    expect(r.ci_upper).toBeCloseTo(0.10220977760213472, 6)
    expect(r.p_value).toBeCloseTo(0.0046471062985921074, 7)
    expect(r.testStatistic).toBeCloseTo(0.400160096064045, 6)
    expect(r.isNonInferior).toBe(true)
    expect(r.testStatisticType).toBe('Z')
    expect(r.testStatisticLabel).toBe('Z₁ = 3.40, Z₂ = -2.60')
  })

  // CTS-03 已修：FM score 反演值 —— method='fm' 分支已接通 calculateFMResult，
  // CI 由 FM score 反演，TOST p 值/统计量用 FM RMLE 标准误，整体不再等于 method='wald'
  it('FM 分支 · 接通 FM 计算路径（CTS-03 已修）', () => {
    const fm = calculateEqResult(200, 100, 200, 104, 0.15, 0.05, false, 'fm')
    const wald = calculateEqResult(200, 100, 200, 104, 0.15, 0.05, false, 'wald')
    // 已修：FM CI/统计量不再等于 Wald
    expect(fm.ci_lower).not.toBeCloseTo(wald.ci_lower, 4)
    expect(fm.ci_upper).not.toBeCloseTo(wald.ci_upper, 4)
    // 固化 FM score 反演具体值
    expect(fm.ci_lower).toBeCloseTo(-0.06206796646118162, 6)
    expect(fm.ci_upper).toBeCloseTo(0.10179944008588793, 6)
    expect(fm.p_value).toBeCloseTo(0.004654161382007027, 7)
    expect(fm.testStatistic).toBeCloseTo(0.40008002400800313, 6)
    expect(fm.isNonInferior).toBe(true)
  })

  it('Wilson 分支 · Newcombe CI（p 值仍为 TOST-Wald）', () => {
    const r = calculateEqResult(200, 100, 200, 104, 0.15, 0.05, false, 'wilson')
    expect(r.ci_lower).toBeCloseTo(-0.06184863798259084, 6)
    expect(r.ci_upper).toBeCloseTo(0.1014712734175539, 6)
    expect(r.p_value).toBeCloseTo(0.0046471062985921074, 7)
  })

  it('MN 分支 · score CI', () => {
    const r = calculateEqResult(200, 100, 200, 104, 0.15, 0.05, false, 'mn')
    expect(r.ci_lower).toBeCloseTo(-0.062170218229293805, 6)
    expect(r.ci_upper).toBeCloseTo(0.10190102130174639, 6)
    expect(r.p_value).toBeCloseTo(0.004698469259276861, 7)
    expect(r.testStatistic).toBeCloseTo(0.39957961102415984, 6)
  })

  it('边界 · 零效应差 (p1=p2=0.5) → 等效成立', () => {
    const r = calculateEqResult(200, 100, 200, 100, 0.15, 0.05, false, 'wald')
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBeCloseTo(-0.08224268125668495, 6)
    expect(r.ci_upper).toBeCloseTo(0.08224268125668495, 6)
    expect(r.p_value).toBeCloseTo(0.0013499672222352377, 7)
    expect(r.testStatistic).toBe(0)
    expect(r.isNonInferior).toBe(true)
  })

  it('边界 · 极端比例 p1=0/p2=1 触发全零 fallback', () => {
    const r = calculateEqResult(50, 0, 50, 50, 0.15, 0.05, false, 'wald')
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBe(0)
    expect(r.ci_upper).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
    expect(r.testStatisticType).toBeUndefined()
  })

  it('边界 · n1=0 现状锁定（反常输出）', () => {
    const r = calculateEqResult(0, 0, 200, 104, 0.15, 0.05, false, 'wald')
    expect(r.p1).toBe(0)
    expect(r.p2).toBe(0.52)
    expect(r.diff).toBe(0.52)
    expect(r.ci_lower).toBeCloseTo(0.4618921844908268, 6)
    expect(r.ci_upper).toBeCloseTo(0.5781078155091732, 6)
    expect(r.p_value).toBe(1)
    expect(r.testStatistic).toBeCloseTo(14.719601443879743, 5)
    expect(r.isNonInferior).toBe(false)
  })

  it('边界 · alpha=0 → 全零 fallback', () => {
    const r = calculateEqResult(200, 100, 200, 104, 0.15, 0, false, 'wald')
    expect(r.ci_lower).toBe(0)
    expect(r.ci_upper).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
  })
})

// ========================================================
// calculateEqResultContinuous —— 等效试验（连续终点，TOST）
// 签名: (n1, mean1, sd1, n2, mean2, sd2, delta, alpha)
// ========================================================
describe('calculateEqResultContinuous (等效-连续)', () => {
  it('典型场景 · n=50/50 均值 100/101 sd 8/8 delta=5 alpha=0.05', () => {
    const r = calculateEqResultContinuous(50, 100, 8, 50, 101, 8, 5, 0.05)
    expect(r.diff).toBe(1)
    expect(r.ci_lower).toBeCloseTo(-1.6317658002139184, 6)
    expect(r.ci_upper).toBeCloseTo(3.6317658002139184, 6)
    expect(r.p_value).toBeCloseTo(0.006209679853494854, 7)
    expect(r.testStatistic).toBeCloseTo(0.625, 6)
    expect(r.isNonInferior).toBe(true)
    expect(r.testStatisticType).toBe('t')
    expect(r.df).toBe(98)
    expect(r.testStatisticLabel).toBe('t₁(98) = 3.75, t₂(98) = -2.50')
  })

  // 复用 Julious 等效场景：sigma=8，界值 5，均值差 0，alpha=0.05
  it('文献复用 · Julious (sigma=8, delta=5)', () => {
    const r = calculateEqResultContinuous(44, 0, 8, 44, 0, 8, 5, 0.05)
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBeCloseTo(-2.8054717694290185, 6)
    expect(r.ci_upper).toBeCloseTo(2.8054717694290185, 6)
    expect(r.p_value).toBeCloseTo(0.00168666134942419, 7)
    expect(r.testStatistic).toBe(0)
    expect(r.df).toBe(86)
  })

  it('边界 · 零效应差（均值相等）→ 等效成立', () => {
    const r = calculateEqResultContinuous(50, 100, 8, 50, 100, 8, 5, 0.05)
    expect(r.diff).toBe(0)
    expect(r.ci_lower).toBeCloseTo(-2.6317658002139184, 6)
    expect(r.ci_upper).toBeCloseTo(2.6317658002139184, 6)
    expect(r.p_value).toBeCloseTo(0.0008890925719067244, 8)
    expect(r.testStatistic).toBe(0)
    expect(r.isNonInferior).toBe(true)
  })

  it('边界 · sd=0 → 全零 fallback', () => {
    const r = calculateEqResultContinuous(50, 100, 0, 50, 101, 0, 5, 0.05)
    expect(r.mean1).toBe(0)
    expect(r.mean2).toBe(0)
    expect(r.diff).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
  })

  it('边界 · alpha=0 → 保留 mean 的 fallback', () => {
    const r = calculateEqResultContinuous(50, 100, 8, 50, 101, 8, 5, 0)
    expect(r.mean1).toBe(100)
    expect(r.mean2).toBe(101)
    expect(r.diff).toBe(1)
    expect(r.ci_lower).toBe(0)
    expect(r.ci_upper).toBe(0)
    expect(r.p_value).toBe(1)
    expect(r.isNonInferior).toBe(false)
  })
})

// ========================================================
// 等效结果验证 alpha 单侧语义锁定（P3-1）
//   calculateEqResult / calculateEqResultContinuous 使用单侧 α：z = Φ⁻¹(1−α)，
//   与样本量计算 calculateEqSampleSize* 及本文件 NI/Sup 结果验证一致（回归防护）。
//   alpha=0.025（单侧）→ z≈1.95996 → (1−2α)=95% CI；修复前误用 Φ⁻¹(1−α/2)≈2.24。
// @see docs/test-reports/static-analysis/2026-01-30-comparison-cont-eq.md 问题 P3-1
// ========================================================
describe('等效结果验证 - alpha 单侧语义锁定（P3-1）', () => {
  // TOST 单侧 α 约定：alpha=0.025 → z=Φ⁻¹(1−α)≈1.96，对应 (1−2α)=95% CI
  const ALPHA = 0.025
  const Z_SINGLE_SIDED = normalInverse(1 - ALPHA) // ≈ 1.95996（正确，单侧 α 约定）
  const Z_BUGGY_HALVED = normalInverse(1 - ALPHA / 2) // ≈ 2.24140（P3-1 修复前的错误值）

  describe('calculateEqResultContinuous（连续终点）', () => {
    // n1=n2=100, sd1=sd2=10, mean 相等 → diff=0
    // pooledVar=100, se=sqrt(100*(1/100+1/100))=sqrt(2)≈1.41421
    const SE = Math.sqrt(2)
    const r = calculateEqResultContinuous(100, 0, 10, 100, 0, 10, 5, ALPHA)

    it('CI 半宽使用单侧 α 的 z=Φ⁻¹(1−α)≈1.96（不再 /2）', () => {
      // 半宽 = z * se；diff=0 故 ci_upper = z*se
      expect(r.ci_upper / SE).toBeCloseTo(Z_SINGLE_SIDED, 4)
    })

    it('回归防护：CI 半宽的 z 不等于修复前的 Φ⁻¹(1−α/2)≈2.24', () => {
      expect(r.ci_upper / SE).not.toBeCloseTo(Z_BUGGY_HALVED, 2)
    })

    it('ci_upper 数值锁定 ≈ 2.7718（1.95996×√2）', () => {
      expect(r.ci_upper).toBeCloseTo(Z_SINGLE_SIDED * SE, 4)
      expect(r.ci_lower).toBeCloseTo(-Z_SINGLE_SIDED * SE, 4)
    })
  })

  describe('calculateEqResult（率终点，Wald）', () => {
    // n1=n2=100, s1=s2=50 → p1=p2=0.5, diff=0
    // se=sqrt(0.5*0.5/100 + 0.5*0.5/100)=sqrt(0.005)
    const SE = Math.sqrt(0.5 * 0.5 / 100 + 0.5 * 0.5 / 100)
    const r = calculateEqResult(100, 50, 100, 50, 0.2, ALPHA, false, 'wald')

    it('CI 半宽使用单侧 α 的 z=Φ⁻¹(1−α)≈1.96（与连续终点一致）', () => {
      expect(r.ci_upper / SE).toBeCloseTo(Z_SINGLE_SIDED, 4)
    })

    it('回归防护：CI 半宽的 z 不等于修复前的 Φ⁻¹(1−α/2)≈2.24', () => {
      expect(r.ci_upper / SE).not.toBeCloseTo(Z_BUGGY_HALVED, 2)
    })
  })
})
