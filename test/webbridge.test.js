import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { defaultConfig, validateConfig } from '../config.js'
import { createEngine } from '../engine.js'
import { INSTALL_PAGE, createWebBridge, loopbackOrigin } from '../webbridge.js'
import { browserIdsFromTabs, rememberBrowsers } from '../browsers.js'
import { toConnectionResult } from '../rpc.js'
import { WebBridgeDriver, normalizeSnapshot } from '../webbridge-driver.js'

test('a connected browser is remembered without its page addresses', () => {
  const ids = browserIdsFromTabs([{ url: 'https://example.com' }, { url: 'edge://newtab/' }, { url: 'chrome://settings/' }])
  assert.deepEqual(ids, ['edge', 'chrome'])
  const remembered = rememberBrowsers(rememberBrowsers([], ids), ['edge'])
  assert.equal(remembered.length, 2)
  assert.equal(JSON.stringify(remembered).includes('example.com'), false)
  const envelope = toConnectionResult({ ok: true, config: { browsers: remembered } })
  assert.equal(envelope.value.config.browsers[0].name, 'Microsoft Edge')
  const failure = toConnectionResult({ ok: false, errors: ['bad'] })
  assert.deepEqual(failure.error.details.errors, ['bad'])
})

test('install page is the official Kimi browser extension page', () => {
  assert.equal(INSTALL_PAGE, 'https://www.kimi.com/products/kimi-browser-extension')
  const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  assert.equal(client.includes(INSTALL_PAGE), true)
  assert.equal(client.includes('window.open(installPage'), true)
  assert.equal(client.includes('权限与控制'), true)
  assert.equal(client.includes('外部浏览器'), true)
})

test('webbridge origin stays on loopback', () => {
  assert.equal(loopbackOrigin('127.0.0.1:10086'), 'http://127.0.0.1:10086')
  assert.throws(() => loopbackOrigin('http://10.0.0.8:10086'), /非本机/)
  assert.throws(() => loopbackOrigin('http://user:pass@127.0.0.1:10086'), /非本机|账号/)
})

test('saved CDP settings are dropped and the connection stays on WebBridge', () => {
  const migrated = validateConfig({ version: 0, remoteEndpoint: 'http://127.0.0.1:9222', allowRemoteEndpoint: true, runMode: 'headless', connection: { mode: 'cdp' } })
  assert.equal(migrated.ok, true)
  assert.equal(migrated.config.connection.mode, 'webbridge')
  assert.equal(migrated.config.connection.extensionEnabled, false)
  assert.equal(Object.hasOwn(migrated.config, 'remoteEndpoint'), false)
  assert.equal(freshMode().connection.mode, 'webbridge')
})

function freshMode() {
  return validateConfig(defaultConfig()).config
}

test('status and command talk to the official local endpoints', async () => {
  const seen = []
  const bridge = createWebBridge({
    addr: '127.0.0.1:10086',
    installed: true,
    async fetch(url, init) {
      seen.push({ url, method: init?.method || 'GET', body: init?.body })
      if (String(url).endsWith('/status')) {
        return { async json() { return { running: true, extension_connected: true, extension_version: 'v2', version: 'v2.0.24' } } }
      }
      return { async json() { return { ok: true, data: { url: 'https://example.com', tabId: 7 } } } }
    },
  })
  const status = await bridge.status()
  assert.equal(status.running, true)
  assert.equal(status.extension_connected, true)
  const data = await bridge.command({ action: 'navigate', args: { url: 'https://example.com', newTab: true }, session: 'dsh-task' })
  assert.equal(data.tabId, 7)
  assert.equal(seen[0].url, 'http://127.0.0.1:10086/status')
  assert.equal(seen[1].url, 'http://127.0.0.1:10086/command')
  assert.equal(JSON.parse(seen[1].body).action, 'navigate')
})

test('snapshot refs from the official tree can be clicked', async () => {
  const snap = normalizeSnapshot({
    url: 'https://example.com',
    title: 'Example',
    tree: [{ role: 'button', name: '继续', ref: '@e4' }],
  })
  assert.equal(snap.elements[0].ref, 'e4')
  assert.equal(snap.elements[0].selector, '@e4')
  const calls = []
  const client = {
    async status() { return { running: true, extension_connected: true, installed: true, addr: '127.0.0.1:10086' } },
    async start() { return this.status() },
    async command(body) {
      calls.push(body)
      if (body.action === 'snapshot') return { url: 'https://example.com', title: 'Example', tree_text: 'button 继续 @e4' }
      return { success: true }
    },
  }
  const config = validateConfig({ ...defaultConfig(), connection: { mode: 'webbridge', extensionEnabled: true } }).config
  const driver = new WebBridgeDriver({ client, getConfig: () => config })
  const page = await driver.goto('profile_1', 'https://example.com')
  assert.equal(page.elements[0].ref, 'e4')
  assert.equal(calls[0].action, 'navigate')
  assert.equal(calls[0].args.newTab, true)
  assert.equal(calls[0].args.group_title, 'DeepSeek')
  assert.equal(calls[0].session, 'dsh-profile_1')
  await driver.click('profile_1', 'e4')
  assert.equal(calls.some((item) => item.action === 'click' && item.args.selector === '@e4'), true)
  await driver.goto('profile_1', 'https://example.com/next')
  assert.equal(calls.filter((item) => item.action === 'navigate').at(-1).args.newTab, false)
})

test('extension stays off until the settings switch is turned on', async () => {
  let commands = 0
  const client = {
    async status() { return { running: true, extension_connected: true, installed: true, addr: '127.0.0.1:10086' } },
    async start() { return this.status() },
    async command() { commands += 1; return {} },
  }
  const config = defaultConfig()
  const driver = new WebBridgeDriver({ client, getConfig: () => config })
  const engine = createEngine({ driver, config })
  const created = await engine.dispatch({ action: 'browser.session.create' })
  assert.equal(created.code, 'BROWSER_DISCONNECTED')
  assert.match(created.message, /权限与控制/)
  assert.equal(commands, 0)
})
