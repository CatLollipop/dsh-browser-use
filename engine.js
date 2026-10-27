/** 把会话、策略、审批、定位、审计和回放串成一次可恢复的运行。 */
import { ApprovalManager } from './approval.js'
import { AuditRecorder } from './audit.js'
import { validateConfig, changedPaths, defaultConfig } from './config.js'
import { DisconnectedDriver } from './driver.js'
import { browserError } from './errors.js'
import { buildSnapshot } from './observer.js'
import { PolicyGuard } from './policy.js'
import { inspectRef, rankCandidates } from './locator.js'
import { redactInput } from './redact.js'
import { conditionMet, retryPlan } from './retry.js'
import { SessionManager } from './session.js'

const USER_ONLY = new Set([
  'browser.approval.respond',
  'browser.approval.revoke',
  'config.save',
  'config.import',
  'config.reset',
  'trace.delete',
  'cleanup',
])

const NAVIGATION = new Set(['goto', 'back', 'reload'])

/** 创建独立引擎。默认驱动是未连接，避免测试双关或误开浏览器。 */
export function createEngine(options = {}) {
  const clock = options.clock || Date.now
  let sequence = 0
  const ids = (kind) => `${kind}_${++sequence}`
  let config = mustConfig(options.config || defaultConfig())
  const driver = options.driver || new DisconnectedDriver()
  const sessions = new SessionManager({
    clock,
    ids,
    maxConcurrent: config.maxConcurrentSessions,
    ttlMs: config.sessionTtlMinutes * 60 * 1000,
  })
  const approvals = new ApprovalManager({ clock, ids: () => ids('approval'), ttlMs: options.approvalTtlMs || 5 * 60 * 1000 })
  const audit = new AuditRecorder({ clock, ids })
  const changes = []
  const snapshots = new Map()

  function guard() {
    return new PolicyGuard(config)
  }

  function enclose(sessionId, work) {
    const run = audit.begin(sessionId || '')
    return Promise.resolve()
      .then(() => work(run))
      .then((value) => {
        audit.finish(run.runId)
        return value?.traceId ? value : { ...value, traceId: run.runId }
      })
      .catch((error) => {
        audit.add(run.runId, { type: 'run.error', error: { code: error.code || 'PERMISSION_DENIED', message: error.message } })
        audit.finish(run.runId)
        return browserError(error.code || 'PERMISSION_DENIED', error.message, {
          traceId: run.runId,
          actionId: error.actionId,
          approvalId: error.approvalId,
          risk: error.risk,
          consequence: error.consequence,
          candidates: error.candidates,
          next: error.next,
        })
      })
  }

  async function sessionCreate(args = {}) {
    if (!config.enabled) throw coded('PERMISSION_DENIED', '插件已停用。')
    sessions.configure({
      maxConcurrent: config.maxConcurrentSessions,
      ttlMs: config.sessionTtlMinutes * 60 * 1000,
    })
    const persistent = config.profile.persistent === true
    const profileId = persistent ? `persist:${config.profile.name || 'default'}` : ids('profile')
    if (args.reuse !== false && config.profile.reuseSession) {
      const existing = sessions.active().find((item) => item.status === 'ready' && item.persistent === persistent && (!persistent || item.profileId === profileId))
      if (existing) {
        sessions.touch(existing.id)
        return { ok: true, reused: true, session: viewSession(existing) }
      }
    }
    const live = await driver.status().catch(() => ({ connected: false }))
    const connected = live?.connected === true
    const session = sessions.create({
      profileId,
      persistent,
      name: args.name,
      capabilities: Object.entries(config.capabilities).filter(([, on]) => on).map(([name]) => name),
    })
    if (!connected) {
      sessions.close(session.id)
      throw coded('BROWSER_DISCONNECTED', live?.reason || '浏览器未连接，没有创建可运行的会话。')
    }
    sessions.mark(session.id, 'ready')
    return { ok: true, reused: false, session: viewSession(sessions.get(session.id)) }
  }

  async function executeInside(run, sessionId, spec, ctx, mode = 'execute') {
    const session = sessions.requireReady(sessionId)
    const type = String(spec?.type || '')
    if (!type) throw coded('PERMISSION_DENIED', '缺少动作类型。')
    let before = session.url ? await captureCurrent(session, run) : undefined
    if (before) {
      const ignored = guard().observePage(before.visibleText)
      audit.add(run.runId, { type: 'page.untrusted', url: before.url, result: ignored })
    }
    let element
    let locatedSnapshot = before
    if (spec.target || spec.query) {
      const located = await locate(session, spec.target || spec.query, before, run)
      if (!located.ok) {
        const error = coded(located.code, located.message)
        error.candidates = located.candidates
        throw error
      }
      element = located.element
      locatedSnapshot = located.snapshot
      before = located.snapshot
    }
    const decision = guard().evaluate({
      type,
      url: type === 'goto' ? spec.url : (before?.url || session.url),
      currentUrl: type === 'goto' ? session.url : '',
      element,
      input: spec.input,
    })
    let actionId = ids('action')
    const key = actionTargetKey(type, spec, element)
    if (spec.approvalId) {
      const existing = approvals.get(spec.approvalId)
      if (!existing || (existing.actionType && existing.actionType !== type) || (existing.targetKey && existing.targetKey !== key)) {
        const error = coded('APPROVAL_INVALID', '审批与这次动作不匹配。')
        error.actionId = actionId
        throw error
      }
      actionId = existing.actionId
    }
    const action = {
      id: actionId,
      sessionId,
      pageId: before?.pageId || '',
      type,
      target: element ? { ref: element.ref, domVersion: before?.domVersion, query: spec.query || spec.target?.query } : undefined,
      input: redactInput(spec.input, element),
      idempotency: decision.idempotency,
      risk: decision.risk,
    }
    audit.add(run.runId, {
      type: mode === 'plan' ? 'action.planned' : 'action.start',
      actionId: action.id,
      url: before?.url || spec.url || '',
      result: { action: storedAction(action, before?.url, spec), risk: decision.risk },
    })
    if (!decision.allowed) {
      const error = coded(decision.code, decision.message)
      error.actionId = action.id
      error.risk = decision.risk
      audit.add(run.runId, { type: 'action.error', actionId: action.id, error: { code: decision.code, message: decision.message } })
      throw error
    }
    if (mode === 'plan') {
      return {
        ok: true,
        status: 'planned',
        actionId: action.id,
        risk: decision.risk,
        idempotency: decision.idempotency,
        needsApproval: decision.needsApproval,
        consequence: decision.consequence,
        traceId: run.runId,
      }
    }
    await ensureApproval(action, decision, spec, session, element, run, ctx)
    if (decision.idempotency === 'side_effect') action.approvalId = spec.approvalId || ''
    const after = await runWithRetry(action, session, spec, run)
    const changes = stateChanges(before, after)
    sessions.touch(session.id, { status: 'ready', url: after?.url || session.url, currentPageId: after?.pageId || session.currentPageId })
    audit.add(run.runId, { type: 'action.end', actionId: action.id, url: after?.url || '', result: { action: storedAction(action, before?.url, spec), status: 'completed' } })
    return {
      ok: true,
      actionId: action.id,
      status: 'completed',
      risk: decision.risk,
      beforeSnapshotId: before?.pageId || '',
      afterSnapshotId: after?.pageId || '',
      stateChanges: changes,
      result: {
        url: after?.url || '',
        title: after?.title || '',
        loadState: after?.loadState || '',
        screenshotRef: after?.screenshotRef || '',
        redactions: after?.redactions || [],
        snapshot: type === 'read' || type === 'snapshot' ? publicSnapshot(after) : undefined,
      },
      traceId: run.runId,
    }
  }

  async function runWithRetry(action, session, spec, run) {
    const plan = retryPlan(action.idempotency, config.wait)
    let last
    for (let attempt = 1; attempt <= plan.attempts; attempt += 1) {
      try {
        sessions.mark(session.id, 'busy')
        return await invoke(session, action.type, spec, action)
      } catch (error) {
        last = error
        if (error.code === 'BROWSER_DISCONNECTED') sessions.mark(session.id, 'error')
        else sessions.mark(session.id, 'ready')
        audit.add(run.runId, { type: 'action.error', actionId: action.id, error: { code: error.code || 'TIMEOUT', message: error.message } })
        if (config.wait.screenshotOnFailure) await failureShot(session, run)
        if (attempt >= plan.attempts || action.idempotency !== 'safe') break
        audit.add(run.runId, { type: 'retry', actionId: action.id, result: { attempt, reason: plan.reason } })
      }
    }
    if (action.idempotency === 'side_effect' && !['UPLOAD_BLOCKED', 'DOWNLOAD_BLOCKED', 'SENSITIVE_DATA_BLOCKED', 'DOMAIN_BLOCKED', 'PERMISSION_DENIED'].includes(last?.code)) {
      last.code = 'ACTION_NOT_IDEMPOTENT'
    }
    throw last
  }

  async function invoke(session, type, spec, action) {
    const profileId = session.profileId
    const ref = action.target?.ref
    try {
      if (type === 'goto') return capture(session, await driver.goto(profileId, spec.url), undefined)
      if (type === 'back') return capture(session, await driver.back(profileId))
      if (type === 'reload') return capture(session, await driver.reload(profileId))
      if (type === 'click') return capture(session, await driver.click(profileId, ref))
      if (type === 'type') return capture(session, await driver.type(profileId, ref, spec.input?.text ?? spec.input ?? ''))
      if (type === 'select') return capture(session, await driver.select(profileId, ref, spec.input?.value ?? spec.input))
      if (type === 'press') return capture(session, await driver.press(profileId, spec.input?.key || spec.input || 'Enter'))
      if (type === 'scroll') return capture(session, await driver.scroll(profileId, spec.input || {}))
      if (type === 'read' || type === 'snapshot' || type === 'wait') return capture(session, await driver.snapshot(profileId))
      if (type === 'screenshot') return captureScreenshot(session)
      if (type === 'upload') {
        assertFile(spec.input)
        return capture(session, await driver.upload(profileId, ref, publicFile(spec.input)))
      }
      if (type === 'download') {
        const file = await driver.download(profileId, ref)
        assertDownload(file)
        return capture(session, await driver.snapshot(profileId))
      }
      throw coded('PERMISSION_DENIED', '不支持的动作。')
    } catch (error) {
      if (error.code === 'BROWSER_DISCONNECTED') sessions.mark(session.id, 'error')
      throw error
    }
  }

  function assertFile(file) {
    const name = String(file?.name || '')
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
    if (!config.files.allowedExtensions.includes(ext) || Number(file?.size || 0) > config.files.maxBytes || String(file?.path || '').includes('..')) {
      throw coded('UPLOAD_BLOCKED', '文件类型、大小或路径不在允许范围内。')
    }
  }

  function assertDownload(file) {
    const relative = String(file?.relativePath || '')
    if (!relative || relative.includes('..') || relative.startsWith('/') || relative.includes('\\')) {
      throw coded('DOWNLOAD_BLOCKED', '下载路径超出允许目录。')
    }
  }

  async function failureShot(session, run) {
    try {
      const shot = await driver.screenshot(session.profileId)
      const ref = shot?.redacted || shot?.sensitive ? 'screenshot:redacted' : 'screenshot:failure'
      audit.add(run.runId, { type: 'screenshot', artifactRef: ref, result: { redacted: shot?.redacted === true } })
    } catch { /* 失败截图本身不能再打断错误返回 */ }
  }

  async function capture(session, raw) {
    if (!raw) return undefined
    const snap = buildSnapshot({
      raw,
      sessionId: session.id,
      snapshotId: ids('snapshot'),
      capturedAt: new Date(clock()).toISOString(),
      config,
      domainAllowed: raw.url ? guard().checkDomain(raw.url, '', 'read').ok === true : false,
    })
    snapshots.set(snap.pageId, snap)
    return snap
  }

  async function captureCurrent(session, run) {
    const raw = await driver.snapshot(session.profileId)
    const snap = await capture(session, raw)
    audit.add(run.runId, { type: 'snapshot', url: snap.url, result: { snapshotId: snap.pageId, domVersion: snap.domVersion, redactions: snap.redactions } })
    return snap
  }

  async function captureScreenshot(session) {
    const shot = await driver.screenshot(session.profileId)
    const snap = await capture(session, await driver.snapshot(session.profileId))
    if (shot?.redacted || snap.sensitive || !config.audit.saveScreenshot) snap.screenshotRef = 'screenshot:redacted'
    else snap.screenshotRef = 'screenshot:captured'
    return snap
  }

  async function locate(session, target, snap, run) {
    let current = snap || await captureCurrent(session, run)
    const query = target?.query || (target?.ref ? null : target)
    if (target?.ref) {
      const inspected = inspectRef(current.elements, target.ref, current.domVersion, target.domVersion || current.domVersion)
      if (inspected.ok) {
        audit.add(run.runId, { type: 'locate', result: { ref: target.ref, unique: true } })
        return { ok: true, element: inspected.element, snapshot: current }
      }
      if (inspected.code === 'STALE_ELEMENT') {
        audit.add(run.runId, { type: 'locate.stale', result: { ref: target.ref } })
        current = await captureCurrent(session, run)
        if (!query && !target.query) return { ok: false, code: 'STALE_ELEMENT', message: '元素引用已失效，且没有可重放的定位条件。' }
      } else return { ok: false, code: inspected.code, message: inspected.message }
    }
    const ranked = rankCandidates(current.elements, query || target.query || target, config.advanced.locatorPriority)
    audit.add(run.runId, { type: 'locate', url: current.url, result: { unique: ranked.unique, candidates: ranked.candidates } })
    if (!ranked.candidates.length) return { ok: false, code: 'ELEMENT_NOT_FOUND', message: '没有符合语义的可见元素。' }
    if (!ranked.unique) return { ok: false, code: 'AMBIGUOUS_TARGET', message: '定位到多个候选，已停止以免点错。', candidates: ranked.candidates }
    return { ok: true, element: current.elements.find((item) => item.ref === ranked.candidates[0].ref), snapshot: current }
  }

  async function ensureApproval(action, decision, spec, session, element, run, ctx) {
    if (!decision.needsApproval) return
    if (spec.approvalId) {
      const used = approvals.consume(spec.approvalId, action.id)
      if (!used.ok) {
        const error = coded('APPROVAL_INVALID', used.message)
        error.actionId = action.id
        throw error
      }
      audit.add(run.runId, { type: 'approval.used', actionId: action.id, result: { approvalId: spec.approvalId } })
      return
    }
    const created = approvals.create({
      actionId: action.id,
      actionType: action.type,
      targetKey: actionTargetKey(action.type, spec, element),
      risk: decision.risk,
      domain: hostname(spec.url || session.url),
      targetSummary: `${action.type} ${element?.name || element?.testId || spec.url || ''}`.trim(),
      dataPreview: action.input?.redacted ? '[REDACTED]' : '',
      consequence: decision.consequence,
    })
    audit.add(run.runId, { type: 'approval.requested', actionId: action.id, result: { approvalId: created.id, risk: decision.risk } })
    if (ctx.approvalBridge) {
      const verdict = await ctx.approvalBridge(created)
      if (verdict === 'approved') {
        approvals.respond(created.id, 'approved', 'user')
        approvals.consume(created.id, action.id)
        audit.add(run.runId, { type: 'approval.approved', actionId: action.id, result: { approvalId: created.id } })
        return
      }
      if (verdict === 'rejected') {
        approvals.respond(created.id, 'rejected', 'user')
        audit.add(run.runId, { type: 'approval.rejected', actionId: action.id, result: { approvalId: created.id } })
        const rejected = coded('PERMISSION_DENIED', '用户拒绝了这次操作，不要自动重试。')
        rejected.actionId = action.id
        throw rejected
      }
    }
    const error = coded('APPROVAL_REQUIRED', '该动作需要人工批准后才能执行。')
    error.actionId = action.id
    error.approvalId = created.id
    error.risk = decision.risk
    error.consequence = decision.consequence
    throw error
  }

  async function replay(runId, args = {}, ctx = {}) {
    const original = audit.get(runId)
    if (!original) throw coded('SESSION_NOT_FOUND', '找不到要回放的 trace。')
    const mode = args.mode === 'live' ? 'live' : 'dry-run'
    const steps = []
    const planned = original.events.filter((event) => event.type === 'action.end' || event.type === 'action.planned')
    for (const event of planned) {
      const stored = event.result?.action
      if (!stored) continue
      const session = sessions.get(original.sessionId)
      if (!session || session.status === 'closed' || session.status === 'error') {
        steps.push({ status: 'paused', code: 'BROWSER_DISCONNECTED' })
        break
      }
      let current
      try { current = await driver.snapshot(session.profileId) } catch {
        steps.push({ status: 'paused', code: 'BROWSER_DISCONNECTED' })
        break
      }
      if (stored.expectedUrl && current.url && stored.expectedUrl !== current.url && !stored.navigation) {
        steps.push({ status: 'paused', code: 'PAGE_CHANGED', actionId: stored.id })
        audit.add(ctx.runId, { type: 'replay.pause', result: { code: 'PAGE_CHANGED' } })
        break
      }
      const sideEffect = stored.risk === 'L2' || stored.risk === 'L3' || stored.idempotency === 'side_effect'
      if (mode === 'dry-run') {
        steps.push({ status: sideEffect ? 'skipped' : 'replayed-read', actionId: stored.id, risk: stored.risk })
        continue
      }
      try {
        const outcome = await executeInside(ctx.run, session.id, {
          type: stored.type,
          url: stored.url,
          query: stored.query,
          approvalId: sideEffect ? args.approvalIds?.[stored.id] : undefined,
          input: stored.input?.redacted ? undefined : stored.input,
        }, ctx, 'execute')
        steps.push(outcome)
        if (!outcome.ok) break
      } catch (error) {
        steps.push(browserError(error.code || 'PERMISSION_DENIED', error.message, {
          actionId: error.actionId,
          approvalId: error.approvalId,
          risk: error.risk || stored.risk,
          consequence: error.consequence,
        }))
        break
      }
    }
    return { ok: steps.every((step) => step.status !== 'paused' && step.ok !== false && step.status !== 'approval_required'), mode, steps }
  }

  const api = {
    getConfig: () => structuredClone(config),
    changes: () => changes.map((item) => ({ ...item, paths: [...item.paths] })),
    snapshots,
    async dispatch(args = {}, ctx = {}) {
      const name = String(args.action || '')
      if (USER_ONLY.has(name) && ctx.user !== true) {
        return browserError('PERMISSION_DENIED', '该操作只能由用户在设置页执行。')
      }
      const handler = handlers[name]
      if (!handler) return browserError('PERMISSION_DENIED', '不支持的浏览器动作。')
      if (name === 'browser.trace.replay' || name === 'browser.action.batch' || name === 'browser.action.execute' || name.startsWith('browser.page.') || name.startsWith('browser.element.') || name.startsWith('browser.session.') || name.startsWith('browser.wait.') || name.startsWith('browser.approval.') || name.startsWith('browser.trace.') || name.startsWith('config.') || name === 'cleanup') {
        return handler(args, ctx)
      }
      return handler(args, ctx)
    },
  }

  const handlers = {
    'browser.session.create': (args) => enclose('', (run) => sessionCreate(args).then((value) => {
      audit.add(run.runId, { type: value.reused ? 'session.reused' : 'session.created', result: { sessionId: value.session?.id } })
      return value
    })),
    'browser.session.list': () => enclose('', () => {
      sessions.sweep()
      return { ok: true, sessions: sessions.active().map(viewSession) }
    }),
    'browser.session.get': (args) => enclose(args.sessionId, () => {
      const session = sessions.get(args.sessionId)
      if (!session || session.status === 'closed') throw coded('SESSION_NOT_FOUND', '找不到会话。')
      return { ok: true, session: viewSession(session) }
    }),
    'browser.session.close': (args) => enclose(args.sessionId, async (run) => {
      const session = sessions.close(args.sessionId)
      if (session && !session.persistent && config.profile.cleanupOnClose) await driver.closeProfile(session.profileId)
      audit.add(run.runId, { type: 'session.closed', result: { sessionId: args.sessionId } })
      return { ok: true, session: viewSession(session) }
    }),
    'browser.session.pause': (args) => enclose(args.sessionId, (run) => {
      const session = sessions.pause(args.sessionId)
      audit.add(run.runId, { type: 'session.paused', result: { sessionId: session.id } })
      return { ok: true, session: viewSession(session) }
    }),
    'browser.session.resume': (args) => enclose(args.sessionId, (run) => {
      const session = sessions.resume(args.sessionId)
      audit.add(run.runId, { type: 'session.resumed', result: { sessionId: session.id } })
      return { ok: true, session: viewSession(session) }
    }),
    'browser.page.goto': (args, ctx) => enclose(args.sessionId, (run) => executeInside(run, args.sessionId, { type: 'goto', url: args.url }, ctx)),
    'browser.page.read': (args, ctx) => enclose(args.sessionId, (run) => executeInside(run, args.sessionId, { type: 'read' }, ctx)),
    'browser.page.snapshot': (args, ctx) => enclose(args.sessionId, (run) => executeInside(run, args.sessionId, { type: 'snapshot' }, ctx).then(async (value) => {
      const snap = [...snapshots.values()].reverse().find((item) => item.sessionId === args.sessionId)
      return { ...value, snapshot: snap }
    })),
    'browser.page.screenshot': (args, ctx) => enclose(args.sessionId, (run) => executeInside(run, args.sessionId, { type: 'screenshot' }, ctx)),
    'browser.page.back': (args, ctx) => enclose(args.sessionId, (run) => executeInside(run, args.sessionId, { type: 'back' }, ctx)),
    'browser.page.reload': (args, ctx) => enclose(args.sessionId, (run) => executeInside(run, args.sessionId, { type: 'reload' }, ctx)),
    'browser.element.find': (args) => enclose(args.sessionId, async (run) => {
      const session = sessions.requireReady(args.sessionId)
      const snap = await captureCurrent(session, run)
      guard().observePage(snap.visibleText)
      const ranked = rankCandidates(snap.elements, args.query || {}, config.advanced.locatorPriority)
      return { ok: true, unique: ranked.unique, candidates: ranked.candidates, snapshotId: snap.pageId, traceId: run.runId }
    }),
    'browser.element.inspect': (args) => enclose(args.sessionId, async (run) => {
      const session = sessions.requireReady(args.sessionId)
      const snap = await captureCurrent(session, run)
      const inspected = inspectRef(snap.elements, args.ref, snap.domVersion, args.domVersion)
      if (!inspected.ok) throw coded(inspected.code, inspected.message)
      return { ok: true, element: inspected.element, traceId: run.runId }
    }),
    'browser.action.execute': (args, ctx) => enclose(args.sessionId, (run) => executeInside(run, args.sessionId, args, ctx, 'execute')),
    'browser.action.batch': (args, ctx) => enclose(args.sessionId, async (run) => {
      const list = Array.isArray(args.actions) ? args.actions : []
      if (list.length > config.advanced.maxActionsPerRun) throw coded('PERMISSION_DENIED', '超过单次运行的最大动作数。')
      const mode = args.mode === 'plan' ? 'plan' : 'execute'
      const steps = []
      let previousUrl = sessions.get(args.sessionId)?.url || ''
      for (const item of list) {
        let outcome
        try {
          outcome = await executeInside(run, args.sessionId, item, ctx, mode)
        } catch (error) {
          outcome = browserError(error.code || 'PERMISSION_DENIED', error.message, {
            actionId: error.actionId,
            approvalId: error.approvalId,
            risk: error.risk,
            consequence: error.consequence,
            candidates: error.candidates,
          })
        }
        steps.push(outcome)
        if (!outcome.ok) break
        if (mode === 'execute' && previousUrl && outcome.result?.url && outcome.result.url !== previousUrl && !NAVIGATION.has(item.type)) {
          steps.push({ ok: false, status: 'paused', code: 'PAGE_CHANGED', message: '执行过程中页面已变化，批次已暂停。' })
          break
        }
        previousUrl = outcome.result?.url || previousUrl
      }
      return { ok: steps.every((step) => step.ok !== false), mode, steps, traceId: run.runId }
    }),
    'browser.wait.until': (args) => enclose(args.sessionId, async (run) => {
      const session = sessions.requireReady(args.sessionId)
      const raw = await driver.snapshot(session.profileId)
      const met = conditionMet(args.condition?.kind, raw, args.condition || {})
      audit.add(run.runId, { type: 'wait', result: { kind: args.condition?.kind, met } })
      if (!met) throw coded('TIMEOUT', '等待条件没有在时限内满足。')
      return { ok: true, status: 'completed' }
    }),
    'browser.approval.list': () => ({ ok: true, approvals: approvals.list() }),
    'browser.approval.request': (args) => enclose(args.sessionId, (run) => executeInside(run, args.sessionId, args, {})),
    'browser.approval.respond': (args) => {
      const result = approvals.respond(args.approvalId, args.decision, args.actor || 'user')
      if (!result.ok) return browserError(result.code, result.message)
      return { ok: true, approval: result.approval }
    },
    'browser.approval.revoke': (args) => {
      const result = approvals.revoke(args.approvalId, args.actor || 'user')
      if (!result.ok) return browserError(result.code, result.message)
      return { ok: true, approval: result.approval }
    },
    'browser.trace.list': (args) => ({ ok: true, traces: audit.list({ sessionId: args.sessionId, action: args.event, failed: args.failed }) }),
    'browser.trace.get': (args) => {
      const trace = audit.get(args.runId || args.traceId)
      if (!trace) return browserError('SESSION_NOT_FOUND', '找不到审计记录。')
      return { ok: true, trace }
    },
    'browser.trace.export': (args) => {
      if (!config.audit.allowExport) return browserError('PERMISSION_DENIED', '导出已被配置关闭。')
      const file = audit.exportRun(args.runId || args.traceId, args.format === 'zip' ? 'zip' : 'json')
      if (!file) return browserError('SESSION_NOT_FOUND', '找不到审计记录。')
      if (file.bytes) return { ok: true, format: 'zip', filename: file.filename, bytes: [...file.bytes] }
      return { ok: true, format: 'json', filename: file.filename, text: file.text }
    },
    'browser.trace.replay': (args, ctx) => enclose(args.sessionId, async (run) => {
      audit.add(run.runId, { type: 'replay.start', result: { source: args.runId, mode: args.mode || 'dry-run' } })
      const value = await replay(args.runId, args, { ...ctx, run, runId: run.runId })
      audit.add(run.runId, { type: 'replay.end', result: { ok: value.ok, mode: value.mode } })
      return { ...value, traceId: run.runId }
    }),
    'trace.delete': (args) => ({ ok: audit.remove(args.runId || args.traceId) }),
    'config.get': () => ({ ok: true, config: api.getConfig(), changes: api.changes() }),
    'config.save': (args) => saveConfig(args.config),
    'config.import': (args) => saveConfig(args.config),
    'config.reset': () => saveConfig(defaultConfig()),
    'config.validate': (args) => {
      const result = validateConfig(args.config || config)
      return result.ok ? { ok: true, config: result.config } : { ok: false, code: 'CONFIG_INVALID', errors: result.errors }
    },
    'cleanup': async () => {
      audit.clear()
      for (const session of [...sessions.active()]) {
        if (!session.persistent) await driver.closeProfile(session.profileId)
        try { sessions.close(session.id) } catch { /* 已关闭 */ }
      }
      return { ok: true }
    },
    'engine.sweep': () => {
      const expired = sessions.sweep()
      if (config.audit.autoCleanup) audit.prune({ retentionDays: config.audit.retentionDays, now: clock() })
      return { ok: true, expired: expired.map((item) => item.id) }
    },
  }

  function saveConfig(draft) {
    const result = validateConfig(draft)
    if (!result.ok) return { ok: false, status: 'error', code: 'CONFIG_INVALID', message: '配置校验失败。', errors: result.errors, recoverable: true, next: '按字段错误修正后再保存。', actionId: '', traceId: '' }
    const paths = changedPaths(config, result.config)
    config = result.config
    sessions.configure({ maxConcurrent: config.maxConcurrentSessions, ttlMs: config.sessionTtlMinutes * 60 * 1000 })
    changes.push({ at: new Date(clock()).toISOString(), version: CONFIG_VERSION_SAFE(config), paths })
    return { ok: true, config: api.getConfig(), paths }
  }

  return api
}

