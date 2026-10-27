/** 把官方 Kimi WebBridge 命令适配成引擎使用的驱动。登录态留在用户自己的 Chrome / Edge 里。 */

import { setTimeout as delay } from 'node:timers/promises'

function fail(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

export function normalizeSnapshot(data) {
  const url = String(data?.url || '')
  const title = String(data?.title || '')
  const tree = data?.tree
  const aria = typeof data?.tree_text === 'string' ? data.tree_text : ''
  const elements = []
  const seen = new Set()
  const add = (refRaw, fields = {}) => {
    const matched = String(refRaw || '').replace(/^@/, '').match(/^e(\d+)$/i)
    if (!matched) return
    const ref = `e${matched[1]}`
    if (seen.has(ref)) return
    seen.add(ref)
    const name = String(fields.name || fields.text || '').slice(0, 120)
    elements.push({
      ref,
      role: String(fields.role || ''),
      name,
      label: String(fields.label || name).slice(0, 120),
      text: String(fields.text || name).slice(0, 160),
      tag: String(fields.tag || ''),
      visible: fields.visible !== false,
      enabled: fields.enabled !== false,
      inputType: String(fields.inputType || ''),
      selector: `@e${matched[1]}`,
    })
  }
  walk(tree, add, 0)
  const blob = aria || (typeof tree === 'string' ? tree : JSON.stringify(tree ?? ''))
  for (const match of blob.matchAll(/@e(\d+)/g)) add(`e${match[1]}`)
  const visibleText = (aria || (typeof tree === 'string' ? tree : collectText(tree))).slice(0, 8000)
  const sensitive = elements.some((item) => /password|passwd|token|otp|验证码|密码/i.test(`${item.name} ${item.inputType}`))
  const edge = `${elements[0]?.ref || ''}:${elements.at(-1)?.ref || ''}`
  return {
    url,
    title,
    visibleText,
    loadState: 'complete',
    networkIdle: true,
    domStable: true,
    domVersion: `${url}#${elements.length}:${edge}`,
    elements,
    sensitive,
  }
}

function walk(node, add, depth) {
  if (!node || depth > 8) return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, add, depth + 1)
    return
  }
  if (typeof node !== 'object') return
  if (node.ref) add(node.ref, node)
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') walk(value, add, depth + 1)
  }
}

function collectText(node, depth = 0) {
  if (!node || depth > 8) return ''
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map((item) => collectText(item, depth + 1)).filter(Boolean).join('\n')
  if (typeof node === 'object') {
    const own = [node.name, node.text].filter((item) => typeof item === 'string').join(' ')
    const nested = Object.values(node).filter((item) => item && typeof item === 'object').map((item) => collectText(item, depth + 1)).join('\n')
    return `${own}\n${nested}`.trim()
  }
  return ''
}

export class WebBridgeDriver {
  constructor({ client, getConfig }) {
    this.client = client
    this.getConfig = getConfig
    this.opened = new Set()
    this.connected = false
  }

