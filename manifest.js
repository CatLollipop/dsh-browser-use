/** 插件对外声明。工具名在运行时收成 browser_use 的 action，见 implementation-notes.md。 */
export const manifest = Object.freeze({
  name: 'dsh-browser-use',
  displayName: 'DSH Browser Use',
  aliases: ['dsh-brower-use'],
  version: '0.1.0',
  protocolVersion: 1,
  defaultPolicy: 'safe',
  capabilities: [
    'browser.session',
    'browser.page.read',
    'browser.element.locate',
    'browser.action.execute',
    'browser.approval',
    'browser.audit',
    'browser.replay',
  ],
  tools: [
    'browser.session.create',
    'browser.session.list',
    'browser.session.get',
    'browser.session.close',
    'browser.session.pause',
    'browser.session.resume',
    'browser.page.goto',
    'browser.page.read',
    'browser.page.snapshot',
    'browser.page.screenshot',
    'browser.page.back',
    'browser.page.reload',
    'browser.element.find',
    'browser.element.inspect',
    'browser.action.execute',
    'browser.action.batch',
    'browser.wait.until',
    'browser.approval.list',
    'browser.approval.request',
    'browser.approval.respond',
    'browser.approval.revoke',
    'browser.trace.get',
    'browser.trace.export',
    'browser.trace.replay',
  ],
  userOnlyTools: ['browser.approval.respond', 'browser.approval.revoke'],
})

const REQUIRED = ['name', 'displayName', 'aliases', 'version', 'protocolVersion', 'defaultPolicy', 'capabilities', 'tools']

/** 校验声明是否还覆盖规格要求的能力与工具名。 */
export function validateManifest(value = manifest) {
  const errors = []
  for (const key of REQUIRED) {
    if (value[key] == null || value[key] === '') errors.push(`缺少 ${key}`)
  }
  if (!Array.isArray(value.aliases) || !value.aliases.includes('dsh-brower-use')) errors.push('缺少兼容别名')
  if (value.defaultPolicy !== 'safe') errors.push('默认策略必须是 safe')
  for (const cap of manifest.capabilities) {
    if (!value.capabilities?.includes(cap)) errors.push(`缺少能力 ${cap}`)
  }
  return { ok: errors.length === 0, errors }
}
