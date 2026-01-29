/**
 * 两组比较样本量计算模块 - 统一入口
 * Two-Group Sample Size Calculator - Entry Point
 *
 * 功能: 非劣效/优效/等效试验的样本量计算
 * 终点: 支持率终点和连续终点
 *
 * @module utils/statistics/sample-size/two-group
 *
 * @references 公式来源
 *
 * [1] Chow SC, Shao J, Wang H, Lokhnygina Y. Sample Size Calculations in Clinical Research.
 *     3rd ed. Chapman and Hall/CRC; 2017. (非劣效/优效公式)
 *
 * [2] Julious SA. Sample Sizes for Clinical Trials. Chapman and Hall/CRC; 2009.
 *     (非劣效/优效/等效公式基础)
 *
 * [3] Julious SA, Campbell MJ. Tutorial in biostatistics: sample sizes for parallel
 *     group clinical trials with binary data. Stat Med. 2012;31:2904-2936.
 *     DOI: 10.1002/sim.5381
 *
 * [4] Flight L, Julious SA. Practical guide to sample size calculations: non-inferiority
 *     and equivalence trials. Pharm Stat. 2016;15(1):80-89. DOI: 10.1002/pst.1716
 *     (等效公式验证案例)
 *
 * [5] PowerAndSampleSize.com - https://powerandsamplesize.com/
 *     (在线公式验证参考)
 *
 * [6] Helmut Schütz. Sample Size Estimation for Equivalence Studies in a Parallel Design.
 *     bebac.at, 2023. (等效公式 Z_{1-β/2} vs Z_{1-β} 选择依据)
 *
 * [7] Phillips KF. Power of the Two One-Sided Tests Procedure in Bioequivalence.
 *     J Pharmacokinet Biopharm. 1990;18(2):137-144. DOI: 10.1007/BF01063556
 *     (TOST检验功效理论基础)
 *
 * @note 公式选择说明
 * - 非劣效/优效：单侧检验，使用 Z_{1-α} 和 Z_{1-β}
 * - 等效 (TOST双侧检验)：
 *   • 当预期差异 Δ=0 (对称场景): 使用 Z_{1-β/2}，确保联合功效达到指定水平
 *   • 当预期差异 Δ≠0 (非对称场景): 使用 Z_{1-β}，功效由最近边界决定
 *
 * @validated 验证状态 (2026-01-25)
 * - 均值终点 Δ=0: Julious (2004) 完美匹配 (832 vs 832, 偏差 0%)
 * - 均值终点 Δ≠0: 自动切换公式，逻辑验证通过
 * - 率终点: Wald方法实现，与部分文献存在方法差异
 */

// ========================================================
// 非劣效试验 (Non-Inferiority Trial)
// ========================================================
export { calculateNISampleSize, calculateNISampleSizeContinuous } from './non-inferiority'

// ========================================================
// 优效试验 (Superiority Trial)
// ========================================================
export { calculateSupSampleSize, calculateSupSampleSizeContinuous } from './superiority'

// ========================================================
// 等效试验 (Equivalence Trial)
// ========================================================
export { calculateEqSampleSize, calculateEqSampleSizeContinuous } from './equivalence'