function CONFIG_VERSION_SAFE(config) {
  return config.version
}

function mustConfig(raw) {
  const result = validateConfig(raw)
  if (!result.ok) {
    const error = new Error(result.errors.join('；'))
    error.code = 'CONFIG_INVALID'
    throw error
  }
  return result.config
}

function coded(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function viewSession(session) {
  return {
    id: session.id,
    name: session.name,
    profileId: session.profileId,
    status: session.status,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    currentPageId: session.currentPageId || '',
    capabilities: session.capabilities,
  }
}

function storedAction(action, expectedUrl, spec) {
  return {
    id: action.id,
    type: action.type,
    risk: action.risk,
    idempotency: action.idempotency,
    query: spec.query || spec.target?.query || undefined,
    url: spec.url || '',
    expectedUrl: expectedUrl || '',
    navigation: NAVIGATION.has(action.type),
    approvalId: spec.approvalId || '',
    input: action.input,
  }
}

function stateChanges(before, after) {
  if (!before || !after) return []
  const changes = []
  if (before.url !== after.url) changes.push({ field: 'url', before: before.url, after: after.url })
  if (before.domVersion !== after.domVersion) changes.push({ field: 'domVersion', before: before.domVersion, after: after.domVersion })
  return changes
}

function actionTargetKey(type, spec, element) {
  return `${type}:${element?.testId || element?.selector || spec?.url || spec?.query?.testId || ''}`
}

function hostname(url) {
  try { return new URL(url).hostname } catch { return '' }
}

function publicFile(file) {
  return { name: String(file.name), size: Number(file.size || 0) }
}

function publicSnapshot(snap) {
  if (!snap) return undefined
  return {
    pageId: snap.pageId,
    url: snap.url,
    title: snap.title,
    domVersion: snap.domVersion,
    loadState: snap.loadState,
    visibleText: snap.visibleText,
    redactions: snap.redactions,
    elements: snap.elements,
  }
}
