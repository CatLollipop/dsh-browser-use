/** PolicyGuard：域名、能力、风险和幂等。页面文字不能改这些决定。 */
import { isSensitiveField } from './redact.js'

const L3_TEXT = /支付|付款|购买|删除|关闭账号|修改权限|导出个人|密码|驗證碼|验证码|otp|token|api\s*key|登录|登入/i
const L2_TEXT = /提交|发送|發送|发布|發布|上传|上傳|下载|下載|发帖|创建/i
const SECRET_READ = /读取密码|读取 token|读取 cookie|导出 cookie|把 token|粘贴 token/i

const CAPABILITY = {
  goto: 'navigate',
  back: 'navigate',
  reload: 'navigate',
  read: 'read',
  snapshot: 'read',
  scroll: 'read',
  wait: 'read',
  screenshot: 'screenshot',
  find: 'locate',
  inspect: 'locate',
  click: 'click',
  press: 'click',
  type: 'type',
  select: 'select',
  upload: 'upload',
  download: 'download',
}

/** 动作的固有幂等性。副作用默认不重试。 */
export function idempotencyOf(type, element, input) {
  if (['read', 'snapshot', 'screenshot', 'wait', 'find', 'inspect', 'scroll'].includes(type)) return 'safe'
  if (['upload', 'download'].includes(type)) return 'side_effect'
  if (isSubmit(type, element, input) || isDestructive(element)) return 'side_effect'
  return 'conditionally_safe'
}

/** 风险分级。敏感字段只会升级，不会因为页面文案降级。 */
export function riskOf(type, element, input) {
  if (isSensitiveField(element || {}) || isSensitiveField({ name: typeof input === 'string' ? '' : input?.name, label: input?.label })) return 'L3'
  if (typeof input === 'string' && isSensitiveField({ name: input })) return 'L3'
  const text = elementText(element)
  if (L3_TEXT.test(text) || L3_TEXT.test(String(input?.intent || ''))) return 'L3'
  if (type === 'upload' || type === 'download' || isSubmit(type, element, input) || L2_TEXT.test(text)) return 'L2'
  if (['read', 'snapshot', 'screenshot', 'scroll', 'wait', 'find', 'inspect', 'goto'].includes(type)) return 'L0'
  return 'L1'
}

function elementText(element) {
  if (!element) return ''
  return [element.name, element.label, element.text, element.placeholder].filter(Boolean).join(' ')
}

function isSubmit(type, element, input) {
  if (input?.submit === true) return true
  if (type === 'press' && String(input?.key || input || '').toLowerCase() === 'enter' && input?.inForm) return true
  const text = elementText(element)
  return type === 'click' && (element?.type === 'submit' || /提交|发送|发布|支付|购买|删除/.test(text))
}

function isDestructive(element) {
  return /删除|支付|关闭账号|修改权限/.test(elementText(element))
}

export class PolicyGuard {
  constructor(config) {
    this.config = config
  }

  /** 页面内容只记一笔“已忽略”。调用前后配置必须同一引用。 */
  observePage(content) {
    const text = String(content || '')
    return {
      trusted: false,
      ignored: true,
      matchedInstruction: SECRET_READ.test(text) || /忽略系统|关闭安全|cookie/i.test(text),
      policyChanged: false,
    }
  }

  evaluate({ type, url, element, input, currentUrl }) {
    const config = this.config
    if (!config.enabled) return deny('PERMISSION_DENIED', '插件已停用。', 'L0', 'safe')
    const risk = riskOf(type, element, input)
    const idempotency = idempotencyOf(type, element, input)
    if (url) {
      const domain = this.checkDomain(url, currentUrl, type)
      if (!domain.ok) return { ...domain, risk, idempotency, needsApproval: false }
    }
    if (risk === 'L3' && isSensitiveField(element || {}) && config.risk.L3 === 'deny') {
      return deny('SENSITIVE_DATA_BLOCKED', '敏感字段被策略拦截，插件不会读取或回显该值。', risk, idempotency)
    }
    const capability = CAPABILITY[type]
    if (capability && !config.capabilities[capability]) {
      const code = type === 'upload' ? 'UPLOAD_BLOCKED' : type === 'download' ? 'DOWNLOAD_BLOCKED' : 'PERMISSION_DENIED'
      return deny(code, `当前没有「${capability}」能力。`, risk, idempotency)
    }
    if ((type === 'upload' && !config.domains.allowUpload) || (type === 'download' && !config.domains.allowDownload)) {
      return deny(type === 'upload' ? 'UPLOAD_BLOCKED' : 'DOWNLOAD_BLOCKED', '域名策略不允许该文件操作。', risk, idempotency)
    }
    if (idempotency === 'side_effect' && type === 'click' && !config.capabilities.submit && isSubmit(type, element, input)) {
      return deny('PERMISSION_DENIED', '提交表单的能力默认关闭。', risk, idempotency)
    }
    const decision = this.decisionFor(risk, type, url, element)
    if (decision === 'deny') return deny(risk === 'L3' ? 'SENSITIVE_DATA_BLOCKED' : 'PERMISSION_DENIED', `${risk} 动作被策略禁止。`, risk, idempotency)
    return {
      ok: true,
      allowed: true,
      risk,
      idempotency,
      needsApproval: decision === 'confirm',
      decision,
      capability,
      consequence: consequenceFor(type, risk, element),
    }
  }

