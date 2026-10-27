/** 设置页走同一套引擎。用户动作带 user: true，模型调用走工具且不能审批。 */
import { scrubText } from './redact.js'

const ROUTE = '/api/dsh-browser-use'

export function registerRpc(ctx, dispatch) {
  const registry = ctx.connection?.fetch
  if (typeof registry?.register !== 'function') return () => {}
  return registry.register({
    path: ROUTE,
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      let message
      try { message = await request.json() } catch {
        return Response.json({ type: 'server-response', rpcId: 'invalid', result: { ok: false, error: { code: 'CONFIG_INVALID', message: '请求不是 JSON。', details: {} } } }, { status: 400 })
      }
      const rpcId = typeof message?.rpcId === 'string' ? message.rpcId : 'invalid'
      const payload = message?.payload && typeof message.payload === 'object' ? message.payload : {}
      let result
      try {
        result = toConnectionResult(await dispatch({ ...payload, action: payload.action }, { user: true }))
        result = scrubResult(result)
      } catch (error) {
        result = { ok: false, error: { code: 'PERMISSION_DENIED', message: scrubText(error?.message || '操作失败。'), details: {} } }
      }
      return Response.json({ type: 'server-response', rpcId, result })
    },
  })
}

/** 设置页的 RPC 只接受 ok/value 或 ok/error/details。业务字段放在 value 里。 */
export function toConnectionResult(result) {
  if (result?.ok === true) return { ok: true, value: result }
  const code = String(result?.error?.code || result?.code || 'CONFIG_INVALID')
  const message = scrubText(String(result?.error?.message || result?.message || (Array.isArray(result?.errors) ? result.errors.join('；') : '操作失败。')))
  const errors = Array.isArray(result?.errors) ? result.errors.map((item) => scrubText(String(item))) : []
  return { ok: false, error: { code, message, details: { errors } } }
}

function scrubResult(value) {
  if (typeof value === 'string') return scrubText(value)
  if (!value || typeof value !== 'object') return value
  return JSON.parse(scrubText(JSON.stringify(value)))
}
