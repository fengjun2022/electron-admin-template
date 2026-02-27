import type { JobSnapshot } from './types'

type Handlers = {
  onOpen?: () => void
  onSnapshot?: (snapshot: JobSnapshot) => void
  onEvent?: (type: string, data: unknown) => void
  onCompleted?: (data: Record<string, unknown>) => void
  onFailed?: (data: Record<string, unknown>) => void
  onError?: (ev: Event) => void
  onClose?: (ev: CloseEvent) => void
  onHeartbeat?: (data: Record<string, unknown>) => void
  onPong?: (data: Record<string, unknown>) => void
  onStatus?: (status: string, data?: Record<string, unknown>) => void
}

function parseJsonSafe(raw: string): any {
  try {
    return JSON.parse(raw)
  } catch {
    return { raw }
  }
}

export function openJobEventsWS(url: string, handlers: Handlers = {}) {
  const ws = new WebSocket(url)
  let pingSeq = 0
  let pingTimer: number | null = null
  let watchdogTimer: number | null = null
  let lastAliveTs = Date.now()
  const pendingPingAt: Record<string, number> = {}
  const HEARTBEAT_INTERVAL_MS = 20000
  const HEARTBEAT_TIMEOUT_MS = 70000

  const clearTimers = () => {
    if (pingTimer !== null) {
      window.clearInterval(pingTimer)
      pingTimer = null
    }
    if (watchdogTimer !== null) {
      window.clearInterval(watchdogTimer)
      watchdogTimer = null
    }
  }

  const sendPing = () => {
    if (ws.readyState !== WebSocket.OPEN) return
    const id = `p${Date.now()}-${++pingSeq}`
    pendingPingAt[id] = Date.now()
    try {
      ws.send(JSON.stringify({ type: 'ping', id, ts: new Date().toISOString() }))
    } catch {
      // ignore send errors; onclose/onerror will handle reconnection
    }
  }

  const startHeartbeat = () => {
    clearTimers()
    pingTimer = window.setInterval(() => {
      sendPing()
    }, HEARTBEAT_INTERVAL_MS)
    watchdogTimer = window.setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return
      const idleMs = Date.now() - lastAliveTs
      if (idleMs <= HEARTBEAT_TIMEOUT_MS) return
      handlers.onStatus?.('heartbeat_timeout', {
        idle_ms: idleMs,
        timeout_ms: HEARTBEAT_TIMEOUT_MS,
        ts: new Date().toISOString(),
      })
      try {
        ws.close(4000, 'heartbeat timeout')
      } catch {
        // ignore close errors
      }
    }, 5000)
  }

  ws.onopen = () => {
    lastAliveTs = Date.now()
    handlers.onStatus?.('connected', { ts: new Date().toISOString() })
    startHeartbeat()
    sendPing()
    handlers.onOpen?.()
  }

  ws.onmessage = (ev) => {
    lastAliveTs = Date.now()
    const packet = parseJsonSafe(String(ev.data || ''))
    const type = String(packet?.type || 'message')
    const data = packet?.data ?? packet

    if (type === 'snapshot') {
      handlers.onSnapshot?.(data as JobSnapshot)
      handlers.onEvent?.('snapshot', data)
      return
    }

    if (type === 'heartbeat') {
      handlers.onHeartbeat?.((data || {}) as Record<string, unknown>)
      handlers.onEvent?.('heartbeat', data)
      return
    }

    if (type === 'pong') {
      const d = ((data || {}) as Record<string, unknown>)
      const pongId = String(d.id || '')
      let rttMs: number | undefined
      if (pongId && pendingPingAt[pongId]) {
        rttMs = Date.now() - Number(pendingPingAt[pongId])
        delete pendingPingAt[pongId]
      }
      handlers.onPong?.({
        ...d,
        ...(rttMs !== undefined ? { rtt_ms: rttMs } : {}),
      })
      handlers.onEvent?.('pong', {
        ...d,
        ...(rttMs !== undefined ? { rtt_ms: rttMs } : {}),
      })
      return
    }

    if (type === 'ws_status') {
      const d = ((data || {}) as Record<string, unknown>)
      handlers.onStatus?.(String(d.status || 'unknown'), d)
      handlers.onEvent?.('ws_status', d)
      return
    }

    handlers.onEvent?.(type, data)
    if (type === 'completed') handlers.onCompleted?.(data as Record<string, unknown>)
    if (type === 'failed') handlers.onFailed?.(data as Record<string, unknown>)
  }

  ws.onerror = (ev) => {
    handlers.onStatus?.('error', { ts: new Date().toISOString() })
    handlers.onError?.(ev)
  }

  ws.onclose = (ev) => {
    clearTimers()
    handlers.onStatus?.('closed', {
      code: ev.code,
      reason: ev.reason,
      was_clean: ev.wasClean,
      ts: new Date().toISOString(),
    })
    handlers.onClose?.(ev)
  }

  return ws
}