  checkDomain(target, currentUrl, type) {
    let url
    try { url = new URL(target) } catch { return deny('NAVIGATION_FAILED', '目标地址不是合法 URL。', 'L0', 'conditionally_safe') }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return deny('DOMAIN_BLOCKED', '只允许不带凭据的 http(s) 地址。', 'L0', 'conditionally_safe')
    }
    const host = url.hostname.toLowerCase()
    if (listed(this.config.domains.deny, host, this.config.domains.subdomainMode)) {
      return deny('DOMAIN_BLOCKED', '该域名在禁止列表中。', 'L0', 'conditionally_safe')
    }
    const allowed = this.config.domains.allow
    if (!allowed.length || !listed(allowed, host, this.config.domains.subdomainMode)) {
      return deny('DOMAIN_BLOCKED', '该域名不在允许列表中。', 'L0', 'conditionally_safe')
    }
    if (type === 'goto' && currentUrl && !this.config.domains.allowCrossOrigin) {
      try {
        const current = new URL(currentUrl)
        if (current.hostname && current.hostname !== host) return deny('DOMAIN_BLOCKED', '当前策略不允许跨域跳转。', 'L1', 'conditionally_safe')
      } catch { /* 当前页为空时允许第一次导航 */ }
    }
    return { ok: true }
  }

  /** 覆盖规则只能维持或提高确认强度，不能把 L2/L3 改成自动放行。 */
  decisionFor(risk, type, url, element) {
    let decision = this.config.risk[risk] || 'confirm'
    for (const rule of this.config.risk.overrides || []) {
      if (!overrideMatches(rule, { risk, type, url, element })) continue
      if ((risk === 'L2' || risk === 'L3') && rule.decision === 'allow') continue
      decision = stronger(decision, rule.decision)
    }
    if (risk === 'L2' && decision !== 'confirm') decision = 'confirm'
    if (risk === 'L3' && decision === 'allow') decision = 'deny'
    return decision
  }
}

function listed(list, host, mode) {
  return list.some((item) => {
    if (mode === 'exact') return host === item
    return host === item || host.endsWith(`.${item}`)
  })
}

function overrideMatches(rule, ctx) {
  if (rule.risk && rule.risk !== ctx.risk) return false
  if (rule.action && rule.action !== ctx.type) return false
  if (rule.domain && ctx.url) {
    try {
      const host = new URL(ctx.url).hostname.toLowerCase()
      if (host !== rule.domain && !host.endsWith(`.${rule.domain}`)) return false
    } catch { return false }
  }
  const text = elementText(ctx.element)
  if (rule.role && ctx.element?.role !== rule.role) return false
  if (rule.text && !text.includes(rule.text)) return false
  if (rule.selector && ctx.element?.selector !== rule.selector && !ctx.element?.locatorCandidates?.some((item) => item.value === rule.selector)) return false
  if (rule.urlPattern && ctx.url && !safePattern(rule.urlPattern, ctx.url)) return false
  if (!rule.domain && !rule.action && !rule.role && !rule.text && !rule.selector && !rule.urlPattern && !rule.risk) return false
  return true
}

function safePattern(pattern, value) {
  try { return new RegExp(pattern).test(value) } catch { return false }
}

function stronger(current, next) {
  const rank = { allow: 0, confirm: 1, deny: 2 }
  return rank[next] > rank[current] ? next : current
}

function deny(code, message, risk, idempotency) {
  return { ok: false, allowed: false, code, message, risk, idempotency, needsApproval: false, decision: 'deny' }
}

function consequenceFor(type, risk, element) {
  const name = elementText(element).slice(0, 40) || type
  if (risk === 'L3') return `该操作涉及高风险目标「${name}」，可能不可逆，且不会读取秘密。`
  if (risk === 'L2') return `该操作会向页面提交或传输数据（${name}），并可能修改远端状态。`
  if (type === 'goto') return '将打开允许列表中的地址。'
  return `将在页面内执行 ${type}。`
}
