import type { JobSnapshot } from './types'

type Handlers = {
  onOpen?: () => void
  onSnapshot?: (snapshot: JobSnapshot) => void
  onEvent?: (type: string, data: unknown) => void
  onCompleted?: (data: Record<string, unknown>) => void
  onFailed?: (data: Record<string, unknown>) => void
  onError?: (ev: Event) => void
  onClose?: (ev: CloseEvent) => void
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

  ws.onopen = () => {
    handlers.onOpen?.()
  }

  ws.onmessage = (ev) => {
    const packet = parseJsonSafe(String(ev.data || ''))
    const type = String(packet?.type || 'message')
    const data = packet?.data ?? packet

    if (type === 'snapshot') {
      handlers.onSnapshot?.(data as JobSnapshot)
      handlers.onEvent?.('snapshot', data)
      return
    }

    handlers.onEvent?.(type, data)
    if (type === 'completed') handlers.onCompleted?.(data as Record<string, unknown>)
    if (type === 'failed') handlers.onFailed?.(data as Record<string, unknown>)
  }

  ws.onerror = (ev) => {
    handlers.onError?.(ev)
  }

  ws.onclose = (ev) => {
    handlers.onClose?.(ev)
  }

  return ws
}

