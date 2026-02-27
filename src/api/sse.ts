import type { JobEvent, JobSnapshot } from './types'

type Handlers = {
  onOpen?: () => void
  onSnapshot?: (snapshot: JobSnapshot) => void
  onEvent?: (type: string, data: unknown) => void
  onCompleted?: (data: Record<string, unknown>) => void
  onFailed?: (data: Record<string, unknown>) => void
  onError?: (ev: Event) => void
}

export function openJobEventsSSE(url: string, handlers: Handlers = {}) {
  const es = new EventSource(url)

  es.onopen = () => {
    handlers.onOpen?.()
  }

  const parse = (e: MessageEvent) => {
    try {
      return JSON.parse(e.data)
    } catch {
      return { raw: e.data }
    }
  }

  es.addEventListener('snapshot', (e) => {
    const data = parse(e as MessageEvent) as JobSnapshot
    handlers.onSnapshot?.(data)
    handlers.onEvent?.('snapshot', data)
  })

  ;['job_created', 'status', 'log', 'heartbeat', 'topic_selected_videos', 'waiting_user_pick', 'queue_status', 'child_note_ready'].forEach((evtName) => {
    es.addEventListener(evtName, (e) => {
      const data = parse(e as MessageEvent) as JobEvent
      handlers.onEvent?.(evtName, data)
    })
  })

  es.addEventListener('completed', (e) => {
    const data = parse(e as MessageEvent) as Record<string, unknown>
    handlers.onEvent?.('completed', data)
    handlers.onCompleted?.(data)
  })

  es.addEventListener('failed', (e) => {
    const data = parse(e as MessageEvent) as Record<string, unknown>
    handlers.onEvent?.('failed', data)
    handlers.onFailed?.(data)
  })

  es.onerror = (ev) => {
    handlers.onError?.(ev)
  }

  return es
}
