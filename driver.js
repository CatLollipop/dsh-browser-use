/** 浏览器驱动接口的进程内替身。真实环境使用官方 WebBridge，测试使用这里。 */
import { materializeFixture } from './fixtures.js'

export class DisconnectedDriver {
  constructor() {
    this.connected = false
  }

  async status() {
    return { connected: false, browser: '', endpoint: '' }
  }

  async assertConnected() {
    const error = new Error('浏览器未连接。')
    error.code = 'BROWSER_DISCONNECTED'
    throw error
  }

  async goto() { return this.assertConnected() }
  async snapshot() { return this.assertConnected() }
  async click() { return this.assertConnected() }
  async type() { return this.assertConnected() }
  async select() { return this.assertConnected() }
  async press() { return this.assertConnected() }
  async scroll() { return this.assertConnected() }
  async screenshot() { return this.assertConnected() }
  async upload() { return this.assertConnected() }
  async download() { return this.assertConnected() }
  async back() { return this.assertConnected() }
  async reload() { return this.assertConnected() }
  async closeProfile() {}
}

export class MockBrowser {
  constructor() {
    this.connected = true
    this.profiles = new Map()
    this.calls = []
    this.failScrolls = 0
  }

  disconnect() {
    this.connected = false
  }

  profile(profileId) {
    if (!this.profiles.has(profileId)) {
      this.profiles.set(profileId, { history: [], index: -1, cookies: new Map(), submits: 0, downloads: [] })
    }
    return this.profiles.get(profileId)
  }

  async status() {
    return { connected: this.connected, browser: 'mock', endpoint: 'mock://fixture' }
  }

  async goto(profileId, url) {
    this.ensure(profileId)
    this.note('goto', url)
    const state = this.profile(profileId)
    const page = materializeFixture(url)
    state.history = state.history.slice(0, state.index + 1)
    state.history.push(page)
    state.index += 1
    return this.snapshot(profileId)
  }

  async back(profileId) {
    this.ensure(profileId)
    this.note('back')
    const state = this.profile(profileId)
    if (state.index <= 0) {
      const error = new Error('没有可以返回的页面。')
      error.code = 'NAVIGATION_FAILED'
      throw error
    }
    state.index -= 1
    return this.snapshot(profileId)
  }

  async reload(profileId) {
    this.ensure(profileId)
    this.note('reload')
    const page = this.current(profileId)
    const fresh = materializeFixture(page.url)
    fresh.flags = { ...page.flags }
    this.profile(profileId).history[this.profile(profileId).index] = fresh
    return this.snapshot(profileId)
  }

  async snapshot(profileId) {
    this.ensure(profileId)
    const page = this.current(profileId)
    const revealed = page.revealed === true
    const elements = page.elements
      .filter((item) => (page.dynamic ? revealed || item.visible : true))
      .map((item) => ({ ...item, value: undefined }))
    return {
      url: page.url,
      title: page.title,
      visibleText: page.visibleText,
      loadState: page.loadState,
      networkIdle: page.networkIdle,
      domStable: page.domStable,
      downloadDone: page.downloadDone === true,
      domVersion: `${page.url}#${page.domEpoch || 1}:${revealed ? 'shown' : 'base'}`,
      elements,
      flags: { ...page.flags },
      sensitive: elements.some((item) => item.inputType === 'password' || /token|验证码/i.test(`${item.name} ${item.label}`)),
    }
  }

  async click(profileId, ref) {
    this.ensure(profileId)
    this.note('click', ref)
    if (this.failNext) return this.consumeFailure()
    const page = this.current(profileId)
    const element = page.elements.find((item) => item.ref === ref)
    if (!element) {
      const error = new Error('元素不存在。')
      error.code = 'ELEMENT_NOT_FOUND'
      throw error
    }
    element.clicked = (element.clicked || 0) + 1
    if (element.href) return this.goto(profileId, element.href)
    if (element.testId === 'submit-order') this.profile(profileId).submits += 1
    if (element.testId === 'disable-security') page.flags.securityOff = true
    return this.snapshot(profileId)
  }

