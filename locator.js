/** 元素定位。多个高分候选时必须交还列表，禁止静默挑一个。 */

const WEIGHT = { testid: 100, role: 86, label: 74, placeholder: 62, text: 50, css: 28, xpath: 10 }

/** 按配置的优先级给候选打分。分差不足则视为不唯一。 */
export function rankCandidates(elements, query, priority = []) {
  const order = priority.length ? priority : Object.keys(WEIGHT)
  const scored = []
  for (const element of elements || []) {
    if (!element?.visible) continue
    const reasons = []
    let score = 0
    for (const kind of order) {
      const hit = matchKind(kind, element, query)
      if (!hit) continue
      score += WEIGHT[kind] || 0
      reasons.push({ kind, value: hit, score: WEIGHT[kind] || 0 })
    }
    if (score > 0) scored.push({ element, score, reasons })
  }
  scored.sort((a, b) => b.score - a.score)
  const unique = scored.length === 1 || (scored.length > 1 && scored[0].score - scored[1].score >= 15)
  return {
    unique: scored.length > 0 && unique,
    candidates: scored.slice(0, 8).map((item) => ({
      ref: item.element.ref,
      role: item.element.role || '',
      name: item.element.name || '',
      text: (item.element.text || '').slice(0, 80),
      score: item.score,
      reasons: item.reasons,
    })),
  }
}

function matchKind(kind, element, query = {}) {
  if (kind === 'testid') return same(query.testId || query.testid, element.testId || element.testid)
  if (kind === 'role') {
    if (!query.role) return ''
    const roleOk = same(query.role, element.role) || same(query.role, element.tag)
    const name = query.name || query.accessibleName
    if (!roleOk) return ''
    if (name && !includes(element.name, name) && !includes(element.text, name)) return ''
    return name ? `${query.role}:${name}` : query.role
  }
  if (kind === 'label') return query.label && includes(element.label || element.name, query.label) ? query.label : ''
  if (kind === 'placeholder') return query.placeholder && includes(element.placeholder, query.placeholder) ? query.placeholder : ''
  if (kind === 'text') return query.text && includes(element.text || element.name, query.text) ? query.text : ''
  if (kind === 'css') return query.css && (element.selector === query.css || element.css === query.css) ? query.css : ''
  if (kind === 'xpath') return query.xpath && element.xpath === query.xpath ? query.xpath : ''
  return ''
}

function same(expected, actual) {
  if (!expected || !actual) return ''
  return String(expected).trim().toLowerCase() === String(actual).trim().toLowerCase() ? String(expected) : ''
}

function includes(actual, expected) {
  if (!expected || !actual) return false
  return String(actual).trim().toLowerCase().includes(String(expected).trim().toLowerCase())
}

/** 引用是否还指向当前 DOM 版本里的可见且启用元素。 */
export function inspectRef(elements, ref, domVersion, expectedVersion) {
  const element = (elements || []).find((item) => item.ref === ref)
  if (expectedVersion && domVersion && expectedVersion !== domVersion) {
    return { ok: false, code: 'STALE_ELEMENT', message: 'DOM 已变化，原引用失效。' }
  }
  if (!element) return { ok: false, code: 'ELEMENT_NOT_FOUND', message: '页面上找不到该元素。' }
  if (!element.visible) return { ok: false, code: 'ELEMENT_NOT_FOUND', message: '元素当前不可见。' }
  if (element.enabled === false) return { ok: false, code: 'ELEMENT_NOT_FOUND', message: '元素当前不可用。' }
  return { ok: true, element }
}
