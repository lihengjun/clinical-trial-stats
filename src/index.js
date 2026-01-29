/**
 * @module statistics
 * @description 统计计算模块 - 主入口文件
 * @author Device Helper Team
 * @date 2026-01-18
 *
 * 本模块提供临床试验样本量计算和结果验证功能，支持:
 * - 两组比较 (非劣效、优效、等效)
 * - 单组试验
 * - 配对设计
 * - 多组比较
 * - 置信区间估计
 * - 敏感性分析
 */

// ========================================================
// Core Modules - 核心模块
// ========================================================
import { normalCDF, normalInverse } from './core/normal-distribution'
import { safeNumber, safeDivide } from './core/safe-math'
import { calculateWilsonCI } from './core/confidence-interval'

// ========================================================
// Sample Size Modules - 样本量计算模块
// ========================================================
import {
  calculateNISampleSize,
  calculateNISampleSizeContinuous,
  calculateSupSampleSize,
  calculateSupSampleSizeContinuous,
  calculateEqSampleSize,
  calculateEqSampleSizeContinuous
} from './sample-size/two-group'

import { calculateOneSampleSize, calculateOneSampleSizeContinuous } from './sample-size/one-sample'

import {
  calculatePairedSampleSize,
  calculatePairedSampleSizeContinuous
} from './sample-size/paired'

import {
  calculateMultigroupSampleSize,
  calculateMultigroupSampleSizeContinuous
} from './sample-size/multigroup'

// ========================================================
// Result Validation Modules - 结果验证模块
// ========================================================
import {
  calculateNIResult,
  calculateNIResultContinuous,
  calculateSupResult,
  calculateSupResultContinuous,
  calculateEqResult,
  calculateEqResultContinuous
} from './result-validation/two-group'

import {
  calculateOneSampleResult,
  calculateOneSampleResultContinuous
} from './result-validation/one-sample'

import { calculatePairedResult, calculatePairedResultContinuous } from './result-validation/paired'

import {
  calculateMultigroupResult,
  calculateMultigroupResultContinuous
} from './result-validation/multigroup'

// ========================================================
// CI Estimation Modules - 置信区间估计模块
// ========================================================
import { calculateRateCISampleSize, calculateRateCI } from './ci-estimation/proportion-ci'

import { calculateMeanCISampleSize, calculateMeanCI } from './ci-estimation/mean-ci'

// ========================================================
// Sensitivity Analysis Module - 敏感性分析模块
// ========================================================
import { runSensitivityAnalysis } from './sensitivity/analysis'

// ========================================================
// Effect Size Module - 效应量计算模块
// ========================================================
import {
  calculateCohenD,
  interpretCohenD,
  getEffectSizeInfo,
  calculateCohenH,
  interpretCohenH,
  getEffectSizeInfoProportion
} from './core/effect-size'

// ========================================================
// Module Exports - 统一导出
// ========================================================
export {
  // 通用函数 (Universal)
  normalCDF,
  normalInverse,

  // 非劣效试验 - 率终点 (Non-Inferiority - Proportion)
  calculateNISampleSize,
  calculateNIResult,

  // 非劣效试验 - 连续终点 (Non-Inferiority - Continuous)
  calculateNISampleSizeContinuous,
  calculateNIResultContinuous,

  // 优效试验 - 率终点 (Superiority - Proportion)
  calculateSupSampleSize,
  calculateSupResult,

  // 优效试验 - 连续终点 (Superiority - Continuous)
  calculateSupSampleSizeContinuous,
  calculateSupResultContinuous,

  // 等效试验 - 率终点 (Equivalence - Proportion)
  calculateEqSampleSize,
  calculateEqResult,

  // 等效试验 - 连续终点 (Equivalence - Continuous)
  calculateEqSampleSizeContinuous,
  calculateEqResultContinuous,

  // 单组试验 - 率终点 (One-Sample - Proportion)
  calculateOneSampleSize,
  calculateOneSampleResult,

  // 单组试验 - 连续终点 (One-Sample - Continuous)
  calculateOneSampleSizeContinuous,
  calculateOneSampleResultContinuous,

  // 率置信区间估计 (Rate Confidence Interval)
  calculateRateCISampleSize,
  calculateRateCI,

  // 均值置信区间估计 (Mean Confidence Interval)
  calculateMeanCISampleSize,
  calculateMeanCI,

  // 配对设计 - 率终点 (Paired - Proportion)
  calculatePairedSampleSize,
  calculatePairedResult,

  // 配对设计 - 连续终点 (Paired - Continuous)
  calculatePairedSampleSizeContinuous,
  calculatePairedResultContinuous,

  // 多组比较 - 率终点 (Multigroup - Proportion)
  calculateMultigroupSampleSize,
  calculateMultigroupResult,

  // 多组比较 - 连续终点 (Multigroup - Continuous)
  calculateMultigroupSampleSizeContinuous,
  calculateMultigroupResultContinuous,

  // 敏感性分析 (Sensitivity Analysis)
  runSensitivityAnalysis,

  // 效应量计算 (Effect Size)
  calculateCohenD,
  interpretCohenD,
  getEffectSizeInfo,
  calculateCohenH,
  interpretCohenH,
  getEffectSizeInfoProportion,

  // 向后兼容（已弃用，请使用 calculateNISampleSize）
  calculateNISampleSize as calculateSampleSize
}
