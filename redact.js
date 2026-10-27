/** 脱敏。密码、Cookie、Token、验证码和卡号只允许留下“存在”这个事实。 */

const SECRET_KEYS = /password|passwd|pwd|secret|token|cookie|authorization|api[-_]?key|otp|验证码|密码|令牌/i
const INLINE_SECRET = /(?:bearer\s+)[a-z0-9._~+/-]{6,}|((?:password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|otp)\s*[:=]\s*)(\S+)/gi
const CARD = /\b(?:\d[ -]*?){13,19}\b/g

/** 折叠一段可能含秘密的文本。空值保持空串。 */
export function scrubText(value) {
  return String(value ?? '')
    .replace(/bearer\s+[a-z0-9._~+/=-]{8,}/gi, '[REDACTED]')
    .replace(/(?:password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|otp|验证码|密码|令牌)\s*[:=]\s*\S+(?:\s+\[REDACTED\])?/gi, '[REDACTED]')
    .replace(CARD, (match) => (digits(match).length >= 13 ? maskCard(match) : match))
}

function digits(value) {
  return String(value).replace(/\D/g, '')
}

function maskCard(value) {
  const raw = digits(value)
  return `${raw.slice(0, 4)}[REDACTED]${raw.slice(-4)}`
}

/** 判断字段名或元素语义是否属于敏感输入。 */
export function isSensitiveField(field = {}) {
  if (field.sensitive === true) return true
  const bag = [field.name, field.label, field.placeholder, field.text, field.role, field.inputType, field.kind]
    .filter(Boolean)
    .join(' ')
  if (String(field.inputType || '').toLowerCase() === 'password') return true
  return SECRET_KEYS.test(bag)
}

/** 递归脱敏普通对象。敏感键只保留 present，不保留值、哈希或原文。 */
export function redactValue(value, depth = 0) {
  if (depth > 6) return '[TRUNCATED]'
  if (value == null) return value
  if (typeof value === 'string') return scrubText(value).slice(0, 2000)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactValue(item, depth + 1))
  if (typeof value !== 'object') return scrubText(value)
  const out = {}
  for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEYS.test(key)) out[key] = { present: item != null && item !== '', redacted: true }
    else out[key] = redactValue(item, depth + 1)
  }
  return out
}

/** 记录敏感输入时只留下类型和是否存在。 */
export function redactInput(input, field) {
  if (!isSensitiveField(field) && !looksSecret(input)) return redactValue(input)
  return { present: input != null && input !== '', redacted: true, kind: sensitiveKind(field, input) }
}

function looksSecret(input) {
  if (typeof input === 'string') {
    return /bearer\s+\S+/i.test(input)
      || /(?:password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|otp)\s*[:=]\s*\S+/i.test(input)
      || /\b\d{13,19}\b/.test(input)
  }
  if (input && typeof input === 'object') return Object.keys(input).some((key) => SECRET_KEYS.test(key))
  return false
}

function sensitiveKind(field, input) {
  const bag = `${field?.inputType || ''} ${field?.name || ''} ${field?.label || ''} ${typeof input === 'string' ? input.slice(0, 32) : ''}`
  if (/password|密码/i.test(bag)) return 'password'
  if (/otp|验证码/i.test(bag)) return 'otp'
  if (/cookie/i.test(bag)) return 'cookie'
  if (/token|authorization|api[-_]?key|令牌/i.test(bag)) return 'token'
  return 'secret'
}