  sessionName(profileId) {
    const raw = String(profileId || 'task').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)
    return `dsh-${raw || 'task'}`
  }

  async status() {
    const config = this.getConfig() || {}
    const enabled = config.connection?.extensionEnabled === true
    let remote = { running: false, extension_connected: false, installed: false, addr: '' }
    try { remote = await this.client.status() } catch (error) {
      remote = { ...remote, message: error.message }
    }
    const connected = enabled && remote.running === true && remote.extension_connected === true
    this.connected = connected
    return {
      connected,
      browser: remote.extension_version ? `Kimi ${remote.extension_version}` : 'Kimi WebBridge',
      endpoint: remote.addr || '',
      running: remote.running === true,
      extensionConnected: remote.extension_connected === true,
      extensionVersion: remote.extension_version || '',
      installed: remote.installed !== false,
      reason: reasonFor(enabled, remote),
    }
  }

  async ensure() {
    const config = this.getConfig() || {}
    if (config.connection?.extensionEnabled !== true) {
      throw fail('BROWSER_DISCONNECTED', '外部浏览器还没开启。请到设置 → 权限与控制 打开开关，安装页会自动打开。')
    }
    let remote = await this.client.status()
    if (!remote.running && remote.installed !== false) remote = await this.client.start()
    if (!remote.running) {
      throw fail('BROWSER_DISCONNECTED', remote.message || 'Kimi WebBridge 本地服务没有启动。请先从安装页完成安装。')
    }
    if (!remote.extension_connected) {
      throw fail('BROWSER_DISCONNECTED', '浏览器扩展未连接。请打开 Chrome 或 Edge，确认已安装并启用 Kimi 浏览器扩展。')
    }
    this.connected = true
  }

  async command(profileId, action, args) {
    await this.ensure()
    try {
      return await this.client.command({ action, args, session: this.sessionName(profileId) })
    } catch (error) {
      if (error.code === 'BROWSER_DISCONNECTED') this.connected = false
      throw error.code ? error : fail('NAVIGATION_FAILED', error.message || 'Kimi WebBridge 命令失败。')
    }
  }

  async goto(profileId, url) {
    const first = !this.opened.has(profileId)
    await this.command(profileId, 'navigate', {
      url: String(url),
      newTab: first,
      ...(first ? { group_title: 'DeepSeek' } : {}),
    })
    this.opened.add(profileId)
    return this.snapshot(profileId)
  }

  async back(profileId) {
    await this.command(profileId, 'evaluate', { code: 'history.back()' })
    await delay(300)
    return this.snapshot(profileId)
  }

  async reload(profileId) {
    await this.command(profileId, 'evaluate', { code: 'location.reload()' })
    await delay(300)
    return this.snapshot(profileId)
  }

  async snapshot(profileId) {
    const data = await this.command(profileId, 'snapshot', {})
    return normalizeSnapshot(data)
  }

  async click(profileId, ref) {
    await this.command(profileId, 'click', { selector: selectorFor(ref) })
    return this.snapshot(profileId)
  }

  async type(profileId, ref, text) {
    await this.command(profileId, 'fill', { selector: selectorFor(ref), value: String(text ?? '') })
    return this.snapshot(profileId)
  }

  async select(profileId, ref, value) {
    return this.type(profileId, ref, value ?? '')
  }

  async press(profileId, key) {
    const name = String(key || 'Enter').slice(0, 32)
    await this.command(profileId, 'evaluate', {
      code: `document.activeElement&&document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(name)},bubbles:true}))`,
    })
    return this.snapshot(profileId)
  }

  async scroll(profileId, input = {}) {
    const y = Number(input.deltaY ?? input.y ?? 400)
    const delta = Number.isFinite(y) ? y : 400
    await this.command(profileId, 'evaluate', { code: `window.scrollBy(0,${delta})` })
    return this.snapshot(profileId)
  }

  async screenshot(profileId) {
    const snap = await this.snapshot(profileId)
    if (snap.sensitive) return { redacted: true, sensitive: true }
    const file = await this.command(profileId, 'screenshot', { format: 'png' })
    return { redacted: false, path: file?.path || '', sensitive: false }
  }

  async upload(profileId, ref, file) {
    const target = String(file?.path || '')
    if (!target || target.includes('..')) throw fail('UPLOAD_BLOCKED', '上传路径不可用。')
    await this.command(profileId, 'upload', { selector: selectorFor(ref), files: [target] })
    return this.snapshot(profileId)
  }

  async download() {
    throw fail('DOWNLOAD_BLOCKED', '官方 WebBridge 不把下载文件交回插件目录。')
  }

  async closeProfile(profileId) {
    if (!this.opened.has(profileId)) return
    try { await this.command(profileId, 'close_session', {}) } catch { /* 标签组可能已经关掉 */ }
    this.opened.delete(profileId)
  }
}

function selectorFor(ref) {
  const text = String(ref || '')
  if (/^@e\d+$/i.test(text)) return text
  if (/^e\d+$/i.test(text)) return `@${text}`
  if (!text) throw fail('ELEMENT_NOT_FOUND', '缺少元素引用。')
  return text
}

function reasonFor(enabled, remote) {
  if (!enabled) return '外部浏览器还没开启。请到设置 → 权限与控制 打开开关，安装页会自动打开。'
  if (remote.installed === false) return '还没有安装 Kimi WebBridge。请从安装页完成 Chrome 或 Edge 扩展安装。'
  if (!remote.running) return remote.message || 'Kimi WebBridge 本地服务没有在运行。'
  if (!remote.extension_connected) return '浏览器扩展未连接。请打开 Chrome 或 Edge，确认 Kimi 浏览器扩展已启用。'
  return ''
}
