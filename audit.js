/** 审计时间线。写入前脱敏，导出只包含已经脱敏的事件。 */
import { redactValue } from './redact.js'
import { zipStore } from './zip.js'

export class AuditRecorder {
  constructor({ clock = Date.now, ids, maxRuns = 200 } = {}) {
    this.clock = clock
    this.ids = ids
    this.maxRuns = maxRuns
    this.runs = new Map()
  }

  begin(sessionId) {
    const now = new Date(this.clock()).toISOString()
    const run = {
      runId: this.ids('trace'),
      sessionId,
      startedAt: now,
      finishedAt: '',
      events: [],
      artifactRefs: [],
    }
    this.runs.set(run.runId, run)
    this.add(run.runId, { type: 'run.start' })
    this.trim()
    return run
  }

  add(runId, event) {
    const run = this.runs.get(runId)
    if (!run) return
    run.events.push({
      ts: new Date(this.clock()).toISOString(),
      type: event.type,
      actionId: event.actionId || '',
      url: event.url || '',
      result: event.result === undefined ? undefined : redactValue(event.result),
      error: event.error === undefined ? undefined : redactValue(event.error),
    })
    if (event.artifactRef) run.artifactRefs.push(event.artifactRef)
  }

  finish(runId) {
    const run = this.runs.get(runId)
    if (!run) return
    run.finishedAt = new Date(this.clock()).toISOString()
    this.add(runId, { type: 'run.end' })
  }

  get(runId) {
    const run = this.runs.get(runId)
    return run ? structuredClone(run) : undefined
  }

  list({ sessionId, action, failed } = {}) {
    return [...this.runs.values()].filter((run) => {
      if (sessionId && run.sessionId !== sessionId) return false
      if (action && !run.events.some((event) => event.result?.type === action || event.type.includes(action))) return false
      if (failed && !run.events.some((event) => event.type.endsWith('.error') || event.error)) return false
      return true
    }).map((run) => ({
      runId: run.runId,
      sessionId: run.sessionId,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      events: run.events.length,
      failed: run.events.some((event) => event.error),
    })).reverse()
  }

  remove(runId) {
    return this.runs.delete(runId)
  }

  exportRun(runId, format = 'json') {
    const run = this.get(runId)
    if (!run) return undefined
    const json = JSON.stringify(run, null, 2)
    if (format === 'zip') {
      return { format: 'zip', filename: `${runId}.zip`, bytes: zipStore([{ name: `${runId}.json`, text: json }]) }
    }
    return { format: 'json', filename: `${runId}.json`, text: json }
  }

  prune({ retentionDays = 7, now = this.clock() } = {}) {
    const cutoff = now - retentionDays * 24 * 60 * 60 * 1000
    for (const [id, run] of this.runs) {
      if (Date.parse(run.startedAt) < cutoff) this.runs.delete(id)
    }
  }

  clear() {
    this.runs.clear()
  }

  trim() {
    const extra = this.runs.size - this.maxRuns
    if (extra <= 0) return
    const oldest = [...this.runs.keys()].slice(0, extra)
    for (const id of oldest) this.runs.delete(id)
  }
}
