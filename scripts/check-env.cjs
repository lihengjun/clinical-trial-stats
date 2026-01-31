/**
 * 开发环境检查脚本
 * VS Code 打开项目时自动运行，检测环境问题并给出修复步骤
 *
 * @module scripts/check-env
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const PASS = '\x1b[32m✓\x1b[0m'
const FAIL = '\x1b[31m✗\x1b[0m'
const WARN = '\x1b[33m!\x1b[0m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

let issues = []
let stepNum = 0

function addIssue(description, command) {
  stepNum++
  issues.push({ step: stepNum, description, command })
}

// ─────────────────────────────────────────────
// 1. 检查 Node.js 版本
// ─────────────────────────────────────────────
function checkNodeVersion() {
  const nvmrcPath = path.join(ROOT, '.nvmrc')
  if (!fs.existsSync(nvmrcPath)) {
    console.log(`${WARN} .nvmrc 文件不存在，跳过 Node 版本检查`)
    return
  }

  const required = fs.readFileSync(nvmrcPath, 'utf-8').trim()
  const current = process.version.replace('v', '')
  const currentMajor = current.split('.')[0]
  const requiredMajor = required.split('.')[0]

  if (currentMajor === requiredMajor) {
    console.log(`${PASS} Node.js 版本: v${current} (要求: v${required}+)`)
  } else {
    console.log(`${FAIL} Node.js 版本不匹配: 当前 v${current}，项目要求 v${required}`)
    addIssue(
      `安装并切换到 Node ${requiredMajor}`,
      `nvm install ${requiredMajor} && nvm use ${requiredMajor}`
    )
  }
}

// ─────────────────────────────────────────────
// 2. 检查 node_modules 是否存在
// ─────────────────────────────────────────────
function checkNodeModules() {
  const nodeModulesPath = path.join(ROOT, 'node_modules')
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`${FAIL} node_modules 不存在`)
    addIssue('安装项目依赖', 'npm install')
    return false
  }
  return true
}

// ─────────────────────────────────────────────
// 3. 检查依赖是否过期（package-lock.json 比 node_modules 新）
// ─────────────────────────────────────────────
function checkDependenciesFresh() {
  const lockPath = path.join(ROOT, 'package-lock.json')
  const nodeModulesPath = path.join(ROOT, 'node_modules')

  if (!fs.existsSync(lockPath) || !fs.existsSync(nodeModulesPath)) return

  const lockMtime = fs.statSync(lockPath).mtimeMs
  const nmMtime = fs.statSync(nodeModulesPath).mtimeMs

  if (lockMtime > nmMtime) {
    console.log(`${FAIL} 依赖已过期 (package-lock.json 有更新)`)
    addIssue('更新项目依赖', 'npm install')
  } else {
    console.log(`${PASS} 依赖已是最新`)
  }
}

// ─────────────────────────────────────────────
// 4. 检查关键全局工具
// ─────────────────────────────────────────────
function checkGlobalTools() {
  try {
    execSync('which git', { stdio: 'pipe' })
    console.log(`${PASS} Git 已安装`)
  } catch {
    console.log(`${FAIL} Git 未安装`)
    addIssue('安装 Git', 'brew install git')
  }
}

// ─────────────────────────────────────────────
// 5. 检查 vitest 是否可用
// ─────────────────────────────────────────────
function checkVitest() {
  const vitestPath = path.join(ROOT, 'node_modules', '.bin', 'vitest')
  if (fs.existsSync(vitestPath)) {
    console.log(`${PASS} Vitest 已安装`)
  } else {
    const nodeModulesPath = path.join(ROOT, 'node_modules')
    if (fs.existsSync(nodeModulesPath)) {
      console.log(`${FAIL} Vitest 未安装 (node_modules 存在但缺少 vitest)`)
      addIssue('重新安装依赖', 'npm install')
    }
    // 如果 node_modules 不存在，checkNodeModules 已经报过了
  }
}

// ─────────────────────────────────────────────
// 6. 检查小程序主项目（可选，仅联合开发时需要）
// ─────────────────────────────────────────────
function checkMainProject() {
  const mainProjectPath = path.resolve(ROOT, '..', 'wxapp_device-helper')
  if (fs.existsSync(mainProjectPath)) {
    console.log(`${PASS} 小程序主项目存在: ${mainProjectPath}`)
  } else {
    console.log(`${WARN} 小程序主项目不存在 (可选，仅联合开发时需要)`)
  }
}

// ─────────────────────────────────────────────
// 执行检查
// ─────────────────────────────────────────────
console.log('')
console.log(`${BOLD}═══ 开发环境检查 (clinical-trial-stats) ═══${RESET}`)
console.log('')

checkNodeVersion()
const hasModules = checkNodeModules()
if (hasModules) {
  checkDependenciesFresh()
  checkVitest()
}
checkGlobalTools()
checkMainProject()

console.log('')

if (issues.length === 0) {
  console.log(`${BOLD}\x1b[32m环境就绪，可以开始开发。${RESET}`)
} else {
  console.log(`${BOLD}\x1b[33m发现 ${issues.length} 个问题，请按以下步骤修复：${RESET}`)
  console.log('')
  for (const issue of issues) {
    console.log(`  ${BOLD}步骤 ${issue.step}${RESET}: ${issue.description}`)
    console.log(`  \x1b[36m$ ${issue.command}${RESET}`)
    console.log('')
  }
  console.log(`修复完成后重新打开项目，或手动运行: ${BOLD}node scripts/check-env.js${RESET}`)
}

console.log('')
