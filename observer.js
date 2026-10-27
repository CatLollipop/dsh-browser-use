/** 把驱动返回的原始页面收成可交给模型和审计的快照。秘密值不会出现在元素里。 */
import { isSensitiveField, scrubText } from './redact.js'

export function buildSnapshot({ raw, sessionId, snapshotId, capturedAt, config, domainAllowed }) {
  const redactions = []
  const elements = (raw.elements || []).map((element) => {
    const sensitive = isSensitiveField(element)
    if (sensitive) redactions.push(element.inputType === 'password' ? 'password' : 'secret-field')
    return {
      sensitive,
      ref: element.ref,
      role: element.role || '',
      name: sensitive ? '[REDACTED]' : scrubText(element.name || '').slice(0, 120),
      label: sensitive ? '' : scrubText(element.label || '').slice(0, 120),
      text: sensitive ? '' : scrubText(element.text || '').slice(0, 160),
      tag: element.tag || '',
      visible: element.visible !== false,
      enabled: element.enabled !== false,
      bbox: element.bbox,
      testId: element.testId || '',
      inputType: element.inputType || '',
      type: element.type || '',
      href: element.href || '',
      download: element.download || '',
      selector: element.testId ? `[data-testid="${element.testId}"]` : '',
      locatorCandidates: element.locatorCandidates || [],
      domVersion: raw.domVersion,
    }
  })
  let visibleText = ''
  const mode = config.audit.saveVisibleText
  if (mode === 'on' || (mode === 'per-domain' && domainAllowed)) {
    visibleText = scrubText(raw.visibleText || '').slice(0, config.advanced.maxTextLength)
  } else if (raw.visibleText) redactions.push('visible-text')
  if (raw.sensitive) redactions.push('screenshot-mask')
  return {
    pageId: snapshotId,
    sessionId,
    url: raw.url || '',
    title: scrubText(raw.title || '').slice(0, 180),
    capturedAt,
    domVersion: raw.domVersion || '',
    loadState: raw.loadState || 'unknown',
    elements: config.audit.saveDom ? elements : elements.map((item) => ({ ...item, bbox: undefined, text: '' })),
    visibleText,
    redactions: [...new Set(redactions)],
    sensitive: raw.sensitive === true,
  }
}
