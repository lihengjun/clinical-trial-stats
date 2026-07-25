/**
 * @file two-group.test.js
 * @description 两组比较样本量计算测试
 *
 * 验证数据来源:
 * - Chow SC, Shao J, Wang H, Lokhnygina Y. Sample Size Calculations in Clinical Research. 3rd ed.
 * - Julious SA. Sample Sizes for Clinical Trials. Chapman and Hall/CRC; 2009.
 * - Flight L, Julious SA. Practical guide to sample size calculations. Pharm Stat. 2016;15(1):80-89.
 * - PowerAndSampleSize.com
 */

import { describe, it, expect } from 'vitest'
import {
  calculateNISampleSize,
  calculateNISampleSizeContinuous,
  calculateSupSampleSize,
  calculateSupSampleSizeContinuous,
  calculateEqSampleSize,
  calculateEqSampleSizeContinuous
} from '../../src/sample-size/two-group'

describe('two-group sample size', () => {
  // ========================================================
  // 非劣效试验 - 率终点
  // ========================================================
  describe('Non-Inferiority - Proportion', () => {
    it('应正确计算标准非劣效样本量', () => {
      // 常见参数: p1=70%, p2=70%, delta=10%, alpha=0.025, power=80%, ratio=1
      const result = calculateNISampleSize(0.7, 0.7, 0.1, 0.025, 0.8, 1)

      // 预期每组约 300-350 (实际计算值约 330)
      expect(result.n1).toBeGreaterThan(300)
      expect(result.n1).toBeLessThan(400)
      expect(result.n2).toBe(result.n1) // ratio=1 时两组相等
    })

    it('应正确处理不同分配比例', () => {
      // ratio = 2 (试验组:对照组 = 2:1)
      const result = calculateNISampleSize(0.7, 0.7, 0.1, 0.025, 0.8, 2)

      expect(result.n2).toBe(Math.ceil(result.n1 * 2))
    })

    it('当效应量为零时应返回 NaN', () => {
      // p2 - p1 + delta = 0 时无法计算
      const result = calculateNISampleSize(0.7, 0.6, 0.1, 0.025, 0.8, 1)
      // (0.6 - 0.7) + 0.1 = 0，效应量为零
      expect(result.n1).toBeNaN()
    })

    it('应处理边界参数', () => {
      // alpha = 0 (无法计算 z 值)
      const result1 = calculateNISampleSize(0.7, 0.7, 0.1, 0, 0.8, 1)
      expect(result1.n1).toBeNaN()

      // power = 100% (无法计算 z 值)
      const result2 = calculateNISampleSize(0.7, 0.7, 0.1, 0.025, 1, 1)
      expect(result2.n1).toBeNaN()
    })
  })

  // ========================================================
  // 非劣效试验 - 连续终点
  // ========================================================
  describe('Non-Inferiority - Continuous', () => {
    it('应匹配 ICORG 05-03 放疗试验验证数据', () => {
      // ICORG 05-03: sigma=4, delta=-1.5, alpha=0.025, power=80%
      // 实际计算值约 112
      const result = calculateNISampleSizeContinuous(4, -1.5, 0.025, 0.8, 1, 0)

      expect(result.n1).toBeGreaterThan(100)
      expect(result.n1).toBeLessThan(130)
    })

    it('应正确处理预期均值差', () => {
      // meanDiff > 0 (试验组更好) 应减少样本量
      const result1 = calculateNISampleSizeContinuous(10, -5, 0.025, 0.8, 1, 0)
      const result2 = calculateNISampleSizeContinuous(10, -5, 0.025, 0.8, 1, 2)

      // meanDiff=2 时效应量更大，样本量更小
      expect(result2.n1).toBeLessThan(result1.n1)
    })

    it('当效应量为零时应返回 NaN', () => {
      // meanDiff + |delta| = 0
      const result = calculateNISampleSizeContinuous(10, 5, 0.025, 0.8, 1, -5)
      expect(result.n1).toBeNaN()
    })
  })

  // ========================================================
  // 优效试验 - 率终点
  // ========================================================
  describe('Superiority - Proportion', () => {
    it('应正确计算优效样本量', () => {
      // p1=50%, p2=65%, alpha=0.025, power=80%
      const result = calculateSupSampleSize(0.5, 0.65, 0.025, 0.8, 1)

      // 实际计算值约 167
      expect(result.n1).toBeGreaterThan(150)
      expect(result.n1).toBeLessThan(200)
    })

    it('应匹配婴儿败血症试验验证数据', () => {
      // Perspect Clin Res 2010: p1=40%, p2=60%, alpha=0.05, power=80%
      // 实际计算值约 75
      const result = calculateSupSampleSize(0.4, 0.6, 0.05, 0.8, 1)

      expect(result.n1).toBeGreaterThan(60)
      expect(result.n1).toBeLessThan(90)
    })

    it('当 p1 = p2 时应返回 NaN', () => {
      // 无差异无法证明优效
      const result = calculateSupSampleSize(0.5, 0.5, 0.025, 0.8, 1)
      expect(result.n1).toBeNaN()
    })
  })

  // ========================================================
  // 优效试验 - 连续终点
  // ========================================================
  describe('Superiority - Continuous', () => {
    it('应正确计算优效样本量', () => {
      // sigma=10, meanDiff=5, alpha=0.025, power=80%
      const result = calculateSupSampleSizeContinuous(10, 5, 0.025, 0.8, 1)

      // 预期每组约 50-70
      expect(result.n1).toBeGreaterThan(45)
      expect(result.n1).toBeLessThan(80)
    })

    it('应匹配疼痛评分试验验证数据', () => {
      // Perspect Clin Res 2010: sigma=4, meanDiff=2, alpha=0.05, power=80%
      // 预期 n ≈ 50
      const result = calculateSupSampleSizeContinuous(4, 2, 0.05, 0.8, 1)

      expect(result.n1).toBeGreaterThan(45)
      expect(result.n1).toBeLessThan(60)
    })

    it('当 meanDiff = 0 时应返回 NaN', () => {
      const result = calculateSupSampleSizeContinuous(10, 0, 0.025, 0.8, 1)
      expect(result.n1).toBeNaN()
    })
  })

  // ========================================================
  // 等效试验 - 率终点
  // ========================================================
  describe('Equivalence - Proportion', () => {
    it('应正确计算等效样本量 (Δ=0 对称场景)', () => {
      // p1=p2=50%, delta=10%, alpha=0.05, power=80%
      const result = calculateEqSampleSize(0.5, 0.5, 0.1, 0.05, 0.8, 1)

      // TOST 需要较大样本量，实际计算值约 429
      expect(result.n1).toBeGreaterThan(400)
      expect(result.n1).toBeLessThan(500)
    })

    it('应正确处理非对称场景 (Δ≠0)', () => {
      // p1=50%, p2=52%, delta=10%
      const result = calculateEqSampleSize(0.5, 0.52, 0.1, 0.05, 0.8, 1)

      // 有预期差异时，样本量会增加
      const resultSymmetric = calculateEqSampleSize(0.5, 0.5, 0.1, 0.05, 0.8, 1)
      expect(result.n1).toBeGreaterThan(resultSymmetric.n1)
    })

    it('当预期差异 >= 界值时应返回 Infinity', () => {
      // |p2 - p1| = 0.1 >= delta = 0.1
      const result = calculateEqSampleSize(0.5, 0.6, 0.1, 0.05, 0.8, 1)
      expect(result.n1).toBe(Infinity)
    })

    it('应处理浮点精度问题', () => {
      // 0.95 - 0.85 = 0.09999999999999998 (浮点误差)
      // 与 delta = 0.1 比较时应正确处理
      const result = calculateEqSampleSize(0.85, 0.95, 0.1, 0.05, 0.8, 1)
      expect(result.n1).toBe(Infinity)
    })
  })

  // ========================================================
  // 等效试验 - 连续终点
  // ========================================================
  describe('Equivalence - Continuous', () => {
    it('应匹配 Julious (2004) 验证数据 (Δ=0)', () => {
      // sigma=8, delta=5, alpha=0.05 (单侧), power=80%, meanDiff=0
      // 注意：alpha=0.05 在 TOST 中是每个单侧检验的 alpha
      // 实际计算值约 44 (使用 Z_{1-β/2} 公式)
      const result = calculateEqSampleSizeContinuous(8, 5, 0.05, 0.8, 1, 0)

      // 验证计算结果合理（大于 0 且有限）
      expect(result.n1).toBeGreaterThan(30)
      expect(result.n1).toBeLessThan(60)
    })

    it('应匹配 Flight (2016) 验证数据 (Δ≠0)', () => {
      // sigma=17, delta=20, alpha=0.05, power=80%, meanDiff=-5
      // 实际计算值约 16 (因使用较宽松的界值)
      const result = calculateEqSampleSizeContinuous(17, 20, 0.05, 0.8, 1, -5)

      // 验证计算结果合理
      expect(result.n1).toBeGreaterThan(10)
      expect(result.n1).toBeLessThan(30)
    })

    it('当预期差异 >= 界值时应返回 Infinity', () => {
      // meanDiff = 10, delta = 5 -> |10| >= 5
      const result = calculateEqSampleSizeContinuous(10, 5, 0.05, 0.8, 1, 10)
      expect(result.n1).toBe(Infinity)
    })

    it('应正确处理不同分配比例', () => {
      // ratio = 2
      const result = calculateEqSampleSizeContinuous(8, 5, 0.05, 0.8, 2, 0)

      expect(result.n2).toBe(Math.ceil(result.n1 * 2))
    })
  })

  // ========================================================
  // 边界条件和错误处理
  // ========================================================
  describe('Edge cases and error handling', () => {
    it('应拒绝无效输入（W8 验证器翻转）', () => {
      // W8 验证器：无效输入拒绝，原 safeNumber 强转 0 属静默算错
      // p1=NaN 不再被 safeNumber(NaN,0) 兜底为合法概率，而是判为类型无效 → 拒绝计算
      const result1 = calculateNISampleSize(NaN, 0.7, 0.1, 0.025, 0.8, 1)
      expect(result1.n1).toBeNaN()

      // W8 验证器：无效输入拒绝，原 safeNumber 强转 0 属静默算错
      // p1=undefined 判为类型无效 → 拒绝计算（原锁定"强转 0 仍算出正数"属静默算错）
      const result = calculateSupSampleSize(undefined, 0.7, 0.025, 0.8, 1)
      expect(result.n1).toBeNaN()
    })

    it('应正确向上取整', () => {
      // 所有样本量应该是整数
      const result = calculateNISampleSize(0.7, 0.7, 0.1, 0.025, 0.8, 1)
      expect(Number.isInteger(result.n1)).toBe(true)
      expect(Number.isInteger(result.n2)).toBe(true)
    })

    it('样本量应该始终为正数或特殊值', () => {
      const result = calculateSupSampleSize(0.3, 0.7, 0.025, 0.8, 1)
      expect(result.n1).toBeGreaterThan(0)

      // 除非是 NaN 或 Infinity
      const result2 = calculateSupSampleSize(0.5, 0.5, 0.025, 0.8, 1)
      expect(Number.isNaN(result2.n1) || result2.n1 === Infinity || result2.n1 > 0).toBe(true)
    })
  })

  // ========================================================
  // 参数敏感性测试
  // ========================================================
  describe('Parameter sensitivity', () => {
    it('增加 power 应增加样本量', () => {
      const result80 = calculateSupSampleSize(0.3, 0.5, 0.025, 0.8, 1)
      const result90 = calculateSupSampleSize(0.3, 0.5, 0.025, 0.9, 1)

      expect(result90.n1).toBeGreaterThan(result80.n1)
    })

    it('减小 alpha 应增加样本量', () => {
      const result005 = calculateSupSampleSize(0.3, 0.5, 0.05, 0.8, 1)
      const result0025 = calculateSupSampleSize(0.3, 0.5, 0.025, 0.8, 1)

      expect(result0025.n1).toBeGreaterThan(result005.n1)
    })

    it('增大效应量应减少样本量', () => {
      const resultSmall = calculateSupSampleSize(0.3, 0.35, 0.025, 0.8, 1) // 5% 差异
      const resultLarge = calculateSupSampleSize(0.3, 0.5, 0.025, 0.8, 1) // 20% 差异

      expect(resultLarge.n1).toBeLessThan(resultSmall.n1)
    })

    it('增大非劣效界值应减少样本量', () => {
      const resultStrict = calculateNISampleSize(0.7, 0.7, 0.05, 0.025, 0.8, 1) // 5% 界值
      const resultLoose = calculateNISampleSize(0.7, 0.7, 0.1, 0.025, 0.8, 1) // 10% 界值

      expect(resultLoose.n1).toBeLessThan(resultStrict.n1)
    })
  })

  // ========================================================
  // W8 统一参数验证器 - 除零 slip-through 闭合（CTS-12）
  // 修复前：ratio≤0 / sigma≤0 被 safeDivide/pow 静默吞掉，返回貌似合理的错值（非 NaN）；
  // 修复后：入口 validateStatParams 判定数学域外 → 拒绝计算 → NaN。
  // 期望值对照取自侦察卡 cardB_divzero_slipthrough 的 runtime 实证。
  // ========================================================
  describe('W8 slip-through 闭合（ratio≤0 / sigma≤0 → NaN）', () => {
    it('ratio=0（率）：修复前 {n1:56,n2:0} → 修复后 NaN', () => {
      const r = calculateNISampleSize(0.8, 0.85, 0.1, 0.025, 0.8, 0)
      expect(r.n1).toBeNaN()
      expect(r.n2).toBeNaN()
    })

    it('ratio<0（率）：修复前 {n1:12,n2:-12}（负样本量）→ 修复后 NaN', () => {
      const r = calculateNISampleSize(0.8, 0.85, 0.1, 0.025, 0.8, -1)
      expect(r.n1).toBeNaN()
      expect(r.n2).toBeNaN()
    })

    it('sigma=0（连续）：修复前 {n1:0,n2:0} → 修复后 NaN', () => {
      const r = calculateNISampleSizeContinuous(0, 5, 0.025, 0.8, 1, 0)
      expect(r.n1).toBeNaN()
      expect(r.n2).toBeNaN()
    })

    it('sigma<0（连续）：修复前 {n1:1,n2:1}（负方差被 pow 掩盖）→ 修复后 NaN', () => {
      const r = calculateNISampleSizeContinuous(-1, 5, 0.025, 0.8, 1, 0)
      expect(r.n1).toBeNaN()
      expect(r.n2).toBeNaN()
    })

    it('ratio=0（优效）：修复前 {n1:503,n2:0} → 修复后 NaN（同源闭合验证）', () => {
      const r = calculateSupSampleSize(0.8, 0.85, 0.025, 0.8, 0)
      expect(r.n1).toBeNaN()
      expect(r.n2).toBeNaN()
    })

    it('sigma=0（优效连续）+ ratio<0（等效）同族闭合', () => {
      expect(calculateSupSampleSizeContinuous(0, 5, 0.025, 0.8, 1).n1).toBeNaN()
      expect(calculateEqSampleSize(0.5, 0.5, 0.1, 0.05, 0.8, -1).n1).toBeNaN()
      expect(calculateEqSampleSizeContinuous(8, 5, 0.05, 0.8, 0, 0).n1).toBeNaN()
    })
  })
})
