/** 配置默认值、迁移与保存前校验。密码持久化永远为 false。 */

export const CONFIG_VERSION = 1

export const LAUNCH_ARG_ALLOWLIST = Object.freeze([
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--disable-extensions',
])

const RISKS = ['L0', 'L1', 'L2', 'L3']
const DECISIONS = ['allow', 'confirm', 'deny']

export function defaultConfig() {
  return {
    version: CONFIG_VERSION,
    enabled: true,
    browser: 'project-default',
    connection: {
      mode: 'webbridge',
      extensionEnabled: false,
    },
    browsers: [],
    credentialRef: '',
    sessionTtlMinutes: 30,
    maxConcurrentSessions: 2,
    locale: 'project',
    profile: {
      temporary: true,
      persistent: false,
      name: '',
      reuseSession: true,
      cleanupOnClose: true,
      persistCookies: false,
      persistPasswords: false,
      profileDirRef: '',
      idleExpireMinutes: 30,
    },
    domains: {
      allow: [],
      deny: [],
      subdomainMode: 'suffix',
      allowCrossOrigin: false,
      allowDownload: false,
      allowUpload: false,
      allowSubmit: false,
      allowPopups: false,
    },
    capabilities: {
      read: true,
      navigate: true,
      locate: true,
      screenshot: true,
      click: false,
      type: false,
      select: false,
      upload: false,
      download: false,
      submit: false,
      external: false,
      mutateBusiness: false,
    },
    risk: {
      L0: 'allow',
      L1: 'confirm',
      L2: 'confirm',
      L3: 'deny',
      overrides: [],
    },
    wait: {
      actionTimeoutMs: 15000,
      elementTimeoutMs: 8000,
      networkIdleMs: 1500,
      domStableMs: 400,
      maxRetries: 1,
      backoff: 'exponential',
      screenshotOnFailure: true,
      pauseOnFailure: false,
    },
    audit: {
      saveDom: true,
      saveScreenshot: false,
      saveVideo: false,
      saveNetworkSummary: false,
      saveVisibleText: 'per-domain',
      retentionDays: 7,
      maxBytes: 50_000_000,
      allowExport: true,
      autoCleanup: true,
    },
    files: {
      allowedExtensions: ['txt', 'png', 'csv', 'pdf'],
      maxBytes: 5_000_000,
    },
    advanced: {
      locatorPriority: ['testid', 'role', 'label', 'placeholder', 'text', 'css', 'xpath'],
      launchArgs: [],
      proxyRef: '',
      webhookRef: '',
      maxTextLength: 8000,
      maxActionsPerRun: 30,
      protocolVersion: 1,
    },
  }
}

/** 把旧配置补到当前版本。未知版本拒绝，避免静默丢字段。 */
export function migrateConfig(raw) {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const version = Number(input.version || 0)
  if (version > CONFIG_VERSION) {
    return { ok: false, errors: [`不支持的配置版本 ${version}`] }
  }
  const base = defaultConfig()
  const merged = merge(base, input)
  merged.version = CONFIG_VERSION
  merged.profile.persistPasswords = false
  if (merged.profile.persistent) merged.profile.temporary = false
  merged.connection.mode = 'webbridge'
  return { ok: true, config: merged }
}

function merge(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch.slice() : base.slice()
  if (base && typeof base === 'object') {
    const out = {}
    for (const key of Object.keys(base)) out[key] = merge(base[key], patch?.[key])
    return out
  }
  return patch === undefined ? base : patch
}

/** 保存前校验。返回新的配置副本，不修改入参。 */
export function validateConfig(raw) {
  const migrated = migrateConfig(raw)
  if (!migrated.ok) return migrated
  const config = migrated.config
  const errors = []
  config.connection.mode = 'webbridge'
  config.connection.extensionEnabled = config.connection.extensionEnabled === true
  config.browsers = normalizeBrowsers(config.browsers, errors)
  if (!['project-default', 'chrome', 'edge', 'chromium'].includes(config.browser)) errors.push('浏览器不在当前环境支持列表中')
  checkRange(errors, '会话 TTL', config.sessionTtlMinutes, 1, 720)
  checkRange(errors, '最大并发会话', config.maxConcurrentSessions, 1, 8)
  checkRange(errors, '动作超时', config.wait.actionTimeoutMs, 100, 120000)
  checkRange(errors, '元素等待', config.wait.elementTimeoutMs, 100, 120000)
  checkRange(errors, '网络空闲等待', config.wait.networkIdleMs, 0, 30000)
  checkRange(errors, 'DOM 稳定等待', config.wait.domStableMs, 0, 10000)
  checkRange(errors, '最大重试次数', config.wait.maxRetries, 0, 5)
  checkRange(errors, '日志保留天数', config.audit.retentionDays, 1, 365)
  checkRange(errors, '快照文本长度', config.advanced.maxTextLength, 200, 50000)
  checkRange(errors, '单次最大动作数', config.advanced.maxActionsPerRun, 1, 100)
  if (!['none', 'linear', 'exponential'].includes(config.wait.backoff)) errors.push('退避策略无效')
  if (!['exact', 'suffix'].includes(config.domains.subdomainMode)) errors.push('子域名匹配模式无效')
  if (!['off', 'per-domain', 'on'].includes(config.audit.saveVisibleText)) errors.push('可见文本保存策略无效')
  validateRef(errors, '凭据引用', config.credentialRef)
  validateRef(errors, '代理引用', config.advanced.proxyRef)
  validateRef(errors, 'Webhook 引用', config.advanced.webhookRef)
  if (config.profile.persistPasswords) errors.push('禁止持久化密码')
  config.profile.persistPasswords = false
  for (const level of RISKS) {
    if (!DECISIONS.includes(config.risk[level])) errors.push(`${level} 决策无效`)
  }
  if (config.risk.L2 !== 'confirm') errors.push('L2 必须始终确认')
  if (config.risk.L3 === 'allow') errors.push('L3 不能自动放行')
  if (!['allow', 'confirm'].includes(config.risk.L0)) errors.push('L0 只能自动允许或确认')
  config.risk.overrides = (config.risk.overrides || []).slice(0, 50).map((row, index) => normalizeOverride(row, index, errors))
  config.domains.allow = normalizeHosts(config.domains.allow, errors, '允许域名')
  config.domains.deny = normalizeHosts(config.domains.deny, errors, '禁止域名')
  config.advanced.launchArgs = normalizeArgs(config.advanced.launchArgs, errors)
  config.files.allowedExtensions = normalizeExtensions(config.files.allowedExtensions)
  if (errors.length) return { ok: false, errors }
  return { ok: true, config }
}

