/** 真实浏览器驱动：复用本机 Chromium 的 CDP，不另起一套浏览器运行时。 */
import { setTimeout as delay } from 'node:timers/promises'

function fail(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

/** 调试地址只接受 http(s)，默认还必须是本机。 */
export function normalizeEndpoint(raw, allowRemote = false) {
  const text = String(raw || '').trim()
  if (!text) throw fail('BROWSER_DISCONNECTED', '还没有填写远程浏览器地址。')
  let url
  try { url = new URL(text) } catch { throw fail('BROWSER_DISCONNECTED', '远程浏览器地址格式不正确。') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw fail('BROWSER_DISCONNECTED', '调试地址不能携带账号、密码或非 http(s) 协议。')
  }
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
  if (!loopback && !allowRemote) throw fail('BROWSER_DISCONNECTED', '默认只连接本机调试端口。')
  return url.origin
}

const SNAPSHOT_EXPRESSION = `(() => {
  const nodes = Array.from(document.querySelectorAll('a,button,input,select,textarea,[role]')).slice(0, 200);
  const cssPath = (el) => {
    const testId = el.getAttribute('data-testid') || '';
    if (testId && !/["\\\\]/.test(testId)) return '[data-testid="' + testId + '"]';
    if (el.id && /^[A-Za-z][\\w-]*$/.test(el.id)) return '#' + el.id;
    const tag = el.tagName.toLowerCase();
    const parent = el.parentElement;
    if (!parent) return tag;
    const index = Array.from(parent.children).filter((child) => child.tagName === el.tagName).indexOf(el) + 1;
    return cssPath(parent) + ' > ' + tag + ':nth-of-type(' + index + ')';
  };
  const elements = nodes.map((el, index) => {
    const type = (el.getAttribute('type') || '').toLowerCase();
    const hint = [el.getAttribute('name'), el.getAttribute('aria-label'), el.getAttribute('placeholder'), el.innerText].join(' ');
    const sensitive = type === 'password' || /password|passwd|token|cookie|otp|api[-_]?key|验证码|密码|令牌/i.test(hint);
    const rect = el.getBoundingClientRect();
    return {
      ref: 'e' + (index + 1),
      role: el.getAttribute('role') || el.tagName.toLowerCase(),
      name: sensitive ? '' : String(el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 120),
      label: sensitive ? '' : String(el.getAttribute('aria-label') || '').slice(0, 120),
      text: sensitive ? '' : String(el.innerText || '').trim().slice(0, 160),
      placeholder: sensitive ? '' : String(el.getAttribute('placeholder') || '').slice(0, 120),
      tag: el.tagName.toLowerCase(),
      testId: el.getAttribute('data-testid') || '',
      inputType: type,
      type: type === 'submit' ? 'submit' : '',
      href: el.href && String(el.href).startsWith('http') ? el.href : '',
      visible: rect.width > 0 && rect.height > 0,
      enabled: !el.disabled,
      sensitive,
      bbox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      selector: cssPath(el),
    };
  });
  return {
    url: location.href,
    title: document.title,
    visibleText: String((document.body && document.body.innerText) || '').slice(0, 8000),
    loadState: document.readyState === 'complete' ? 'complete' : 'loading',
    networkIdle: document.readyState === 'complete',
    domStable: true,
    domVersion: location.href + '#' + elements.length,
    elements,
    sensitive: elements.some((item) => item.sensitive || item.inputType === 'password'),
  };
})()`

/** 把 CDP 页面适配成引擎使用的驱动。上传和下载在这条驱动上保持拒绝。 */
export class CdpBrowserDriver {
  constructor(getConfig) {
    this.getConfig = getConfig
    this.ws = null
    this.targetId = ''
    this.nextId = 1
    this.pending = new Map()
    this.selectors = new Map()
    this.connected = false
  }

  endpoint() {
    const config = this.getConfig() || {}
    return normalizeEndpoint(config.remoteEndpoint, config.allowRemoteEndpoint === true)
  }

  async status() {
    try {
      const version = await this.requestJson('/json/version')
      this.connected = true
      return { connected: true, browser: String(version?.Browser || ''), endpoint: this.endpoint() }
    } catch {
      this.connected = false
      return { connected: false, browser: '', endpoint: '' }
    }
  }

  async goto(_profileId, url) {
    await this.ensureSocket()
    await this.send('Page.navigate', { url: String(url) })
    await delay(400)
    return this.snapshot()
  }

  async back() {
    await this.ensureSocket()
    const history = await this.send('Page.getNavigationHistory')
    const index = Number(history?.currentIndex || 0) - 1
    const entry = history?.entries?.[index]
    if (!entry) throw fail('NAVIGATION_FAILED', '没有可以返回的页面。')
    await this.send('Page.navigateToHistoryEntry', { entryId: entry.id })
    await delay(300)
    return this.snapshot()
  }

  async reload() {
    await this.ensureSocket()
    await this.send('Page.reload', { ignoreCache: false })
    await delay(400)
    return this.snapshot()
  }

  async snapshot() {
    await this.ensureSocket()
    const raw = await this.evaluate(SNAPSHOT_EXPRESSION)
    if (!raw || typeof raw !== 'object') throw fail('NAVIGATION_FAILED', '页面没有返回可读快照。')
    this.selectors = new Map((raw.elements || []).map((item) => [item.ref, item.selector]))
    return raw
  }

  async click(_profileId, ref) {
    const selector = this.selectors.get(ref)
    if (!selector) throw fail('STALE_ELEMENT', '元素引用已失效。')
    const point = await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`)
    if (!point) throw fail('ELEMENT_NOT_FOUND', '页面上已经没有这个元素。')
    const mouse = { x: Math.round(point.x), y: Math.round(point.y), button: 'left', clickCount: 1 }
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...mouse })
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...mouse })
    await delay(200)
    return this.snapshot()
  }

  async type(_profileId, ref, text) {
    const selector = this.selectors.get(ref)
    if (!selector) throw fail('STALE_ELEMENT', '元素引用已失效。')
    const blocked = await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return 'missing';
      el.focus();
      return el.type === 'password' ? 'password' : 'ok';
    })()`)
    if (blocked === 'missing') throw fail('ELEMENT_NOT_FOUND', '页面上已经没有这个元素。')
    if (blocked === 'password') throw fail('SENSITIVE_DATA_BLOCKED', 'CDP 驱动拒绝向密码框写入。')
    await this.send('Input.insertText', { text: String(text ?? '') })
    return this.snapshot()
  }

  async select(_profileId, ref, value) {
    const selector = this.selectors.get(ref)
    if (!selector) throw fail('STALE_ELEMENT', '元素引用已失效。')
    const ok = await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.value = ${JSON.stringify(String(value ?? ''))};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`)
    if (!ok) throw fail('ELEMENT_NOT_FOUND', '页面上已经没有这个元素。')
    return this.snapshot()
  }

  async press(_profileId, key) {
    const name = String(key || 'Enter')
    await this.ensureSocket()
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name })
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name })
    return this.snapshot()
  }

  async scroll(_profileId, input = {}) {
    const deltaY = Math.max(-4000, Math.min(4000, Math.round(Number(input.deltaY || input.y || 600))))
    await this.ensureSocket()
    await this.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 10, y: 10, deltaX: 0, deltaY })
    return this.snapshot()
  }

  async screenshot() {
    const page = await this.snapshot()
    if (page.sensitive) return { redacted: true, bytes: null }
    return { redacted: true, bytes: null, note: '截图字节不进入普通结果，只保留遮罩标记。' }
  }

  async upload() {
    throw fail('UPLOAD_BLOCKED', 'CDP 驱动不接收页面发起的文件读取；请使用受控的本地夹具或人工上传。')
  }

  async download() {
    throw fail('DOWNLOAD_BLOCKED', 'CDP 驱动不把下载内容写入任意路径。')
  }

  async closeProfile() {}

  async requestJson(pathname) {
    const response = await fetch(`${this.endpoint()}${pathname}`, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw fail('BROWSER_DISCONNECTED', '调试端口没有正常响应。')
    return response.json()
  }

  async ensureSocket() {
    if (this.ws && this.ws.readyState === 1) return
    const tabs = await this.requestJson('/json/list')
    const page = (Array.isArray(tabs) ? tabs : []).find((item) => item.type === 'page' && item.webSocketDebuggerUrl)
    if (!page) throw fail('BROWSER_DISCONNECTED', '调试端口上没有可控制的页面。')
    this.targetId = page.id
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(page.webSocketDebuggerUrl)
      const timer = setTimeout(() => reject(fail('BROWSER_DISCONNECTED', '连接调试通道超时。')), 8000)
      socket.addEventListener('open', () => { clearTimeout(timer); resolve() })
      socket.addEventListener('error', () => { clearTimeout(timer); reject(fail('BROWSER_DISCONNECTED', '调试通道连接失败。')) })
      socket.addEventListener('message', (event) => this.onMessage(event.data))
      socket.addEventListener('close', () => { this.connected = false; this.ws = null })
      this.ws = socket
    })
    this.connected = true
    await this.send('Page.enable')
    await this.send('Runtime.enable')
  }

  onMessage(raw) {
    let message
    try { message = JSON.parse(String(raw)) } catch { return }
    const pending = this.pending.get(message.id)
    if (!pending) return
    this.pending.delete(message.id)
    clearTimeout(pending.timer)
    if (message.error) pending.reject(fail('NAVIGATION_FAILED', '浏览器拒绝了这次调用。'))
    else pending.resolve(message.result)
  }

  send(method, params = {}) {
    const socket = this.ws
    if (!socket || socket.readyState !== 1) return Promise.reject(fail('BROWSER_DISCONNECTED', '调试通道已断开。'))
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(fail('TIMEOUT', '浏览器调用超时。'))
      }, 15000)
      this.pending.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result?.exceptionDetails) throw fail('NAVIGATION_FAILED', '页面脚本执行失败。')
    return result?.result?.value
  }
}
