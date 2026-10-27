/** 等待与重试。只有 safe 动作可以自动重试，副作用一次失败就停止。 */

export const WAIT_KINDS = Object.freeze([
  'element',
  'visible',
  'enabled',
  'text',
  'url',
  'dom_stable',
  'network_idle',
  'download',
  'approval',
  'load',
])

/** 返回允许的尝试次数。conditionally_safe 与 side_effect 都是 1。 */
export function retryPlan(idempotency, wait) {
  if (idempotency !== 'safe') {
    return {
      attempts: 1,
      backoffMs: 0,
      reason: idempotency === 'side_effect' ? 'side_effect' : 'not_unconditionally_idempotent',
    }
  }
  const extra = Math.max(0, Number(wait?.maxRetries || 0))
  return { attempts: 1 + extra, backoffMs: backoffStep(wait?.backoff, 1), reason: 'safe' }
}

export function backoffStep(strategy, attempt) {
  if (strategy === 'none') return 0
  if (strategy === 'linear') return 150 * attempt
  return 150 * (2 ** Math.max(0, attempt - 1))
}

/** 判断一次等待条件是否已经满足。不满足且超时由调用方报 TIMEOUT。 */
export function conditionMet(kind, page, expectation = {}) {
  if (!WAIT_KINDS.includes(kind)) return false
  if (kind === 'element' || kind === 'visible') return (page.elements || []).some((item) => matches(item, expectation) && item.visible)
  if (kind === 'enabled') return (page.elements || []).some((item) => matches(item, expectation) && item.visible && item.enabled !== false)
  if (kind === 'text') return String(page.visibleText || '').includes(String(expectation.text || ''))
  if (kind === 'url') return String(page.url || '').includes(String(expectation.url || ''))
  if (kind === 'dom_stable') return page.domStable === true
  if (kind === 'network_idle') return page.networkIdle === true
  if (kind === 'download') return page.downloadDone === true
  if (kind === 'approval') return expectation.approved === true
  if (kind === 'load') return page.loadState === 'complete'
  return false
}

function matches(element, expectation) {
  if (expectation.ref) return element.ref === expectation.ref
  if (expectation.testId) return element.testId === expectation.testId
  if (expectation.text) return String(element.text || element.name || '').includes(expectation.text)
  return true
}