function normalizeBrowsers(value, errors) {
  if (!Array.isArray(value)) return []
  const choices = {
    history: ['ask', 'allow', 'deny'],
    browse: ['allow', 'ask', 'deny'],
    download: ['confirm', 'allow', 'deny'],
  }
  const known = new Set(['edge', 'chrome'])
  return value.slice(0, 8).map((item) => {
    const id = String(item?.id || '')
    if (!known.has(id)) errors.push('只能记录已经连接过的 Chrome 或 Edge')
    const pick = (key, fallback) => choices[key].includes(item?.[key]) ? item[key] : fallback
    const sites = Array.isArray(item?.sites) ? item.sites.slice(0, 50).map((site) => ({
      host: String(site?.host || '').trim().toLowerCase(),
      browse: choices.browse.includes(site?.browse) ? site.browse : 'allow',
      download: choices.download.includes(site?.download) ? site.download : 'confirm',
    })).filter((site) => site.host && !site.host.includes('://') && !site.host.includes('/')) : []
    return {
      id,
      name: id === 'edge' ? 'Microsoft Edge' : 'Google Chrome',
      enabled: item?.enabled === true,
      history: pick('history', 'ask'),
      siteTools: item?.siteTools === true,
      browse: pick('browse', 'allow'),
      download: pick('download', 'confirm'),
      developerCdp: item?.developerCdp === true,
      sites,
    }
  })
}

function checkRange(errors, label, value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) errors.push(`${label}必须是 ${min} 到 ${max} 的整数`)
}

function validateRef(errors, label, value) {
  const text = String(value || '')
  if (!text) return
  if (text.length > 120 || !/^[a-zA-Z0-9._:/-]+$/.test(text)) errors.push(`${label}只能是安全的引用名，不能是秘密本身`)
  if (/password|secret|bearer|token/i.test(text) && !text.startsWith('credentials://')) errors.push(`${label}看起来像秘密，请改用凭据引用`)
}

function normalizeHosts(list, errors, label) {
  const out = []
  const seen = new Set()
  for (const item of Array.isArray(list) ? list : []) {
    const host = String(item || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^\./, '')
    if (!host || !/^[a-z0-9.-]+$/.test(host)) {
      errors.push(`${label}包含无效项`)
      continue
    }
    if (seen.has(host)) continue
    seen.add(host)
    out.push(host)
  }
  return out.slice(0, 100)
}

function normalizeArgs(list, errors) {
  const out = []
  for (const item of Array.isArray(list) ? list : []) {
    const arg = String(item || '').trim()
    if (!arg) continue
    if (!LAUNCH_ARG_ALLOWLIST.includes(arg)) errors.push(`启动参数不在白名单内：${arg.slice(0, 40)}`)
    else if (!out.includes(arg)) out.push(arg)
  }
  return out
}

function normalizeExtensions(list) {
  const fallback = defaultConfig().files.allowedExtensions
  const source = Array.isArray(list) && list.length ? list : fallback
  return [...new Set(source.map((item) => String(item || '').toLowerCase().replace(/^\./, '')).filter((item) => /^[a-z0-9]{1,8}$/.test(item)))].slice(0, 20)
}

function normalizeOverride(row, index, errors) {
  const decision = DECISIONS.includes(row?.decision) ? row.decision : ''
  const risk = RISKS.includes(row?.risk) ? row.risk : ''
  if (!decision) errors.push(`覆盖规则 ${index + 1} 缺少决策`)
  if (risk === 'L3' && decision === 'allow') errors.push('覆盖规则不能自动放行 L3')
  if (risk === 'L2' && decision === 'allow') errors.push('覆盖规则不能自动放行 L2')
  return {
    domain: String(row?.domain || '').trim().toLowerCase(),
    action: String(row?.action || '').trim(),
    role: String(row?.role || '').trim(),
    text: String(row?.text || '').trim().slice(0, 80),
    selector: String(row?.selector || '').trim().slice(0, 120),
    urlPattern: String(row?.urlPattern || '').trim().slice(0, 160),
    risk,
    decision: decision || 'confirm',
  }
}

/** 比较两次配置，只返回变化的路径，不返回值。 */
export function changedPaths(before, after) {
  const paths = []
  walk(before, after, '', paths)
  return paths
}

function walk(before, after, prefix, paths) {
  if (Object.is(before, after)) return
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      walk(before[key], after[key], prefix ? `${prefix}.${key}` : key, paths)
    }
    return
  }
  if (JSON.stringify(before) !== JSON.stringify(after)) paths.push(prefix || '(root)')
}
