/**
 * @file golden-two-group-ni.test.js
 * @description 两组-率-非劣效 R 对照 golden fixture 消费测试
 *
 * 逐条断言本库 calculateNISampleSize（率终点）与 R golden 的偏差在容差内。
 * golden 数据 + 完整 R 调用命令: tests/fixtures/golden-two-group-ni.json
 * 再生成: npm run golden:two-group-ni（调 tests/fixtures/r/generate-two-group-ni.R）
 *
 * ── 容差依据（先实测再定, 见 fixture meta）──────────────────────────────
 *  主 golden = TrialSize::TwoSampleProportion.NIS（Chow et al. 2017 unpooled 正态近似），
 *  与本库 non-inferiority.js 使用的完全同一闭式公式。因此本库整数结果 ⌈n⌉ 与 R 连续值
 *  之间的唯一偏差来源是【取整】：实测全网格 max 相对偏差 1.60%（n≈50, 取整占比最大），
 *  median 0.23%。REL_TOL=2% 界定该取整偏差并留裕度。同时对对照组 n1 施加更强的
 *  "⌈连续 golden⌉ 精确相等" 断言，直接验证公式实现保真度（可捕获任何公式/编码偏差）。
 *
 * ── 已知偏差（known_deviation, 待第三批 P1 精度项评估）─────────────────────
 *  gsDesign::nBinomial（Farrington-Manning 受约束 MLE 方差, 临床注册金标准）作为交叉
 *  方法参考。实测对称场景本库正态近似 vs FM 方差呈双峰: 6/8 例 <1.8% 一致, 2 例高基线
 *  边界 (p>=0.85: README 0.85 / 高率 0.90) 达 2.5~2.9%。后者系【方法学差异非实现缺陷】,
 *  在 JSON 标 known_deviation:true, 主测试跳过, 单列"已知偏差清单"锁定当前偏差值。
 *  （FM 非对称 NI 符号约定实测存在歧义 → fm_reference 仅覆盖对称 ratio=1 场景。）
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { calculateNISampleSize } from '../../src/sample-size/two-group'

const fixture = JSON.parse(
  readFileSync(new URL('./golden-two-group-ni.json', import.meta.url), 'utf-8')
)

const REL_TOL = fixture.meta.rel_tolerance
const METHOD_BAND = fixture.meta.method_band

/** 相对偏差 |actual - golden| / golden */
const relDev = (actual, golden) => Math.abs(actual - golden) / golden

/** 从记录 inputs 调用本库 */
const runLib = (r) => {
  const i = r.inputs
  return calculateNISampleSize(i.p1, i.p2, i.delta, i.alpha, i.power, i.ratio)
}

describe('golden two-group NI (R 对照验证)', () => {
  // fixture 自身完整性
  describe('fixture 完整性', () => {
    it('每条记录含 golden 值与完整 R 调用命令', () => {
      expect(fixture.records.length).toBeGreaterThanOrEqual(8)
      for (const r of fixture.records) {
        expect(r.inputs).toBeTruthy()
        expect(Number.isFinite(r.golden.n1_control)).toBe(true)
        expect(Number.isFinite(r.golden.n2_treatment)).toBe(true)
        expect(typeof r.golden.r_call).toBe('string')
        expect(r.golden.r_call.length).toBeGreaterThan(0)
      }
    })

    it('meta 声明与实际 known_deviation 条数一致', () => {
      const actual = fixture.records.filter((r) => r.known_deviation === true).length
      expect(actual).toBe(fixture.meta.known_deviation_count)
    })
  })

  // ── 主测试: 与主 golden (TrialSize Chow) 的偏差在容差内; 跳过 known_deviation ──
  describe('主 golden 保真度（vs TrialSize Chow unpooled, 容差内）', () => {
    const main = fixture.records.filter((r) => r.known_deviation !== true)

    it.each(main.map((r) => [r.id, r]))('%s', (_id, r) => {
      const res = runLib(r)

      // (1) 对照组 n1 = ⌈连续 golden⌉ 精确相等 —— 同公式实现保真度
      expect(res.n1).toBe(r.golden.n1_control_ceil)

      // (2) 两组相对偏差均在容差内（取整偏差）
      expect(relDev(res.n1, r.golden.n1_control)).toBeLessThanOrEqual(REL_TOL)
      expect(relDev(res.n2, r.golden.n2_treatment)).toBeLessThanOrEqual(REL_TOL)

      // (3) 本库 n2 派生契约: 先 ceil(n1) 再按 ratio 取整
      expect(res.n2).toBe(Math.ceil(res.n1 * r.inputs.ratio))
    })
  })

  // ── FM 方法一致性: 记录本库正态近似 vs gsDesign FM 方差的关系（对称场景）──
  describe('FM 方法一致带（vs gsDesign Farrington-Manning）', () => {
    const withFm = fixture.records.filter((r) => r.fm_reference !== null)

    it.each(withFm.map((r) => [r.id, r]))('%s', (_id, r) => {
      const res = runLib(r)
      const dev = relDev(res.n1, r.fm_reference.per_arm)
      // 锁定当前实测偏差（JSON 记录值与运行时重算一致）
      expect(dev).toBeCloseTo(r.fm_reference.method_deviation, 4)
      // 双峰断言: known_deviation 例超方法带; 其余在带内
      if (r.known_deviation === true) {
        expect(dev).toBeGreaterThan(METHOD_BAND)
      } else {
        expect(dev).toBeLessThanOrEqual(METHOD_BAND)
      }
    })
  })

  // ── 已知偏差清单: 主测试跳过的高基线方法差异, 锁定现值, 待第三批 P1 精度项评估 ──
  describe('已知偏差清单（known_deviation, 待第三批 P1 精度）', () => {
    const known = fixture.records.filter((r) => r.known_deviation === true)

    it('存在待评估的高基线方法差异条目', () => {
      expect(known.length).toBe(fixture.meta.known_deviation_count)
      for (const r of known) {
        expect(r.fm_reference).not.toBeNull()
        expect(typeof r.known_deviation_note).toBe('string')
      }
    })

    it.each(known.map((r) => [r.id, r]))('%s（锁定现值）', (_id, r) => {
      const res = runLib(r)
      // 本库实现仍与 Chow golden 一致（方法差异不等于实现缺陷）
      expect(res.n1).toBe(r.golden.n1_control_ceil)
      // 锁定本库 vs FM 的当前偏差, 超方法带 —— 防回归静默漂移
      const dev = relDev(res.n1, r.fm_reference.per_arm)
      expect(dev).toBeGreaterThan(METHOD_BAND)
      expect(dev).toBeCloseTo(r.fm_reference.method_deviation, 4)
    })
  })
})
