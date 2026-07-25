/**
 * @file param-validator.test.js
 * @description 统一参数验证器单元测试（W8/P0）
 *
 * 覆盖三分层:
 *   1. errors（拒绝）: 类型无效（NaN/undefined/非数值）+ 数学域外（概率 ∉ (0,1)、正数 ≤0）
 *   2. warnings（允许算+告警）: 域内统计反常（alpha>0.5 / power<0.5 / ratio 极端）
 *   3. 边界值: 开区间端点 0 与 1、恰好 >0.5 / <0.5 阈值
 */

import { describe, it, expect } from 'vitest'
import { validateStatParams } from '../../src/core/param-validator'

describe('validateStatParams', () => {
  // ========================================================
  // 返回结构体契约
  // ========================================================
  describe('返回结构体', () => {
    it('空参数 → valid=true，errors/warnings 均为空数组', () => {
      const r = validateStatParams({})
      expect(r.valid).toBe(true)
      expect(r.errors).toEqual([])
      expect(r.warnings).toEqual([])
    })

    it('errors/warnings 条目含参数名 param 字段', () => {
      const r = validateStatParams({ ratio: 0 })
      expect(r.valid).toBe(false)
      expect(r.errors[0].param).toBe('ratio')
      expect(typeof r.errors[0].message).toBe('string')
    })
  })

  // ========================================================
  // 概率类参数 (0,1) 开区间：p / p0 / p1 / p2 / alpha / power / confidenceLevel
  // ========================================================
  describe('概率类参数 - 数学域 (0,1)', () => {
    it('域内值 → valid', () => {
      expect(validateStatParams({ p1: 0.5, alpha: 0.025, power: 0.8 }).valid).toBe(true)
      expect(validateStatParams({ p: 0.001, confidenceLevel: 0.999 }).valid).toBe(true)
    })

    it('边界 0 → 拒绝（开区间）', () => {
      expect(validateStatParams({ p1: 0 }).valid).toBe(false)
      expect(validateStatParams({ alpha: 0 }).valid).toBe(false)
      expect(validateStatParams({ power: 0 }).valid).toBe(false)
      expect(validateStatParams({ confidenceLevel: 0 }).valid).toBe(false)
    })

    it('边界 1 → 拒绝（开区间）', () => {
      expect(validateStatParams({ p2: 1 }).valid).toBe(false)
      expect(validateStatParams({ power: 1 }).valid).toBe(false)
      expect(validateStatParams({ confidenceLevel: 1 }).valid).toBe(false)
    })

    it('域外（<0 或 >1）→ 拒绝', () => {
      expect(validateStatParams({ p1: -0.1 }).valid).toBe(false)
      expect(validateStatParams({ p2: 1.5 }).valid).toBe(false)
      expect(validateStatParams({ alpha: 5 }).valid).toBe(false)
    })

    it('全部概率键均受 (0,1) 约束', () => {
      for (const key of ['p', 'p0', 'p1', 'p2', 'alpha', 'power', 'confidenceLevel']) {
        expect(validateStatParams({ [key]: 0 }).valid).toBe(false)
        expect(validateStatParams({ [key]: 1 }).valid).toBe(false)
        expect(validateStatParams({ [key]: 0.5 }).valid).toBe(true)
      }
    })
  })

  // ========================================================
  // 正数类参数 > 0：sigma / sd / ratio / n / n1
  // ========================================================
  describe('正数类参数 - 数学域 >0', () => {
    it('正值 → valid', () => {
      expect(validateStatParams({ sigma: 10, sd: 5, ratio: 1, n: 100, n1: 50 }).valid).toBe(true)
    })

    it('=0 → 拒绝（slip-through 根因：sigma=0 / ratio=0）', () => {
      expect(validateStatParams({ sigma: 0 }).valid).toBe(false)
      expect(validateStatParams({ ratio: 0 }).valid).toBe(false)
      expect(validateStatParams({ sd: 0 }).valid).toBe(false)
      expect(validateStatParams({ n: 0 }).valid).toBe(false)
      expect(validateStatParams({ n1: 0 }).valid).toBe(false)
    })

    it('<0 → 拒绝（负值：ratio<0 / sigma<0）', () => {
      expect(validateStatParams({ ratio: -1 }).valid).toBe(false)
      expect(validateStatParams({ sigma: -0.5 }).valid).toBe(false)
    })

    it('n>0 不强制整数（非整数正值仍 valid）', () => {
      expect(validateStatParams({ n: 12.5 }).valid).toBe(true)
      expect(validateStatParams({ n1: 0.5 }).valid).toBe(true)
    })
  })

  // ========================================================
  // 类型无效：NaN / undefined / 非数值 一律拒绝（对应 :231/:235 翻转根因）
  // ========================================================
  describe('类型无效 → 拒绝', () => {
    it('NaN → 拒绝', () => {
      expect(validateStatParams({ p1: NaN }).valid).toBe(false)
      expect(validateStatParams({ sigma: NaN }).valid).toBe(false)
    })

    it('undefined（键存在但值 undefined）→ 拒绝', () => {
      expect(validateStatParams({ p1: undefined }).valid).toBe(false)
      expect(validateStatParams({ ratio: undefined }).valid).toBe(false)
    })

    it('Infinity → 拒绝', () => {
      expect(validateStatParams({ n1: Infinity }).valid).toBe(false)
      expect(validateStatParams({ sigma: Infinity }).valid).toBe(false)
    })

    it('非数值类型（字符串/null）→ 拒绝', () => {
      expect(validateStatParams({ alpha: '0.5' }).valid).toBe(false)
      expect(validateStatParams({ power: null }).valid).toBe(false)
    })
  })

  // ========================================================
  // 统计反常 → warnings（允许计算，不进 errors）
  // ========================================================
  describe('统计反常 → warnings（域内允许计算）', () => {
    it('alpha>0.5 → warning，仍 valid', () => {
      const r = validateStatParams({ alpha: 0.7 })
      expect(r.valid).toBe(true)
      expect(r.warnings.some(w => w.param === 'alpha')).toBe(true)
    })

    it('power<0.5 → warning，仍 valid', () => {
      const r = validateStatParams({ power: 0.3 })
      expect(r.valid).toBe(true)
      expect(r.warnings.some(w => w.param === 'power')).toBe(true)
    })

    it('ratio 极端（<0.1 或 >10）→ warning，仍 valid', () => {
      const rLow = validateStatParams({ ratio: 0.05 })
      expect(rLow.valid).toBe(true)
      expect(rLow.warnings.some(w => w.param === 'ratio')).toBe(true)

      const rHigh = validateStatParams({ ratio: 20 })
      expect(rHigh.valid).toBe(true)
      expect(rHigh.warnings.some(w => w.param === 'ratio')).toBe(true)
    })

    it('阈值边界：alpha=0.5 / power=0.5 / ratio=0.1 / ratio=10 不触发 warning', () => {
      expect(validateStatParams({ alpha: 0.5 }).warnings).toEqual([])
      expect(validateStatParams({ power: 0.5 }).warnings).toEqual([])
      expect(validateStatParams({ ratio: 0.1 }).warnings).toEqual([])
      expect(validateStatParams({ ratio: 10 }).warnings).toEqual([])
    })
  })

  // ========================================================
  // 多参数组合 + 未知键忽略
  // ========================================================
  describe('多参数组合与未知键', () => {
    it('一个域外即 valid=false，多域外累积多条 errors', () => {
      const r = validateStatParams({ p1: 0.5, ratio: 0, alpha: 2 })
      expect(r.valid).toBe(false)
      expect(r.errors).toHaveLength(2)
      expect(r.errors.map(e => e.param).sort()).toEqual(['alpha', 'ratio'])
    })

    it('无域约束键（delta / meanDiff / mu0）被忽略，不影响 valid', () => {
      const r = validateStatParams({ delta: -5, meanDiff: 100, mu0: -3, alpha: 0.025 })
      expect(r.valid).toBe(true)
      expect(r.errors).toEqual([])
    })

    it('errors 与 warnings 可并存（域外 + 域内反常）', () => {
      const r = validateStatParams({ ratio: 0, power: 0.3 })
      expect(r.valid).toBe(false)
      expect(r.errors.some(e => e.param === 'ratio')).toBe(true)
      expect(r.warnings.some(w => w.param === 'power')).toBe(true)
    })
  })
})
