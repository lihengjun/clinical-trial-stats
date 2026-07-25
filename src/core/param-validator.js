/**
 * 统计参数验证器 / Statistical Parameter Validator
 * 统一入口参数校验 | 区分「数学无效」与「统计不合理」 | 依赖: 无
 * @module core/param-validator
 *
 * 设计目标（合并 CTS-10 / CTS-12）:
 * - CTS-10: 统一"判错约定"—— 所有计算函数入口消费同一验证器，替代分散的
 *   safeNumber 静默兜底 / 各自 domain-guard 三风格并存。
 * - CTS-12: 闭合 ratio≤0 / sigma≤0 等"被 safeDivide 静默吞掉"的除零 slip-through。
 *
 * 返回哲学（保持不变）: 计算函数对外仍返回 NaN/Infinity，本模块**不 throw**；
 *   验证器仅返回结构体，由调用方决定"invalid → 该函数语义的 NaN 形态"。
 *
 * 判错分层:
 * - errors（→ 拒绝计算）: 数学无效。类型无效（NaN/undefined/非数值）与数学域外
 *   （概率 ∉ (0,1)、sigma≤0、ratio≤0、n≤0）一律入 errors。
 * - warnings（→ 允许计算但告警）: 域内的统计反常（alpha>0.5、power<0.5、
 *   分配比极端）。warnings 不阻断计算，结构体导出留给未来消费方。
 *
 * @reference STATISTICS_AUDIT_REPORT §4.2 / §九 P0「统一参数验证器」
 *   对标 gsDesign gsDErrorCheck、G*Power、statsmodels。
 */

// ========================================================
// 参数域分类
// ========================================================

/**
 * 概率类参数：数学域为开区间 (0, 1)
 * 说明: p10 / p01（McNemar 不一致对比例，可为 0）与 p_groups（数组）不在此列，
 *   由各自入口的既有 guard 处理，避免误拒合法 0 值。
 */
const PROBABILITY_PARAMS = new Set(['p', 'p0', 'p1', 'p2', 'alpha', 'power', 'confidenceLevel'])

/**
 * 正数类参数：数学域为 value > 0（整数处不强制整数，仅禁非正）
 */
const POSITIVE_PARAMS = new Set(['sigma', 'sd', 'ratio', 'n', 'n1'])

// 统计反常告警阈值（域内允许计算，仅提示）
const ALPHA_WARN_HIGH = 0.5 // alpha > 0.5 无统计意义
const POWER_WARN_LOW = 0.5 // power < 0.5 劣于随机猜测
const RATIO_WARN_LOW = 0.1 // 分配比过小
const RATIO_WARN_HIGH = 10 // 分配比过大

/**
 * 有限数值判定：排除 NaN / Infinity / undefined / 非 number 类型
 * @param {*} value - 待判定值
 * @returns {boolean} 是否为有限数值
 */
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * 统一参数验证器
 * 仅校验 `params` 中"已提供且有域约束"的键；无域约束的键（如 delta / meanDiff /
 * mu0 等）被忽略。键存在但值为 undefined/NaN 视为类型无效 → error。
 *
 * @param {Object} params - 待校验参数对象（键名须与 PROBABILITY_PARAMS / POSITIVE_PARAMS 对齐）
 * @param {number} [params.p] - 预期率 (0,1)
 * @param {number} [params.p0] - 历史对照率 (0,1)
 * @param {number} [params.p1] - 对照组/试验组率 (0,1)
 * @param {number} [params.p2] - 试验组率 (0,1)
 * @param {number} [params.alpha] - 显著性水平 (0,1)
 * @param {number} [params.power] - 检验效能 (0,1)
 * @param {number} [params.confidenceLevel] - 置信水平 (0,1)
 * @param {number} [params.sigma] - 标准差 > 0
 * @param {number} [params.sd] - 标准差 > 0
 * @param {number} [params.ratio] - 分配比 > 0
 * @param {number} [params.n] - 样本量 > 0
 * @param {number} [params.n1] - 对照组样本量 > 0
 * @returns {{valid: boolean, errors: Array<{param: string, message: string}>, warnings: Array<{param: string, message: string}>}}
 *   valid = errors.length === 0；errors/warnings 为含参数名的条目数组。
 *
 * @example
 *   validateStatParams({ p1: 0.7, alpha: 0.025, power: 0.8, ratio: 1 })
 *   // → { valid: true, errors: [], warnings: [] }
 *   validateStatParams({ ratio: 0 })
 *   // → { valid: false, errors: [{ param: 'ratio', message: 'ratio must be > 0' }], warnings: [] }
 *
 * @see docs/audit/STATISTICS_AUDIT_REPORT.md §4.2
 */
function validateStatParams(params) {
  const errors = []
  const warnings = []

  for (const key of Object.keys(params)) {
    const value = params[key]

    if (PROBABILITY_PARAMS.has(key)) {
      // 类型无效（NaN/undefined/非数值）→ 数学无效
      if (!isFiniteNumber(value)) {
        errors.push({ param: key, message: `${key} must be a finite number` })
        continue
      }
      // 数学域：开区间 (0, 1)
      if (value <= 0 || value >= 1) {
        errors.push({ param: key, message: `${key} must be in (0, 1)` })
        continue
      }
      // 统计反常（域内）→ 告警但允许计算
      if (key === 'alpha' && value > ALPHA_WARN_HIGH) {
        warnings.push({ param: key, message: 'alpha > 0.5 is statistically meaningless' })
      }
      if (key === 'power' && value < POWER_WARN_LOW) {
        warnings.push({ param: key, message: 'power < 0.5: test is worse than random guess' })
      }
    } else if (POSITIVE_PARAMS.has(key)) {
      if (!isFiniteNumber(value)) {
        errors.push({ param: key, message: `${key} must be a finite number` })
        continue
      }
      // 数学域：value > 0
      if (value <= 0) {
        errors.push({ param: key, message: `${key} must be > 0` })
        continue
      }
      // 分配比极端值（域内）→ 告警但允许计算
      if (key === 'ratio' && (value < RATIO_WARN_LOW || value > RATIO_WARN_HIGH)) {
        warnings.push({ param: key, message: 'extreme allocation ratio, clinically impractical' })
      }
    }
    // 未列入两类集合的键（delta / meanDiff / mu0 等无域约束参数）忽略
  }

  return { valid: errors.length === 0, errors, warnings }
}

export { validateStatParams }
