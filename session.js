/** 会话状态机：starting、ready、busy、paused、closed、error。 */
export class SessionManager {
  constructor({ clock = Date.now, ids, maxConcurrent = 2, ttlMs = 30 * 60 * 1000 } = {}) {
    this.clock = clock
    this.ids = ids
    this.maxConcurrent = maxConcurrent
    this.ttlMs = ttlMs
    this.sessions = new Map()
  }

  configure({ maxConcurrent, ttlMs }) {
    if (maxConcurrent) this.maxConcurrent = maxConcurrent
    if (ttlMs) this.ttlMs = ttlMs
  }

  active() {
    return [...this.sessions.values()].filter((item) => item.status !== 'closed')
  }

  create({ profileId, persistent, name, capabilities }) {
    this.sweep()
    const alive = this.active()
    if (alive.length >= this.maxConcurrent) {
      const error = new Error('已达到最大并发会话数。')
      error.code = 'CONCURRENCY_LIMIT'
      throw error
    }
    if (persistent && alive.some((item) => item.profileId === profileId)) {
      const error = new Error('该持久 Profile 已被另一个会话占用。')
      error.code = 'PROFILE_LOCKED'
      throw error
    }
    const now = this.clock()
    const session = {
      id: this.ids('session'),
      name: String(name || '').slice(0, 80),
      profileId,
      persistent: persistent === true,
      status: 'starting',
      createdAt: new Date(now).toISOString(),
      lastUsedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.ttlMs).toISOString(),
      currentPageId: '',
      url: '',
      capabilities: [...capabilities],
    }
    this.sessions.set(session.id, session)
    return session
  }

  findReusable(profileId) {
    this.sweep()
    return this.active().find((item) => item.profileId === profileId && (item.status === 'ready' || item.status === 'paused'))
  }

  get(id) {
    this.sweep()
    return this.sessions.get(id)
  }

  mark(id, status) {
    const session = this.sessions.get(id)
    if (!session || session.status === 'closed') return session
    session.status = status
    return session
  }

  touch(id, patch = {}) {
    const session = this.sessions.get(id)
    if (!session) return undefined
    const now = this.clock()
    session.lastUsedAt = new Date(now).toISOString()
    session.expiresAt = new Date(now + this.ttlMs).toISOString()
    Object.assign(session, patch)
    return session
  }

  pause(id) {
    const session = this.requireOpen(id)
    if (session.status === 'paused') return session
    if (!['ready', 'busy'].includes(session.status)) {
      const error = new Error('当前状态不能暂停。')
      error.code = 'PERMISSION_DENIED'
      throw error
    }
    session.status = 'paused'
    return session
  }

  resume(id) {
    const session = this.requireOpen(id)
    if (session.status !== 'paused') {
      const error = new Error('只有暂停中的会话可以恢复。')
      error.code = 'PERMISSION_DENIED'
      throw error
    }
    session.status = 'ready'
    this.touch(id)
    return session
  }

  close(id) {
    const session = this.sessions.get(id)
    if (!session || session.status === 'closed') {
      const error = new Error('找不到可关闭的会话。')
      error.code = 'SESSION_NOT_FOUND'
      throw error
    }
    session.status = 'closed'
    return session
  }

  requireReady(id) {
    const session = this.requireOpen(id)
    if (session.status === 'paused') {
      const error = new Error('会话已暂停。')
      error.code = 'SESSION_PAUSED'
      throw error
    }
    if (session.status === 'error') {
      const error = new Error('浏览器连接已断开。')
      error.code = 'BROWSER_DISCONNECTED'
      throw error
    }
    if (session.status !== 'ready' && session.status !== 'busy') {
      const error = new Error('会话还不能接收动作。')
      error.code = 'SESSION_NOT_FOUND'
      throw error
    }
    return session
  }

  requireOpen(id) {
    const session = this.sessions.get(id)
    if (!session || session.status === 'closed') {
      const error = new Error('找不到会话。')
      error.code = 'SESSION_NOT_FOUND'
      throw error
    }
    if (Date.parse(session.expiresAt) <= this.clock()) {
      session.status = 'closed'
      const error = new Error('会话已过期。')
      error.code = 'SESSION_EXPIRED'
      throw error
    }
    return session
  }

  sweep() {
    const now = this.clock()
    const expired = []
    for (const session of this.sessions.values()) {
      if (session.status === 'closed') continue
      if (Date.parse(session.expiresAt) <= now) {
        session.status = 'closed'
        expired.push(session)
      }
    }
    return expired
  }
}
