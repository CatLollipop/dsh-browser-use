/** 对用户可见的错误。消息会先脱敏，且不携带页面原文。 */
import { scrubText } from './redact.js'

export const ERROR_CODES = Object.freeze([
  'SESSION_NOT_FOUND',
  'SESSION_EXPIRED',
  'SESSION_PAUSED',
  'DOMAIN_BLOCKED',
  'PERMISSION_DENIED',
  'APPROVAL_REQUIRED',
  'APPROVAL_INVALID',
  'ELEMENT_NOT_FOUND',
  'AMBIGUOUS_TARGET',
  'STALE_ELEMENT',
  'TIMEOUT',
  'NAVIGATION_FAILED',
  'DOWNLOAD_BLOCKED',
  'UPLOAD_BLOCKED',
  'SENSITIVE_DATA_BLOCKED',
  'ACTION_NOT_IDEMPOTENT',
  'PAGE_CHANGED',
  'BROWSER_DISCONNECTED',
  'PROFILE_LOCKED',
  'CONCURRENCY_LIMIT',
  'CONFIG_INVALID',
])

const RECOVERABLE = new Set([
  'SESSION_PAUSED',
  'APPROVAL_REQUIRED',
  'APPROVAL_INVALID',
  'ELEMENT_NOT_FOUND',
  'AMBIGUOUS_TARGET',
  'STALE_ELEMENT',
  'TIMEOUT',
  'PAGE_CHANGED',
  'BROWSER_DISCONNECTED',
  'NAVIGATION_FAILED',
])

/** 构造稳定错误对象。额外字段里的字符串也会脱敏。 */
export function browserError(code, message, extra = {}) {
  const safeCode = ERROR_CODES.includes(code) ? code : 'PERMISSION_DENIED'
  return {
    ok: false,
    status: extra.status || (safeCode === 'APPROVAL_REQUIRED' ? 'approval_required' : 'error'),
    code: safeCode,
    message: scrubText(String(message || '操作被拒绝。')).slice(0, 400),
    recoverable: extra.recoverable ?? RECOVERABLE.has(safeCode),
    next: scrubText(String(extra.next || defaultNext(safeCode))).slice(0, 300),
    actionId: String(extra.actionId || ''),
    traceId: String(extra.traceId || ''),
    approvalId: extra.approvalId ? String(extra.approvalId) : undefined,
    risk: extra.risk,
    consequence: extra.consequence ? scrubText(String(extra.consequence)).slice(0, 300) : undefined,
    candidates: Array.isArray(extra.candidates) ? extra.candidates : undefined,
  }
}

function defaultNext(code) {
  const table = {
    SESSION_NOT_FOUND: '重新创建会话后再试。',
    SESSION_EXPIRED: '会话已过期，请新建会话。',
    SESSION_PAUSED: '先恢复会话，再继续动作。',
    DOMAIN_BLOCKED: '把域名加入允许列表，或停止访问该站点。',
    PERMISSION_DENIED: '在设置中打开对应能力，或放弃这次操作。',
    APPROVAL_REQUIRED: '请用户在「浏览器自动化」设置页批准这一条审批，不要自动重试副作用动作。',
    APPROVAL_INVALID: '原审批不能复用，请为这一次动作重新申请。',
    ELEMENT_NOT_FOUND: '重新读取页面后再定位。',
    AMBIGUOUS_TARGET: '把候选列表交给用户选择，不要猜测。',
    STALE_ELEMENT: '已要求重新快照；请使用新的元素引用。',
    TIMEOUT: '延长等待或改由人工继续。',
    NAVIGATION_FAILED: '确认地址仍在白名单内后重试导航。',
    DOWNLOAD_BLOCKED: '下载能力默认关闭。确认文件类型与目录后再单独批准。',
    UPLOAD_BLOCKED: '上传能力默认关闭。确认文件类型与大小后再单独批准。',
    SENSITIVE_DATA_BLOCKED: '不要读取或回显密码、验证码、Cookie 或 Token。',
    ACTION_NOT_IDEMPOTENT: '副作用动作不会自动重试，请人工确认是否已经生效。',
    PAGE_CHANGED: '页面已变化，重新快照并重新评估风险。',
    BROWSER_DISCONNECTED: '打开设置 → 权限与控制，开启外部浏览器并确认 Kimi 扩展已连接。',
    PROFILE_LOCKED: '关闭占用该 Profile 的会话后再试。',
    CONCURRENCY_LIMIT: '关闭一个会话，或调高并发上限。',
    CONFIG_INVALID: '按字段错误修正配置后再保存。',
  }
  return table[code] || '停止自动重试，并向用户说明当前状态。'
}
