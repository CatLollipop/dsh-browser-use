/** 审批只绑定一条动作。过期、撤销或被用过的审批不能给下一次副作用复用。 */

const OPEN = new Set(['pending', 'approved'])

export class ApprovalManager {
  constructor({ clock = Date.now, ids, ttlMs = 5 * 60 * 1000 } = {}) {
    this.clock = clock
    this.ids = ids || (() => `approval_${Math.random().toString(36).slice(2, 10)}`)
    this.ttlMs = ttlMs
    this.items = new Map()
  }

  create({ actionId, actionType = '', targetKey = '', risk, domain, targetSummary, dataPreview, consequence }) {
    const now = this.clock()
    const item = {
      id: this.ids(),
      actionId,
      actionType,
      targetKey,
      risk,
      domain: domain || '',
      targetSummary: String(targetSummary || '').slice(0, 160),
      dataPreview: dataPreview || '',
      consequence: String(consequence || '').slice(0, 300),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.ttlMs).toISOString(),
      status: 'pending',
      used: false,
      actor: '',
      decidedAt: '',
    }
    this.items.set(item.id, item)
    return clone(item)
  }

  list() {
    this.expire()
    return [...this.items.values()].map(clone).reverse()
  }

  get(id) {
    this.expire()
    const item = this.items.get(id)
    return item ? clone(item) : undefined
  }

  /** 只有用户路径可以改变结论。 */
  respond(id, decision, actor = 'user') {
    this.expire()
    const item = this.items.get(id)
    if (!item) return { ok: false, code: 'APPROVAL_INVALID', message: '找不到审批。' }
    if (item.status !== 'pending') return { ok: false, code: 'APPROVAL_INVALID', message: '审批已经结束。' }
    if (!['approved', 'rejected'].includes(decision)) return { ok: false, code: 'APPROVAL_INVALID', message: '只能批准或拒绝。' }
    item.status = decision
    item.actor = String(actor || 'user').slice(0, 80)
    item.decidedAt = new Date(this.clock()).toISOString()
    return { ok: true, approval: clone(item) }
  }

  revoke(id, actor = 'user') {
    this.expire()
    const item = this.items.get(id)
    if (!item) return { ok: false, code: 'APPROVAL_INVALID', message: '找不到审批。' }
    if (!OPEN.has(item.status) || item.used) return { ok: false, code: 'APPROVAL_INVALID', message: '该审批不能再撤销。' }
    item.status = 'revoked'
    item.actor = String(actor || 'user').slice(0, 80)
    item.decidedAt = new Date(this.clock()).toISOString()
    return { ok: true, approval: clone(item) }
  }

  /** 使用审批。动作 id 必须一致，且只能成功一次。 */
  consume(id, actionId) {
    this.expire()
    const item = this.items.get(id)
    if (!item) return { ok: false, code: 'APPROVAL_INVALID', message: '找不到审批。' }
    if (item.status === 'expired') return { ok: false, code: 'APPROVAL_INVALID', message: '审批已过期。' }
    if (item.status !== 'approved' || item.used) return { ok: false, code: 'APPROVAL_INVALID', message: '审批不可用。' }
    if (item.actionId !== actionId) return { ok: false, code: 'APPROVAL_INVALID', message: '审批不能用于其他动作。' }
    item.used = true
    return { ok: true, approval: clone(item) }
  }

  expire() {
    const now = this.clock()
    for (const item of this.items.values()) {
      if (item.status === 'pending' && Date.parse(item.expiresAt) <= now) item.status = 'expired'
    }
  }
}

function clone(item) {
  return { ...item }
}