  async type(profileId, ref, text) {
    this.ensure(profileId)
    this.note('type', ref)
    const page = this.current(profileId)
    const element = page.elements.find((item) => item.ref === ref)
    if (!element) {
      const error = new Error('元素不存在。')
      error.code = 'ELEMENT_NOT_FOUND'
      throw error
    }
    element.value = text
    return this.snapshot(profileId)
  }

  async select(profileId, ref, value) {
    this.ensure(profileId)
    this.note('select', ref)
    const page = this.current(profileId)
    const element = page.elements.find((item) => item.ref === ref)
    if (!element) {
      const error = new Error('元素不存在。')
      error.code = 'ELEMENT_NOT_FOUND'
      throw error
    }
    element.selected = value
    return this.snapshot(profileId)
  }

  async press(profileId, key) {
    this.ensure(profileId)
    this.note('press', key)
    const page = this.current(profileId)
    page.lastKey = key
    return this.snapshot(profileId)
  }

  async scroll(profileId) {
    this.ensure(profileId)
    this.note('scroll')
    if (this.failScrolls > 0) {
      this.failScrolls -= 1
      const error = new Error('滚动暂时失败。')
      error.code = 'TIMEOUT'
      throw error
    }
    this.current(profileId).scrolled = true
    return this.snapshot(profileId)
  }

  async screenshot(profileId) {
    this.ensure(profileId)
    const snap = await this.snapshot(profileId)
    if (snap.sensitive) return { redacted: true, bytes: null }
    return { redacted: false, bytes: 'mock-png', mediaType: 'image/png' }
  }

  async upload(profileId, ref, file) {
    this.ensure(profileId)
    this.note('upload', file?.name)
    const page = this.current(profileId)
    page.uploads = [...(page.uploads || []), { ref, name: file.name, size: file.size }]
    return this.snapshot(profileId)
  }

  async download(profileId, ref) {
    this.ensure(profileId)
    this.note('download', ref)
    const file = { name: 'report.csv', bytes: 12, relativePath: 'report.csv' }
    this.profile(profileId).downloads.push(file)
    this.current(profileId).downloadDone = true
    return file
  }

  async closeProfile(profileId) {
    this.profiles.delete(profileId)
  }

  reveal(profileId) {
    const page = this.current(profileId)
    page.revealed = true
    for (const element of page.elements) {
      element.visible = true
      element.enabled = true
    }
    page.visibleText = '稍后出现的按钮已经可用'
  }

  bumpDom(profileId) {
    const page = this.current(profileId)
    page.domEpoch = (page.domEpoch || 1) + 1
    for (const element of page.elements) element.ref = `${element.ref}x`
  }

  writeCookie(profileId, name, value) {
    this.profile(profileId).cookies.set(name, value)
  }

  cookies(profileId) {
    return Object.fromEntries(this.profile(profileId).cookies)
  }

  current(profileId) {
    const state = this.profile(profileId)
    if (state.index < 0) {
      const error = new Error('会话还没有页面。')
      error.code = 'NAVIGATION_FAILED'
      throw error
    }
    return state.history[state.index]
  }

  ensure(profileId) {
    if (!this.connected) {
      const error = new Error('浏览器连接已断开。')
      error.code = 'BROWSER_DISCONNECTED'
      throw error
    }
    if (!profileId) {
      const error = new Error('Profile 不可用。')
      error.code = 'PROFILE_LOCKED'
      throw error
    }
  }

  note(type, detail) {
    this.calls.push({ type, detail })
  }

  count(type) {
    return this.calls.filter((item) => item.type === type).length
  }

  failNextSubmit() {
    this.failNext = { code: 'TIMEOUT', message: '提交超时。' }
  }

  consumeFailure() {
    const failure = this.failNext
    this.failNext = null
    const error = new Error(failure.message)
    error.code = failure.code
    throw error
  }
}
