/** 官方 Kimi WebBridge 客户端。只连接本机回环地址，不自建桥，也不主动停止服务。 */

import { spawn } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { browserIdsFromTabs } from './browsers.js'

export const INSTALL_PAGE = 'https://www.kimi.com/products/kimi-browser-extension'
export const DEFAULT_ADDR = '127.0.0.1:10086'

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1'])

export function binaryPath(home = homedir()) {
  const name = process.platform === 'win32' ? 'kimi-webbridge.exe' : 'kimi-webbridge'
  return path.join(home, '.kimi-webbridge', 'bin', name)
}

/** 把 host:port 收成回环 origin。非本机地址直接拒绝。 */
export function loopbackOrigin(addr = DEFAULT_ADDR) {
  const text = String(addr || '').trim()
  if (!text) {
    const error = new Error('WebBridge 地址为空。')
    error.code = 'BROWSER_DISCONNECTED'
    throw error
  }
  let url
  try { url = new URL(text.includes('://') ? text : `http://${text}`) } catch {
    const error = new Error('WebBridge 地址格式不正确。')
    error.code = 'BROWSER_DISCONNECTED'
    throw error
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !LOOPBACK.has(url.hostname)) {
    const error = new Error('只连接本机 Kimi WebBridge，不使用带账号或非本机的地址。')
    error.code = 'BROWSER_DISCONNECTED'
    throw error
  }
  return url.origin
}

export function createWebBridge(options = {}) {
  const fetchImpl = options.fetch || globalThis.fetch
  const spawnImpl = options.spawn || spawn
  const home = options.home || homedir()
  const readFileImpl = options.readFile || readFile
  const accessImpl = options.access || access

  async function installed() {
    if (typeof options.installed === 'boolean') return options.installed
    try {
      await accessImpl(binaryPath(home))
      return true
    } catch {
      return false
    }
  }

  async function origin() {
    if (options.addr) return loopbackOrigin(options.addr)
    try {
      const raw = await readFileImpl(path.join(home, '.kimi-webbridge', 'config.json'), 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed?.addr) return loopbackOrigin(parsed.addr)
    } catch { /* 没有自定义端口时用默认地址 */ }
    return loopbackOrigin(DEFAULT_ADDR)
  }

  async function status() {
    const present = await installed()
    let base = ''
    try { base = await origin() } catch (error) {
      return { running: false, extension_connected: false, installed: present, addr: '', message: error.message }
    }
    const addr = base.replace(/^https?:\/\//, '')
    try {
      const response = await fetchImpl(`${base}/status`, { signal: AbortSignal.timeout(2000) })
      const body = await response.json()
      if (!body || typeof body !== 'object' || typeof body.running !== 'boolean') {
        return { running: false, extension_connected: false, installed: present, addr, message: '这个端口上的服务不是 Kimi WebBridge。' }
      }
      return {
        running: body.running === true,
        extension_connected: body.extension_connected === true,
        extension_version: String(body.extension_version || ''),
        version: String(body.version || ''),
        installed: true,
        addr,
      }
    } catch {
      return { running: false, extension_connected: false, installed: present, addr }
    }
  }

  async function start() {
    const current = await status()
    if (current.running) return current
    if (!current.installed) {
      return { ...current, message: '还没有安装 Kimi WebBridge。' }
    }
    const bin = binaryPath(home)
    const outcome = await runStart(spawnImpl, bin)
    const again = await status()
    if (!again.running) {
      return { ...again, message: outcome.err || outcome.out || 'Kimi WebBridge 没有启动。' }
    }
    return again
  }

  async function command({ action, args = {}, session = 'dsh' }) {
    const base = await origin()
    const response = await fetchImpl(`${base}/command`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: String(action || ''), args, session: String(session || 'dsh') }),
      signal: AbortSignal.timeout(30000),
    })
    let body
    try { body = await response.json() } catch {
      const error = new Error('Kimi WebBridge 没有返回 JSON。')
      error.code = 'BROWSER_DISCONNECTED'
      throw error
    }
    if (!body || body.ok !== true) {
      const error = new Error(body?.error?.message || 'Kimi WebBridge 命令失败。')
      error.code = body?.error?.code === 'extension_not_connected' ? 'BROWSER_DISCONNECTED' : 'NAVIGATION_FAILED'
      throw error
    }
    return body.data
  }

  async function connectedBrowserIds() {
    try {
      const data = await command({ action: 'list_browser_tabs', args: {}, session: 'dsh-settings' })
      return browserIdsFromTabs(data?.tabs)
    } catch {
      return []
    }
  }

  return { installPage: INSTALL_PAGE, origin, status, start, command, connectedBrowserIds }
}

function runStart(spawnImpl, bin) {
  return new Promise((resolve) => {
    let child
    try {
      child = spawnImpl(bin, ['start'], { stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      resolve({ code: 1, out: '', err: error.message })
      return
    }
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM') } catch { /* 进程可能已经退出 */ }
    }, 15000)
    child.stdout?.on?.('data', (chunk) => { out += chunk })
    child.stderr?.on?.('data', (chunk) => { err += chunk })
    child.on?.('error', (error) => {
      clearTimeout(timer)
      resolve({ code: 1, out, err: error.message })
    })
    child.on?.('close', (code) => {
      clearTimeout(timer)
      resolve({ code, out: clip(out), err: clip(err) })
    })
  })
}

function clip(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 240)
}
