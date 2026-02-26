import { apiRequest, buildApiUrl, getAuthToken } from './client'
import type {
  ChatMessagesResponse,
  ChatModelsResponse,
  ChatReplyRequest,
  ChatReplyResponse,
  ChatSessionCreateResponse,
} from './types'

export function createChatSessionApi(title = '') {
  return apiRequest<ChatSessionCreateResponse>('/chat/sessions', {
    method: 'POST',
    body: { title },
    auth: true,
  })
}

export function listChatModelsApi() {
  return apiRequest<ChatModelsResponse>('/chat/models', {
    method: 'GET',
    auth: true,
  })
}

export function listChatMessagesApi(sessionUuid: string, limit = 100) {
  return apiRequest<ChatMessagesResponse>(`/chat/sessions/${sessionUuid}/messages?limit=${limit}`, {
    method: 'GET',
    auth: true,
  })
}

export function sendChatMessageApi(sessionUuid: string, payload: ChatReplyRequest) {
  return apiRequest<ChatReplyResponse>(`/chat/sessions/${sessionUuid}/messages`, {
    method: 'POST',
    body: payload,
    auth: true,
  })
}

type StreamHandlers = {
  onMeta?: (data: any) => void
  onStart?: (data: any) => void
  onDelta?: (text: string, data: any) => void
  onDone?: (data: any) => void
  onSaved?: (data: any) => void
}

export async function sendChatMessageStreamApi(
  sessionUuid: string,
  payload: ChatReplyRequest,
  handlers: StreamHandlers = {},
) {
  const url = buildApiUrl(`/chat/sessions/${sessionUuid}/reply-stream`)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getAuthToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    let message = `HTTP ${resp.status}`
    try {
      const ct = resp.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const data = await resp.json() as any
        message = data?.detail || data?.message || message
      } else {
        const text = await resp.text()
        if (text) message = text
      }
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  if (!resp.body) throw new Error('流式响应不可用')
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const dispatchEvent = (eventName: string, rawData: string) => {
    let data: any = {}
    try {
      data = rawData ? JSON.parse(rawData) : {}
    } catch {
      data = { raw: rawData }
    }
    if (eventName === 'meta') handlers.onMeta?.(data)
    else if (eventName === 'start') handlers.onStart?.(data)
    else if (eventName === 'delta') handlers.onDelta?.(String(data?.text || ''), data)
    else if (eventName === 'done') handlers.onDone?.(data)
    else if (eventName === 'saved') handlers.onSaved?.(data)
  }

  const flushBlocks = (final = false) => {
    const parts = buffer.split('\n\n')
    if (!final) buffer = parts.pop() || ''
    else buffer = ''

    for (const block of parts) {
      const lines = block.split('\n')
      let eventName = 'message'
      const dataLines: string[] = []
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
      }
      if (dataLines.length) dispatchEvent(eventName, dataLines.join('\n'))
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      if (buffer.trim()) flushBlocks(true)
      break
    }
    buffer += decoder.decode(value, { stream: true })
    flushBlocks(false)
  }
}
